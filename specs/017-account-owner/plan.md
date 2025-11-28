# Implementation Plan: Account Owner Assignment

**Branch**: `017-account-owner` | **Date**: 2025-11-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/017-account-owner/spec.md`

## Summary

Add account owner assignment feature to Family Finance, allowing bank accounts and credit cards to be assigned to specific family members (Daniel or Aryane). This involves renaming the existing `allowed_emails` table to `profiles`, adding `owner_id` FK columns to `accounts` and `credit_cards` tables, and updating the UI to display/select owners with filtering capability. All UI text in Brazilian Portuguese (pt-BR).

## Technical Context

**Language/Version**: TypeScript 5.9.3  
**Primary Dependencies**: React 19.2.0, Zustand 5.0.8, Zod 4.1.13, @supabase/supabase-js 2.86.0  
**Storage**: Supabase PostgreSQL (cloud-hosted)  
**Testing**: Vitest 4.0.14 + React Testing Library 16.3.0  
**Target Platform**: Web SPA (Vite 7.2.4)  
**Project Type**: Single web application  
**Performance Goals**: < 100ms for UI interactions, < 1s for data operations  
**Constraints**: All UI text in pt-BR, seed-only profile management (no UI CRUD for profiles)  
**Scale/Scope**: 2 family members (Daniel, Aryane), ~10-20 accounts/cards total

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Check (Phase 0)

| Gate | Status | Notes |
|------|--------|-------|
| Tech stack alignment | ✅ PASS | Uses existing stack: React, Zustand, Supabase, Zod, shadcn/ui |
| File naming conventions | ✅ PASS | Will use kebab-case for files, PascalCase for components |
| Component structure | ✅ PASS | Will follow existing patterns in `src/components/manage/` |
| Data flow pattern | ✅ PASS | Zustand store → Supabase → Realtime → UI (existing pattern) |
| Testing approach | ✅ PASS | Unit tests for business logic, component tests with mocked Supabase |
| Validation strategy | ✅ PASS | Zod schemas for runtime validation (existing pattern) |
| Security model | ✅ PASS | RLS policies for authenticated access (existing pattern) |
| Language requirement | ✅ PASS | All UI text in pt-BR as required by spec |

### Post-Design Check (Phase 1)

| Gate | Status | Notes |
|------|--------|-------|
| Migration naming | ✅ PASS | `005_account_owner.sql` follows existing pattern (001-004) |
| Type definitions | ✅ PASS | Profile type added, BankAccount/CreditCard extended with nullable owner |
| Component patterns | ✅ PASS | OwnerBadge follows existing badge patterns (TYPE_LABELS in list items) |
| Form patterns | ✅ PASS | Owner dropdown follows existing Select patterns in forms |
| Store patterns | ✅ PASS | owner_id handling follows existing field update patterns |
| Data fetching | ✅ PASS | Supabase nested select for joins (documented in research.md) |
| RLS policies | ✅ PASS | Profiles SELECT policy for authenticated users |
| Backward compatibility | ✅ PASS | All changes are additive; existing data unaffected |

**No violations identified. All gates passed.**

## Project Structure

### Documentation (this feature)

```text
specs/017-account-owner/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no API contracts, frontend-only)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── manage/
│   │   ├── accounts/
│   │   │   ├── account-form.tsx       # MODIFY: Add owner dropdown
│   │   │   ├── account-list-item.tsx  # MODIFY: Add owner badge
│   │   │   └── account-list.tsx       # MODIFY: Add filter dropdown
│   │   └── credit-cards/
│   │       ├── credit-card-form.tsx       # MODIFY: Add owner dropdown
│   │       ├── credit-card-list-item.tsx  # MODIFY: Add owner badge
│   │       └── credit-card-list.tsx       # MODIFY: Add filter dropdown
│   └── ui/
│       └── owner-badge.tsx            # NEW: Reusable owner badge component
├── hooks/
│   └── use-finance-data.ts            # MODIFY: Add profiles subscription
├── stores/
│   └── finance-store.ts               # MODIFY: Add owner_id to account/card operations
├── types/
│   └── index.ts                       # MODIFY: Add Profile type, extend BankAccount/CreditCard
└── lib/
    └── supabase.ts                    # No changes needed

supabase/
└── migrations/
    └── 005_account_owner.sql          # NEW: profiles table + owner_id columns

tests/
├── unit/                              # Unit tests for type validation
└── integration/                       # Component tests with mocked Supabase
```

**Structure Decision**: Single web application - extends existing structure with modifications to account/credit-card components and a new migration for the profiles table and owner_id columns.

## Complexity Tracking

> No constitution violations to justify.

| Aspect | Assessment |
|--------|------------|
| New dependencies | None required |
| New patterns | None - follows existing form/list patterns |
| Database changes | Additive only (new table + nullable columns) |
| Breaking changes | None - owner_id is optional, existing data unaffected |
