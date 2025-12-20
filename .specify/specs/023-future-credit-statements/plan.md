# Implementation Plan: Future Credit Card Statements

**Branch**: `023-future-credit-statements` | **Date**: 2025-12-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/023-future-credit-statements/spec.md`

## Summary

Enable users to pre-define credit card statement balances for upcoming months (up to 12 months ahead), with automatic promotion to current statement on month change. This integrates with the existing cashflow projection engine to show accurate future expenses based on user-defined values rather than repeating current balances.

## Technical Context

**Language/Version**: TypeScript 5.9.3  
**Primary Dependencies**: React 19.2.0, Zustand 5.0.8, Zod 4.1.13, Supabase 2.86.0  
**Storage**: Supabase PostgreSQL (existing `credit_cards` table extended, new `future_statements` table)  
**Testing**: Vitest 4.0.14 + React Testing Library 16.3.0 (unit), Playwright 1.57.0 (E2E)  
**Target Platform**: Web SPA (modern browsers)
**Project Type**: Web application (SPA with cloud backend)  
**Performance Goals**: Cashflow recalculation < 100ms, UI updates < 50ms  
**Constraints**: Client-side offline-capable patterns preferred, month progression runs once per session at app launch  
**Scale/Scope**: Single household, ~10 credit cards max, 12 months future statements per card

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Status | Notes |
|------|--------|-------|
| **Tech Stack Compliance** | ✅ PASS | Using pinned versions from constitution: TypeScript 5.9.3, React 19.2.0, Zustand 5.0.8, Zod 4.1.13, Supabase 2.86.0 |
| **Testing Requirements** | ✅ PASS | TR-001 to TR-004 require unit, visual regression, and E2E tests - will implement per spec |
| **Architecture Pattern** | ✅ PASS | Follows SPA pattern with Supabase backend, Zustand stores, React components |
| **Data Flow** | ✅ PASS | User Input → React Components → Zustand Store → Supabase Client → PostgreSQL |
| **Coding Standards** | ✅ PASS | Will follow kebab-case files, PascalCase components, camelCase functions |
| **Single Responsibility** | ✅ PASS | FutureStatement as separate entity, not bloating CreditCard |
| **Existing Patterns** | ✅ PASS | Follows existing entity patterns (accounts, expenses, projects) |
| **Error Handling** | ✅ PASS | Will use existing Result<T> pattern from finance-store |

**Gate Result**: ✅ **PASS** - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/023-future-credit-statements/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── future-statement.schema.ts
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── types/
│   └── index.ts                          # Add FutureStatement types
├── lib/
│   └── cashflow/
│       ├── calculate.ts                  # Modify to use future statements
│       └── month-progression.ts          # NEW: month progression logic
├── stores/
│   └── finance-store.ts                  # Add future statement CRUD
├── hooks/
│   ├── use-finance-data.ts               # Add future statements subscription
│   └── use-month-progression.ts          # NEW: session check hook
├── components/
│   └── manage/
│       └── credit-cards/
│           ├── credit-card-card.tsx      # Extend with future statements
│           ├── future-statement-list.tsx # NEW: list component
│           └── future-statement-form.tsx # NEW: add/edit form

supabase/
└── migrations/
    └── 20251202XXXXXX_future_statements.sql  # NEW: database migration

tests/
├── unit/
│   ├── future-statement.test.ts
│   └── month-progression.test.ts
├── integration/
│   └── cashflow-with-future-statements.test.ts
└── e2e/
    └── future-statements.spec.ts
```

**Structure Decision**: Following existing web application structure with components, stores, hooks, and types directories. New feature adds a new entity (FutureStatement) that integrates with existing CreditCard entity and cashflow calculation engine.

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
