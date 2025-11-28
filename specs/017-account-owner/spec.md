# Feature Specification: Account Owner Assignment

**Feature Branch**: `017-account-owner`  
**Created**: 2025-11-28  
**Status**: Draft  
**Input**: User description: "Build an Account Owner Assignment feature for Family Finance that allows assigning bank accounts and credit cards to specific family members (owners)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Assign Owner to New Account (Priority: P1)

As a family member managing finances, I want to select an owner when creating a new bank account or credit card, so that I can track which family member each financial account belongs to.

**Why this priority**: This is the core functionality that enables organizational tracking of accounts by family member. Without the ability to assign owners during creation, the feature has no foundation.

**Independent Test**: Can be fully tested by creating a new bank account, selecting "Daniel" as owner, and verifying the owner is saved and displayed correctly.

**Acceptance Scenarios**:

1. **Given** I am on the new bank account creation form, **When** I look for owner selection, **Then** I see a dropdown with options "Não atribuído", "Daniel", and "Aryane"
2. **Given** I am creating a new bank account, **When** I select "Daniel" as the owner and save, **Then** the account is created with Daniel as the assigned owner
3. **Given** I am creating a new credit card, **When** I do not select any owner, **Then** the credit card is created with no owner (unassigned)
4. **Given** I am on the new credit card creation form, **When** I look for owner selection, **Then** I see the same owner dropdown options available

---

### User Story 2 - View Owner in Account Lists (Priority: P1)

As a family member viewing financial accounts, I want to see the owner displayed alongside each account/card name in list views, so that I can quickly identify who each account belongs to.

**Why this priority**: Equal priority to Story 1 because displaying the owner is essential for the feature to provide organizational value. Without visible owner information, the assignment serves no practical purpose.

**Independent Test**: Can be fully tested by viewing the bank accounts list with accounts that have different owners assigned and verifying owner badges are displayed correctly.

**Acceptance Scenarios**:

1. **Given** I have a bank account with owner "Daniel", **When** I view the bank accounts list, **Then** I see a badge or label showing "Daniel" next to the account name
2. **Given** I have a credit card with no owner assigned, **When** I view the credit cards list, **Then** I see no owner badge (or "Não atribuído" indicator) next to the card name
3. **Given** I have multiple accounts with different owners, **When** I view the accounts list, **Then** each account shows its respective owner badge

---

### User Story 3 - Edit Owner on Existing Account (Priority: P2)

As a family member, I want to change or remove the owner of an existing bank account or credit card, so that I can correct assignments or update ownership when accounts change hands.

**Why this priority**: Important for maintaining accurate records, but secondary to initial assignment and display since users can work around this by recreating accounts if needed.

**Independent Test**: Can be fully tested by editing an existing bank account, changing the owner from "Daniel" to "Aryane", and verifying the change persists.

**Acceptance Scenarios**:

1. **Given** I have a bank account with owner "Daniel", **When** I edit the account and change owner to "Aryane", **Then** the account is saved with "Aryane" as the new owner
2. **Given** I have a credit card with owner "Aryane", **When** I edit the card and clear the owner selection, **Then** the card is saved with no owner assigned
3. **Given** I have an account with no owner, **When** I edit the account and select "Daniel" as owner, **Then** the account is saved with "Daniel" as the owner

---

### User Story 4 - Filter Accounts by Owner (Priority: P3)

As a family member, I want to filter the accounts and credit cards lists by owner, so that I can focus on accounts belonging to a specific family member.

**Why this priority**: Nice-to-have enhancement that improves usability but is not essential for the core organizational functionality. Users can still identify owners visually without filtering.

**Independent Test**: Can be fully tested by using the filter dropdown in the accounts list to select "Daniel" and verifying only Daniel's accounts are shown.

**Acceptance Scenarios**:

1. **Given** I am viewing the bank accounts list, **When** I select "Daniel" from the owner filter, **Then** only accounts owned by Daniel are displayed
2. **Given** I am viewing the credit cards list, **When** I select "Não atribuído" from the owner filter, **Then** only cards without an owner are displayed
3. **Given** I have the owner filter set to "Aryane", **When** I select "Todos" from the filter, **Then** all accounts are displayed regardless of owner
4. **Given** I am viewing a filtered list, **When** the filter is active, **Then** the filter dropdown clearly indicates the current selection

---

### Edge Cases

- What happens when an account has an owner and the owner field is displayed alongside an already long account name? The owner badge displays inline after the account name; if the combined width exceeds the container, the account name truncates with ellipsis (`text-overflow: ellipsis`) while the owner badge remains fully visible.
- How does the system handle accounts created before this feature existed? They should appear as "Não atribuído" (unassigned) by default.
- What happens when filtering results in an empty list? The system should display an appropriate empty state message indicating no accounts match the filter criteria.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an owner selection dropdown on bank account creation and edit forms with options: "Não atribuído" (default), "Daniel", "Aryane"
- **FR-002**: System MUST provide an owner selection dropdown on credit card creation and edit forms with the same options
- **FR-003**: System MUST persist the selected owner when saving a bank account or credit card
- **FR-004**: System MUST display the owner as a visual badge/label next to the account/card name in list views
- **FR-005**: System MUST allow the owner field to be optional (accounts can exist without an owner)
- **FR-006**: System MUST provide a filter dropdown in the bank accounts list view with options: "Todos", "Daniel", "Aryane", "Não atribuído"
- **FR-007**: System MUST provide a filter dropdown in the credit cards list view with the same filter options
- **FR-008**: System MUST apply the selected filter to show only matching accounts/cards in the list
- **FR-009**: System MUST display all UI text related to this feature in Brazilian Portuguese (pt-BR)
- **FR-010**: System MUST treat existing accounts/cards (created before this feature) as having no owner assigned

### Key Entities

- **Profile**: Renamed from `allowed_emails`, this table represents family members who can own financial accounts and (optionally) log in. Schema: `id` (UUID, PK), `name` (TEXT, required), `email` (CITEXT, UNIQUE, nullable for auth gating), `created_at`, `created_by`. Pre-seeded with "Daniel" and "Aryane" profiles. Seed-only for this version (no UI management).
- **Owner**: A foreign key reference from accounts/credit_cards to the `profiles` table. The owner is an optional attribute that can be null/unassigned. If a profile is deleted, the FK uses `ON DELETE SET NULL` to automatically clear ownership on affected accounts.
- **Bank Account**: Extended with an optional `owner_id` field (UUID FK, nullable) referencing `profiles.id`.
- **Credit Card**: Extended with an optional `owner_id` field (UUID FK, nullable) referencing `profiles.id`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Owner dropdown is present and functional on bank account and credit card creation/edit forms
- **SC-002**: Owner badge is visible next to account/card names in list views without additional user action
- **SC-003**: Filter dropdown updates list results immediately upon selection (no page reload required)
- **SC-004**: 100% of existing accounts display correctly with "Não atribuído" status after feature deployment
- **SC-005**: Users can complete the full workflow (create account with owner, view in list, filter by owner) without encountering errors or confusion
- **SC-006**: All user-facing text appears in Brazilian Portuguese (pt-BR) with no English text visible in the feature

## Assumptions

- The profiles list is fixed to "Daniel" and "Aryane" (seeded via migration) and does not require dynamic UI management in this version
- All authenticated family members have equal access to view and edit all accounts regardless of owner assignment
- Owner assignment is purely organizational and does not affect any calculations, permissions, or data access
- The existing form layouts for bank accounts and credit cards have space to accommodate an additional dropdown field
- Migration of existing accounts with embedded owner names (e.g., "Nubank - Daniel") will be handled manually by the user rather than automated

## Clarifications

### Session 2025-11-28

- Q: How should the owner field be stored in the database? → A: Rename existing `allowed_emails` table to `profiles`, add `name` column, and use FK reference to accounts/credit_cards
- Q: What happens if a family member with assigned accounts is deleted? → A: Allow deletion and CASCADE to null (set owner to "Não atribuído" automatically)
- Q: Should the profiles table be manageable via UI? → A: Seed-only for this version (no UI management); table pre-populated via migration
