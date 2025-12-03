# Implementation Plan: Historical Projection Snapshots

**Branch**: `025-projection-snapshots` | **Date**: December 3, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/025-projection-snapshots/spec.md`

## Summary

Enable users to save, browse, and review point-in-time captures of their cashflow projections. Users can save the current projection state as a named snapshot, view a history list with summary metrics, and open any snapshot to see the exact visualization as it appeared when saved. Implementation leverages existing `CashflowChart` and `SummaryPanel` components with frozen data, storing snapshots in a new `projection_snapshots` table with JSONB for the complete input state and projection result.

## Technical Context

**Language/Version**: TypeScript 5.9.3  
**Primary Dependencies**: React 19.2.0, Vite 7.2.4, @supabase/supabase-js 2.86.0, Zustand 5.0.8, Recharts 3.5.0, Zod 4.1.13  
**Storage**: Supabase PostgreSQL with JSONB for snapshot data  
**Testing**: Vitest 4.0.14 + React Testing Library 16.3.0 (unit), Playwright 1.57.0 (E2E)  
**Target Platform**: Web SPA (modern browsers)  
**Project Type**: Single SPA with cloud backend  
**Performance Goals**: Save <3s, History list <2s for 50 snapshots, Detail view <2s  
**Constraints**: Projection periods 1-365 days stored without degradation  
**Scale/Scope**: Single household use, unlimited snapshots per household

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| **Tech Stack Alignment** | ✅ PASS | Uses existing stack: TypeScript, React, Supabase, Zustand, Recharts |
| **Architecture Pattern** | ✅ PASS | Follows SPA + Supabase pattern with Zustand stores |
| **Component Reuse** | ✅ PASS | Reuses `CashflowChart`, `SummaryPanel` components with frozen data props |
| **RLS Pattern** | ✅ PASS | Uses `household_id` + `get_user_household_id()` pattern from existing tables |
| **Naming Conventions** | ✅ PASS | kebab-case files, PascalCase components, camelCase functions |
| **Test Coverage** | ✅ PASS | Unit tests for store/hooks, E2E for critical flows |
| **No Breaking Changes** | ✅ PASS | Additive feature - new table, new pages, optional dashboard action |

## Project Structure

### Documentation (this feature)

```text
specs/025-projection-snapshots/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output (API contracts)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── cashflow/           # Reuse existing components
│   │   ├── cashflow-chart.tsx
│   │   └── summary-panel.tsx
│   └── snapshots/          # NEW: Snapshot-specific components
│       ├── index.ts
│       ├── save-snapshot-dialog.tsx
│       ├── snapshot-list.tsx
│       ├── snapshot-card.tsx
│       └── snapshot-empty-state.tsx
├── pages/
│   ├── dashboard.tsx       # Modified: Add "Save Snapshot" button
│   ├── history.tsx         # NEW: Snapshot history page
│   └── snapshot-detail.tsx # NEW: View saved snapshot
├── stores/
│   └── snapshots-store.ts  # NEW: Zustand store for snapshots
├── hooks/
│   └── use-snapshot-projection.ts  # NEW: Transform frozen data for chart
├── types/
│   ├── index.ts            # Existing types
│   └── snapshot.ts         # NEW: Snapshot-specific types
└── lib/
    └── snapshots/          # NEW: Snapshot utilities
        ├── index.ts
        └── schema-version.ts

supabase/
└── migrations/
    └── 20251203XXXXXX_projection_snapshots.sql  # NEW: Table + RLS

tests/
├── unit/
│   ├── stores/
│   │   └── snapshots-store.test.ts
│   └── hooks/
│       └── use-snapshot-projection.test.ts
└── e2e/
    └── snapshots.spec.ts
```

**Structure Decision**: Follows existing single SPA structure with dedicated `components/snapshots/` directory for new UI components, new pages for history/detail views, and a dedicated Zustand store for snapshot CRUD operations.

## Complexity Tracking

> No violations detected - design uses existing patterns without deviation.
