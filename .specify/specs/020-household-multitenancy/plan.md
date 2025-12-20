# Implementation Plan: Household Multi-Tenancy

**Branch**: `020-household-multitenancy` | **Date**: 2025-12-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/020-household-multitenancy/spec.md`

## Summary

Implement household-based multi-tenancy to isolate financial data between user groups. This involves creating a `households` table, adding `household_id` to all existing tables (profiles, accounts, projects, expenses, credit_cards, user_preferences), updating RLS policies for household-based data isolation, modifying the invite flow to assign `household_id` to new users, and displaying household name and members in the UI.

## Technical Context

**Language/Version**: TypeScript 5.9.3  
**Primary Dependencies**: React 19.2.0, Vite 7.2.4, @supabase/supabase-js 2.86.0, Zustand 5.0.8  
**Storage**: Supabase PostgreSQL (cloud-hosted)  
**Testing**: Vitest 4.0.14 + React Testing Library 16.3.0 (unit), Playwright 1.57.0 (E2E)  
**Target Platform**: Web SPA (React), deployed to Vercel  
**Project Type**: Web application (frontend only, BaaS backend)  
**Performance Goals**: < 1s initial load, < 100ms cashflow recalculation  
**Constraints**: Must work with existing Supabase free tier, no service interruption during migration  
**Scale/Scope**: ~2-10 users per household, unlimited households

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Status | Notes |
|------|--------|-------|
| Use exact pinned versions | ✅ PASS | No new dependencies required |
| Follow existing patterns | ✅ PASS | Extending existing Supabase/RLS patterns |
| TypeScript strict mode | ✅ PASS | Types will extend existing schemas |
| Supabase RLS required | ✅ PASS | Updating RLS from `USING(true)` to household-based |
| Portuguese PT-BR for UI | ✅ PASS | "residência", "membros" in UI text |
| Migration safety | ✅ PASS | Additive migration, no destructive changes |
| File naming: kebab-case | ✅ PASS | Will follow existing conventions |
| Zod for validation | ✅ PASS | Extending existing Zod schemas |

## Project Structure

### Documentation (this feature)

```text
specs/020-household-multitenancy/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── household-api.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
# Existing structure - changes inline
src/
├── components/
│   └── layout/
│       └── header.tsx           # Update: add household name display
│   └── household/               # NEW: household components
│       ├── household-badge.tsx  # Household name badge in header
│       └── members-list.tsx     # Members section in settings/manage
├── hooks/
│   ├── use-auth.ts              # Update: include household in auth state
│   └── use-household.ts         # NEW: household data hook
├── lib/
│   └── supabase.ts              # Update: add household row types
├── stores/
│   └── household-store.ts       # NEW: household state management
├── types/
│   └── index.ts                 # Update: add Household type/schema
└── pages/
    └── manage.tsx               # Update: add members section

supabase/
└── migrations/
    └── 009_households.sql       # NEW: households table + RLS updates
```

**Structure Decision**: Single web application structure maintained. New components follow existing patterns under `src/components/household/`. Database changes via single additive migration.

## Complexity Tracking

> No violations requiring justification. Feature follows existing patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | - | - |
