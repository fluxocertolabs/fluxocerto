# Feature Specification: CI Database Migrations

**Feature Branch**: `022-ci-db-migrations`  
**Created**: 2025-12-02  
**Status**: Draft  
**Input**: User description: "Setup automatic database migrations for Supabase in the CI/CD pipeline"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated Production Migration on Merge (Priority: P1)

As a developer, when I merge a pull request to main that includes database schema changes, the database migrations are automatically applied to production before the application deploys, ensuring the database schema always matches the deployed code.

**Why this priority**: This is the core functionality that eliminates manual migration steps and prevents deployment gaps where code deploys but schema changes are missing.

**Independent Test**: Can be fully tested by merging a PR with a new migration file and observing that the production database schema is updated before the Vercel deployment completes.

**Acceptance Scenarios**:

1. **Given** a PR is merged to main containing new migration files in `supabase/migrations/`, **When** the CI pipeline runs, **Then** the migrations are applied to production Supabase before the deploy-production job begins.

2. **Given** a PR is merged to main with no new migrations, **When** the CI pipeline runs, **Then** the migrate job completes successfully (no-op) and deploy-production proceeds normally.

3. **Given** migrations are already applied to production, **When** the same migrations are run again, **Then** the migrate job completes successfully without errors (idempotent behavior).

---

### User Story 2 - Pipeline Failure on Migration Error (Priority: P1)

As a developer, when a migration fails to apply to production, the deployment is blocked to prevent deploying code that depends on missing schema changes.

**Why this priority**: Prevents broken deployments where application code expects schema changes that weren't applied, which would cause runtime errors.

**Independent Test**: Can be fully tested by introducing an intentionally invalid migration and observing that the pipeline fails before deployment.

**Acceptance Scenarios**:

1. **Given** a migration contains invalid syntax or conflicts with existing data, **When** the CI pipeline runs, **Then** the migrate job fails and the deploy-production job is skipped.

2. **Given** the migration job fails, **When** viewing the pipeline status, **Then** clear error messages indicate which migration failed and why.

---

### User Story 3 - Secure Credential Management (Priority: P1)

As a repository administrator, Supabase credentials are stored securely and never exposed in logs or code, ensuring production database access is protected.

**Why this priority**: Security is non-negotiable for production database access credentials.

**Independent Test**: Can be fully tested by auditing the workflow file to ensure secrets are used correctly and reviewing CI logs to confirm credentials are masked.

**Acceptance Scenarios**:

1. **Given** the migrate job runs, **When** viewing CI logs, **Then** no sensitive credentials (access tokens, project references) are visible in the output.

2. **Given** the workflow file is committed, **When** reviewing the code, **Then** credentials are referenced only via GitHub Secrets, not hardcoded values.

---

### User Story 4 - PR Validation Unchanged (Priority: P2)

As a developer opening a pull request, migration syntax is validated locally via the existing e2e test infrastructure (supabase start), without requiring production credentials or running against the production database.

**Why this priority**: Maintains existing PR validation behavior while adding production migration capability only on merge.

**Independent Test**: Can be fully tested by opening a PR with a syntactically invalid migration and observing that CI fails during e2e tests.

**Acceptance Scenarios**:

1. **Given** a PR is opened with migration changes, **When** the CI pipeline runs, **Then** migrations are validated against local Supabase (existing behavior preserved).

2. **Given** a PR is opened, **When** the CI pipeline runs, **Then** no production migrations are attempted (production migration only happens on merge to main).

---

### Edge Cases

- What happens when the Supabase service is temporarily unavailable during migration? The job should fail with a clear error and block deployment.
- What happens when a migration times out? The job should fail with a timeout error and block deployment.
- What happens when credentials are missing or invalid? The job should fail early with a clear "authentication failed" or "missing credentials" error.
- What happens when network connectivity to Supabase is interrupted mid-migration? The job should fail and report the partial state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Pipeline MUST include a "migrate" job that executes database migrations against the production Supabase project.

- **FR-002**: Migrate job MUST run only on push events to the main branch.

- **FR-003**: Migrate job MUST complete successfully before the deploy-production job can start.

- **FR-004**: Migrate job MUST depend on successful completion of quality, visual, and e2e test jobs.

- **FR-005**: Pipeline MUST fail entirely if the migrate job fails, preventing deployment of incompatible code.

- **FR-006**: Migrate job MUST use GitHub Secrets for Supabase authentication credentials (SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF).

- **FR-007**: Migrate job MUST NOT expose credentials in CI logs or outputs.

- **FR-008**: Pull request CI runs MUST NOT trigger production migrations (continue using local Supabase validation only).

- **FR-009**: Migrate job MUST provide clear error messages when migrations fail, including the specific migration file that failed.

- **FR-010**: Migrate job MUST be idempotent - running the same migrations multiple times should not cause errors.

### Key Entities

- **Migration File**: A SQL file in `supabase/migrations/` containing schema changes to be applied to the database. Each file has a timestamp-based name ensuring execution order.

- **GitHub Secret**: Encrypted credentials stored in repository settings, referenced by name in workflow files. Used for SUPABASE_ACCESS_TOKEN (authentication) and SUPABASE_PROJECT_REF (target project identifier).

- **Pipeline Job**: A unit of work in the CI/CD workflow with defined dependencies, conditions, and steps. Jobs can depend on other jobs and run conditionally.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Merging a PR with new migrations to main results in automatic schema updates to production with zero manual intervention.

- **SC-002**: Migration job completes within 5 minutes under normal conditions for typical schema changes.

- **SC-003**: 100% of migration failures block the corresponding deployment (no deployments proceed with failed migrations).

- **SC-004**: Zero credential exposure incidents - all secrets remain masked in CI logs.

- **SC-005**: Developers can trace migration failures to specific files and error messages within 30 seconds of reviewing CI logs.

- **SC-006**: Existing PR validation workflow continues to work unchanged - no disruption to current development flow.

## Assumptions

- The Supabase CLI `supabase db push` command is the correct method for applying migrations to production (based on existing local development setup).
- GitHub Actions secrets are the appropriate mechanism for storing production credentials in this project.
- The existing e2e tests adequately validate migration syntax by running `supabase start` with local migrations.
- Network connectivity between GitHub Actions runners and Supabase cloud is reliable.
- The production Supabase project is already configured and accessible via the CLI with the correct credentials.
