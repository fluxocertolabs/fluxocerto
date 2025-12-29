---
description: "Actionable, dependency-ordered task list for implementing today's estimated balance"
---

# Tasks: Today's estimated balance

**Input**: Design documents from `/.specify/specs/026-estimate-today-balance/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅  

**Tests**: Requested by the feature artifacts (spec scenarios + plan.md + quickstart.md) — include **unit + E2E + visual regression** tasks.

**Organization**: Tasks are grouped by user story where possible to enable independent implementation and testing of each story, with **[Shared]** phases for cross-cutting infrastructure and regression coverage.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3). Use **[Shared]** for cross-cutting infrastructure/polish tasks that are not owned by a single user story.
- Include exact file paths in descriptions

## Path Conventions

- **Single SPA project**: `src/` at repository root
- Hooks: `src/hooks/`
- Cashflow engine/helpers: `src/lib/cashflow/`
- Date helpers: `src/lib/dates/`
- Dashboard: `src/pages/dashboard.tsx`
- Components: `src/components/cashflow/`
- E2E: `e2e/tests/`, page objects in `e2e/pages/`, fixtures in `e2e/fixtures/`

## Testing & Coverage Policy (mandatory)

**Goal**: Anything we add or change must be protected by **unit + E2E + visual regression** coverage.

- **Unit (logic-level)**: For any new/changed deterministic logic (especially `src/lib/**` and `src/hooks/**`), add/extend `*.test.ts` and validate with `pnpm test:unit:coverage`.
  - New pure modules introduced by this feature (e.g., `src/lib/cashflow/estimate-today.ts`, `src/lib/dates/timezone.ts`) must be tested to **full line + branch coverage**.
- **E2E (behavior-level)**: Add/extend Playwright E2E tests under `e2e/tests/` to validate user-facing behavior (marker, CTA, rebased projection, snapshots frozen) with `pnpm test:e2e:run`.
- **Visual regression (UI-level)**: Add/extend Playwright visual tests under `e2e/tests/visual/` using `visualTest` + `toHaveScreenshot()` for all new/changed Dashboard states with `pnpm test:visual:local` (update snapshots only via `pnpm test:visual:update`).

**Definition of done (testing)**:
- `pnpm test:unit:coverage` passes and the new/changed feature logic has full coverage.
- `pnpm test:e2e:run` passes for chromium.
- `pnpm test:visual:local` passes (desktop + mobile visual projects).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new module/component entry points required by the plan and contracts.

- [ ] T001 [Shared] Create timezone-aware date-only helpers module in `src/lib/dates/timezone.ts` (create `src/lib/dates/` if missing)
- [ ] T002 [Shared] Create estimate helpers module scaffold in `src/lib/cashflow/estimate-today.ts` (types + function stubs from `.specify/specs/026-estimate-today-balance/contracts/estimated-balance.md`)
- [ ] T003 [P] [Shared] Export new estimate helpers from `src/lib/cashflow/index.ts` (so hooks can import from `@/lib/cashflow`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pure, deterministic computation (timezone + estimate + rebased projection) that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T008 [US1] Add unit tests (TDD) for date rules + base derivation + estimation interval math in `src/lib/cashflow/estimate-today.test.ts`:
  - `(baseDate, today]` start-exclusive/end-inclusive behavior
  - `America/Sao_Paulo` date-only “today”
  - “no reliable base” (`hasBase === false`) when user never updated balances OR any checking account lacks `balanceUpdatedAt`
  - multi-checking base formatting inputs: single date vs range
  - scenario rules (optimistic includes probable/uncertain; pessimistic guaranteed-only)
  - scenario-specific estimate marker: only “provável/incerta” income in `(baseDate, today]` ⇒ `isEstimated.optimistic === true` and `isEstimated.pessimistic === false`
- [ ] T009 [US1] Add unit tests (TDD) for rebasing correctness in `src/lib/cashflow/estimate-today.test.ts`:
  - no double counting (future projection starts tomorrow)
  - synthetic “today” point prepended to keep `projectionDays`
  - optimistic offset behavior where `optimisticOffset = optimisticEstimatedToday - pessimisticEstimatedToday` is applied to optimistic balances and derived danger flags
- [ ] T004 [Shared] Implement date-only conversion helpers in `src/lib/dates/timezone.ts` using `Intl.DateTimeFormat` with explicit `timeZone` (per `.specify/specs/026-estimate-today-balance/research.md`)
- [ ] T005 [Shared] Implement `getCheckingBalanceUpdateBase()` in `src/lib/cashflow/estimate-today.ts`:
  - derive base as single date vs range from checking accounts’ `balanceUpdatedAt` (date-only in `America/Sao_Paulo`)
  - return `null` if any checking account is missing `balanceUpdatedAt` (no reliable base; aligns with FR-009)
  - choose `baseForComputation` as the **earliest** checking-account base date (safe base) while retaining the full range for UI transparency (aligns with FR-012)
- [ ] T006 [Shared] Implement `calculateEstimatedTodayBalance()` in `src/lib/cashflow/estimate-today.ts` by reusing `calculateCashflow()` for the interval `(baseForComputation, today]` (start exclusive, end inclusive; `today` is date-only in `America/Sao_Paulo`)
- [ ] T007 [Shared] Implement `rebaseProjectionFromEstimatedToday()` in `src/lib/cashflow/estimate-today.ts`:
  - prepend synthetic “today”
  - forward projection starts tomorrow (prevents double counting)
  - apply `optimisticOffset = optimisticEstimatedToday - pessimisticEstimatedToday` to optimistic balances and derived flags (per `.specify/specs/026-estimate-today-balance/research.md`)

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - See today's estimated balance (Priority: P1) 🎯 MVP

**Goal**: When opening the Dashboard after the last balance update, show **today’s estimated balance** (base + movements since base) and rebase the projection to start from that value, without double counting.

**Independent Test**: Create a minimal dataset with a backdated `balance_updated_at` base and a few incomes/expenses in `(baseDate, today]`, then verify:
- “today” value is computed correctly for optimistic vs pessimistic scenarios
- a clear “Saldo estimado” indicator is shown with the base date/range
- the chart/summary start from the estimated value and future projection starts tomorrow

### Tests for User Story 1 ⚠️

> Tests-first rule:
> - Foundational unit tests live in **Phase 2** (T008–T009).
> - Write the E2E + visual tests below before wiring UI (they should fail until implementation is complete).

- [ ] T010 [P] [US1] Add E2E seed helpers to set `accounts.balance_updated_at` and insert dated movements using admin client in `e2e/fixtures/db.ts`
- [ ] T011 [US1] Add Playwright page-object locators + helpers for the estimate indicator in `e2e/pages/dashboard-page.ts`
- [ ] T012 [US1] Add E2E test for “Saldo estimado” indicator + base text + CTA opens QuickUpdate in `e2e/tests/dashboard-estimated-balance.spec.ts`
  - Include scenario-specific marker behavior: with only “provável/incerta” income in `(baseDate, today]`, the marker is visible in **Otimista** and NOT visible in **Pessimista**
- [ ] T030 [P] [US1] Add desktop visual regression coverage for estimated/no-estimate/no-base Dashboard states in `e2e/tests/visual/dashboard.visual.spec.ts` (light + dark screenshots)
- [ ] T031 [P] [US1] Add mobile visual regression coverage for estimated/no-estimate/no-base Dashboard states in `e2e/tests/visual/mobile.visual.spec.ts` (light + dark screenshots)
- [ ] T032 [US1] Add E2E test for the “no reliable base” state (FR-009): when checking account(s) have `balance_updated_at = null`, Dashboard shows guidance + CTA to **Atualizar Saldos**, and does NOT show “Saldo estimado” in `e2e/tests/dashboard-estimated-balance.spec.ts`

### Implementation for User Story 1

- [ ] T013 [P] [US1] Add pt-BR date formatting helper for “DD/MM” (and range formatting) in `src/lib/format.ts` + add unit coverage in `src/lib/format.test.ts`
- [ ] T014 [P] [US1] Implement `EstimatedBalanceIndicator` UI (marker + base text + CTA affordance) in `src/components/cashflow/estimated-balance-indicator.tsx`
- [ ] T015 [US1] Export the new indicator from `src/components/cashflow/index.ts`
- [ ] T016 [US1] Extend `useCashflowProjection()` to compute `EstimatedTodayBalance` + rebased projection in `src/hooks/use-cashflow-projection.ts` (use `America/Sao_Paulo`; ensure snapshot hook path remains untouched) + add unit coverage in `src/hooks/use-cashflow-projection.test.ts`
- [ ] T017 [US1] Render `EstimatedBalanceIndicator` above the Summary/Chart in `src/pages/dashboard.tsx` and wire click → `setShowQuickUpdate(true)`
- [ ] T037 [US1] Implement the “no reliable base” state (FR-009) in `src/pages/dashboard.tsx`: when `estimate.hasBase === false`, show pt-BR guidance + CTA to **Atualizar Saldos**, and do not show “Saldo estimado”
- [ ] T033 [P] [US1] Add component-level unit tests for `EstimatedBalanceIndicator` (copy + base formatting + click behavior) in `src/components/cashflow/estimated-balance-indicator.test.tsx`

**Checkpoint**: User Story 1 complete — Dashboard shows estimated-today balance with marker and rebased projection

---

## Phase 4: User Story 2 - Don't show “estimated” when nothing changed (Priority: P2)

**Goal**: When there are no relevant movements since the last update, keep the UI quiet (no “Saldo estimado” highlight).

**Independent Test**: Set `balance_updated_at` to a recent date and ensure there are no events in `(baseDate, today]`, then verify the Dashboard shows the base value and does **not** show the estimate indicator.

### Tests for User Story 2

- [ ] T018 [P] [US2] Add unit test asserting `isEstimated.optimistic === false` and `isEstimated.pessimistic === false` (therefore `isEstimated.any === false`) when no movements exist in `(baseDate, today]` in `src/lib/cashflow/estimate-today.test.ts`
- [ ] T019 [P] [US2] Add E2E test asserting the estimate indicator is NOT visible when no movements exist in `e2e/tests/dashboard-estimated-balance.spec.ts`

### Implementation for User Story 2

- [ ] T020 [US2] Gate `EstimatedBalanceIndicator` rendering on `estimate.hasBase === true && estimate.isEstimated[activeScenario] === true` (do NOT use `isEstimated.any` for UI gating) and keep the “no base” state from FR-009 intact in `src/pages/dashboard.tsx`
- [ ] T021 [US2] Ensure `calculateEstimatedTodayBalance()` treats “no movements” correctly for both scenarios (guaranteed-only rules) in `src/lib/cashflow/estimate-today.ts`

**Checkpoint**: User Story 2 complete — no false “estimated” warnings

---

## Phase 5: User Story 3 - Updating balances and editing events updates the value automatically (Priority: P3)

**Goal**: If balance is estimated, user can resolve it quickly via “Atualizar Saldos”; retroactive edits to past events automatically recompute today’s estimate without extra steps.

**Independent Test**:
- Start from an “estimated” state, complete QuickUpdate, and verify the estimate marker disappears
- Insert/edit a past single-shot event in `(baseDate, today]` and verify the Dashboard updates without manual refresh

### Tests for User Story 3

- [ ] T022 [US3] Add E2E test: from estimated state → open QuickUpdate → Concluir → indicator disappears in `e2e/tests/dashboard-estimated-balance.spec.ts`
- [ ] T023 [US3] Add E2E test: insert/update a dated single-shot expense within `(baseDate, today]` and assert estimate recomputes in `e2e/tests/dashboard-estimated-balance.spec.ts`

### Implementation for User Story 3

- [ ] T024 [P] [US3] Ensure estimate/projection recompute is fully reactive to realtime updates (accounts/projects/expenses/cards/futureStatements) in `src/hooks/use-cashflow-projection.ts`
- [ ] T025 [P] [US3] Ensure QuickUpdate completion updates `balance_updated_at` for checking accounts so estimate state clears (validate store path used by `QuickUpdateView`) in `src/stores/finance-store.ts` + add unit coverage in `src/stores/finance-store.test.ts`

**Checkpoint**: User Story 3 complete — estimate clears after update; retroactive changes recompute automatically

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate end-to-end behavior and guard against regressions (especially snapshots).

- [ ] T026 [P] [Shared] Add regression coverage to ensure snapshot pages never show “Saldo estimado”:
  - E2E: assert the indicator is not visible on `/history` and `/history/:id` in `e2e/tests/snapshots.spec.ts`
  - Visual: ensure snapshot screenshots remain free of estimate UI in `e2e/tests/visual/snapshots.visual.spec.ts`
- [ ] T034 [P] [Shared] Add E2E regression for SC-004 in `e2e/tests/snapshots.spec.ts`: after saving a snapshot, add/edit a current income/expense and verify the snapshot detail values do **not** change
- [ ] T027 [P] [Shared] Ensure all new UI copy is pt-BR and matches spec wording in `src/components/cashflow/estimated-balance-indicator.tsx`
- [ ] T028 [Shared] Run the manual validation checklist in `.specify/specs/026-estimate-today-balance/quickstart.md` (include the required test commands: `pnpm test:unit:coverage`, `pnpm test:e2e:run`, `pnpm test:visual:local`)
- [ ] T035 [P] [Shared] Validate plan NFRs (NFR-001/NFR-002):
  - Performance: time the pure in-memory estimate + rebase computation path against the representative dataset defined in `spec.md` NFR-001 (≤100 entities; `projectionDays = 90`) and confirm it stays < 50ms
  - Network: confirm no new Supabase table queries or realtime subscriptions were added for this feature beyond the existing Dashboard finance data load pattern
- [ ] T029 [P] [Shared] Confirm exports and imports remain consistent (no circular deps) after adding estimate module in `src/lib/cashflow/index.ts` (NFR-004 maintainability gate)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS** all user stories
- **User Stories (Phase 3+)**: Depend on Foundational completion
- **Polish (Phase 6)**: Depends on completion of desired user stories

### User Story Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (BLOCKS ALL)
    ↓
Phase 3: US1 - Estimated today + rebased projection (MVP)
    ↓
Phase 4: US2 - Suppress marker when nothing changed
    ↓
Phase 5: US3 - QuickUpdate clears estimate + retroactive edits recompute
    ↓
Phase 6: Polish (snapshots regression + quickstart validation)
```

### Within Each User Story

- Tests (when included) MUST be written and FAIL before implementation
- Pure computation before hook integration
- Hook integration before UI wiring
- Story complete before moving to next priority

### Parallel Opportunities

- Phase 1: T003 can run in parallel once T002 exists
- Phase 2: unit tests (T008–T009) can run in parallel with timezone helper work (T004) once module stubs exist
- Phase 3: E2E seeding (T010) can run in parallel with page-object work (T011); formatting helper (T013) and indicator UI (T014) can run in parallel; visual tests (T030–T031) can run in parallel after seed helpers exist
- Phase 5: Hook and store work (T024–T025) can run in parallel; E2E work (T022–T023) can run in parallel with T024–T025
- Phase 6: T026, T027, T029, T034, T035 can run in parallel

---

## Parallel Example: User Story 1

```bash
# In parallel (different files):
Task T008: "Unit tests for estimate interval math in src/lib/cashflow/estimate-today.test.ts"
Task T010: "E2E seed helpers in e2e/fixtures/db.ts"
Task T030: "Visual regression for estimated states in e2e/tests/visual/dashboard.visual.spec.ts"
Task T013: "Add DD/MM formatting helper in src/lib/format.ts"
Task T014: "Create indicator component in src/components/cashflow/estimated-balance-indicator.tsx"
```

---

## Parallel Example: User Story 2

```bash
# In parallel:
Task T018: "Unit test for no-movements case in src/lib/cashflow/estimate-today.test.ts"
Task T019: "E2E test for absence of indicator in e2e/tests/dashboard-estimated-balance.spec.ts"
```

---

## Parallel Example: User Story 3

```bash
# In parallel:
Task T022: "E2E test for QuickUpdate clearing estimate in e2e/tests/dashboard-estimated-balance.spec.ts"
Task T024: "Reactive recompute in src/hooks/use-cashflow-projection.ts"
Task T025: "QuickUpdate clears estimate via balance_updated_at in src/stores/finance-store.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational tests + implementation (T008–T009, T004–T007)
3. Complete Phase 3: User Story 1 (T010–T017, T030–T033, T037)
4. **STOP and VALIDATE**: Confirm indicator + rebased projection are correct on Dashboard

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → test independently → MVP demo
3. US2 → reduce noise → demo
4. US3 → trust loop (update clears estimate) → demo
5. Polish → snapshot regression + quickstart validation

---

## Notes

- All date comparisons must be date-only in `America/Sao_Paulo` (see `.specify/specs/026-estimate-today-balance/research.md`)
- Interval rules: `(baseDate, today]` (start exclusive, end inclusive)
- Keep historical snapshots frozen — do not apply estimate logic to `useSnapshotProjection`

