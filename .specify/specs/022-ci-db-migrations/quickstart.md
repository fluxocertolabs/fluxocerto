# Quickstart: CI Database Migrations

**Feature**: 022-ci-db-migrations  
**Prerequisites**: GitHub repository admin access, Supabase project access

## Overview

This feature adds automatic database migration execution to the CI/CD pipeline. When code is merged to `main`, migrations are applied to production Supabase before the application deploys.

## Setup Steps

### 1. Generate Supabase Access Token

1. Go to [Supabase Dashboard](https://app.supabase.com/account/tokens)
2. Click **Generate new token**
3. Name it (e.g., `github-actions-ci`)
4. Copy the token immediately (it won't be shown again)

### 2. Get Project Reference

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **General**
3. Copy the **Reference ID** (format: `abcdefghijklmnop`)

### 3. Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add the following repository secrets:

| Secret Name | Value |
|-------------|-------|
| `SUPABASE_ACCESS_TOKEN` | Your generated access token from step 1 |
| `SUPABASE_PROJECT_REF` | Your project reference ID from step 2 |
| `SUPABASE_DB_PASSWORD` | Your database password (from project creation) |

### 4. Verify Existing Secrets

Ensure these secrets already exist (for existing deployments):
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### 5. Test the Integration

1. Create a test migration:
   ```bash
   # Create a no-op migration for testing
   supabase migration new test_ci_integration
   ```

2. Add harmless content to the migration file:
   ```sql
   -- Test migration for CI integration
   -- This migration does nothing and can be safely deleted
   SELECT 1;
   ```

3. Create a PR, merge to main, and observe:
   - The `migrate` job runs after `e2e` tests pass
   - The `deploy-production` job waits for `migrate` to complete
   - Migration output shows in the job logs

4. **Clean up**: After verification, you can remove the test migration or keep it as documentation.

## Verification Checklist

After merging the workflow changes:

- [ ] `migrate` job appears in GitHub Actions workflow
- [ ] Job runs only on pushes to `main` (not on PRs)
- [ ] Supabase CLI version is pinned (not `latest`)
- [ ] No credentials visible in logs
- [ ] `deploy-production` waits for `migrate` to complete
- [ ] Pipeline fails if migration has errors

## Troubleshooting

### "Authentication failed" error
- Verify `SUPABASE_ACCESS_TOKEN` is correct and not expired
- Ensure token has sufficient permissions

### "Project not found" error
- Verify `SUPABASE_PROJECT_REF` matches your project
- Check you're using the Reference ID, not the project name

### Migration timeout
- Check migration complexity
- Consider breaking large migrations into smaller files
- Hard timeout is 10 minutes (FR-014)

### Concurrent migration failures
- The concurrency group serializes migrations
- If a migration is queued, check GitHub Actions for pending runs

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflow                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐   ┌────────┐   ┌─────┐                             │
│  │ quality │──▶│ visual │──▶│ e2e │                             │
│  └─────────┘   └────────┘   └──┬──┘                             │
│                                │                                 │
│                    ┌───────────┴───────────┐                     │
│                    │                       │                     │
│                    ▼                       ▼                     │
│  (PR only)  ┌──────────────┐     ┌─────────────┐  (main only)   │
│             │deploy-preview│     │   migrate   │                │
│             └──────────────┘     └──────┬──────┘                │
│                                         │                        │
│                                         ▼                        │
│                                ┌─────────────────┐               │
│                                │deploy-production│               │
│                                └─────────────────┘               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Related Files

- `.github/workflows/ci.yml` - Main workflow file (to be modified)
- `supabase/migrations/` - Migration files (existing)
- `specs/022-ci-db-migrations/research.md` - Research findings

