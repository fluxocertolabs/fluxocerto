# Implementation Plan: Single-Shot Expenses

**Branch**: `014-single-shot-expenses` | **Date**: 2025-11-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-single-shot-expenses/spec.md`

## Summary

Add support for one-time expenses (despesas pontuais) that occur on a specific calendar date rather than recurring monthly. This extends the existing expenses table with a `type` discriminator column to support both fixed (recurring) and single-shot expense types. Single-shot expenses appear in cashflow projections on their exact date and are automatically considered "past" when that date has passed.

## Technical Context

**Language/Version**: TypeScript 5.9.3  
**Primary Dependencies**: React 19.2.0, Zustand 5.0.8, Zod 4.1.13, @supabase/supabase-js 2.86.0  
**Storage**: Supabase PostgreSQL (existing `expenses` table extended with `type` column)  
**Testing**: Vitest 4.0.14 + React Testing Library 16.3.0  
**Target Platform**: Web SPA (Vite 7.2.4)  
**Project Type**: Web application (SPA with cloud backend)  
**Performance Goals**: < 100ms cashflow recalculation, < 1s page load  
**Constraints**: Must maintain backward compatibility with existing fixed expenses  
**Scale/Scope**: Single-user/family personal finance app

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Tech stack alignment | ✅ PASS | Uses existing React/Zustand/Supabase/Zod stack |
| Data model extension | ✅ PASS | Extends existing `expenses` table (spec-approved approach) |
| Naming conventions | ✅ PASS | Will follow kebab-case files, PascalCase components |
| Component patterns | ✅ PASS | Will follow existing manage page patterns |
| Cashflow integration | ✅ PASS | Extends existing calculation engine |
| UI language | ✅ PASS | Brazilian Portuguese (pt-BR) consistent with app |
| Amount storage | ✅ PASS | Cents (integer) consistent with existing entities |
| No new dependencies | ✅ PASS | Uses existing date-fns for date handling |

## Project Structure

### Documentation (this feature)

```text
specs/014-single-shot-expenses/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── store-api.md     # Zustand store API contracts
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── manage/
│       └── expenses/
│           ├── expense-form.tsx           # Extended for type selection
│           ├── expense-list.tsx           # Extended with sub-tabs
│           ├── expense-list-item.tsx      # Extended for date display
│           ├── single-shot-expense-form.tsx  # New: single-shot specific form
│           └── single-shot-expense-list-item.tsx  # New: single-shot specific item
├── lib/
│   └── cashflow/
│       ├── calculate.ts                   # Extended for single-shot expenses
│       ├── types.ts                       # Extended ExpenseEvent type
│       └── validators.ts                  # Extended validation
├── stores/
│   └── finance-store.ts                   # Extended with single-shot actions
├── hooks/
│   └── use-finance-data.ts                # Extended mapping for new fields
└── types/
    └── index.ts                           # Extended Expense types with discriminator

supabase/
└── migrations/
    └── 003_single_shot_expenses.sql       # Schema migration
```

**Structure Decision**: Extends existing single-project SPA structure. No new directories needed - single-shot expenses integrate into existing expense management patterns.

## Complexity Tracking

No constitution violations - implementation uses existing patterns and extends current data model as specified.
