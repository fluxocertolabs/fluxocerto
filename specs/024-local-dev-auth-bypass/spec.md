# Feature Specification: Local Development Auth Bypass

**Feature Branch**: `024-local-dev-auth-bypass`  
**Created**: 2025-12-03  
**Status**: Draft  
**Input**: User description: "Implement a Local Development Auth Bypass feature to allow the application to run locally without requiring manual login steps, facilitating automated testing by AI agents."

## Clarifications

### Session 2025-12-03

- Q: How should developers execute the token generation script? → A: `pnpm run gen:token` - Add script to package.json using `tsx` runner.
- Q: Should the script create seed data for RLS testing? → A: Yes, create minimal seed data (1 household, 1 account) for immediate RLS verification.
- Q: What should happen if setSession() fails in dev mode? → A: Fall back to normal login form with error toast explaining bypass failure.
- Q: What level of console output should the script provide? → A: Verbose step-by-step progress (e.g., "Creating user...", "Generating tokens...", "✓ Done").

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated Testing Session Initialization (Priority: P1)

An AI agent or developer runs the local Supabase instance and wants to immediately access the authenticated application without manual login steps. They execute a setup script once, which generates valid session tokens. These tokens are stored as environment variables and automatically authenticate the user when the app starts.

**Why this priority**: This is the core feature that enables automated testing by AI agents. Without automatic session initialization, AI agents cannot interact with the application's authenticated features, blocking all downstream testing capabilities.

**Independent Test**: Can be fully tested by running the token generation script, setting environment variables, and launching the app - verifying the dashboard appears immediately without login screen.

**Acceptance Scenarios**:

1. **Given** a local Supabase instance is running and environment variables are not set, **When** developer runs the token generation script, **Then** the script outputs valid `VITE_DEV_ACCESS_TOKEN` and `VITE_DEV_REFRESH_TOKEN` values.

2. **Given** the dev tokens are set in environment variables and local Supabase is running, **When** developer starts the frontend in DEV mode, **Then** the application renders the authenticated dashboard immediately without showing the login screen.

3. **Given** the dev tokens are set in environment variables, **When** developer runs in PRODUCTION mode, **Then** the auth bypass is ignored and normal authentication flow applies.

---

### User Story 2 - Dev User Management (Priority: P2)

The token generation script ensures a dedicated development user (`dev@local`) exists and is properly configured to access the application. If the user doesn't exist, it creates them automatically.

**Why this priority**: The dev user is a prerequisite for token generation, but once created it persists across sessions, making this a one-time setup concern.

**Independent Test**: Can be tested by running the script on a fresh Supabase instance and verifying user creation, then running again to verify idempotency.

**Acceptance Scenarios**:

1. **Given** no `dev@local` user exists in the local Supabase instance, **When** the token generation script runs, **Then** a new user with email `dev@local` is created and confirmed.

2. **Given** `dev@local` user already exists, **When** the token generation script runs, **Then** the script uses the existing user without creating a duplicate.

3. **Given** `dev@local` is not in the `allowed_emails` list, **When** the token generation script runs, **Then** the script adds `dev@local` to the allowed emails list.

---

### User Story 3 - RLS Policy Verification (Priority: P2)

The authenticated session created by the bypass must be a valid Supabase session that triggers Row Level Security policies normally. All database operations should respect RLS as if the user logged in manually.

**Why this priority**: This ensures tests are realistic and catch actual RLS-related bugs, maintaining the integrity of the testing environment.

**Independent Test**: Can be tested by performing database operations through the bypassed session and verifying RLS constraints are enforced.

**Acceptance Scenarios**:

1. **Given** an authenticated dev session via bypass, **When** the app queries the `accounts` table, **Then** only accounts belonging to the dev user's household are returned (RLS applied).

2. **Given** an authenticated dev session via bypass, **When** the app attempts to access data from another household, **Then** the request returns no results due to RLS policies.

---

### Edge Cases

- What happens when Supabase is not running? → Script fails with clear error message explaining Supabase must be started.
- What happens when Service Role Key is invalid? → Script fails with authentication error.
- What happens when tokens expire? → The Supabase client's built-in refresh mechanism handles token refresh automatically.
- What happens in CI/CD environments? → The bypass only activates in DEV mode, so production builds and CI builds are unaffected.
- What happens when `setSession()` fails in dev mode? → Frontend falls back to normal login form and displays an error toast explaining the bypass failure reason.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a script (`scripts/generate-dev-token.ts`) that generates valid Supabase session tokens for local development, executable via `pnpm run gen:token` (using `tsx` runner).
- **FR-002**: Script MUST connect to local Supabase using the Service Role Key from environment or `supabase status` output.
- **FR-003**: Script MUST ensure a `dev@local` user exists in the authentication system with email confirmed.
- **FR-004**: Script MUST ensure `dev@local` is present in the `allowed_emails` database table (if the table exists).
- **FR-004.1**: Script MUST create minimal seed data for the dev user if not present: one household linked to the user, and one sample account within that household, enabling immediate RLS verification.
- **FR-005**: Script MUST output tokens in a format suitable for copying to `.env` (e.g., `VITE_DEV_ACCESS_TOKEN=xxx`) and update `.env` automatically.
- **FR-005.1**: Script MUST provide verbose step-by-step console output indicating progress (e.g., "Creating user...", "Generating tokens...", "✓ Done").
- **FR-006**: Frontend MUST detect DEV mode (`import.meta.env.DEV`) and presence of `VITE_DEV_ACCESS_TOKEN` environment variable.
- **FR-007**: Frontend MUST call `supabase.auth.setSession()` with injected tokens BEFORE rendering the application.
- **FR-008**: Auth bypass MUST NOT activate in production builds regardless of environment variable presence.
- **FR-009**: Session injection MUST preserve full RLS functionality - the session must be indistinguishable from a manually authenticated session from the database's perspective.
- **FR-010**: Script MUST handle the case where `dev@local` user already exists without creating duplicates.
- **FR-011**: Frontend MUST gracefully handle `setSession()` failure by falling back to normal login form and displaying an error toast with the failure reason.

### Key Entities

- **Dev User**: A special user with email `dev@local` used exclusively for local development and testing.
- **Session Tokens**: Access Token (JWT) and Refresh Token pair that represent an authenticated Supabase session.
- **Allowed Emails**: Database table that controls which emails are permitted to authenticate with the application.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developer can go from `pnpm dev` to seeing authenticated dashboard in under 5 seconds (after initial setup).
- **SC-002**: AI agent can complete a full test cycle (view data, create record, verify persistence) without any manual authentication steps.
- **SC-003**: 100% of database queries through bypassed session respect RLS policies identically to manual login sessions.
- **SC-004**: Token generation script completes in under 10 seconds on first run (including user creation).
- **SC-005**: Zero additional configuration required beyond running the setup script once (which writes tokens to `.env`).

## Assumptions

- Local Supabase instance is accessible at `http://127.0.0.1:54321` (standard Supabase CLI default).
- The `allowed_emails` table exists and follows the current schema used by the invite system.
- Service Role Key is available from `supabase status` command or environment variables.
- The existing `initializeAuth()` function in `src/lib/supabase.ts` can be extended or bypassed for dev mode injection.
