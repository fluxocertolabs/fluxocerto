# Implementation Plan: Monthly Ritual Enhancement

**Branch**: `006-monthly-ritual` | **Date**: 2025-11-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-monthly-ritual/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

The Monthly Ritual Enhancement feature streamlines the monthly balance update workflow for Fluxo Certo. The primary requirements are:

1. **Quick Balance Update View** (P1) - A focused view showing all bank accounts and credit cards in a single list with inline editing, auto-save on blur, and keyboard navigation (Tab between fields)
2. **Dashboard Health Indicator** (P2) - At-a-glance health status (Good/Warning/Danger) with stale data detection (30+ days)
3. **Configurable Projection Length** (P3) - Allow users to select projection periods (7/14/30/60/90 days) persisted to local storage
4. **Surplus/Deficit Summary** (P4) - Show net change (end balance - starting balance) for both scenarios

Technical approach: Extend existing Dexie.js database schema with `balanceUpdatedAt` timestamps and `UserPreferences` table. Build new React components following existing patterns (shadcn/ui, Tailwind). Leverage existing cashflow calculation engine with configurable projection days.

## Technical Context

**Language/Version**: TypeScript 5.9.3  
**Primary Dependencies**: React 19.2.0, Vite 7.2.4, Dexie.js 4.2.1, Zustand 5.0.8, shadcn/ui, Tailwind CSS 4.1.17  
**Storage**: IndexedDB (via Dexie.js 4.2.1) - local-first  
**Testing**: Vitest 4.0.14 + React Testing Library 16.3.0  
**Target Platform**: Web (SPA), modern browsers with IndexedDB support  
**Project Type**: Single SPA (no backend)  
**Performance Goals**: Quick Balance Update view loads <1s, projection recalculation <100ms, auto-save <50ms  
**Constraints**: Local-first (no network), offline-capable, <100MB memory  
**Scale/Scope**: Single user, 2-5 bank accounts, 2-4 credit cards (typical household)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Uses pinned dependencies | ✅ PASS | All dependencies already pinned in CONSTITUTION.md |
| Follows existing patterns | ✅ PASS | Will use existing component structure, Zustand store pattern, Dexie hooks |
| No external APIs | ✅ PASS | Local-first, all data in IndexedDB |
| TypeScript strict mode | ✅ PASS | Project already configured with strict mode |
| shadcn/ui components | ✅ PASS | Will use existing Button, Input, Dialog, Card components |
| File naming (kebab-case) | ✅ PASS | Will follow existing convention |
| Testing coverage | ✅ PASS | Will add tests for new calculation logic |
| Database migrations | ✅ PASS | Dexie supports versioned migrations |

## Project Structure

### Documentation (this feature)

```text
specs/006-monthly-ritual/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── cashflow/
│   │   ├── health-indicator.tsx      # NEW: Dashboard health status
│   │   ├── projection-selector.tsx   # NEW: Period dropdown
│   │   └── surplus-deficit.tsx       # NEW: Surplus/deficit display
│   ├── quick-update/                 # NEW: Quick Balance Update feature
│   │   ├── index.ts
│   │   ├── quick-update-view.tsx     # Main view component
│   │   ├── balance-list.tsx          # List of all balances
│   │   ├── balance-list-item.tsx     # Individual balance row
│   │   └── empty-state.tsx           # No accounts/cards state
│   └── ui/                           # Existing shadcn/ui components
├── db/
│   └── index.ts                      # MODIFY: Add version 2 migration
├── hooks/
│   ├── use-cashflow-projection.ts    # MODIFY: Accept projection days param
│   └── use-user-preferences.ts       # NEW: Preferences hook
├── lib/
│   ├── cashflow/
│   │   └── calculate.ts              # Already supports projectionDays option
│   └── staleness.ts                  # NEW: Staleness detection utilities
├── pages/
│   └── dashboard.tsx                 # MODIFY: Add health indicator, projection selector
├── stores/
│   ├── finance-store.ts              # MODIFY: Add updateBalance action with timestamp
│   └── preferences-store.ts          # NEW: User preferences store
└── types/
    └── index.ts                      # MODIFY: Add balanceUpdatedAt, UserPreferences
```

**Structure Decision**: Extending existing single SPA structure. New Quick Balance Update components go in `src/components/quick-update/`. Dashboard enhancements (health indicator, projection selector, surplus/deficit) go in `src/components/cashflow/`.

## Complexity Tracking

> No violations - design follows existing patterns and stays within constitution guidelines.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
