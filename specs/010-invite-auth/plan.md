# Implementation Plan: Invite-Only Magic Link Authentication

**Branch**: `010-invite-auth` | **Date**: 2025-11-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-invite-auth/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Transition Family Finance from anonymous authentication to invite-only Magic Link (passwordless email) authentication. Pre-approved email addresses stored in `allowed_emails` table are validated via a Supabase `before-user-created` database hook. All authenticated family members share the same financial data (no per-user isolation) through updated RLS policies.

## Technical Context

**Language/Version**: TypeScript 5.9.3  
**Primary Dependencies**: React 19.2.0, Vite 7.2.4, @supabase/supabase-js 2.86.0, react-router-dom 7.9.6, Zustand 5.0.8  
**Storage**: Supabase PostgreSQL (cloud-hosted)  
**Testing**: Vitest 4.0.14, React Testing Library 16.3.0  
**Target Platform**: Web SPA (modern browsers)  
**Project Type**: Web application (SPA)  
**Performance Goals**: Initial load < 1s, auth flow < 2 minutes end-to-end, sign-out < 1s  
**Constraints**: Supabase free tier limits, 1-hour Magic Link expiry (Supabase default)  
**Scale/Scope**: Single-family use, ~5 users, shared data access

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Check (Phase 0)

| Gate | Status | Notes |
|------|--------|-------|
| Uses pinned dependency versions | ✅ PASS | @supabase/supabase-js 2.86.0 already pinned |
| Follows existing architecture patterns | ✅ PASS | Extends existing Supabase client in `src/lib/supabase.ts` |
| Uses shadcn/ui for new UI components | ✅ PASS | Login page will use existing ui/ primitives |
| Follows file naming conventions (kebab-case) | ✅ PASS | New files: `login.tsx`, `auth-callback.tsx`, `use-auth.ts` |
| Uses Zustand for state management | ✅ PASS | Auth state can use existing pattern or simple React state |
| Follows TypeScript strict mode | ✅ PASS | Existing tsconfig enforces strict |
| No breaking changes to existing data | ⚠️ JUSTIFIED | user_id column removal is intentional per spec (fresh start for shared data) |
| RLS policies protect data | ✅ PASS | New policies allow all authenticated users (family sharing model) |

### Post-Design Check (Phase 1) ✅ COMPLETE

| Gate | Status | Notes |
|------|--------|-------|
| Data model follows existing patterns | ✅ PASS | `allowed_emails` table uses same conventions as other tables |
| API contracts use Supabase client | ✅ PASS | No custom REST endpoints, uses `supabase.auth.*` methods |
| Edge Function follows Supabase patterns | ✅ PASS | Uses standardwebhooks for signature verification |
| Migration is additive where possible | ✅ PASS | New table added; column removal is intentional per spec |
| Error handling matches existing patterns | ✅ PASS | Maps to user-friendly messages like existing `handleSupabaseError` |
| Route protection follows React patterns | ✅ PASS | Uses hooks + conditional rendering, no complex middleware |
| No new dependencies required | ✅ PASS | All functionality uses existing @supabase/supabase-js 2.86.0 |

**Complexity Tracking**:

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Remove user_id column | Spec requirement: all family members share data | Per-user isolation defeats the purpose of family sharing |
| Database hook (Edge Function) | Invite-only access control at signup time | Client-side validation is insecure; post-signup deletion is poor UX |

## Project Structure

### Documentation (this feature)

```text
specs/010-invite-auth/
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
│   ├── auth/                    # NEW: Auth-related components
│   │   └── login-form.tsx       # Magic Link request form
│   ├── layout/
│   │   └── header.tsx           # MODIFY: Add sign-out button
│   └── ui/                      # Existing shadcn/ui primitives
├── pages/
│   ├── login.tsx                # NEW: Login page
│   ├── auth-callback.tsx        # NEW: Magic Link callback handler
│   ├── dashboard.tsx            # EXISTING: Protected route
│   └── manage.tsx               # EXISTING: Protected route
├── hooks/
│   ├── use-auth.ts              # NEW: Auth state management
│   └── use-finance-data.ts      # MODIFY: Remove user_id filtering
├── lib/
│   └── supabase.ts              # MODIFY: Magic Link auth methods
├── App.tsx                      # MODIFY: Add routes, auth guard
└── main.tsx                     # MODIFY: Update auth initialization

supabase/
├── migrations/
│   ├── 001_initial_schema.sql   # EXISTING
│   └── 002_invite_auth.sql      # NEW: allowed_emails table, RLS changes
└── functions/
    └── before-user-created/     # NEW: Edge Function for invite validation
        └── index.ts
```

**Structure Decision**: Single web application structure. Auth components added to existing component hierarchy. New migration file for schema changes. Edge Function for signup validation hook.
