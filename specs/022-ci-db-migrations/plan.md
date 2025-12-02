# Implementation Plan: CI Database Migrations

**Branch**: `022-ci-db-migrations` | **Date**: 2025-12-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/022-ci-db-migrations/spec.md`

## Summary

Implement automatic database migration execution in the CI/CD pipeline for production Supabase deployments. On merge to main, a new "migrate" job will run `supabase db push` to apply pending migrations before the deploy-production job executes. The workflow uses GitHub Secrets for credentials, implements concurrency groups to serialize migrations, and blocks deployment on migration failure.

## Technical Context

**Language/Version**: YAML (GitHub Actions workflow), Bash (CLI commands)
**Primary Dependencies**: Supabase CLI v2.62.10, GitHub Actions  
**Storage**: Supabase PostgreSQL (production)  
**Testing**: E2E tests via local Supabase (existing), manual verification for CI workflow  
**Target Platform**: GitHub Actions Ubuntu runners  
**Project Type**: CI/CD infrastructure (workflow modification)  
**Performance Goals**: Migration job completes within 5 minutes (hard timeout: 10 minutes)  
**Constraints**: Migrations must complete before deployment; serialized execution via concurrency group  
**Scale/Scope**: Single workflow file modification (~50-80 lines added)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Checkpoint | Status | Notes |
|------------|--------|-------|
| Uses GitHub Actions (CI/CD standard) | ✅ PASS | Existing workflow at `.github/workflows/ci.yml` |
| Version pinning required | ✅ PASS | Will pin Supabase CLI to v2.62.10 (was using `latest`) |
| Secrets via environment variables | ✅ PASS | SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF via GitHub Secrets |
| Forward-only migrations | ✅ PASS | Aligns with constitution's "forward-looking only" data lifecycle |
| Existing e2e validation preserved | ✅ PASS | PR validation continues using local Supabase |
| No new dependencies in app code | ✅ PASS | CI-only change, no impact to TypeScript/React code |

**Gate Result**: ✅ PASS - All checks satisfied, proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/022-ci-db-migrations/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command) - N/A for this feature
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command) - N/A for this feature
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
.github/
└── workflows/
    └── ci.yml           # Modified: add migrate job with production deployment dependency

supabase/
└── migrations/          # Existing migration files (009 files currently)
    ├── 001_initial_schema.sql
    ├── ...
    └── 009_households.sql
```

**Structure Decision**: CI infrastructure modification only. No new directories or application code changes required. The migrate job will be added to the existing `ci.yml` workflow, positioned between e2e tests and deploy-production.

## Complexity Tracking

> No violations detected - this is a minimal infrastructure addition following existing patterns.

## Constitution Check (Post-Design)

*Re-evaluation after Phase 1 design completion.*

| Checkpoint | Status | Notes |
|------------|--------|-------|
| Uses GitHub Actions (CI/CD standard) | ✅ PASS | Design uses existing `ci.yml` workflow |
| Version pinning required | ✅ PASS | Supabase CLI pinned to v2.62.10 in research.md |
| Secrets via environment variables | ✅ PASS | SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF, SUPABASE_DB_PASSWORD defined in quickstart.md |
| Forward-only migrations | ✅ PASS | No rollback mechanism by design (per spec) |
| Existing e2e validation preserved | ✅ PASS | PR workflow unchanged; migrate job only on main |
| No new dependencies in app code | ✅ PASS | Changes scoped to `.github/workflows/ci.yml` only |
| Timeout constraints | ✅ PASS | 10-minute hard timeout specified (FR-014) |
| Retry mechanism | ✅ PASS | Single retry with 30s delay (FR-012) |
| Concurrency handling | ✅ PASS | GitHub Actions concurrency group (FR-011) |

**Post-Design Gate Result**: ✅ PASS - Design aligns with all constitution and specification requirements.

## Generated Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Implementation Plan | `specs/022-ci-db-migrations/plan.md` | ✅ Complete |
| Research | `specs/022-ci-db-migrations/research.md` | ✅ Complete |
| Data Model | `specs/022-ci-db-migrations/data-model.md` | ✅ Complete (N/A) |
| Contracts | `specs/022-ci-db-migrations/contracts/` | ✅ Complete (N/A) |
| Quickstart | `specs/022-ci-db-migrations/quickstart.md` | ✅ Complete |

## Next Steps

1. Run `/speckit.tasks` to break this plan into implementable tasks
2. Tasks will be written to `specs/022-ci-db-migrations/tasks.md`
3. Implementation follows the task sequence with PR per logical unit
