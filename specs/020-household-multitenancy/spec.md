# Feature Specification: Household Multi-Tenancy

**Feature Branch**: `020-household-multitenancy`  
**Created**: 2025-12-01  
**Status**: Draft  
**Input**: User description: "Household Multi-Tenancy (Data Isolation Between User Groups) - Create households table, add household_id to all tables, update RLS policies for data isolation, update invite flow to assign household_id, display household name and members in UI"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Data Isolation Between Households (Priority: P1)

Como usuário de uma residência, preciso que meus dados financeiros sejam completamente isolados de outras residências, garantindo privacidade e segurança.

**Why this priority**: This is the core value proposition of the feature. Without proper data isolation, the multi-tenancy feature provides no value and creates security/privacy risks. All other stories depend on this foundation.

**Independent Test**: Can be fully tested by creating two households with different users, adding financial data to each, and verifying that User A cannot see, access, or modify User B's data under any circumstance.

**Acceptance Scenarios**:

1. **Given** User A belongs to Household Alpha with 3 accounts, **When** User A views the accounts list, **Then** User A sees only the 3 accounts from Household Alpha
2. **Given** User B belongs to Household Beta with 2 projects, **When** User B accesses the projects page, **Then** User B sees only the 2 projects from Household Beta
3. **Given** User A belongs to Household Alpha, **When** User A attempts to access data from Household Beta via direct URL or API, **Then** the system returns empty results or access denied
4. **Given** existing data from before the migration, **When** the migration completes, **Then** all existing data is assigned to the default "Família Padrão" household

---

### User Story 2 - Invite New Members to Household (Priority: P2)

Como membro de uma residência, preciso convidar novos membros para minha residência para que possamos gerenciar nossas finanças juntos.

**Why this priority**: After data isolation, the ability to add family members to share financial data is the primary use case. This enables the collaborative aspect of household financial management.

**Independent Test**: Can be fully tested by having an existing user send an invite, having the new user accept via magic link, and verifying the new user sees the same household data as the inviter.

**Acceptance Scenarios**:

1. **Given** User A belongs to Household Alpha, **When** User A invites email "newmember@email.com", **Then** a new profile is created with household_id pointing to Household Alpha
2. **Given** User A invites a new email, **When** the new user completes authentication, **Then** the new user immediately sees all existing data from Household Alpha
3. **Given** User A from Household Alpha attempts to invite User B who already belongs to Household Beta, **When** User A submits the invite, **Then** the system displays an error message indicating the user already belongs to another household
4. **Given** a new user accepts an invite, **When** they access the app for the first time, **Then** they see the household name in the interface confirming which household they joined

---

### User Story 3 - View Household Information and Members (Priority: P3)

Como membro de uma residência, preciso visualizar informações sobre minha residência e quem são os outros membros para ter clareza sobre quem tem acesso aos dados.

**Why this priority**: Provides transparency and trust within the household. Users need to know who else can see their financial data. This is important but not blocking for core functionality.

**Independent Test**: Can be fully tested by logging in as any household member and verifying the household name appears in the header/sidebar and the members list shows all correct members.

**Acceptance Scenarios**:

1. **Given** User A belongs to Household "Família Silva", **When** User A views any page in the application, **Then** the household name "Família Silva" is displayed in the header or sidebar
2. **Given** Household Alpha has 3 members (Ana, Bruno, Carla), **When** any member views the "Membros da Residência" section, **Then** all 3 members are listed with their names/emails
3. **Given** User A belongs to Household Alpha, **When** User A views the members list, **Then** User A can identify themselves in the list (visual indicator for "you")

---

### Edge Cases

- What happens when a user tries to access data after their household is deleted? System should gracefully handle orphaned users by blocking access and displaying appropriate message.
- What happens when the last member of a household is removed? The household should remain with its data intact (admin-only deletion).
- What happens when an invite is sent to an email that's already pending invite to another household? System should reject the invite with clear error message.
- What happens when two users from different households try to invite the same new email simultaneously? First invite to complete wins; second receives "user already belongs to a household" error.
- What happens to shared data during the migration if relationships exist across what would become different households? Not applicable - current system has single-tenant data, migration assigns ALL existing data to single default household.

## Requirements *(mandatory)*

### Functional Requirements

**Household Management**
- **FR-001**: System MUST create a `households` entity with unique identifier, name, and timestamps (created_at, updated_at)
- **FR-002**: System MUST assign every user profile to exactly one household (NOT NULL constraint)
- **FR-003**: System MUST prevent users from belonging to multiple households simultaneously

**Data Association**
- **FR-004**: System MUST associate all financial entities (accounts, projects, expenses, single_shot_expenses, single_shot_income, credit_cards, user_preferences) with a household
- **FR-005**: System MUST enforce that all new financial data created by a user is automatically assigned to the user's household

**Data Isolation (RLS)**
- **FR-006**: System MUST restrict data visibility so users can only view data belonging to their household
- **FR-007**: System MUST restrict data modification so users can only edit/delete data belonging to their household
- **FR-008**: System MUST apply household-based access control at the database level (Row Level Security)

**Migration**
- **FR-009**: System MUST create a default household named "Família Padrão" during migration
- **FR-010**: System MUST assign all existing profiles and their associated data to the default household during migration
- **FR-011**: System MUST complete migration without data loss or service interruption

**Invite Flow**
- **FR-012**: System MUST assign new invited users to the inviting user's household automatically
- **FR-013**: System MUST reject invites to users who already belong to a household with clear error message
- **FR-014**: System MUST validate household assignment before completing new user registration

**User Interface**
- **FR-015**: System MUST display the current household name visibly in the application header or sidebar
- **FR-016**: System MUST provide a "Membros da Residência" section showing all members of the user's household
- **FR-017**: System MUST display all UI text related to households in Brazilian Portuguese (pt-BR)

**Constraints (v1 Limitations)**
- **FR-018**: System MUST NOT allow users to switch between households
- **FR-019**: System MUST NOT allow users to transfer to different households
- **FR-020**: System MUST NOT allow self-service household creation (admin-only)

### Key Entities

- **Household**: Represents a family/group that shares financial data. Contains: unique identifier, display name, creation timestamp, update timestamp. One household has many profiles and all associated financial entities.
- **Profile**: Extended to include household association. Each profile belongs to exactly one household. The household_id determines data access scope.
- **Financial Entities** (accounts, projects, expenses, single_shot_expenses, single_shot_income, credit_cards, user_preferences): All extended with household association to enable data isolation filtering.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users from different households have 100% data isolation - no cross-household data leakage under any access pattern (direct URL, API calls, UI navigation)
- **SC-002**: New invited users can access shared household data within 30 seconds of completing authentication
- **SC-003**: Existing users experience zero data loss during migration - all pre-migration data remains accessible and correctly associated
- **SC-004**: Users can identify their household name and view all household members within 2 clicks from any page
- **SC-005**: Invite rejection for existing household members provides clear error feedback within 3 seconds
- **SC-006**: All existing application functionality continues to work correctly, scoped to household context
- **SC-007**: 100% of RLS policy tests pass, verifying isolation between at least 2 distinct households

## Assumptions

- The application currently operates with a single implicit household (all users see all data)
- Magic link authentication flow remains unchanged; only the profile creation step is modified
- Household names are display-only and don't need to be unique across the system
- The "Membros da Residência" section is read-only in v1 (no member management beyond invites)
- Admin household creation will be handled via direct database operations or separate admin tooling (out of scope for this feature)
- User preferences are household-specific (each household can have different preferences)
