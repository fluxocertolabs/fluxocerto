# Feature Specification: Invite-Only Magic Link Authentication

**Feature Branch**: `010-invite-auth`  
**Created**: 2025-11-27  
**Status**: Draft  
**Input**: User description: "Implement invite-only authentication for Family Finance using Supabase Magic Link (passwordless email login)."

## Context

Family Finance currently uses Supabase anonymous authentication (implemented in spec 008-supabase-migration). This means:

- Any visitor gets an anonymous session automatically
- Data is isolated per anonymous user via `user_id` column and RLS policies
- There's no way to access the same data from multiple devices/browsers

This spec transitions to invite-only Magic Link authentication where:

- Only pre-approved email addresses can access the app
- All authenticated family members share the same financial data (no per-user isolation)
- Users authenticate via passwordless email links (free on Supabase, no passwords to remember)

## User Scenarios & Testing

### User Story 1 - Magic Link Login (Priority: P1)

A family member visits the app, enters their email address, receives a login link via email, and clicks it to authenticate. The process is passwordless and straightforward.

**Why this priority**: Without the core authentication flow working, no one can access the app. This is the foundational capability.

**Independent Test**: Enter a pre-approved email on the login page, receive the Magic Link email, click the link, and verify successful authentication with access to the dashboard.

**Acceptance Scenarios**:

1. **Given** a user with an approved email visits the app, **When** they enter their email and click "Send Magic Link", **Then** they see a success message: "Check your email for the login link"
2. **Given** a user receives a Magic Link email, **When** they click the link within 1 hour, **Then** they are authenticated and redirected to the dashboard
3. **Given** a user is authenticated, **When** they refresh the browser, **Then** they remain logged in (session persists)

---

### User Story 2 - Invite-Only Access Control (Priority: P1)

Only family members whose email addresses have been pre-approved by an administrator can create accounts. Unauthorized users receive a clear rejection message.

**Why this priority**: The invite-only restriction is a core security requirement. Without it, anyone could sign up and potentially access family financial data.

**Independent Test**: Attempt to sign up with a non-approved email and verify the rejection message appears.

**Acceptance Scenarios**:

1. **Given** a user with a non-approved email enters their address, **When** they attempt to sign up, **Then** they see the error: "Access is invite-only. Please contact the family administrator."
2. **Given** an administrator adds an email to the allowed list via Supabase dashboard, **When** that user attempts to sign up, **Then** they can successfully receive a Magic Link
3. **Given** an administrator removes an email from the allowed list, **When** that user's session expires and they try to log in again, **Then** they are blocked with the invite-only error

---

### User Story 3 - Shared Family Data Access (Priority: P1)

All authenticated family members can view and edit the same financial data. There is no per-user data isolation - everyone sees the household's accounts, expenses, projects, and credit cards.

**Why this priority**: The entire purpose of switching from anonymous auth is to enable family-wide data sharing. This is essential for the app's collaborative use case.

**Independent Test**: Two family members log in from different devices, one adds an expense, and the other sees it appear in real-time.

**Acceptance Scenarios**:

1. **Given** two family members are logged in, **When** one adds a bank account, **Then** the other sees the new account immediately
2. **Given** a family member updates a credit card balance, **When** another family member views the dashboard, **Then** they see the updated balance
3. **Given** all family financial data exists in the system, **When** any authenticated user opens the app, **Then** they see all data regardless of who created it

---

### User Story 4 - Sign Out (Priority: P2)

Users can sign out of the application, which clears their session and returns them to the login page.

**Why this priority**: Sign-out is a standard security feature, but secondary to the core authentication flow.

**Independent Test**: Click the sign-out button and verify redirection to the login page with session cleared.

**Acceptance Scenarios**:

1. **Given** a user is authenticated, **When** they click the sign-out button in the header, **Then** they are redirected to the login page
2. **Given** a user has signed out, **When** they try to navigate directly to the dashboard, **Then** they are redirected to the login page

---

### User Story 5 - Authentication Error Handling (Priority: P2)

Users receive clear, actionable feedback when authentication issues occur (expired links, rate limiting, network errors).

**Why this priority**: Good error handling improves user experience but is secondary to core functionality.

**Independent Test**: Use an expired Magic Link and verify the appropriate error message appears.

**Acceptance Scenarios**:

1. **Given** a user clicks a Magic Link older than 1 hour, **When** the app processes the link, **Then** they see: "This link has expired. Please request a new one." with a button to return to login
2. **Given** a user requests too many Magic Links in quick succession, **When** rate limiting kicks in, **Then** they see: "Too many requests. Please wait a few minutes and try again."
3. **Given** the network is unavailable, **When** a user tries to request a Magic Link, **Then** they see: "Unable to connect. Please check your internet connection."

---

### Edge Cases

- What happens when a Magic Link is clicked after 1 hour? → Show "This link has expired. Please request a new one." with a link back to login page
- What happens when a user requests multiple Magic Links? → Only the most recent link is valid; older links are invalidated
- What happens when rate limiting is triggered? → Show "Too many requests. Please wait a few minutes and try again."
- What happens when the user's browser doesn't support the auth callback? → Show generic error with instructions to try a different browser
- What happens when an authenticated user's session expires? → Redirect to login page on next navigation/action
- What happens when the allowed_emails table is empty? → No one can sign up; this is intentional (admin must add at least one email first)

## Requirements

### Functional Requirements

**Authentication Method:**

- **FR-001**: System MUST use Supabase Magic Link (OTP via email) as the sole authentication method
- **FR-002**: System MUST NOT require or store passwords
- **FR-003**: Magic Links MUST expire after 1 hour (Supabase default)
- **FR-004**: System MUST persist user sessions across browser refreshes using Supabase session storage

**Invite-Only Access Control:**

- **FR-005**: System MUST maintain an `allowed_emails` table containing pre-approved email addresses
- **FR-006**: System MUST use a Supabase `before-user-created` database hook to validate email addresses during signup
- **FR-007**: The hook MUST reject signup attempts for emails NOT in the `allowed_emails` table
- **FR-008**: Rejected users MUST see the message: "Access is invite-only. Please contact the family administrator."
- **FR-009**: Administrators MUST be able to manage the allowed emails list via Supabase dashboard (no in-app admin UI required)

**Shared Family Data:**

- **FR-010**: System MUST remove the `user_id` column from all data tables (accounts, projects, expenses, credit_cards)
- **FR-011**: RLS policies MUST allow all authenticated users to read all data
- **FR-012**: RLS policies MUST allow all authenticated users to write (insert/update/delete) all data
- **FR-013**: Real-time subscriptions MUST NOT filter by user_id (all authenticated users receive all changes)

**Out of Scope:**

- Ownership/audit tracking (created_by, updated_by fields) - not required for single-family use
- Change history or audit logs - not required for this feature

**User Interface:**

- **FR-014**: System MUST provide a `/login` page with email input and "Send Magic Link" button
- **FR-015**: System MUST handle Magic Link callbacks at `/auth/confirm` route
- **FR-016**: System MUST redirect unauthenticated users to `/login` when accessing protected routes
- **FR-017**: System MUST display a sign-out button in the application header
- **FR-018**: System MUST show toast notifications for authentication success, errors, and status messages

**Cleanup:**

- **FR-019**: System MUST disable anonymous authentication in Supabase project settings
- **FR-020**: System MUST remove anonymous auth initialization code from the application

### Key Entities

- **allowed_emails**: Table storing pre-approved email addresses for invite-only access. Contains: id (UUID primary key), email (text, unique, case-insensitive), created_at (timestamp), created_by (text, optional - for audit purposes)

- **User Session**: Managed by Supabase Auth. Contains: user id, email, session token, expiration. Persisted in browser storage.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users with approved emails can complete the full login flow (request link → receive email → click link → access app) in under 2 minutes
- **SC-002**: Users with non-approved emails are blocked within 3 seconds of attempting signup, with clear error message
- **SC-003**: All authenticated family members see identical data when viewing the same screen
- **SC-004**: Session persists across browser refresh without requiring re-authentication
- **SC-005**: Sign-out completes and redirects to login page within 1 second
- **SC-006**: 100% of authentication errors display user-friendly messages (no raw error codes shown to users)

## Assumptions

- Supabase Magic Link emails are delivered reliably (depends on Supabase email provider)
- Users have access to the email address they're signing up with
- At least one email will be added to `allowed_emails` before the feature goes live
- Family administrator has access to Supabase dashboard for managing allowed emails
- Supabase free tier supports the `before-user-created` hook functionality

## Data Migration Strategy

**Existing Anonymous User Data**: This is a single-family app with one household's data. The migration approach is:

1. **Before deployment**: Administrator backs up any existing data via Supabase dashboard export
2. **Data handling**: Existing anonymous user data will be abandoned (user_id column removed from tables)
3. **Fresh start**: After migration, the first authenticated family member re-enters the household's financial data
4. **Rationale**: This is acceptable because:
   - Single-family use means only one household's data exists
   - The family administrator controls the migration timing
   - Re-entering data is simpler than complex migration scripts for a small dataset

**Acceptance Test**: After deployment, verify that authenticated users can create new data and all family members see the same shared data.
