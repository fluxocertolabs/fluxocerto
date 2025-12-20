# Implementation Plan: Cashflow Dashboard

**Branch**: `004-cashflow-dashboard` | **Date**: 2025-11-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-cashflow-dashboard/spec.md`

## Summary

Build the main Dashboard page displaying a 30-day cashflow projection chart with optimistic/pessimistic scenarios, danger day highlighting, summary statistics panel, and day-level detail tooltips. The dashboard is read-only and uses the existing cashflow engine, Zustand store, and Dexie.js database with Recharts for visualization.

## Technical Context

**Language/Version**: TypeScript 5.9.3  
**Primary Dependencies**: React 19.2.0, Recharts 3.5.0 (to install), Tailwind CSS 4.1.17, shadcn/ui  
**Storage**: IndexedDB via Dexie.js 4.2.1 (existing)  
**State**: Zustand 5.0.8 (existing)  
**Testing**: Vitest 4.0.14 + React Testing Library 16.3.0  
**Target Platform**: Web (modern browsers), responsive 320px-1920px+  
**Project Type**: Single SPA (local-first)  
**Performance Goals**: Dashboard load <1s, cashflow recalculation <100ms  
**Constraints**: Read-only dashboard, local-first (no network), offline-capable

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Tech stack alignment | ✅ PASS | React 19 + Vite 7 + TypeScript 5.9 + Tailwind 4 + Recharts 3.5 |
| Dependency pinning | ✅ PASS | Will pin Recharts to 3.5.0 exactly |
| Architecture pattern | ✅ PASS | SPA with local-first data, follows existing patterns |
| File naming conventions | ✅ PASS | kebab-case files, PascalCase components |
| Component structure | ✅ PASS | Functional components with hooks |
| State management | ✅ PASS | Uses existing Zustand store + Dexie hooks |
| Testing requirements | ✅ PASS | Will add unit tests for chart data transformation |
| Performance targets | ✅ PASS | <1s load, <100ms recalc matches spec |
| Security | ✅ PASS | No external APIs, data stays local |

## Project Structure

### Documentation (this feature)

```text
specs/004-cashflow-dashboard/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output (N/A - no API contracts for UI-only feature)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── ui/                          # shadcn/ui primitives (existing)
│   └── cashflow/                    # NEW: Cashflow chart components
│       ├── cashflow-chart.tsx       # Main chart with area fills
│       ├── chart-tooltip.tsx        # Custom tooltip for day details
│       ├── summary-panel.tsx        # Statistics summary cards
│       ├── empty-state.tsx          # No data guidance
│       ├── error-state.tsx          # Error with retry button
│       ├── loading-skeleton.tsx     # Skeleton/shimmer placeholders
│       └── index.ts                 # Barrel export
├── pages/
│   └── dashboard.tsx                # NEW: Main dashboard page
├── lib/
│   ├── cashflow/                    # Existing cashflow engine
│   └── format.ts                    # NEW: Currency/date formatting utilities
├── hooks/
│   └── use-cashflow-projection.ts   # NEW: Hook to compute projection from DB
├── stores/                          # Existing Zustand stores
├── db/                              # Existing Dexie.js database
└── types/
    └── index.ts                     # Existing types (no changes needed)
```

**Structure Decision**: Single SPA structure following existing patterns. New components go in `src/components/cashflow/`, new page in `src/pages/`, new hook in `src/hooks/`.

## Complexity Tracking

> No violations - design follows existing patterns and Constitution guidelines.

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Chart library | Recharts 3.5.0 | Already specified in Constitution |
| State management | Dexie hooks + useMemo | Reuse existing patterns, no new store needed |
| Component granularity | 6 focused components | Single responsibility, testable units |
| Styling | Tailwind + CSS variables | Match existing shadcn/ui patterns |
