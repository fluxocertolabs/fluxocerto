# Data Model: CI Database Migrations

**Feature**: 022-ci-db-migrations  
**Date**: 2025-12-02

## Not Applicable

This feature is a **CI/CD infrastructure change** that does not introduce any new data entities or modify the existing database schema.

### Rationale

- The feature adds a GitHub Actions workflow job to apply *existing* migrations
- No new tables, columns, or relationships are created
- The migration mechanism itself (`supabase db push`) uses Supabase's built-in migration tracking

### Existing Entities (Unchanged)

The migrations applied by this CI job are the existing files in `supabase/migrations/`:

| Migration | Description |
|-----------|-------------|
| 001_initial_schema.sql | Core schema + RLS policies |
| 002_invite_auth.sql | Invite-only authentication |
| 003_single_shot_expenses.sql | One-time expenses |
| 004_user_preferences.sql | User preferences |
| 005_account_owner.sql | Account ownership tracking |
| 006_populate_profile_names.sql | Profile name population |
| 007_cleanup_profiles.sql | Profile cleanup |
| 008_single_shot_income.sql | Single-shot income |
| 009_households.sql | Household support |

### Migration Tracking

Supabase CLI maintains migration history in the `supabase_migrations` schema, which is managed automatically and requires no application-level modeling.

