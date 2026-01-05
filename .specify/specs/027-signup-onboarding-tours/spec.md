# Feature Specification: Self-Serve Signup, Onboarding & Tours

**Feature Branch**: `027-signup-onboarding-tours`  
**Created**: 2026-01-04  
**Status**: Draft  
**Input**: User description: "Self-serve Magic Link signup + onboarding wizard + first-time page tours"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified Magic Link sign-in/sign-up (Priority: P1)

A visitor enters their email on the login screen and requests a Magic Link. Clicking the link authenticates them. The same flow works for both existing users and brand-new registrations, without revealing whether the email already exists.

**Why this priority**: This unlocks self-serve acquisition while preserving privacy and avoiding email enumeration.

**Independent Test**: From a logged-out state, request a Magic Link with (a) a known existing email and (b) a brand-new email; in both cases, complete the link flow and reach the app without the login UI ever confirming account existence.

**Acceptance Scenarios**:

1. **Given** a logged-out visitor enters any email and requests a Magic Link, **When** the request completes, **Then** they see the same generic success state regardless of whether the email is new or existing.
2. **Given** a visitor clicks a valid Magic Link, **When** authentication completes, **Then** they are signed in and redirected into the app.
3. **Given** a visitor clicks an expired or invalid Magic Link, **When** the app processes it, **Then** they see a clear recovery path to request a new link (without revealing account existence).

---

### User Story 2 - No “orphaned” first login (Priority: P1)

After a brand-new user completes authentication, the system ensures they have a usable, data-isolated group context so the app can load group-scoped data immediately and safely.

**Why this priority**: Without guaranteed group membership, new registrations can land in an unusable state (errors/blank screens), which destroys time-to-value.

**Independent Test**: Use a never-before-seen email to complete the Magic Link flow, then refresh and navigate across core pages; the app should never error due to missing group/profile membership.

**Acceptance Scenarios**:

1. **Given** a user signs in for the first time, **When** they land in the app, **Then** they have membership in exactly one data-isolated group and group-scoped pages load without “missing membership/profile” errors.
2. **Given** group/profile provisioning fails, **When** the user lands in the app, **Then** they see a recoverable error state with actions to retry, sign out, and get help (no dead-end session).
3. **Given** a user refreshes immediately after first login, **When** the app reloads, **Then** it still resolves the same valid group context and remains usable.

---

### User Story 3 - First-run onboarding wizard to reach first projection (Priority: P2)

When the user’s current group is not yet configured with the minimum data required for a projection, the app shows a skippable onboarding wizard. The wizard helps the user quickly create initial financial data: profile/group naming, at least one bank account, at least one income source, at least one expense, and an optional credit card.

**Why this priority**: Reduces “blank slate” friction and shortens time-to-value (cashflow projection).

**Independent Test**: Log in as a new user with an unconfigured group, complete the onboarding steps, then confirm the dashboard can show a projection. Refresh mid-wizard and confirm progress is retained.

**Acceptance Scenarios**:

1. **Given** a signed-in user’s group does not meet minimum setup, **When** they enter the app, **Then** the onboarding wizard is offered automatically and can be skipped at any time.
2. **Given** the user leaves or refreshes mid-onboarding, **When** they return, **Then** they can resume where they left off (progress retained).
3. **Given** the user completes onboarding with the minimum dataset, **When** they open the dashboard, **Then** they can see a cashflow projection without needing to hunt for additional required setup screens.
4. **Given** the user skips required setup, **When** they navigate the app, **Then** they are not blocked but see clear CTAs to continue setup from relevant empty states.

---

### User Story 4 - First-time page tours (coachmarks) (Priority: P2)

When a user visits certain key pages for the first time (e.g., Dashboard, Manage, History), the app offers a short guided tour highlighting important UI elements. The tour is navigable (Next/Back) and dismissible (Skip/Close). Completed/dismissed tours do not auto-show again, but can be replayed intentionally.

**Why this priority**: Helps users build a mental model of the product faster and reduces “where do I click?” confusion.

**Independent Test**: Visit a target page for the first time and complete/skip the tour; revisit the same page to confirm it does not auto-show; trigger the tour again via an explicit “Show tour” action.

**Acceptance Scenarios**:

1. **Given** a user opens a target page for the first time, **When** the page renders, **Then** the tour is shown automatically (or offered immediately) and can be navigated with Next/Back or dismissed.
2. **Given** a user completes or dismisses a page tour, **When** they revisit that page, **Then** the tour does not auto-show again.
3. **Given** the user chooses “Show tour” intentionally, **When** they trigger it, **Then** the tour runs again regardless of prior completion state.
4. **Given** a tour step’s target element is not present due to responsive layout or conditional UI, **When** the tour runs, **Then** it gracefully skips or adapts without breaking the tour flow.

---

### Edge Cases

- Magic Link is expired/invalid → show a clear recovery action to request a new link
- First-login provisioning partially succeeds (user exists but group membership missing) → self-heal on next app load or show recoverable error with retry
- Multiple group members → onboarding/tour auto-show behavior should not repeatedly interrupt each person
- User skips onboarding and later wants to complete setup → clear re-entry points and progress continuity
- Responsive layouts hide tour targets → tour skips/reorders steps safely
- User signs in on a second device → onboarding/tour completion state should behave consistently for the same user

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & registration:**

- **FR-001**: The system MUST support passwordless email Magic Link authentication as the only sign-in method within this scope.
- **FR-002**: The login experience MUST support both sign-in and account creation using the same email + Magic Link flow.
- **FR-003**: After submitting an email for a Magic Link, the UI MUST show a generic confirmation state that does not reveal whether the email is already registered (no email enumeration).
- **FR-004**: Any restrictions that prevent a user from continuing (if they exist) MUST NOT be communicated on the login screen in a way that reveals account existence.
- **FR-005**: When a Magic Link is expired or invalid, the user MUST see a clear path to request a new link.

**Group membership on first login:**

- **FR-006**: After first successful authentication for a brand-new user, the system MUST ensure the user has a valid profile and membership in exactly one data-isolated group before loading group-scoped pages.
- **FR-007**: For self-serve sign-ups, the system MUST create a brand-new group for the new user (joining existing groups via invitation is out of scope for this feature).
- **FR-008**: If group/profile provisioning fails, the app MUST present a recoverable error state that does not leave the user in an unusable session (retry + sign out + help).

**Onboarding wizard:**

- **FR-009**: The app MUST define “minimum setup complete” as: at least 1 bank account, at least 1 income source, and at least 1 expense in the current group. Credit cards are optional.
- **FR-010**: If minimum setup is not complete, the app MUST automatically offer a first-run onboarding wizard that is skippable and does not block navigation.
- **FR-011**: The onboarding wizard MUST retain progress across refreshes and allow the user to resume later.
- **FR-012**: The onboarding wizard MUST guide the user through creating: display name (optional), group name (optional), first bank account, at least one income source, at least one expense, and optionally a credit card (or explicitly skip credit cards).
- **FR-013**: If the user skips onboarding before minimum setup is complete, the app MUST still function and MUST provide clear CTAs to continue setup from relevant empty states and/or a dedicated “Continue setup” entry point.

**Page tours (coachmarks):**

- **FR-014**: The system MUST provide first-time page tours for the agreed set of key pages (at minimum: Dashboard, Manage, History).
- **FR-015**: Page tours MUST support Next, Back, and Skip/Close actions, and MUST not permanently block core actions.
- **FR-016**: Page tours MUST auto-show at most once per user per page (unless the user intentionally replays them).
- **FR-017**: Tours MUST persist completion/dismissal state so users are not repeatedly interrupted across sessions/devices.
- **FR-018**: Tours MUST gracefully handle missing targets due to responsive layout or conditional UI (skip/adapt without breaking).

**Copy & environments:**

- **FR-019**: All user-facing copy introduced by this feature MUST be in Brazilian Portuguese (pt-BR).
- **FR-020**: Existing development/preview authentication bypass behavior MUST remain available and should not be blocked by onboarding/tour UX.

**Acceptance coverage (traceability):**

- User Story 1 acceptance scenarios cover **FR-001** through **FR-005**
- User Story 2 acceptance scenarios cover **FR-006** through **FR-008**
- User Story 3 acceptance scenarios cover **FR-009** through **FR-013**
- User Story 4 acceptance scenarios cover **FR-014** through **FR-018**
- **FR-019** and **FR-020** are cross-cutting requirements validated throughout the experience

### Key Entities *(include if feature involves data)*

- **User**: A person identified by their email address who can authenticate via Magic Link.
- **Group**: A data-isolated container for a household’s financial data (accounts, incomes, expenses, credit cards).
- **Membership**: A link between a user and a group that determines which group data they can access.
- **Onboarding State**: Per-user (and group-aware) state that stores whether onboarding is in progress, completed, or dismissed, plus step progress.
- **Tour State**: Per-user state that stores, for each target page tour, whether it is not-started, completed, or dismissed (and the tour version).
- **Bank Account**: A group-scoped financial account (e.g., checking) needed as a base for cashflow.
- **Income Source**: A recurring or one-off inflow definition used in projections.
- **Expense**: A recurring or one-off outflow definition used in projections.
- **Credit Card**: An optional group-scoped liability used in projections and cashflow awareness.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can complete self-serve registration (email → Magic Link → authenticated app load) without support in under 3 minutes median time (excluding email delivery latency).
- **SC-002**: In a usability test, at least 90% of new users who start onboarding reach a visible cashflow projection on the dashboard within 5 minutes of first app load.
- **SC-003**: Login submission responses are indistinguishable to the user (same UI state + copy) for new vs existing emails, preventing email enumeration via the login experience.
- **SC-004**: Onboarding progress persists across refresh: users resume at the same step after a reload in 100% of tested cases.
- **SC-005**: Each page tour auto-shows at most once per user per page, and can be replayed intentionally on demand.

## Assumptions & Scope Notes

- Self-serve registration is fully open in this scope (no invite codes/allowlist gating).
- New self-serve sign-ups create a brand-new group by default; joining an existing group is explicitly out of scope here.
- Onboarding auto-show is driven by group readiness (minimum setup) and should not repeatedly interrupt the same user once dismissed/completed.
- Tour completion is tracked per user (preferred for multi-member groups) and applies consistently across devices for the same signed-in user.
- Dependencies: the product continues to support Magic Link email delivery, a group-based data isolation model, and persistent per-user state for onboarding/tour completion.
