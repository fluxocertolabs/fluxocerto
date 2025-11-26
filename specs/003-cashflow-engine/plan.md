# Implementation Plan: Cashflow Calculation Engine

**Branch**: `003-cashflow-engine` | **Date**: 2025-11-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-cashflow-engine/spec.md`

## Summary

Build a pure TypeScript module that projects daily cashflow balances over a configurable period (default 30 days). The engine calculates two parallel scenarios (optimistic and pessimistic) based on income certainty levels, identifies danger days (negative balance), and produces summary statistics. Implementation will be pure functions with no side effects, integrating with existing Dexie.js data layer types.

## Technical Context

**Language/Version**: TypeScript 5.9.3  
**Primary Dependencies**: Zod 4.1.13 (validation), date-fns 4.1.0 (date manipulation)  
**Storage**: N/A (engine is stateless, receives data as input)  
**Testing**: Vitest 4.0.14  
**Target Platform**: Browser (SPA) via Vite 7.2.4  
**Project Type**: Single (pure library module within existing React app)  
**Performance Goals**: < 100ms for 100 entities with 30-day projection  
**Constraints**: Pure functions, no side effects, no input mutation  
**Scale/Scope**: Typical household: ~5 accounts, ~10 income sources, ~20 expenses, ~5 credit cards

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Check

| Gate | Status | Notes |
|------|--------|-------|
| Tech stack alignment | ✅ PASS | TypeScript, Zod, Vitest - all in constitution |
| Architecture fit | ✅ PASS | `/src/lib/cashflow.ts` location defined in constitution |
| Naming conventions | ✅ PASS | kebab-case files, camelCase functions, PascalCase types |
| Data model compatibility | ⚠️ NOTE | Existing `Project.certainty` has 3 values (`guaranteed`, `probable`, `uncertain`); spec defines 2 (`guaranteed`, `uncertain`). Engine will treat `probable` same as `uncertain` for pessimistic scenario. |
| Testing requirements | ✅ PASS | Constitution requires unit tests for `lib/cashflow.ts` |
| Performance constraints | ✅ PASS | < 100ms matches constitution target |
| No new dependencies | ⚠️ NOTE | Will need `date-fns` for date manipulation - must pin exact version |

**Pre-Design Gate Result**: ✅ PASS (with notes)

### Post-Design Check

| Gate | Status | Notes |
|------|--------|-------|
| Tech stack alignment | ✅ PASS | Using TypeScript, Zod, Vitest, date-fns@4.1.0 (pinned) |
| Architecture fit | ✅ PASS | `/src/lib/cashflow/` directory structure follows constitution patterns |
| Naming conventions | ✅ PASS | All files kebab-case, functions camelCase, types PascalCase |
| Data model compatibility | ✅ PASS | Engine uses existing types from `src/types/index.ts`, treats `probable` as `uncertain` |
| Testing requirements | ✅ PASS | Test structure defined in `src/lib/cashflow/*.test.ts` |
| Performance constraints | ✅ PASS | O(days × entities) algorithm meets < 100ms target |
| Dependency versioning | ✅ PASS | `date-fns@4.1.0` pinned exactly per constitution protocol |
| Pure functions | ✅ PASS | No side effects, no input mutation per FR-014/FR-015 |

**Post-Design Gate Result**: ✅ PASS

## Project Structure

### Documentation (this feature)

```text
specs/003-cashflow-engine/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output (internal TypeScript interfaces)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── cashflow/
│   │   ├── index.ts           # Main export (calculateCashflow function)
│   │   ├── types.ts           # Engine-specific types (DailySnapshot, etc.)
│   │   ├── calculate.ts       # Core calculation logic
│   │   ├── frequencies.ts     # Payment frequency handlers
│   │   └── validators.ts      # Input validation with Zod
│   └── utils.ts               # Existing utilities
├── types/
│   └── index.ts               # Existing domain types (BankAccount, Project, etc.)
└── test/
    └── setup.ts               # Existing test setup

```

**Structure Decision**: Single project structure. Engine lives in `/src/lib/cashflow/` as a pure module. Tests are colocated following constitution pattern (`src/**/*.test.ts`). Uses existing types from `/src/types/index.ts`.

**Test Files** (colocated per constitution):
```text
src/lib/cashflow/
├── calculate.test.ts      # Core calculation tests
├── frequencies.test.ts    # Frequency handler tests
└── validators.test.ts     # Input validation tests

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
