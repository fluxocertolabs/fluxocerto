# Implementation Plan: Investment-Inclusive Balance Line

**Branch**: `016-investment-balance-line` | **Date**: 2025-11-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/016-investment-balance-line/spec.md`

## Summary

Add a third line to the cashflow chart showing total balance including investment accounts (pessimistic balance + investment totals), and make legend items interactive for toggling line visibility. The investment-inclusive line uses cyan color (#06b6d4) with stroke-only rendering (no gradient fill). Legend items become clickable with hover states, tooltips, and visual muting for hidden elements.

## Technical Context

**Language/Version**: TypeScript 5.9.3  
**Primary Dependencies**: React 19.2.0, Recharts 3.5.0, Zustand 5.0.8, Tailwind CSS 4.1.17  
**Storage**: Supabase PostgreSQL (existing bank_accounts table with type='investment')  
**Testing**: Vitest 4.0.14 + React Testing Library 16.3.0  
**Target Platform**: Web (SPA) - Desktop + Mobile responsive  
**Project Type**: Single web application (React SPA)  
**Performance Goals**: Chart re-renders < 100ms, toggle animations 150ms fade  
**Constraints**: Session-only state (no persistence), Y-axis fixed scale regardless of visibility  
**Scale/Scope**: Single chart component enhancement, ~3 modified files + 1 new component

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Check (Phase 0)

| Gate | Status | Notes |
|------|--------|-------|
| Tech stack alignment | ✅ PASS | Uses existing React 19, Recharts 3.5, Zustand, Tailwind |
| Pinned dependencies | ✅ PASS | No new dependencies required |
| Architecture pattern | ✅ PASS | Follows existing SPA + Zustand + Supabase pattern |
| File structure | ✅ PASS | Extends existing `/src/components/cashflow/` |
| Data model | ✅ PASS | Uses existing BankAccount type (investment type already exists) |
| Coding standards | ✅ PASS | Follows kebab-case files, PascalCase components |
| Testing requirements | ✅ PASS | Unit tests for calculation logic, component tests for interactions |

**No violations detected. Proceeding to Phase 0.**

### Post-Design Check (Phase 1)

| Gate | Status | Notes |
|------|--------|-------|
| Tech stack alignment | ✅ PASS | Uses `Line` component from existing Recharts 3.5.0 |
| Pinned dependencies | ✅ PASS | No new dependencies - Line is part of recharts |
| Architecture pattern | ✅ PASS | React useState for session-only state (not Zustand - appropriate for local UI state) |
| File structure | ✅ PASS | New `chart-legend.tsx` follows existing component pattern |
| Data model | ✅ PASS | Extended `ChartDataPoint` with `investmentInclusiveBalance` |
| Coding standards | ✅ PASS | kebab-case files, PascalCase components, camelCase functions |
| Testing requirements | ✅ PASS | Unit test for `transformToChartData` with investment total |
| Performance | ✅ PASS | CSS transitions (150ms), memoized calculations, no re-renders on toggle |

**Post-design validation complete. No violations. Ready for Phase 2 (tasks).**

## Project Structure

### Documentation (this feature)

```text
specs/016-investment-balance-line/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no API changes)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── cashflow/
│       ├── cashflow-chart.tsx      # MODIFY: Add investment line + interactive legend
│       ├── chart-tooltip.tsx       # MODIFY: Conditional display based on visibility
│       ├── chart-legend.tsx        # NEW: Interactive legend component
│       └── types.ts                # MODIFY: Add visibility state types
├── hooks/
│   └── use-cashflow-projection.ts  # MODIFY: Add investment balance calculation
└── lib/
    └── cashflow/
        └── types.ts                # MODIFY: Add investment balance to DailySnapshot (if needed)
```

**Structure Decision**: Extends existing cashflow component structure. New `chart-legend.tsx` component encapsulates interactive legend behavior, keeping `cashflow-chart.tsx` focused on chart rendering.

## Complexity Tracking

> No violations to justify - implementation uses existing patterns and no new dependencies.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | - | - |
