# Feature Specification: Self-Serve Signup, Onboarding & Tours

**Feature Branch**: `027-signup-onboarding-tours`  
**Created**: 2026-01-04  
**Status**: Draft  
**Input**: User description: "Self-serve Magic Link signup + onboarding wizard + first-time page tours"

## Clarifications

### Session 2026-01-04

- Q: After a user skips/dismisses the onboarding wizard before “minimum setup complete”, should the wizard auto-show again on later app loads? → A: Auto-show only once; after skip/dismiss it will not auto-show again, and the user continues via “Continuar configuração” / empty-state CTAs.
- Q: For first-time page tours on a user’s first visit to a target page, should the tour auto-start or only be offered? → A: Auto-start the tour on first visit (with Skip/Close always available).
- Q: If the onboarding wizard is being shown (because minimum setup isn’t complete), what should happen with page tours on those first visits? → A: Defer tours while the wizard is active; after the wizard is completed or dismissed, tours can auto-start on the next eligible page visit.
- Q: Which pages should have first-time tours in this feature’s scope? → A: Only Dashboard, Manage, History.
- Q: Where should onboarding state (progress + dismissed/completed) and tour state (per page completion/dismissal + version) be persisted? → A: Server-side (Supabase DB) per user (and group-aware for onboarding), shared across devices.
- Q: In the recoverable provisioning error state (“Tentar novamente / Sair / Ajuda”), what does “Ajuda” do? → A: Opens an in-app help dialog with troubleshooting steps and a “Copiar detalhes” action that copies diagnostic details to the clipboard. Minimum requirements:
  - Troubleshooting content (pt-BR): short, actionable steps (e.g., verify connection, refresh, try again, sign out/in) plus guidance to share copied details with support.
  - Copied diagnostic payload: includes at least an error `message`, error `code` (when available), current route, timestamp (ISO), and the authenticated `user_id` (and `group_id` if known).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified Magic Link sign-in/sign-up (Priority: P1)

A visitor enters their email on the login screen and requests a Magic Link. Clicking the link authenticates them. The same flow works for both existing users and brand-new registrations, without revealing whether the email already exists.

**Why this priority**: This unlocks self-serve acquisition while preserving privacy and avoiding email enumeration.

**Independent Test**: From a logged-out state, request a Magic Link with (a) a known existing email and (b) a brand-new email; in both cases, complete the link flow and reach the app without the login UI ever confirming account existence.

**Acceptance Scenarios**:

1. **Given** a logged-out visitor enters any email and requests a Magic Link, **When** the request completes, **Then** they see the same generic success state regardless of whether the email is new or existing.
2. **Given** a visitor clicks a valid Magic Link, **When** authentication completes, **Then** they are signed in and redirected into the app.
3. **Given** a visitor clicks an expired or invalid Magic Link, **When** the app processes it, **Then** they see a pt-BR error state (e.g., “Link inválido ou expirado”) with a primary action like “Solicitar novo link” that returns them to the login screen to request a new Magic Link (without revealing account existence).

---

### User Story 2 - No “orphaned” first login (Priority: P1)

After a brand-new user completes authentication, the system ensures they have a usable, data-isolated group context so the app can load group-scoped data immediately and safely.

**Why this priority**: Without guaranteed group membership, new registrations can land in an unusable state (errors/blank screens), which destroys time-to-value.

**Independent Test**: Use a never-before-seen email to complete the Magic Link flow, then refresh and navigate across core pages; the app should never error due to missing group/profile membership.

**Acceptance Scenarios**:

1. **Given** a user signs in for the first time, **When** they land in the app, **Then** they have membership in exactly one data-isolated group and group-scoped pages load without “missing membership/profile” errors.
2. **Given** group/profile provisioning fails, **When** the user lands in the app, **Then** they see a recoverable error state with actions “Tentar novamente”, “Sair”, and “Ajuda”. “Ajuda” opens an in-app dialog (pt-BR) with troubleshooting steps and a “Copiar detalhes” action to copy diagnostic details — no dead-end session.
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
4. **Given** the user skips required setup, **When** they navigate the app, **Then** they are not blocked, the onboarding wizard does not auto-show again, and they see clear CTAs to “Continuar configuração” from relevant empty states.

---

### User Story 4 - First-time page tours (coachmarks) (Priority: P2)

When a user visits the in-scope key pages for the first time (Dashboard, Manage, History), the app auto-starts a short guided tour highlighting important UI elements (unless the onboarding wizard is active, in which case tours are deferred until onboarding is completed or dismissed). The tour is navigable (Next/Back) and dismissible (Skip/Close). Completed/dismissed tours do not auto-show again, but can be replayed intentionally.

**Why this priority**: Helps users build a mental model of the product faster and reduces “where do I click?” confusion.

**Independent Test**: Visit a target page for the first time and complete/skip the tour; revisit the same page to confirm it does not auto-show; trigger the tour again via an explicit “Mostrar tour” action.

**Acceptance Scenarios**:

1. **Given** a user opens a target page for the first time and the onboarding wizard is not currently active, **When** the page renders, **Then** the tour auto-starts and can be navigated with Next/Back or dismissed.
2. **Given** a user completes or dismisses a page tour, **When** they revisit that page, **Then** the tour does not auto-show again.
3. **Given** the user chooses “Mostrar tour” intentionally, **When** they trigger it, **Then** the tour runs again regardless of prior completion state.
4. **Given** a tour step’s target element is not present due to responsive layout or conditional UI, **When** the tour runs, **Then** it gracefully skips or adapts without breaking the tour flow.
5. **Given** the onboarding wizard is currently active, **When** a user opens a target page for the first time, **Then** the page tour does not auto-start and is deferred until onboarding is completed or dismissed.

---

### Edge Cases

- Magic Link is expired/invalid → show a clear recovery action to request a new link
- First-login provisioning partially succeeds (user exists but group membership missing) → self-heal on next app load or show recoverable error with “Tentar novamente” / “Sair” / “Ajuda”
- Multiple group members → onboarding/tour auto-show behavior should not repeatedly interrupt each person
- User skips onboarding and later wants to complete setup → clear re-entry points and progress continuity
- Onboarding wizard is active → page tours are deferred (no overlapping overlays) until onboarding is completed or dismissed
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
- **FR-008**: If group/profile provisioning fails, the app MUST present a recoverable error state that does not leave the user in an unusable session (“Tentar novamente” + “Sair” + “Ajuda”, with “Copiar detalhes” available from Ajuda).

**Onboarding wizard:**

- **FR-009**: The app MUST define “minimum setup complete” as: at least 1 bank account, at least 1 income source, and at least 1 expense in the current group. Credit cards are optional.
- **FR-010**: If minimum setup is not complete, the app MUST automatically offer a first-run onboarding wizard that is skippable, does not block navigation, and auto-shows at most once per user per group (it MUST NOT auto-show again after being skipped/dismissed).
- **FR-011**: The onboarding wizard MUST retain progress across refreshes and allow the user to resume later, with state persisted server-side (Supabase DB). Persisted state MUST include (at minimum) the wizard `status` and `current_step`, and dismissing/skipping MUST preserve progress for later manual resume (and remain consistent across sessions/devices for the same user, group-aware).
- **FR-012**: The onboarding wizard MUST guide the user through creating: display name (optional), group name (optional), first bank account, at least one income source, at least one expense, and optionally a credit card (or explicitly skip credit cards).
- **FR-013**: If the user skips onboarding before minimum setup is complete, the app MUST still function and MUST provide clear CTAs to continue setup from relevant empty states and/or a dedicated “Continuar configuração” entry point (and the wizard MUST remain accessible via those entry points).

**Page tours (coachmarks):**

- **FR-014**: The system MUST provide first-time page tours for the in-scope key pages: Dashboard, Manage, History (additional page tours are out of scope for this feature).
- **FR-015**: Page tours MUST support Next, Back, and Skip/Close actions, and MUST not permanently block core actions.
- **FR-016**: Page tours MUST auto-show at most once per user per page **per tour version** (unless the user intentionally replays them) and MUST be deferred while the onboarding wizard is active; after onboarding is completed or dismissed, tours can auto-start on the next eligible page visit.
- **FR-017**: Tours MUST persist completion/dismissal state server-side (Supabase DB), including a `version` field, so users are not repeatedly interrupted across sessions/devices; if a tour’s version increases, the updated tour becomes eligible to auto-show again once.
- **FR-018**: Tours MUST gracefully handle missing targets due to responsive layout or conditional UI (skip/adapt without breaking).

**Copy & environments:**

- **FR-019**: All user-facing copy introduced by this feature MUST be in Brazilian Portuguese (pt-BR).
- **FR-020**: Existing development/preview authentication bypass behavior MUST remain available and should not be blocked by onboarding/tour UX.

### Non-Functional Requirements

- **NFR-001 (Privacy)**: The login experience MUST not allow email enumeration across the full flow (requesting a Magic Link, handling restrictions, and recovering from invalid/expired links). User-visible states and copy MUST remain generic and MUST NOT differ based on whether an email is registered.
- **NFR-002 (Reliability)**: Brand-new self-serve users MUST not land in a dead-end “missing group/profile” state; failures MUST be recoverable (“Tentar novamente” + “Sair” + “Ajuda”).
- **NFR-003 (Cross-device consistency)**: Onboarding and tour state MUST behave consistently across devices/browsers for the same signed-in user (server-side persistence is the source of truth).
- **NFR-004 (Overlay coordination)**: Onboarding wizard and page tours MUST never overlap; tours are deferred while the wizard is active.
- **NFR-005 (Performance)**: On initial authenticated app load, onboarding + tours MUST add at most ~2 small Supabase reads beyond existing baseline group/finance reads (≤1 for onboarding state + ≤1 for tour state), and MUST not introduce polling loops that degrade responsiveness.

**Acceptance coverage (traceability):**

- User Story 1 acceptance scenarios cover **FR-001** through **FR-005**
- User Story 2 acceptance scenarios cover **FR-006** through **FR-008**
- User Story 3 acceptance scenarios cover **FR-009** through **FR-013**
- User Story 4 acceptance scenarios cover **FR-014** through **FR-018**
- **FR-019** and **FR-020** are cross-cutting requirements validated throughout the experience
- **NFR-005** is validated via a perf sanity check using browser network inspection (onboarding + tour state reads only).

### Key Entities *(include if feature involves data)*

- **User**: A person identified by their email address who can authenticate via Magic Link.
- **Group**: A data-isolated container for a household’s financial data (accounts, incomes, expenses, credit cards).
- **Membership**: A link between a user and a group that determines which group data they can access.
- **Onboarding State**: Server-side (Supabase DB) per-user, group-aware state that stores whether onboarding is in progress, completed, or dismissed, plus step progress.
- **Tour State**: Server-side (Supabase DB) per-user state that stores, for each target page tour, whether it is not-started, completed, or dismissed (and the tour version).
- **Bank Account**: A group-scoped financial account (e.g., checking) needed as a base for cashflow.
- **Income Source**: A recurring or one-off inflow definition used in projections. *(Implementation note: in the current schema, income sources map to `projects`.)*
- **Expense**: A recurring or one-off outflow definition used in projections.
- **Credit Card**: An optional group-scoped liability used in projections and cashflow awareness.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can complete self-serve registration (email → Magic Link → authenticated app load) without support in under 3 minutes median time (excluding email delivery latency).
- **SC-002**: In a usability test, at least 90% of new users who start onboarding reach a visible cashflow projection on the dashboard within 5 minutes of first app load.
- **SC-003**: Login submission responses are indistinguishable to the user (same UI state + copy) for new vs existing emails, preventing email enumeration via the login experience.
- **SC-004**: Onboarding progress persists across refresh: users resume at the same step after a reload in 100% of tested cases.
- **SC-005**: Each page tour auto-shows at most once per user per page per tour version, and can be replayed intentionally on demand.

### Measurement Notes

- **SC-001 / SC-002** are measured via a lightweight manual usability test protocol (timed sessions), and are not enforced via automated tests in this feature’s scope.
- **SC-003 / SC-004 / SC-005** are validated via acceptance scenarios and automated E2E/manual regression checks.

## Assumptions & Scope Notes

- Self-serve registration is fully open in this scope (no invite codes/allowlist gating).
- New self-serve sign-ups create a brand-new group by default; joining an existing group is explicitly out of scope here.
- Implementation note: for idempotent self-serve provisioning, the newly created group’s `id` is deterministic and equals `auth.uid()`.
- Onboarding auto-show is driven by group readiness (minimum setup) and auto-shows at most once per user per group (once dismissed/skipped, it will not auto-show again).
- Tour completion is tracked per user (preferred for multi-member groups) and applies consistently across devices for the same signed-in user.
- Page tours in this scope are limited to: Dashboard, Manage, History.
- Onboarding and tour state are persisted server-side (Supabase DB) and shared across devices for the same user.
- Dependencies: the product continues to support Magic Link email delivery, a group-based data isolation model, and persistent per-user state for onboarding/tour completion.
