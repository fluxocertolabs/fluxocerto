# Implementation Plan: Data Management UI

**Branch**: `005-data-management-ui` | **Date**: 2025-11-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-data-management-ui/spec.md`

## Summary

Build a comprehensive data management interface at `/manage` route that allows users to create, read, update, and delete financial entities (bank accounts, projects/income, fixed expenses, and credit cards). The interface uses a tabbed layout for entity organization, supports inline editing for quick balance updates, and integrates with the existing Zustand store and Dexie.js database layer. Navigation between dashboard and data management is enabled via a CTA button in the empty state and persistent header navigation.

## Technical Context

**Language/Version**: TypeScript 5.9.3  
**Primary Dependencies**: React 19.2.0, Zustand 5.0.8, Dexie.js 4.2.1, shadcn/ui, Zod 4.1.13  
**Storage**: IndexedDB (via Dexie.js) - local-first  
**Testing**: Vitest 4.0.14 + React Testing Library 16.3.0  
**Target Platform**: Modern browsers (desktop + mobile web)  
**Project Type**: Single-page application (SPA)  
**Performance Goals**: < 100ms form validation, < 1s data persistence, 60fps UI interactions  
**Constraints**: Offline-capable, no external APIs, mobile-responsive (min 320px width)  
**Scale/Scope**: ~20 entities per type maximum, single user

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Check

| Gate | Status | Notes |
|------|--------|-------|
| Tech stack matches constitution | ✅ PASS | React 19, TypeScript 5.9.3, Zustand, Dexie.js, shadcn/ui, Tailwind CSS 4 |
| Follows existing architecture patterns | ✅ PASS | Components in `/src/components`, pages in `/src/pages`, stores in `/src/stores` |
| Uses pinned dependency versions | ✅ PASS | Will use exact versions from constitution |
| Follows naming conventions | ✅ PASS | kebab-case files, PascalCase components, camelCase functions |
| Local-first data model | ✅ PASS | All data persisted via existing Dexie.js layer |
| No new external dependencies required | ⚠️ NEEDS RESEARCH | Need routing library (react-router-dom) |
| Reuses existing store actions | ✅ PASS | All CRUD operations exist in finance-store.ts |
| Mobile-responsive design | ✅ PASS | Required by spec, using Tailwind responsive classes |

### Post-Phase 1 Check (after design complete)

| Gate | Status | Notes |
|------|--------|-------|
| Tech stack matches constitution | ✅ PASS | All tech confirmed compatible |
| Follows existing architecture patterns | ✅ PASS | Design follows established patterns |
| Uses pinned dependency versions | ✅ PASS | react-router-dom@7.9.6 pinned exactly |
| Follows naming conventions | ✅ PASS | All new files follow kebab-case convention |
| Local-first data model | ✅ PASS | No schema changes, uses existing DB layer |
| New dependency justified | ✅ PASS | react-router-dom required for spec FR-001, FR-002 (navigation) |
| Reuses existing store actions | ✅ PASS | All CRUD via existing finance-store actions |
| Mobile-responsive design | ✅ PASS | Contracts specify responsive patterns |
| No over-engineering | ✅ PASS | Minimal components, no unnecessary abstractions |

## Project Structure

### Documentation (this feature)

```text
specs/005-data-management-ui/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output (UI component contracts)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── ui/                      # shadcn/ui primitives (to be installed)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── switch.tsx
│   │   ├── tabs.tsx
│   │   └── alert-dialog.tsx
│   ├── layout/                  # NEW: Layout components
│   │   └── header.tsx           # Persistent navigation header
│   ├── manage/                  # NEW: Data management components
│   │   ├── accounts/
│   │   │   ├── account-form.tsx
│   │   │   ├── account-list.tsx
│   │   │   └── account-list-item.tsx
│   │   ├── projects/
│   │   │   ├── project-form.tsx
│   │   │   ├── project-list.tsx
│   │   │   └── project-list-item.tsx
│   │   ├── expenses/
│   │   │   ├── expense-form.tsx
│   │   │   ├── expense-list.tsx
│   │   │   └── expense-list-item.tsx
│   │   ├── credit-cards/
│   │   │   ├── credit-card-form.tsx
│   │   │   ├── credit-card-list.tsx
│   │   │   └── credit-card-list-item.tsx
│   │   └── shared/
│   │       ├── entity-empty-state.tsx
│   │       ├── delete-confirmation.tsx
│   │       └── inline-edit-input.tsx
│   └── cashflow/                # Existing (update empty-state.tsx)
├── pages/
│   ├── dashboard.tsx            # Existing (add header integration)
│   └── manage.tsx               # NEW: Data management page
├── stores/
│   └── finance-store.ts         # Existing (no changes needed)
├── db/
│   └── index.ts                 # Existing (no changes needed)
├── hooks/
│   ├── use-cashflow-projection.ts  # Existing
│   └── use-finance-data.ts         # NEW: Hook to access all finance data
├── lib/
│   └── utils.ts                 # Existing (may add form helpers)
├── types/
│   └── index.ts                 # Existing (no changes needed)
└── App.tsx                      # Update with routing
```

**Structure Decision**: Single SPA with client-side routing. New `/manage` page with tabbed interface. Shared layout components for consistent navigation. Entity-specific components organized by domain (accounts, projects, expenses, credit-cards).

## Complexity Tracking

> No constitution violations requiring justification.

| Decision | Rationale |
|----------|-----------|
| Adding react-router-dom | Required for `/manage` route navigation per spec. Minimal routing library for SPA. |
| Tab-based UI | Spec requirement for organized entity management. Uses shadcn/ui Tabs component. |
| Inline editing | Spec requirement (FR-011, FR-012) for quick balance updates. Custom component. |

