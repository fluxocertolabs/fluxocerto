# Feature Specification: Notifications & Profile Settings

**Feature Branch**: `028-notifications-profile`  
**Created**: 2026-01-09  
**Status**: Draft  
**Input**: User description: "Implement a first version of a Notifications system (in-app + email) with a minimal Profile settings area"

## Clarifications

### Session 2026-01-09

- Q: For this feature, how should we store the email opt-out? → A: Rename/split preferences: rename current `user_preferences` → `group_preferences`, create a new per-user `user_preferences`, and store the email opt-out in the new per-user table.
- Q: What should be the canonical recipient identifier for a Notification? → A: `user_id` (UUID) referencing `auth.users(id)`.
- Q: What should be the default for email notifications? → A: Enabled by default (opt-out).
- Q: What should the new per-user `user_preferences` table look like? → A: Key-value: `(user_id, key, value, created_at, updated_at)` with `UNIQUE(user_id, key)`.
- Q: How should we enforce “welcome notification is created at most once per user” (idempotency)? → A: Add a nullable `dedupe_key`/`idempotency_key` on `notifications` and enforce `UNIQUE(user_id, dedupe_key)`; for welcome use `dedupe_key = "welcome-v1"`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Notifications inbox with unread state (Priority: P1)

As a signed-in user, I can open an in-app notifications inbox from the main navigation and see a persistent list of my notifications, newest-first, with unread/read state and an unread indicator.

**Why this priority**: This establishes a durable, user-visible source of truth for important events beyond transient toasts and provides the core notifications UX foundation for future notification types.

**Independent Test**: Sign in, open the notifications inbox, confirm a welcome notification is present (if eligible) as unread, mark it as read, and refresh to confirm the state persists.

**Acceptance Scenarios**:

1. **Given** a signed-in user is eligible for a welcome notification, **When** the user reaches the authenticated app for the first time after this feature ships, **Then** exactly one welcome notification is created for that user and appears in the inbox as unread.
2. **Given** a user opens the notifications inbox, **When** the inbox loads, **Then** notifications are listed newest-first with clear unread/read state and an unread indicator reflects the number of unread notifications.
3. **Given** a user has an unread notification, **When** they mark that notification as read, **Then** the unread indicator updates and the read state persists across refresh and across devices for the same user.
4. **Given** the user was offline when notifications were created, **When** they later return and open the inbox, **Then** they can still see the persistent notifications without duplicates.

---

### User Story 2 - Live updates while using the app (Priority: P1)

While actively using the app, the user sees new notifications appear automatically (without a manual refresh) and the unread indicator updates, even if the notification is created from another device/tab or a system event.

**Why this priority**: Notifications must feel timely and trustworthy, and state should stay reasonably consistent across tabs/devices.

**Independent Test**: With two active sessions for the same user, trigger creation of a new notification from one session and observe it appear in the other without a full page reload.

**Acceptance Scenarios**:

1. **Given** a user is signed in and actively using the app, **When** a new notification is created for them, **Then** it appears in the inbox and the unread indicator updates without requiring a full page refresh.
2. **Given** live delivery is temporarily disconnected, **When** the user later reconnects or reloads the app, **Then** the notifications inbox shows all notifications accurately (no missing items, no duplicate items).

---

### User Story 3 - Profile settings for display name and email notification preference (Priority: P1)

A signed-in user can manage basic Profile settings: update their display name, view their email address (read-only), and opt out of notification emails.

**Why this priority**: This provides user control for notification emails and ensures profile identity details (display name) are accurate and consistent across the product.

**Independent Test**: Navigate to Profile settings, change the display name and save, confirm it appears elsewhere in the app; confirm the email field is visible but non-editable; toggle email notifications off and confirm the preference persists.

**Acceptance Scenarios**:

1. **Given** a user navigates to Profile settings, **When** they update their display name, **Then** the change persists and is reflected anywhere the app shows their name.
2. **Given** a user is viewing Profile settings, **Then** their email address is displayed but cannot be edited (disabled input) and an explanatory hint is shown.
3. **Given** a user disables email notifications in Profile settings, **When** they save the change, **Then** the preference persists and is enforced for future notification emails.

---

### User Story 4 - Welcome email delivery (Priority: P2)

When a welcome notification is created and the user has email notifications enabled, the user receives a welcome email shortly after, with consistent branding and a clear call-to-action to return to the app.

**Why this priority**: Email increases the chance a user sees important notifications even when they are not actively in the app, while remaining user-controlled via preferences.

**Independent Test**: Ensure email notifications are enabled, trigger welcome notification creation for a test user, verify that an email is generated/sent in live environments; disable email notifications and verify that no email is sent for future notification events.

**Acceptance Scenarios**:

1. **Given** a welcome notification is created for a user and email notifications are enabled at send time, **When** the email is sent, **Then** the user receives a welcome email shortly after with brand-consistent formatting and a clear call-to-action back to the app.
2. **Given** the user has email notifications disabled at send time, **When** a notification email would otherwise be sent, **Then** no email is sent (email opt-out is enforced).
3. **Given** a user disables email notifications immediately before or after a notification is created, **When** the system attempts to send a notification email, **Then** the send decision honors the user’s current preference at the time of sending.

---

### Edge Cases

- A user toggles email notifications off close to notification creation time → email sending honors the preference at send time
- Temporary network interruption or live delivery disconnect → notifications still appear on next reload/reconnect without duplication
- Multiple tabs/devices for the same user → unread/read state converges and remains reasonably consistent
- Notification creation retries → the welcome notification does not duplicate
- Group membership and privacy → user-scoped notifications are never visible to other group members

## Requirements *(mandatory)*

### Functional Requirements

**In-app notifications:**

- **FR-001**: The app MUST provide an in-app notifications inbox that is discoverable from the primary navigation on both desktop and mobile layouts.
- **FR-002**: The system MUST persist notifications per user so users can view past notifications across sessions/devices.
- **FR-003**: The inbox MUST list notifications newest-first and present a clear unread vs read state per notification.
- **FR-004**: The app MUST show an unread indicator that reflects the current number of unread notifications for the signed-in user.
- **FR-005**: Users MUST be able to mark an individual notification as read, and the unread indicator MUST update accordingly. Read state MUST persist across refreshes/devices for the same user.
- **FR-006**: The system MUST create the welcome notification at most once per user (no duplicates across refreshes, devices, or retries).
- **FR-006a**: The system MUST enforce welcome notification idempotency with a database-level uniqueness guarantee using an idempotency/dedupe key (e.g. `dedupe_key = "welcome-v1"`), unique per user.
- **FR-007**: The notifications system MUST support an optional primary action for a notification (e.g., action label + destination link) so future actionable notifications can be represented without redesigning the data model or UI.
- **FR-008**: When a new notification is created for an active signed-in user, the inbox and unread indicator MUST update without requiring a full page refresh (best-effort live delivery, with persistence as the source of truth).

**Email notifications:**

- **FR-009**: For notification events that support email delivery (starting with welcome), the system MUST be able to send an email notification to the user’s authenticated email address.
- **FR-010**: The system MUST enforce a per-user preference to opt out of notification emails stored in `user_preferences` (per-user table; not shared across group members). If the preference is disabled at send time, the email MUST NOT be sent.
- **FR-010a**: Email notifications MUST default to enabled (opt-out). If the per-user preference is not yet set for a user, the system MUST treat it as enabled.
- **FR-011**: Notification emails MUST follow the product’s established branding and include a clear call-to-action that returns the user to the app.
- **FR-012**: Email sending credentials/secrets MUST NOT be exposed to end users; sending MUST occur only in a trusted, server-controlled environment.
- **FR-013**: The notification email workflow MUST remain testable in development environments without requiring delivery to a real external inbox (e.g., safe preview/logging mechanism).

**Profile settings:**

- **FR-014**: The app MUST provide a Profile settings area that is discoverable from the primary navigation.
- **FR-015**: Users MUST be able to update their display name in Profile settings, and the updated name MUST be reflected anywhere the app shows that user’s name.
- **FR-016**: Profile settings MUST display the user’s authenticated email address, but MUST NOT allow the user to change it in this feature (disabled input + explanatory hint).
- **FR-017**: Profile settings MUST allow the user to toggle notification emails on or off, and the preference MUST persist.

**Localization:**

- **FR-018**: All user-facing UI text introduced by this feature MUST be in Brazilian Portuguese (pt-BR). (Copy content is out of scope for this spec step; placeholders are acceptable.)

**Privacy & access:**

- **FR-019**: A user’s notifications MUST NOT be visible to other users (including other members of the same group) unless a future notification is explicitly designed as group-wide.
- **FR-020**: Notification read/unread state MUST be user-specific and consistent across tabs/devices for the same signed-in user.

### Key Entities *(include if feature involves data)*

- **Notification**: A user-visible message representing an event, scoped to a single recipient (`user_id` referencing `auth.users.id`). Attributes include: event type (e.g., welcome), created time, read/unread state, message content (pt-BR copy), an optional primary action (label + destination), and an optional idempotency/dedupe key (e.g. `dedupe_key`) for DB-enforced de-duplication.
- **Notification Email Preference**: A per-user setting stored in the per-user `user_preferences` table indicating whether the user wants to receive notification emails (global opt-in/opt-out for this iteration).
- **User Preferences**: A per-user key-value table (`user_id`, `key`, `value`, timestamps) with `UNIQUE(user_id, key)`. For this iteration it stores `email_notifications_enabled` as `'true'`/`'false'`.
- **Group Preferences**: The existing `user_preferences` table is renamed to `group_preferences` and stores group-scoped preferences (e.g., theme) separately from per-user preferences.
- **User Profile**: User-managed fields (e.g., display name) and read-only display of the authenticated email address.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can open the notifications inbox from the primary navigation within 1 click/tap on both desktop and mobile layouts.
- **SC-002**: The welcome notification is created at most once per user: across 20 reloads and 2 separate devices for a test user, 0 duplicate welcome notifications are observed.
- **SC-003**: For an active user session under normal connectivity, newly created notifications appear in the inbox and update the unread indicator within 5 seconds, without manual refresh.
- **SC-004**: Marking a notification as read updates the unread indicator within 2 seconds and persists across refresh in 100% of tested cases.
- **SC-005**: A user can update their display name and see it reflected in at least one other UI surface within 30 seconds in 100% of tested cases.
- **SC-006**: Email opt-out is enforced: in testing, users with notification emails disabled receive 0 notification emails; users with notification emails enabled receive the welcome email within 2 minutes of welcome creation in live environments.

## Assumptions & Scope Notes

- Welcome is triggered the first time a user reaches the authenticated app after this feature ships (applies to both existing and new users) and is created once per user.
- Only one notification type (“welcome”) is in scope for this iteration; the system is designed to accommodate additional notification types later.
- This iteration includes only in-app + email notifications; push notifications, SMS, and other channels are out of scope.
- Email preference is global (single toggle), not per-notification-type.
- Email address changes and authentication model changes are out of scope.
- “Unsubscribe link” compliance flows are out of scope for this iteration; preference control is provided in Profile settings.
- As part of this feature, preferences are split: rename current `user_preferences` → `group_preferences` (group-scoped) and introduce a new per-user `user_preferences` for user-specific settings (starting with `email_notifications_enabled`).
- Email notifications are enabled by default; if a user has no explicit `email_notifications_enabled` preference saved yet, it is treated as enabled.
