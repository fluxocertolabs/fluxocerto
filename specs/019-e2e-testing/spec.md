# Feature Specification: End-to-End Testing Suite

**Feature Branch**: `019-e2e-testing`  
**Created**: 2025-11-28  
**Status**: Draft  
**Input**: User description: "Build a comprehensive end-to-end (E2E) testing suite for the Family Finance application that covers all critical user flows. The tests must run against an isolated test database (not production) and provide confidence that the application works correctly from a user's perspective."

## Clarifications

### Session 2025-11-28

- Q: Which E2E testing framework should be used? → A: Playwright
- Q: How should transient test failures be handled? → A: Playwright built-in retry with 2 retries per test
- Q: Should edge cases be included in E2E test scope? → A: Yes, include all edge cases in main test suite
- Q: When should database be reset for test isolation? → A: Before each test file/spec (via beforeAll hook)
- Q: Should E2E test failures block PR merges in CI? → A: Yes, blocking (strict quality gate)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Authentication Flow Testing (Priority: P1)

A developer or CI system needs to verify that the invite-only Magic Link authentication system works correctly, ensuring only pre-approved users can access the application.

**Why this priority**: Authentication is the gateway to the entire application. If auth is broken, no other feature can be accessed. This is the foundational security layer.

**Independent Test**: Can be fully tested by verifying the login form submission, magic link delivery via Inbucket, session persistence, and logout functionality. Delivers confidence that the security boundary is intact.

**Acceptance Scenarios**:

1. **Given** an allowed email in the `allowed_emails` table, **When** user requests a magic link, **Then** a success message is displayed and email is captured in Inbucket
2. **Given** a non-allowed email, **When** user requests a magic link, **Then** the same success message is displayed (no email enumeration) but no email is sent
3. **Given** a magic link in Inbucket, **When** user clicks the link, **Then** user is authenticated and redirected to dashboard
4. **Given** an authenticated user, **When** user refreshes the page, **Then** session persists and user remains logged in
5. **Given** an authenticated user, **When** user clicks sign out, **Then** user is logged out and redirected to login page
6. **Given** an unauthenticated user, **When** user tries to access dashboard directly, **Then** user is redirected to login page

---

### User Story 2 - Account Management Testing (Priority: P1)

A developer needs to verify that users can create, read, update, and delete bank accounts, ensuring the financial data management core works correctly.

**Why this priority**: Accounts are the foundation of cashflow calculations. Without working account management, the app cannot track balances.

**Independent Test**: Can be fully tested by creating accounts through the UI, verifying they appear in the list, editing them, and deleting them. Delivers confidence in basic CRUD operations.

**Acceptance Scenarios**:

1. **Given** an authenticated user with no accounts, **When** user creates a checking account with name "Nubank" and balance R$ 1.000,00, **Then** account appears in the account list
2. **Given** an account exists, **When** user edits the account name to "Nubank Principal", **Then** the updated name is displayed
3. **Given** an account exists, **When** user updates the balance to R$ 2.500,00, **Then** the new balance is reflected immediately
4. **Given** an account exists, **When** user clicks delete and confirms, **Then** the account is removed from the list
5. **Given** multiple accounts exist, **When** user views the accounts tab, **Then** all accounts are displayed with correct types (checking/savings/investment)
6. **Given** an account with an owner assigned, **When** user views the account, **Then** owner badge is displayed correctly

---

### User Story 3 - Expense Management Testing (Priority: P1)

A developer needs to verify that users can manage both fixed recurring expenses and single-shot one-time expenses.

**Why this priority**: Expenses are critical for accurate cashflow projections. Both recurring and one-time expenses must be tracked correctly.

**Independent Test**: Can be fully tested by creating, editing, toggling, and deleting both fixed and single-shot expenses. Delivers confidence in expense tracking.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** user creates a fixed expense "Aluguel" with amount R$ 2.000,00 and due day 10, **Then** expense appears in the fixed expenses list
2. **Given** a fixed expense exists, **When** user toggles it inactive, **Then** expense shows as inactive in the list
3. **Given** a fixed expense exists, **When** user edits the amount to R$ 2.200,00, **Then** the updated amount is displayed
4. **Given** a fixed expense exists, **When** user deletes it with confirmation, **Then** expense is removed from the list
5. **Given** an authenticated user, **When** user creates a single-shot expense "Compra de Móveis" with amount R$ 5.000,00 and date 2025-12-15, **Then** expense appears in the single-shot expenses list
6. **Given** a single-shot expense exists, **When** user edits the date to 2025-12-20, **Then** the updated date is displayed
7. **Given** a single-shot expense exists, **When** user deletes it, **Then** expense is removed from the list

---

### User Story 4 - Project (Income) Management Testing (Priority: P1)

A developer needs to verify that users can manage recurring income projects and single-shot one-time income.

**Why this priority**: Income tracking is essential for cashflow projections. Both recurring and one-time income must work correctly.

**Independent Test**: Can be fully tested by creating, editing, and deleting both recurring projects and single-shot income. Delivers confidence in income tracking.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** user creates a recurring project "Salário" with amount R$ 8.000,00, monthly frequency, and guaranteed certainty, **Then** project appears in the recurring projects list
2. **Given** a recurring project exists, **When** user changes frequency to biweekly, **Then** the updated frequency is displayed
3. **Given** a recurring project exists, **When** user toggles it inactive, **Then** project shows as inactive
4. **Given** a recurring project exists, **When** user changes certainty to "probable", **Then** the certainty badge updates
5. **Given** an authenticated user, **When** user creates a single-shot income "Bônus Anual" with amount R$ 10.000,00, date 2025-12-20, and guaranteed certainty, **Then** income appears in the single-shot income list
6. **Given** a single-shot income exists, **When** user edits the certainty to "uncertain", **Then** the certainty badge updates
7. **Given** income items exist, **When** user deletes them with confirmation, **Then** they are removed from their respective lists

---

### User Story 5 - Dashboard & Cashflow Projection Testing (Priority: P1)

A developer needs to verify that the dashboard correctly displays cashflow projections based on the financial data.

**Why this priority**: The dashboard is the primary user interface and the main value proposition. Users need to see accurate projections.

**Independent Test**: Can be fully tested with seeded data by verifying chart rendering, projection period changes, and summary panel accuracy. Delivers confidence in the core visualization.

**Acceptance Scenarios**:

1. **Given** no financial data exists, **When** user views the dashboard, **Then** empty state is displayed with guidance to add data
2. **Given** accounts, expenses, and projects exist, **When** user views the dashboard, **Then** cashflow chart renders with data points
3. **Given** the dashboard is loaded, **When** user changes projection period from 30 to 90 days, **Then** chart updates to show 90-day projection
4. **Given** the dashboard is loaded, **When** user views the summary panel, **Then** correct totals for income, expenses, and balance are displayed (values must match calculations from `src/lib/cashflow/calculate.ts` engine)
5. **Given** accounts with stale balances exist, **When** user views the health indicator, **Then** stale data warning is displayed
6. **Given** the dashboard is loaded, **When** user clicks "Atualizar Saldos", **Then** Quick Update modal opens

---

### User Story 6 - Quick Update Flow Testing (Priority: P2)

A developer needs to verify that the Quick Update modal allows users to efficiently update all balances at once.

**Why this priority**: Quick Update is a key UX feature for the monthly ritual but not critical for basic functionality.

**Independent Test**: Can be fully tested by opening the modal, updating balances, and verifying changes persist. Delivers confidence in the batch update workflow.

**Acceptance Scenarios**:

1. **Given** accounts and credit cards exist, **When** user opens Quick Update modal, **Then** all accounts and credit cards are listed
2. **Given** Quick Update modal is open, **When** user updates an account balance inline, **Then** the new value is displayed
3. **Given** Quick Update modal is open, **When** user clicks "Concluir", **Then** all balances are saved and modal closes
4. **Given** Quick Update modal is open, **When** user clicks cancel, **Then** modal closes without saving changes

---

### User Story 7 - Credit Card Management Testing (Priority: P2)

A developer needs to verify that credit card management works correctly.

**Why this priority**: Credit cards affect cashflow projections but are secondary to core account/expense/income management.

**Independent Test**: Can be fully tested by creating, editing, and deleting credit cards. Delivers confidence in credit card tracking.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** user creates a credit card "Nubank Platinum" with balance R$ 3.000,00 and due day 15, **Then** card appears in the credit cards list
2. **Given** a credit card exists, **When** user edits the due day to 20, **Then** the updated due day is displayed
3. **Given** a credit card exists, **When** user updates the statement balance, **Then** the new balance is reflected
4. **Given** a credit card exists, **When** user deletes it with confirmation, **Then** card is removed from the list

---

### User Story 8 - Theme Switching Testing (Priority: P3)

A developer needs to verify that theme switching works and persists correctly.

**Why this priority**: Theme switching is a nice-to-have UX feature that doesn't affect core functionality.

**Independent Test**: Can be fully tested by toggling theme and verifying visual changes and persistence. Delivers confidence in theme management.

**Acceptance Scenarios**:

1. **Given** user is on any page, **When** user clicks the theme toggle, **Then** theme switches between light and dark mode
2. **Given** user has selected dark mode, **When** user refreshes the page, **Then** dark mode persists
3. **Given** dark mode is active, **When** user views the dashboard, **Then** all components render correctly with dark theme colors

---

### Edge Cases (In Scope)

The following edge cases MUST be covered by the E2E test suite:

- **EC-001**: Network connection lost during data submission → verify error handling and retry behavior
  - **Pass criteria**: Error toast displayed within 3 seconds, retry button available, no data corruption
- **EC-002**: Concurrent edits from multiple tabs → verify last-write-wins behavior (Supabase default)
  - **Pass criteria**: Last submitted value persists after page refresh in both tabs, no errors thrown
- **EC-003**: Session expires during long editing session → verify graceful redirect to login
  - **Pass criteria**: User redirected to login page within 5 seconds of session expiry detection, no data loss for unsaved work
- **EC-004**: Large datasets (100+ accounts/expenses) → verify UI performance and pagination/scrolling
  - **Pass criteria**: Page loads in < 3 seconds with 100+ items, no UI freezing, smooth scrolling
- **EC-005**: Supabase realtime connection drops and reconnects → verify data sync recovery
  - **Pass criteria**: Data syncs within 10 seconds of WebSocket reconnection, UI reflects latest state

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Test suite MUST run against local Supabase instance (not production)
- **FR-002**: Test suite MUST reset database state before each test file/spec (via `beforeAll` hook) to ensure isolation while maintaining reasonable execution speed
- **FR-003**: Test suite MUST handle Magic Link authentication by capturing emails from Inbucket
- **FR-004**: Test suite MUST provide authenticated session injection for non-auth tests to improve speed
- **FR-005**: Test suite MUST support running in both headed (debug) and headless (CI) modes
- **FR-006**: Test suite MUST be executable via `pnpm test:e2e` command
- **FR-007**: Test suite MUST be runnable in GitHub Actions CI pipeline as a blocking check (failures prevent PR merge)
- **FR-008**: Test suite MUST provide seed data for consistent test scenarios
- **FR-009**: Test suite MUST use Page Object pattern for maintainable selectors
- **FR-010**: Test suite MUST verify all UI text is in Brazilian Portuguese (pt-BR) - verified implicitly through acceptance scenario assertions using Portuguese text patterns (e.g., "Enviar", "Aluguel", "Atualizar Saldos")
- **FR-011**: Test suite MUST handle currency values in BRL format (R$ X.XXX,XX) - verified through `IFormatUtils` utility and acceptance scenarios using BRL-formatted values
- **FR-012**: Test suite MUST complete full run in under 5 minutes
- **FR-013**: Test suite MUST achieve 95%+ pass rate on repeated runs (no flaky tests)
- **FR-014**: Test suite MUST support parallel test execution where possible
- **FR-015**: Test suite MUST use Playwright as the E2E testing framework
- **FR-016**: Test suite MUST configure Playwright with 2 automatic retries per test to handle transient failures

### Key Entities *(include if feature involves data)*

- **Test User**: Pre-approved email in `allowed_emails` table with known identity for test scenarios
- **Test Fixtures**: Reusable authentication helpers, page objects, and data factories (see `contracts/fixtures.ts` for interface definitions)
- **Seed Data**: Predefined accounts, expenses, projects, and credit cards for consistent test scenarios (see `ITestDataFactory` in `contracts/fixtures.ts`)
- **Page Objects**: Abstraction layer for UI interactions (LoginPage, DashboardPage, ManagePage) (see `contracts/page-objects.ts` for interface definitions)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All P1 user flows have passing E2E tests covering happy path and key error scenarios
- **SC-002**: Full test suite completes in under 5 minutes on standard CI hardware
- **SC-003**: Test suite achieves 95%+ pass rate when run 10 times consecutively (flakiness threshold)
- **SC-004**: New developers can run E2E tests locally within 5 minutes of setup using documented commands
- **SC-005**: CI pipeline automatically runs E2E tests on every pull request
- **SC-006**: Test failures provide clear error messages and screenshots for debugging
- **SC-007**: Test suite can be extended with new tests following established patterns within 15 minutes per test

## Terminology

> **Note**: Throughout this specification:
> - "**Projects**" refers to **recurring income** sources (salary, retainers, etc.)
> - "**Single-shot income**" refers to **one-time income** events (bonuses, freelance payments, etc.)
> - These terms align with the application's domain model in `src/types/index.ts`

## Assumptions

1. **Local Supabase availability**: The local Supabase instance (`supabase start`) is available and functional for E2E tests
2. **Inbucket accessibility**: Supabase's built-in Inbucket email server (port 54324) is accessible for capturing magic links
3. **Service role key availability**: The local Supabase service role key is available for test setup operations
4. **Browser compatibility**: Tests will run on Chromium by default; cross-browser testing is out of scope
5. **Single viewport**: Tests will run at desktop viewport (1280x720); responsive testing is out of scope
6. **No visual regression**: Tests verify functionality, not pixel-perfect visual appearance
7. **English test code**: Test code, comments, and file names remain in English per codebase conventions
