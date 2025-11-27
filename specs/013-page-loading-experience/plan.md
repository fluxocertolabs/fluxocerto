# Implementation Plan: Page Loading Experience

**Branch**: `013-page-loading-experience` | **Date**: 2025-11-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-page-loading-experience/spec.md`

## Summary

Eliminate UI flickering and provide a polished, professional loading experience across all pages (Dashboard, Manage, Quick Update modal) using a **hybrid approach** (existing hooks + coordinated state management) with dedicated Skeleton components, ARIA live regions for accessibility, and smooth CSS fade transitions (250ms).

**Key Technical Decisions** (from research):
- **Architecture**: Hybrid approach - keep existing `useFinanceData` hook, add coordinated loading state wrapper
- **Transitions**: CSS opacity fade (250ms, GPU-accelerated) - no layout shifts
- **Minimum Display**: 100ms skeleton display to prevent flash on fast loads
- **Timeout**: 5-second threshold before showing timeout error
- **Accessibility**: `aria-live="polite"` + `aria-busy` for non-interrupting announcements

## Technical Context

**Language/Version**: TypeScript 5.9.3  
**Primary Dependencies**: React 19.2.0, React Router 7.9.6, Zustand 5.0.8, Tailwind CSS 4.1.17  
**Storage**: Supabase PostgreSQL (@supabase/supabase-js 2.86.0)  
**Testing**: Vitest 4.0.14 + React Testing Library 16.3.0  
**Target Platform**: Web SPA (Vite 7.2.4)  
**Project Type**: Web application (SPA)  
**Performance Goals**: Zero CLS, minimum 100ms skeleton display, 5s timeout threshold  
**Constraints**: No visible flickering, smooth transitions (200-300ms fade), ARIA accessibility  
**Scale/Scope**: 3 pages (Dashboard, Manage) + 1 modal (Quick Update)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Uses pinned dependencies | ✅ PASS | React 19.2.0, all deps pinned in package.json |
| Follows existing patterns | ✅ PASS | Extends existing LoadingSkeleton, ErrorState components |
| Uses shadcn/ui components | ✅ PASS | Will use existing UI primitives |
| Uses Tailwind CSS | ✅ PASS | All styling via Tailwind classes |
| Uses Zustand for state | ✅ PASS | Will use existing store patterns |
| TypeScript strict mode | ✅ PASS | Project already uses strict mode |
| File naming: kebab-case | ✅ PASS | Following existing convention |
| Component naming: PascalCase | ✅ PASS | Following existing convention |

**No violations detected. Proceeding with Phase 0.**

## Project Structure

### Documentation (this feature)

```text
specs/013-page-loading-experience/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output (N/A - no API contracts)
```

### Source Code (repository root)

```text
src/
├── types/
│   └── loading.ts                  # NEW: Loading state type definitions
├── components/
│   └── loading/                    # NEW: Loading experience components
│       ├── page-loading-wrapper.tsx    # Wrapper with ARIA + transitions
│       ├── dashboard-skeleton.tsx      # Dashboard-specific skeleton
│       ├── manage-skeleton.tsx         # Manage page skeleton  
│       └── modal-skeleton.tsx          # Quick Update modal skeleton
├── hooks/
│   └── use-coordinated-loading.ts  # NEW: Coordinated loading state hook
├── pages/
│   ├── dashboard.tsx               # EXISTING: Will integrate new loading
│   └── manage.tsx                  # EXISTING: Will integrate new loading
└── components/
    ├── cashflow/
    │   └── loading-skeleton.tsx    # EXISTING: May be deprecated/consolidated
    └── quick-update/
        └── quick-update-view.tsx   # EXISTING: Will be enhanced
```

**Structure Decision**: Single project structure. New loading infrastructure in `src/components/loading/` and `src/hooks/`. The existing `LoadingSkeleton` in `cashflow/` may be consolidated into the new `DashboardSkeleton` to avoid duplication.

## Complexity Tracking

> No violations requiring justification.

---

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design completion.*

| Gate | Status | Notes |
|------|--------|-------|
| Uses pinned dependencies | ✅ PASS | No new dependencies required |
| Follows existing patterns | ✅ PASS | Extends existing skeleton/error patterns |
| Uses shadcn/ui components | ✅ PASS | Uses existing Card, Button primitives |
| Uses Tailwind CSS | ✅ PASS | All transitions via Tailwind utilities |
| Uses Zustand for state | ✅ PASS | Loading state via React hooks (no store needed) |
| TypeScript strict mode | ✅ PASS | All new types are strictly typed |
| File naming: kebab-case | ✅ PASS | `use-coordinated-loading.ts`, `page-loading-wrapper.tsx` |
| Component naming: PascalCase | ✅ PASS | `PageLoadingWrapper`, `DashboardSkeleton` |
| Performance targets | ✅ PASS | Zero CLS, 250ms transitions, 100ms min display |
| Accessibility | ✅ PASS | ARIA live regions with polite announcements |

**All gates passed. Design is ready for implementation.**

---

## Generated Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Research | [research.md](./research.md) | Technical research and decisions |
| Data Model | [data-model.md](./data-model.md) | Type definitions and state machine |
| Quickstart | [quickstart.md](./quickstart.md) | Implementation guide with code examples |
| Contracts | [contracts/](./contracts/) | N/A - frontend-only feature |

---

## Next Steps

Run `/speckit.tasks` to generate implementation tasks from this plan.
