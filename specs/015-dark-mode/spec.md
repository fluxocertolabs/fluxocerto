# Feature Specification: Dark Mode

**Feature Branch**: `015-dark-mode`  
**Created**: 2025-11-28  
**Status**: Draft  
**Input**: User description: "Build a Dark Mode feature for Family Finance that provides persistent dark color scheme, theme toggle in header, user preference persistence in Supabase, system theme detection, and smooth transition animations"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Toggle Between Light and Dark Themes (Priority: P1)

Maria uses the Family Finance app frequently in the evening after work to check her family's cashflow. The bright white interface strains her eyes in low-light conditions. She wants to switch to a dark color scheme for comfortable viewing.

**Why this priority**: Core feature functionality - without the ability to toggle themes, the entire feature has no value. This is the primary interaction users will have with dark mode.

**Independent Test**: Can be fully tested by clicking the theme toggle in the header and observing the entire UI change to dark colors. Delivers immediate value by reducing eye strain.

**Acceptance Scenarios**:

1. **Given** Maria is on any authenticated page (Dashboard or Gerenciar), **When** she clicks the theme toggle in the header, **Then** the entire interface switches to dark mode with dark backgrounds and light text
2. **Given** Maria is using dark mode, **When** she clicks the theme toggle again, **Then** the interface switches back to light mode
3. **Given** Maria is using any theme, **When** she navigates between pages, **Then** the selected theme persists across navigation
4. **Given** Maria is viewing any component (cards, charts, forms, buttons), **When** she switches themes, **Then** all components adapt their colors appropriately

---

### User Story 2 - Theme Preference Syncs Across Devices (Priority: P2)

João, Maria's husband, prefers dark mode on his phone but uses the family computer during the day. He wants his dark mode preference to be remembered when he logs in on different devices.

**Why this priority**: Essential for the multi-user family context. Without persistence, users would need to manually toggle every session, degrading the experience significantly.

**Independent Test**: Can be tested by setting a theme preference on one device, logging out, then logging in on another device and verifying the theme is automatically applied.

**Acceptance Scenarios**:

1. **Given** João sets his theme preference to dark mode, **When** he logs out and logs back in on the same device, **Then** dark mode is automatically applied
2. **Given** João sets his theme preference on his phone, **When** he logs in on the family computer, **Then** his dark mode preference is applied automatically
3. **Given** Maria prefers light mode and João prefers dark mode, **When** each logs in with their own account, **Then** each sees their own preferred theme

---

### User Story 3 - System Theme Detection for New Users (Priority: P3)

Pedro is a new family member who just received an invite to the app. His phone is set to dark mode system-wide. When he first logs in, he expects the app to respect his system preference without manual configuration.

**Why this priority**: Improves first-time user experience by reducing friction. However, users can still manually toggle if the default is wrong, so this is a nice-to-have enhancement.

**Independent Test**: Can be tested by setting the operating system to dark mode, logging in as a new user (no saved preference), and verifying the app automatically uses dark mode.

**Acceptance Scenarios**:

1. **Given** Pedro's device is set to dark mode and he has no saved theme preference, **When** he logs in for the first time, **Then** the app displays in dark mode
2. **Given** Pedro's device is set to light mode and he has no saved preference, **When** he logs in for the first time, **Then** the app displays in light mode
3. **Given** Pedro has previously set a theme preference, **When** he logs in, **Then** his saved preference takes precedence over system preference
4. **Given** Pedro's system preference changes while using the app, **When** he has no saved preference, **Then** the app does not automatically switch (only applies on initial load)

---

### User Story 4 - Smooth Visual Transition (Priority: P4)

Ana, another family member, finds abrupt visual changes jarring. When switching themes, she expects a smooth, polished transition that feels professional and intentional.

**Why this priority**: Polish and user experience refinement. The feature works without smooth transitions, but they significantly improve perceived quality.

**Independent Test**: Can be tested by toggling the theme and observing that colors transition smoothly over a brief duration rather than changing instantly.

**Acceptance Scenarios**:

1. **Given** Ana is on any page, **When** she toggles the theme, **Then** colors transition smoothly over 200 milliseconds
2. **Given** Ana toggles the theme rapidly multiple times, **When** the transitions occur, **Then** the interface remains stable without visual glitches
3. **Given** Ana is viewing animated elements (loading spinners, charts), **When** she toggles the theme, **Then** animations continue smoothly during the transition

---

### Edge Cases

- What happens when the user's browser doesn't support `prefers-color-scheme`? The app defaults to light mode.
- What happens when Supabase is temporarily unreachable while saving preference? The preference is saved locally and synced when connection is restored using "last write wins" conflict resolution (most recent timestamp takes precedence). No error toast is shown for background sync failures (silent retry).
- What happens when a user clears their browser data? System preference is used until they set a new preference.
- What happens during the brief moment between page load and preference fetch? The app uses system preference (or light mode as ultimate fallback) to prevent flash of incorrect theme.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a theme toggle control accessible from the header on all authenticated pages
- **FR-002**: System MUST support two themes: light mode (current default) and dark mode
- **FR-003**: System MUST apply the selected theme to all UI components including cards, forms, buttons, charts, dialogs, and loading states
- **FR-004**: System MUST persist the user's theme preference in a database table linked to their user account
- **FR-005**: System MUST detect the user's operating system theme preference on initial load when no saved preference exists
- **FR-006**: System MUST display the toggle control as an icon button (Sun/Moon icons) with aria-label in Brazilian Portuguese ("Alternar para tema claro" / "Alternar para tema escuro")
- **FR-007**: System MUST animate theme transitions smoothly to avoid jarring visual changes
- **FR-008**: System MUST maintain WCAG AA color contrast ratios in both light and dark themes
- **FR-009**: System MUST ensure focus states are clearly visible in both themes
- **FR-010**: System MUST preserve the selected theme across page navigation within a session
- **FR-011**: System MUST apply the saved theme preference immediately upon user authentication
- **FR-012**: System MUST gracefully handle the loading state before preference is fetched (no flash of wrong theme)
- **FR-013**: System SHOULD log theme changes at INFO level for debugging purposes (no dedicated product analytics required)

### Key Entities

- **User Preference**: Represents a user's personal settings, including theme choice. Stored in a new `user_preferences` table with a flexible key-value design (columns: `id`, `user_id`, `key`, `value`, `created_at`, `updated_at`). For theme, `key` = "theme" and `value` = "light" or "dark". This design allows future extension for additional user preferences without schema changes.
- **Theme**: The visual appearance mode of the application. Values: "light" or "dark". Affects all color variables used throughout the UI.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can toggle between light and dark themes in under 1 second, with visible feedback
- **SC-002**: Theme preference is correctly applied within 500ms of user authentication completing
- **SC-003**: 100% of existing UI components (cards, forms, buttons, charts, dialogs, skeletons) render correctly in both themes
- **SC-004**: All text and interactive elements maintain WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text) in both themes
- **SC-005**: Theme preference syncs correctly across devices for the same user account in 100% of cases
- **SC-006**: New users without saved preferences see the app in their system's preferred theme on first load
- **SC-007**: Theme transitions complete smoothly without visual glitches or layout shifts

## Clarifications

### Session 2025-11-28

- Q: Where should the user's theme preference be stored? → A: New `user_preferences` table with key-value design (user_id, key, value)
- Q: When local and server preferences conflict, which wins? → A: Last write wins (most recent timestamp)
- Q: Should theme toggle events be tracked for analytics? → A: No dedicated analytics; log at INFO level for debugging only
