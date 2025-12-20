# Implementation Plan: Twice-Monthly Variable Amounts

**Branch**: `012-twice-monthly-variable-amounts` | **Date**: 2025-11-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-twice-monthly-variable-amounts/spec.md`

## Summary

Add support for different payment amounts on each day of twice-monthly payment schedules. Users can enable a "Valores diferentes para cada dia" toggle when configuring twice-monthly projects, allowing them to set distinct amounts for each payment day (e.g., R$ 3.000 on day 5, R$ 500 on day 20). The cashflow engine will use the correct amount for each respective payment day.

## Technical Context

**Language/Version**: TypeScript 5.9.3  
**Primary Dependencies**: React 19.2.0, Vite 7.2.4, Zod 4.1.13, Zustand 5.0.8, date-fns  
**Storage**: Supabase PostgreSQL (JSONB `payment_schedule` column)  
**Testing**: Vitest 4.0.14, React Testing Library 16.3.0  
**Target Platform**: Web (SPA)  
**Project Type**: Web application (single frontend)  
**Performance Goals**: Cashflow recalculation < 100ms  
**Constraints**: Backward compatible with existing twice-monthly projects  
**Scale/Scope**: Personal finance app, single user per session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| TypeScript strict mode | ✅ PASS | Using TS 5.9.3 with strict mode |
| Zod for validation | ✅ PASS | Will extend TwiceMonthlyScheduleSchema |
| Zustand for state | ✅ PASS | Existing project store handles CRUD |
| Supabase for persistence | ✅ PASS | JSONB column supports schema extension |
| shadcn/ui components | ✅ PASS | Will use existing Switch, Input, Label |
| Brazilian Portuguese UI | ✅ PASS | All labels in pt-BR |
| Backward compatibility | ✅ PASS | Optional fields, fallback to single amount |
| No data migration | ✅ PASS | JSONB schema extension, no SQL migration |

## Project Structure

### Documentation (this feature)

```text
specs/012-twice-monthly-variable-amounts/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── manage/
│       └── projects/
│           ├── project-form.tsx       # Add variable amounts toggle + fields
│           └── project-list-item.tsx  # Update amount display format
├── lib/
│   └── cashflow/
│       ├── calculate.ts               # Update income event creation
│       └── frequencies.ts             # Update isTwiceMonthlyPaymentDue
├── types/
│   └── index.ts                       # Extend TwiceMonthlyScheduleSchema

tests/
└── (colocated with source files as *.test.ts)
```

**Structure Decision**: Single frontend SPA structure. Changes are localized to:
1. Type definitions (Zod schema extension)
2. Form component (UI toggle + fields)
3. List item component (display format)
4. Cashflow engine (amount selection logic)

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
