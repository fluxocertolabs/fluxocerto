# Implementation Plan: Supabase Migration

**Branch**: `008-supabase-migration` | **Date**: 2025-11-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-supabase-migration/spec.md`

## Summary

Migrate the Family Finance application from local-first IndexedDB (Dexie.js) to Supabase PostgreSQL as the backend database. This migration replaces the Dexie.js database layer with Supabase client, converts `useLiveQuery` reactive hooks to Supabase Realtime subscriptions, implements anonymous authentication for single-user mode, and sets up Row Level Security for future multi-user support. The migration enables cloud persistence while maintaining the current responsive user experience.

## Technical Context

**Language/Version**: TypeScript 5.9.3  
**Primary Dependencies**: React 19.2.0, Vite 7.2.4, Zustand 5.0.8, Zod 4.1.13, @supabase/supabase-js 2.86.0  
**Storage**: Supabase PostgreSQL (replacing IndexedDB/Dexie.js)  
**Testing**: Vitest 4.0.14 + React Testing Library 16.3.0  
**Target Platform**: Web browser (SPA)  
**Project Type**: Single-page web application  
**Performance Goals**: Initial load <2s, UI updates within 500ms of data changes  
**Constraints**: Network-dependent (graceful degradation on errors), Supabase free tier compatible  
**Scale/Scope**: Single-user household finance app, <100 entities typical

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Tech stack alignment | ✅ PASS | Uses React 19, TypeScript 5.9, Zustand 5.0.8, Zod 4.1.13 as per constitution |
| Pinned dependencies | ✅ PASS | @supabase/supabase-js pinned to 2.86.0 (verified latest) |
| Naming conventions | ✅ PASS | Files kebab-case, components PascalCase, functions camelCase |
| Component structure | ✅ PASS | Maintains existing hooks/stores/components pattern |
| Testing strategy | ✅ PASS | Will mock Supabase for component tests per constitution |
| Data models | ✅ PASS | Keeps Zod schemas as source of truth (FR-008) |
| Security | ✅ PASS | Uses env vars for credentials (FR-017, FR-018), RLS enabled |

**Post-Design Re-check**: All gates pass. No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/008-supabase-migration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no external API)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── components/          # No changes needed (UI layer unchanged)
├── pages/               # No changes needed
├── stores/
│   └── finance-store.ts # UPDATE: Replace Dexie calls with Supabase
├── hooks/
│   └── use-finance-data.ts # UPDATE: Replace useLiveQuery with Supabase subscriptions
├── db/
│   └── index.ts         # UPDATE: Replace Dexie with Supabase client (or remove)
├── lib/
│   ├── supabase.ts      # NEW: Supabase client singleton + auth helper
│   └── cashflow/        # No changes (calculation engine unchanged)
├── types/
│   └── index.ts         # No changes (Zod schemas remain source of truth)
└── main.tsx             # UPDATE: Initialize anonymous auth on app start

supabase/
└── migrations/
    └── 001_initial_schema.sql  # NEW: Database schema + RLS policies

# Root files
├── .env.example         # NEW: Environment variable template
└── package.json         # UPDATE: Add supabase-js, remove dexie deps
```

**Structure Decision**: Single project structure maintained. New `src/lib/supabase.ts` follows existing pattern of utilities in `/lib`. Database schema lives in `supabase/migrations/` following Supabase CLI conventions.

## Complexity Tracking

No violations requiring justification. The migration follows a straightforward replacement pattern:
- Dexie.js → Supabase client (1:1 replacement)
- useLiveQuery → Supabase Realtime subscriptions (1:1 replacement)
- Local storage → Cloud PostgreSQL (architectural upgrade, not complexity increase)
