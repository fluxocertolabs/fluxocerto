# Implementation Plan: Single-Shot Income

**Branch**: `018-single-shot-income` | **Date**: 2025-11-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/018-single-shot-income/spec.md`

## Summary

Add support for single-shot (one-time) income entries that occur on a specific calendar date, not recurring. This extends the existing `projects` table with a `type` discriminator column following the same pattern established by single-shot expenses (feature 014). Users can create, edit, and delete single-shot income with name, amount, date, and certainty level. Income appears in cashflow projections on the exact scheduled date with certainty-based scenario filtering.

## Technical Context

**Language/Version**: TypeScript 5.9.3
**Primary Dependencies**: React 19.2.0, Vite 7.2.4, Supabase (@supabase/supabase-js 2.86.0), Zustand 5.0.8, Zod 4.1.13
**Storage**: Supabase PostgreSQL (extends existing `projects` table)
**Testing**: Vitest 4.0.14 + React Testing Library 16.3.0
**Target Platform**: Web SPA (Vite dev server on port 5173)
**Project Type**: Web application (single SPA)
**Performance Goals**: < 1s initial load, < 100ms cashflow recalculation
**Constraints**: Must follow existing single-shot expenses pattern, maintain backward compatibility with recurring projects
**Scale/Scope**: Personal finance app, single user per session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Tech stack matches | ✅ PASS | TypeScript, React 19, Supabase, Zustand, Zod - all match constitution |
| Follows existing patterns | ✅ PASS | Mirrors 014-single-shot-expenses implementation pattern |
| Database approach | ✅ PASS | Extends existing table with discriminator (same as expenses) |
| No new dependencies | ✅ PASS | Uses existing stack only |
| UI components | ✅ PASS | Uses shadcn/ui components, follows existing manage page patterns |
| Naming conventions | ✅ PASS | kebab-case files, PascalCase components, camelCase functions |
| Amount in cents | ✅ PASS | Follows existing monetary value convention |

## Project Structure

### Documentation (this feature)

```text
specs/018-single-shot-income/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output
    └── store-api.md     # Store operations contract
```

### Source Code (repository root)

```text
src/
├── components/
│   └── manage/
│       └── projects/
│           ├── project-form.tsx            # Existing (no changes)
│           ├── project-list.tsx            # Existing (no changes)
│           ├── project-list-item.tsx       # Existing (no changes)
│           ├── project-section.tsx         # NEW: Tab container for recurring/single-shot
│           ├── single-shot-income-form.tsx # NEW: Form for single-shot income
│           ├── single-shot-income-list.tsx # NEW: List for single-shot income
│           └── single-shot-income-list-item.tsx # NEW: List item for single-shot income
├── hooks/
│   └── use-finance-data.ts                 # MODIFY: Add single-shot income mapping
├── lib/
│   └── cashflow/
│       ├── calculate.ts                    # MODIFY: Add single-shot income events
│       ├── validators.ts                   # MODIFY: Add single-shot income validation
│       └── types.ts                        # MODIFY: Add SingleShotIncomeEvent type
├── stores/
│   └── finance-store.ts                    # MODIFY: Add single-shot income CRUD
├── pages/
│   └── Manage.tsx                          # MODIFY: Use ProjectSection component
└── types/
    └── index.ts                            # MODIFY: Add single-shot income types

supabase/
└── migrations/
    └── 008_single_shot_income.sql          # NEW: Migration to extend projects table
```

**Structure Decision**: Web application structure with frontend-only changes. Backend is Supabase PostgreSQL with RLS policies. Follows existing component organization under `src/components/manage/`.

## Complexity Tracking

> No constitution violations. Implementation follows established patterns from 014-single-shot-expenses.

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Database schema | Extend `projects` table | Same pattern as expenses, maintains single source of truth |
| TypeScript types | Discriminated union | Same pattern as expenses, type-safe at compile time |
| UI structure | Sub-tabs under Projetos | Matches spec requirement, mirrors expense section pattern |
