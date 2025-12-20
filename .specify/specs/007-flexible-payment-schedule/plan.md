# Implementation Plan: Flexible Payment Schedule

**Branch**: `007-flexible-payment-schedule` | **Date**: 2025-11-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-flexible-payment-schedule/spec.md`

## Summary

Enhance the payment schedule system to support frequency-appropriate payment day selection: day-of-week for weekly/biweekly payments, day-of-month for monthly payments, and dual day-of-month for twice-a-month payments. This requires changes to the data model, form components, validation logic, and cashflow calculation engine.

## Technical Context

**Language/Version**: TypeScript 5.9.3  
**Primary Dependencies**: React 19.2.0, Zod 4.1.13, date-fns, Dexie.js 4.2.1  
**Storage**: IndexedDB (via Dexie.js) - local-first  
**Testing**: Vitest 4.0.14 + React Testing Library 16.3.0  
**Target Platform**: Web browser (SPA)  
**Project Type**: Single web application  
**Performance Goals**: Form input changes < 100ms (perceived instant), cashflow recalculation < 100ms  
**Constraints**: Local-first, no backend, offline-capable  
**Scale/Scope**: Single-user, ~10-50 projects typical

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Check (Phase 0)

| Gate | Status | Notes |
|------|--------|-------|
| Uses pinned dependencies | ✅ PASS | All deps pinned in constitution |
| Follows existing patterns | ✅ PASS | Extends existing Project entity and form patterns |
| No new external dependencies | ✅ PASS | Uses existing date-fns, Zod, shadcn/ui |
| Maintains local-first architecture | ✅ PASS | All changes are client-side |
| Follows file naming conventions | ✅ PASS | kebab-case files, PascalCase components |
| Schema changes via Dexie migrations | ✅ PASS | Will use Dexie version upgrade |
| Tests for business logic | ✅ PASS | Will add tests for frequency functions |

### Post-Design Check (Phase 1)

| Gate | Status | Notes |
|------|--------|-------|
| Data model matches constitution patterns | ✅ PASS | Uses Zod schemas like existing entities |
| Uses ISO 8601 for dates | ✅ PASS | Day-of-week uses ISO 8601 (1=Mon, 7=Sun) via `getISODay()` |
| Backward compatible | ✅ PASS | Legacy `paymentDay` field preserved, auto-converts on edit |
| No breaking changes to existing data | ✅ PASS | Existing projects continue to work |
| Follows component structure | ✅ PASS | Hooks → derived state → handlers → render |
| Validation at form level | ✅ PASS | Zod refinements for twice-monthly validation |
| Error handling per spec | ✅ PASS | Inline errors below input fields |
| Performance within targets | ✅ PASS | Conditional rendering is instant (<100ms) |

## Project Structure

### Documentation (this feature)

```text
specs/007-flexible-payment-schedule/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no API contracts for local-first)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── types/
│   └── index.ts              # Project schema updates (PaymentSchedule union type)
├── lib/
│   └── cashflow/
│       ├── frequencies.ts    # New frequency handlers (twice-a-month, day-of-week)
│       ├── frequencies.test.ts # Tests for new frequency logic
│       └── calculate.ts      # Updated to use new payment schedule
├── components/
│   └── manage/
│       └── projects/
│           └── project-form.tsx  # Dynamic payment day input
└── db/
    └── index.ts              # Dexie schema migration (version 3)
```

**Structure Decision**: Single web application following existing structure. Changes are localized to types, cashflow engine, and project form component.

## Complexity Tracking

> No violations - feature fits within existing architecture.

| Aspect | Assessment |
|--------|------------|
| Data model change | Minimal - extends existing paymentDay to support union type |
| Form complexity | Moderate - conditional rendering based on frequency |
| Calculation logic | Moderate - new frequency handler for twice-a-month |
| Migration | Minimal - backward compatible (existing data works) |
