# Auth Provisioning Contract

**Feature**: 027-signup-onboarding-tours  
**Type**: DB invariant + client recovery contract  
**Scope**: Prevent “orphaned first login” (spec FR-006–FR-008)

## Goal (Invariant)

After a user successfully authenticates via Magic Link, the system must guarantee:

- The user has membership in **exactly one data-isolated group** (for self-serve signups).
- Group-scoped pages can load immediately without “missing membership/profile” errors.

In this codebase, group membership is anchored by:

- `profiles.email` (matches auth JWT email)
- `profiles.group_id` (used by `get_user_group_id()` for RLS)

## Database Contract

### Function: `ensure_current_user_group()`

**Type**: SQL function (exposed via `rpc`)  
**Security**: `SECURITY DEFINER` (runs with elevated DB privileges, but must enforce auth checks)  
**Idempotency**: MUST be safe to call multiple times

**Inputs**: none (uses `auth.uid()` and `auth.jwt()` context)  
**Returns** (suggested): `{ group_id uuid, created boolean }`

**Behavior**:

1. Read `email` from JWT (must be present and non-empty).
2. If a `profiles` row exists for that email:
   - Ensure its `group_id` references a real `groups` row (create group only if missing).
   - Return the existing `group_id`.
3. If no `profiles` row exists for that email (self-serve first login):
   - Create a new `groups` row with deterministic `id = auth.uid()` (self-serve invariant: one group per user).
   - Insert a new `profiles` row:
     - `id = auth.uid()` (recommended for new users; legacy profiles may differ)
     - `email = lower(email)`
     - `group_id = auth.uid()`
     - `name` derived from email prefix (best-effort; user can change via onboarding)
   - Return `group_id = auth.uid()`.

**Failure modes**:

- If email is missing in JWT → raise a clear error (client shows recoverable state with retry/sign-out).
- If insert fails due to constraint/race → function must remain idempotent and return the canonical group.

### Trigger: `on_auth_user_created`

Create a trigger on `auth.users` that calls the provisioning logic on insert.

**Notes**:

- Trigger is best-effort; client must still be able to call `ensure_current_user_group()` for recovery.
- Trigger must not leak PII in logs.

## Client Contract

### When to call provisioning

- **Auth callback** (`/auth/confirm`): after `getSession()` returns a valid session, call `rpc('ensure_current_user_group')` before redirecting into the authenticated app.
- **Recoverable error path**: if group-scoped queries fail due to missing membership, present a screen with:
  - **Retry provisioning**: calls the same RPC
  - **Sign out**
  - **Get help** (support link/copy per product conventions)

### Success criteria

- Fresh email signup → immediately lands in app without orphan errors (User Story 2).
- Immediate refresh after first login → app remains usable (User Story 2).


