# Implementation Plan: Today's estimated balance

**Branch**: `026-estimate-today-balance` | **Date**: 2025-12-29 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/026-estimate-today-balance/spec.md`

## Summary

Update the Dashboard to show **today's estimated balance** by starting from the last balance update (date-only) and applying all incomes and expenses that occurred since then (start exclusive, end inclusive), respecting scenario rules (Optimistic vs Pessimistic). When the balance is an estimate, the UI must clearly signal “Saldo estimado”, explain the base update date (or range), and provide a direct action to **Atualizar Saldos**. The cashflow projection must be **rebased** to start from the estimated value without double counting movements already applied. Historical snapshots remain frozen and unchanged.

## Technical Context

**Language/Version**: TypeScript 5.9.3 (React 19.2.0, Vite 7.2.4; Node >= 20)  
**Primary Dependencies**: @supabase/supabase-js 2.86.0, date-fns 4.1.0, zod 4.1.13, zustand 5.0.8, recharts 3.5.0, Tailwind CSS 4.1.17 (+ shadcn/ui/Radix)  
**Storage**: Supabase PostgreSQL (tables: `accounts`, `projects`, `expenses`, `credit_cards`, `future_statements`, `projection_snapshots`)  
**Testing**: Vitest 4.0.14 (unit), Playwright 1.57.0 (E2E/visual)  
**Target Platform**: Web SPA (modern browsers; deployed on Vercel)  
**Project Type**: Single SPA with Supabase backend  
**Performance Goals**: Recompute estimate + projection in < 50ms for typical household datasets; no extra network requests beyond existing Supabase fetch/subscriptions  
**Constraints**: UI text in pt-BR; code in English; currency math in integer cents; snapshots remain frozen; date rules use `America/Sao_Paulo` “today” (see `research.md`)  
**Scale/Scope**: Typical household scale (≤100 entities), projection periods up to 90 days

### Validation Notes (NFRs)

- **NFR-001 (Performance)**: Validate by timing the pure in-memory computation path (estimate + rebase) for the representative dataset defined in `spec.md` (≤100 entities; `projectionDays = 90`). Do not include network time or React render time in this measurement.
- **NFR-002 (Network)**: Validate via code review that no new Supabase table queries or realtime subscriptions were introduced for this feature beyond the existing Dashboard finance data load pattern.
- **NFR-004 (Maintainability)**: Confirm new helpers remain side-effect-free (no network calls, no store writes) and avoid circular dependencies across `src/lib/cashflow/*` exports/imports.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| **UI Text in pt-BR** | ✅ PASS | New indicator/empty states must be pt-BR |
| **Code in English** | ✅ PASS | New helpers/hooks/types remain English |
| **Currency = cents (integers)** | ✅ PASS | Estimated balance computed in cents; formatting at view layer |
| **Tech Stack Alignment** | ✅ PASS | Uses existing React/Vite/Supabase/Zustand/date-fns stack |
| **No new DB schema required** | ✅ PASS | Uses existing `balance_updated_at` + existing movement tables |
| **Snapshot immutability** | ✅ PASS | Snapshot pages continue using frozen `projection_snapshots.data.projection` |
| **Testing coverage** | ✅ PASS | Unit tests for estimation math; E2E + visual regression for dashboard behavior |

**Gate Result**: ✅ ALL GATES PASS - Proceed with implementation

## Project Structure

### Documentation (this feature)

```text
.specify/specs/026-estimate-today-balance/
├── plan.md                   # This file
├── research.md               # Phase 0 output
├── data-model.md             # Phase 1 output
├── quickstart.md             # Phase 1 output
├── contracts/                # Phase 1 output (internal/module contracts)
│   └── estimated-balance.md
└── tasks.md                  # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── hooks/
│   └── use-cashflow-projection.ts          # Modified: compute estimated-today + rebase projection
│   └── use-cashflow-projection.test.ts     # NEW/MOD: unit coverage for hook integration
├── lib/
│   ├── cashflow/
│   │   ├── calculate.ts                    # Reused: event generation + projection engine
│   │   └── estimate-today.ts               # NEW: pure helpers for base/interval/marker/rebase
│   │   └── index.ts                        # Modified: export estimate helpers
│   ├── dates/
│   │   └── timezone.ts                     # NEW: date-only helpers for America/Sao_Paulo (Intl-based)
│   └── format.ts                           # Modified: add DD/MM (and range) formatting helpers for the indicator
│   └── format.test.ts                      # NEW: unit coverage for formatting helpers
├── components/
│   └── cashflow/
│       ├── estimated-balance-indicator.tsx # NEW: “Saldo estimado” + base + CTA to Atualizar Saldos
│       ├── estimated-balance-indicator.test.tsx # NEW: unit coverage for indicator behavior/copy
│       └── index.ts                        # Modified: export indicator
└── pages/
    └── dashboard.tsx                       # Modified: wire indicator click to open QuickUpdate

src/stores/finance-store.ts                 # Modified: ensure QuickUpdate updates clear estimate state
src/stores/finance-store.test.ts            # NEW: unit coverage for store update path

src/lib/cashflow/estimate-today.test.ts     # NEW: unit tests for estimation/rebase rules
e2e/fixtures/db.ts                          # Modified: seed helpers for balance_updated_at + movements
e2e/pages/dashboard-page.ts                 # Modified: page-object locators/helpers for indicator
e2e/tests/dashboard-estimated-balance.spec.ts # NEW: E2E regression for marker + rebased projection
e2e/tests/snapshots.spec.ts                 # Modified: snapshot regression (no estimate UI + frozen values)
e2e/tests/visual/dashboard.visual.spec.ts   # Modified: add visual regression for estimated/no-estimate/no-base states
e2e/tests/visual/mobile.visual.spec.ts      # Modified: add mobile visual regression for estimated/no-estimate/no-base states
e2e/tests/visual/snapshots.visual.spec.ts   # Modified: ensure snapshot pages remain “historical” (no estimate UI)
```

**Structure Decision**: Extend existing dashboard architecture by adding a small set of pure helpers under `src/lib/` and wiring them into `useCashflowProjection()`, keeping UI changes localized to a new indicator component and minimal edits to the Dashboard page.

## Complexity Tracking

> No violations - design follows existing patterns with additive changes only.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
