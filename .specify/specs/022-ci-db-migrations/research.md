# Research: CI Database Migrations

**Feature**: 022-ci-db-migrations  
**Date**: 2025-12-02

## Research Tasks

### 1. Supabase CLI Migration Command

**Question**: What is the correct command to apply migrations to a production Supabase project?

**Decision**: Use `supabase db push` command

**Rationale**: 
- `supabase db push` applies local migrations to the remote database
- Supports `--dry-run` for previewing changes
- Automatically tracks migration history to avoid re-applying
- Idempotent by design - running same migrations multiple times is safe

**Alternatives Considered**:
- `supabase migration up` - Only for local development
- Direct SQL execution - Loses migration tracking benefits
- `supabase db push --include-seed` - Not needed; seed data is for dev only

**Documentation Source**: [Supabase CLI Documentation](https://context7.com/supabase/cli)

---

### 2. Supabase CLI Version Pinning

**Question**: What version of Supabase CLI should be pinned?

**Decision**: Pin to `v2.62.10` (current latest as of 2025-12-02)

**Rationale**:
- Matches FR-013 requirement to pin specific version
- Latest stable release with all required features
- Avoids breaking changes from automatic updates
- Version updates require explicit PR (trackable changes)

**Alternatives Considered**:
- `latest` - Currently used in existing workflow, but violates FR-013 and constitution pinning requirements
- Older versions - No benefit, may lack features

**How to Update**: When updating, verify release notes and update in single PR with testing.

---

### 3. GitHub Actions Authentication

**Question**: How does the Supabase CLI authenticate in CI environments?

**Decision**: Use `SUPABASE_ACCESS_TOKEN` environment variable + `supabase link`

**Rationale**:
- Supabase CLI respects `SUPABASE_ACCESS_TOKEN` environment variable
- Combined with `supabase link --project-ref <PROJECT_REF>` establishes project context
- No interactive login required in CI
- Secrets are automatically masked in GitHub Actions logs

**Required GitHub Secrets**:
| Secret Name | Purpose |
|-------------|---------|
| `SUPABASE_ACCESS_TOKEN` | Personal access token for Supabase CLI authentication |
| `SUPABASE_DB_PASSWORD` | Database password for linking (if required by project settings) |

**Note**: `SUPABASE_PROJECT_REF` mentioned in spec should be stored as a secret for security, even though it's not strictly sensitive. This prevents exposure of project identifiers.

**Workflow Pattern**:
```yaml
env:
  SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

steps:
  - uses: supabase/setup-cli@v1
    with:
      version: 2.62.10
  - run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
  - run: supabase db push
```

---

### 4. Concurrency Group Configuration

**Question**: How to serialize migration jobs to prevent race conditions?

**Decision**: Use GitHub Actions concurrency group scoped to migrate job

**Rationale**:
- FR-011 requires serialization when multiple PRs merge in quick succession
- Concurrency groups in GitHub Actions automatically queue or cancel conflicting runs
- Using `cancel-in-progress: false` ensures migrations queue rather than cancel

**Implementation**:
```yaml
migrate:
  concurrency:
    group: supabase-migrate-production
    cancel-in-progress: false  # Queue, don't cancel
```

**Alternatives Considered**:
- External locking service - Adds complexity
- Database-level locking - Supabase migrations already handle this internally
- Workflow-level concurrency - Would affect all jobs, not just migrations

---

### 5. Retry Mechanism

**Question**: How to implement automatic retry on transient failures?

**Decision**: Use shell script with retry loop

**Rationale**:
- FR-012 requires single retry with 30-second delay
- Native GitHub Actions doesn't have built-in retry
- Simple bash loop is transparent and debuggable

**Implementation**:
```yaml
- name: Apply migrations
  run: |
    set +e
    supabase db push
    if [ $? -ne 0 ]; then
      echo "Migration failed, retrying in 30 seconds..."
      sleep 30
      supabase db push
    fi
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

**Alternatives Considered**:
- `nick-fields/retry@v3` action - Adds dependency, less transparent
- Custom action - Over-engineering for single retry
- No retry - Violates FR-012

---

### 6. Timeout Configuration

**Question**: How to enforce the 10-minute hard timeout?

**Decision**: Use GitHub Actions `timeout-minutes` on job level

**Rationale**:
- FR-014 requires 10-minute hard timeout
- GitHub Actions native timeout is reliable and well-documented
- Clearly visible in workflow file

**Implementation**:
```yaml
migrate:
  timeout-minutes: 10
```

---

### 7. Error Reporting

**Question**: How to ensure clear error messages for debugging?

**Decision**: Capture and display migration output with context

**Rationale**:
- FR-009 requires clear error messages including specific migration file
- Supabase CLI naturally outputs the failing migration
- GitHub Actions step summary can highlight errors

**Implementation**:
```yaml
- name: Apply migrations
  id: migrate
  run: supabase db push 2>&1 | tee migration-output.txt
  
- name: Report migration status
  if: failure()
  run: |
    echo "## Migration Failed" >> $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY
    cat migration-output.txt >> $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY
```

---

### 8. Existing Workflow Integration

**Question**: How does the migrate job fit into the existing CI pipeline?

**Decision**: Insert migrate job between e2e tests and deploy-production

**Rationale**:
- FR-003: Migrate must complete before deploy-production starts
- FR-004: Migrate depends on quality, visual, and e2e jobs
- Matches existing job dependency chain

**Current Pipeline**:
```
quality → visual → e2e → deploy-preview (PR only)
                      → deploy-production (main only)
```

**New Pipeline**:
```
quality → visual → e2e → deploy-preview (PR only)
                      → migrate → deploy-production (main only)
```

---

## Resolved Clarifications

| Original Unknown | Resolution |
|-----------------|------------|
| CLI command for production | `supabase db push` after `supabase link` |
| CLI version to pin | v2.62.10 |
| Authentication method | `SUPABASE_ACCESS_TOKEN` env var |
| Concurrency approach | GitHub Actions concurrency group |
| Retry implementation | Bash retry loop with 30s delay |
| Timeout mechanism | `timeout-minutes: 10` on job |

## Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| `supabase/setup-cli` | v1 (action) | Install Supabase CLI |
| Supabase CLI | 2.62.10 | Apply migrations |
| GitHub Actions | N/A | CI/CD platform |

## Security Considerations

1. **Access Token Scope**: SUPABASE_ACCESS_TOKEN should have minimal required permissions
2. **Secret Masking**: GitHub Actions automatically masks secrets in logs
3. **Audit Trail**: All migration runs are tracked in GitHub Actions history
4. **No Hardcoding**: All credentials via GitHub Secrets (FR-006, FR-007)

