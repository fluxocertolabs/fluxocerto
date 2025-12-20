# Tasks: E2E Testing Suite

**Input**: Design documents from `/specs/019-e2e-testing/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: This feature IS a test suite - all tasks are test-related by nature.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md structure:
- E2E tests: `e2e/` at repository root
- Page Objects: `e2e/pages/`
- Fixtures: `e2e/fixtures/`
- Tests: `e2e/tests/`
- Utilities: `e2e/utils/`
- CI Workflow: `.github/workflows/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, Playwright configuration, and core dependencies

- [X] T001 Install @playwright/test@1.57.0 and configure in package.json with exact version pinning
- [X] T002 Create e2e/playwright.config.ts with projects (setup, chromium), retries (2), workers (50% CI), timeout settings per research.md
- [X] T003 [P] Create e2e/.gitignore for .auth/ directory and test artifacts
- [X] T004 [P] Add package.json scripts: test:e2e, test:e2e:ui, test:e2e:debug, test:e2e:report

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story tests can be written

**⚠️ CRITICAL**: No test spec files can be created until this phase is complete

### Utilities & Helpers

- [X] T005 Create e2e/utils/inbucket.ts implementing IInbucketClient contract (listMessages, getMessage, deleteMessage, purgeMailbox, getLatestMessage, extractMagicLink)
- [X] T006 [P] Create e2e/utils/supabase-admin.ts with createClient using service role key for direct database access
- [X] T007 [P] Create e2e/utils/test-data.ts implementing ITestDataFactory contract - export factory functions: createAccount(), createExpense(), createSingleShotExpense(), createProject(), createSingleShotIncome(), createCreditCard(), createBasicSeedData(), createFullSeedData(), createLargeSeedData() (see contracts/fixtures.ts for interface)
- [X] T008 [P] Create e2e/utils/format.ts implementing IFormatUtils contract (formatBRL, parseBRL, formatDate, parseDate)

### Fixtures

- [X] T009 Create e2e/fixtures/db.ts implementing IDatabaseFixture contract (resetDatabase, ensureTestUser, removeTestUser, seedAccounts, seedExpenses, seedSingleShotExpenses, seedProjects, seedSingleShotIncome, seedCreditCards, seedFullScenario)
- [X] T010 Create e2e/fixtures/auth.ts implementing IAuthFixture contract (requestMagicLink, getMagicLinkUrl, waitForMagicLinkEmail, authenticate, logout, loadSession)
- [X] T011 Create e2e/fixtures/test-base.ts extending Playwright test with custom fixtures (db, auth, managePage, dashboardPage, loginPage, quickUpdatePage)

### Page Objects (All can run in parallel)

- [X] T012 [P] Create e2e/pages/login-page.ts implementing ILoginPage contract (goto, requestMagicLink, expectMagicLinkSent, expectToBeOnLoginPage)
- [X] T013 [P] Create e2e/pages/dashboard-page.ts implementing IDashboardPage contract (goto, hasEmptyState, selectProjectionDays, openQuickUpdate, expectChartRendered, getIncomeTotal, getExpenseTotal, hasStaleWarning)
- [X] T014 [P] Create e2e/pages/manage-page.ts implementing IManagePage contract with tab navigation and section accessors
- [X] T015 [P] Create e2e/pages/accounts-section.ts implementing IAccountsSection contract (clickAdd, createAccount, editAccount, updateAccountName, updateAccountBalance, deleteAccount, expectAccountVisible, expectAccountNotVisible, getAccountCount)
- [X] T016 [P] Create e2e/pages/expenses-section.ts implementing IExpensesSection contract (selectFixedExpenses, selectSingleShot, createFixedExpense, createSingleShotExpense, toggleExpense, updateExpenseAmount, deleteExpense, expectExpenseVisible, expectExpenseNotVisible, expectExpenseInactive)
- [X] T017 [P] Create e2e/pages/projects-section.ts implementing IProjectsSection contract (selectRecurring, selectSingleShot, createRecurringProject, createSingleShotIncome, toggleProject, updateProjectFrequency, updateProjectCertainty, deleteProject, expectProjectVisible, expectProjectNotVisible, expectProjectInactive, expectCertaintyBadge)
- [X] T018 [P] Create e2e/pages/credit-cards-section.ts implementing ICreditCardsSection contract (clickAdd, createCreditCard, updateDueDay, updateBalance, deleteCreditCard, expectCardVisible, expectCardNotVisible)
- [X] T019 [P] Create e2e/pages/quick-update-page.ts implementing IQuickUpdatePage contract (waitForModal, updateAccountBalance, updateCreditCardBalance, complete, cancel, expectModalClosed, expectAccountsListed, expectCardsListed)

### Auth Setup Project

- [X] T020 Create e2e/fixtures/auth.setup.ts to run authentication once and save state to e2e/.auth/user.json

**Checkpoint**: Foundation ready - test spec files can now be created

---

## Phase 3: User Story 1 - Authentication Flow Testing (Priority: P1) 🎯 MVP

**Goal**: Verify invite-only Magic Link authentication works correctly

**Independent Test**: Run `pnpm test:e2e e2e/tests/auth.spec.ts` - tests magic link flow, session persistence, logout, and access control

### Implementation for User Story 1

- [X] T021 [US1] Create e2e/tests/auth.spec.ts with test describe block and beforeAll hook for database reset
- [X] T022 [US1] Implement test: allowed email requests magic link → success message displayed, email captured in Inbucket
- [X] T023 [US1] Implement test: non-allowed email requests magic link → same success message (no enumeration), no email sent
- [X] T024 [US1] Implement test: click magic link from Inbucket → user authenticated, redirected to dashboard
- [X] T025 [US1] Implement test: authenticated user refreshes page → session persists, remains logged in
- [X] T026 [US1] Implement test: authenticated user clicks sign out → logged out, redirected to login
- [X] T027 [US1] Implement test: unauthenticated user accesses dashboard directly → redirected to login

**Checkpoint**: Authentication flow fully tested - security boundary verified

---

## Phase 4: User Story 2 - Account Management Testing (Priority: P1)

**Goal**: Verify CRUD operations for bank accounts work correctly

**Independent Test**: Run `pnpm test:e2e e2e/tests/accounts.spec.ts` - tests create, read, update, delete for checking/savings/investment accounts

### Implementation for User Story 2

- [X] T028 [US2] Create e2e/tests/accounts.spec.ts with test describe block and beforeAll hook for database reset and auth state
- [X] T029 [US2] Implement test: create checking account "Nubank" with balance R$ 1.000,00 → appears in list
- [X] T030 [US2] Implement test: edit account name to "Nubank Principal" → updated name displayed
- [X] T031 [US2] Implement test: update balance to R$ 2.500,00 → new balance reflected immediately
- [X] T032 [US2] Implement test: delete account with confirmation → removed from list
- [X] T033 [US2] Implement test: multiple accounts exist → all displayed with correct types (checking/savings/investment)
- [X] T034 [US2] Implement test: account with owner assigned → owner badge displayed correctly

**Checkpoint**: Account management fully tested - basic CRUD operations verified

---

## Phase 5: User Story 3 - Expense Management Testing (Priority: P1)

**Goal**: Verify fixed recurring and single-shot expense management works correctly

**Independent Test**: Run `pnpm test:e2e e2e/tests/expenses.spec.ts` - tests create, edit, toggle, delete for both expense types

### Implementation for User Story 3

- [X] T035 [US3] Create e2e/tests/expenses.spec.ts with test describe block and beforeAll hook for database reset and auth state
- [X] T036 [US3] Implement test: create fixed expense "Aluguel" R$ 2.000,00 due day 10 → appears in fixed expenses list
- [X] T037 [US3] Implement test: toggle fixed expense inactive → shows as inactive in list
- [X] T038 [US3] Implement test: edit fixed expense amount to R$ 2.200,00 → updated amount displayed
- [X] T039 [US3] Implement test: delete fixed expense with confirmation → removed from list
- [X] T040 [US3] Implement test: create single-shot expense "Compra de Móveis" R$ 5.000,00 date 2025-12-15 → appears in single-shot list
- [X] T041 [US3] Implement test: edit single-shot expense date to 2025-12-20 → updated date displayed
- [X] T042 [US3] Implement test: delete single-shot expense → removed from list

**Checkpoint**: Expense management fully tested - both recurring and one-time expenses verified

---

## Phase 6: User Story 4 - Project (Income) Management Testing (Priority: P1)

**Goal**: Verify recurring income projects and single-shot income management works correctly

**Independent Test**: Run `pnpm test:e2e e2e/tests/projects.spec.ts` - tests create, edit, toggle, delete for both income types

### Implementation for User Story 4

- [X] T043 [US4] Create e2e/tests/projects.spec.ts with test describe block and beforeAll hook for database reset and auth state
- [X] T044 [US4] Implement test: create recurring project "Salário" R$ 8.000,00 monthly guaranteed → appears in recurring list
- [X] T045 [US4] Implement test: change project frequency to biweekly → updated frequency displayed
- [X] T046 [US4] Implement test: toggle project inactive → shows as inactive
- [X] T047 [US4] Implement test: change project certainty to "probable" → certainty badge updates
- [X] T048 [US4] Implement test: create single-shot income "Bônus Anual" R$ 10.000,00 date 2025-12-20 guaranteed → appears in single-shot list
- [X] T049 [US4] Implement test: edit single-shot income certainty to "uncertain" → certainty badge updates
- [X] T050 [US4] Implement test: delete income items with confirmation → removed from respective lists

**Checkpoint**: Income management fully tested - both recurring and one-time income verified

---

## Phase 7: User Story 5 - Dashboard & Cashflow Projection Testing (Priority: P1)

**Goal**: Verify dashboard correctly displays cashflow projections based on financial data

**Independent Test**: Run `pnpm test:e2e e2e/tests/dashboard.spec.ts` - tests chart rendering, projection periods, summary panel

### Implementation for User Story 5

- [X] T051 [US5] Create e2e/tests/dashboard.spec.ts with test describe block and beforeAll hook for database reset and auth state
- [X] T052 [US5] Implement test: no financial data → empty state displayed with guidance to add data
- [X] T053 [US5] Implement test: accounts, expenses, projects exist → cashflow chart renders with data points
- [X] T054 [US5] Implement test: change projection period from 30 to 90 days → chart updates to show 90-day projection
- [X] T055 [US5] Implement test: view summary panel → correct totals for income, expenses, and balance displayed
- [X] T056 [US5] Implement test: accounts with stale balances → stale data warning displayed
- [X] T057 [US5] Implement test: click "Atualizar Saldos" → Quick Update modal opens

**Checkpoint**: Dashboard fully tested - core visualization and projection verified

---

## Phase 8: User Story 6 - Quick Update Flow Testing (Priority: P2)

**Goal**: Verify Quick Update modal allows efficient batch balance updates

**Independent Test**: Run `pnpm test:e2e e2e/tests/quick-update.spec.ts` - tests modal, inline editing, save, cancel

### Implementation for User Story 6

- [X] T058 [US6] Create e2e/tests/quick-update.spec.ts with test describe block and beforeAll hook with seeded accounts and credit cards
- [X] T059 [US6] Implement test: open Quick Update modal → all accounts and credit cards listed
- [X] T060 [US6] Implement test: update account balance inline → new value displayed
- [X] T061 [US6] Implement test: click "Concluir" → all balances saved, modal closes
- [X] T062 [US6] Implement test: click cancel → modal closes without saving changes

**Checkpoint**: Quick Update flow fully tested - batch update workflow verified

---

## Phase 9: User Story 7 - Credit Card Management Testing (Priority: P2)

**Goal**: Verify credit card management CRUD operations work correctly

**Independent Test**: Run `pnpm test:e2e e2e/tests/credit-cards.spec.ts` - tests create, edit, delete for credit cards

### Implementation for User Story 7

- [X] T063 [US7] Create e2e/tests/credit-cards.spec.ts with test describe block and beforeAll hook for database reset and auth state
- [X] T064 [US7] Implement test: create credit card "Nubank Platinum" R$ 3.000,00 due day 15 → appears in list
- [X] T065 [US7] Implement test: edit due day to 20 → updated due day displayed
- [X] T066 [US7] Implement test: update statement balance → new balance reflected
- [X] T067 [US7] Implement test: delete credit card with confirmation → removed from list

**Checkpoint**: Credit card management fully tested - CRUD operations verified

---

## Phase 10: User Story 8 - Theme Switching Testing (Priority: P3)

**Goal**: Verify theme switching works and persists correctly

**Independent Test**: Run `pnpm test:e2e e2e/tests/theme.spec.ts` - tests toggle, persistence, visual consistency

### Implementation for User Story 8

- [X] T068 [US8] Create e2e/tests/theme.spec.ts with test describe block and beforeAll hook for auth state
- [X] T069 [US8] Implement test: click theme toggle → theme switches between light and dark mode
- [X] T070 [US8] Implement test: dark mode selected, refresh page → dark mode persists
- [X] T071 [US8] Implement test: dark mode active, view dashboard → all components render correctly with dark theme colors

**Checkpoint**: Theme switching fully tested - UX preference persistence verified

---

## Phase 11: Edge Cases Testing

**Goal**: Verify application handles edge cases gracefully (EC-001 to EC-005)

**Independent Test**: Run `pnpm test:e2e e2e/tests/edge-cases.spec.ts` - tests network loss, concurrent edits, session expiry, large datasets, realtime reconnect

### Implementation for Edge Cases

- [X] T072 Create e2e/tests/edge-cases.spec.ts with test describe block
- [X] T073 [P] Implement test EC-001: network connection lost during data submission → error handling and retry behavior verified (use page.route() to simulate offline)
- [X] T074 [P] Implement test EC-002: concurrent edits from multiple tabs → conflict resolution or last-write-wins behavior verified (two browser contexts)
- [X] T075 [P] Implement test EC-003: session expires during long editing session → graceful redirect to login (manipulate Supabase auth state)
- [X] T076 [P] Implement test EC-004: large datasets (100+ accounts/expenses) → UI performance and pagination/scrolling verified (seed 100+ records)
- [X] T077 [P] Implement test EC-005: Supabase realtime connection drops and reconnects → data sync recovery verified (page.route() to block WebSocket)

**Checkpoint**: Edge cases fully tested - resilience and error handling verified

---

## Phase 12: CI/CD Integration

**Purpose**: GitHub Actions workflow for automated E2E testing on PRs

- [X] T078 Create .github/workflows/e2e.yml with Supabase CLI setup, Playwright install, test execution, artifact upload on failure
- [X] T079 Configure workflow to block PR merges on E2E test failures (required check)
- [X] T080 Add environment secrets documentation for SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

**Checkpoint**: CI/CD fully configured - automated quality gate active

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [ ] T081 Run full test suite 10 times to verify 95%+ pass rate (flakiness threshold per SC-003)
- [ ] T082 Verify full test suite completes in under 5 minutes (SC-002)
- [X] T083 Run quickstart.md validation - verify all documented commands work correctly
- [X] T084 Verify test failure screenshots and traces are captured correctly
- [X] T085 Code cleanup: remove any debug statements, ensure consistent formatting

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user story tests
- **User Stories (Phase 3-11)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **CI/CD (Phase 12)**: Can start after Phase 1, but should complete after at least one user story
- **Polish (Phase 13)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (Auth - P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (Accounts - P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 3 (Expenses - P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 4 (Projects - P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 5 (Dashboard - P1)**: Can start after Foundational - May use seeded data from other entity types
- **User Story 6 (Quick Update - P2)**: Can start after Foundational - Requires accounts/credit cards page objects
- **User Story 7 (Credit Cards - P2)**: Can start after Foundational - No dependencies on other stories
- **User Story 8 (Theme - P3)**: Can start after Foundational - No dependencies on other stories
- **Edge Cases**: Can start after Foundational - Uses various page objects

### Within Each User Story

- Tests in a spec file should be independent and can run in any order
- Each test uses beforeAll hook to reset database and ensure test user
- Tests should not depend on state from previous tests

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Page Objects (T012-T019) can be created in parallel
- All Utility files (T005-T008) can be created in parallel
- Once Foundational phase completes, all user stories can start in parallel
- Edge case tests (T073-T077) can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all utilities in parallel:
Task: "Create e2e/utils/inbucket.ts"
Task: "Create e2e/utils/supabase-admin.ts"
Task: "Create e2e/utils/test-data.ts"
Task: "Create e2e/utils/format.ts"

# Launch all page objects in parallel:
Task: "Create e2e/pages/login-page.ts"
Task: "Create e2e/pages/dashboard-page.ts"
Task: "Create e2e/pages/manage-page.ts"
Task: "Create e2e/pages/accounts-section.ts"
Task: "Create e2e/pages/expenses-section.ts"
Task: "Create e2e/pages/projects-section.ts"
Task: "Create e2e/pages/credit-cards-section.ts"
Task: "Create e2e/pages/quick-update-page.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Auth)
4. **STOP and VALIDATE**: Run `pnpm test:e2e e2e/tests/auth.spec.ts`
5. Auth flow verified - security boundary tested

### Incremental Delivery (P1 Stories)

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (Auth) → Test independently → Core security verified
3. Add User Story 2 (Accounts) → Test independently → CRUD foundation verified
4. Add User Story 3 (Expenses) → Test independently → Expense tracking verified
5. Add User Story 4 (Projects) → Test independently → Income tracking verified
6. Add User Story 5 (Dashboard) → Test independently → Core visualization verified
7. Each story adds test coverage without breaking previous tests

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Stories 1 & 5 (Auth, Dashboard)
   - Developer B: User Stories 2 & 7 (Accounts, Credit Cards)
   - Developer C: User Stories 3 & 4 (Expenses, Projects)
   - Developer D: User Stories 6 & 8 + Edge Cases (Quick Update, Theme)
3. Stories complete and integrate independently

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 85 |
| **Setup Phase** | 4 tasks |
| **Foundational Phase** | 16 tasks |
| **User Story Tasks** | 57 tasks |
| **CI/CD Tasks** | 3 tasks |
| **Polish Tasks** | 5 tasks |
| **Parallel Opportunities** | 25+ tasks can run in parallel |
| **User Stories** | 8 stories + Edge Cases |
| **MVP Scope** | Phase 1-3 (User Story 1: Auth) |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable via its spec file
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All page objects implement contracts from `/specs/019-e2e-testing/contracts/`
- BRL currency format (R$ X.XXX,XX) must be used in all assertions
- pt-BR locale for UI text verification

