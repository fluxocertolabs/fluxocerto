# Implementation Plan: Notifications & Profile Settings

**Branch**: `028-notifications-profile` | **Date**: 2026-01-09 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `.specify/specs/028-notifications-profile/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement the first version of a Notifications system (**in-app + email**) and a minimal **Profile settings** area:

- In-app notifications inbox (persistent, unread/read state, unread indicator, realtime updates)
- Profile settings (update display name, show authenticated email read-only, toggle email notifications opt-out)
- Split preferences: rename current group-scoped `user_preferences` → `group_preferences`, add new per-user `user_preferences`
- Create a single welcome notification per user (DB-enforced idempotency via `dedupe_key`)

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.9.3 (Node >= 20), React 19.2.0, Vite 7.2.4  
**Primary Dependencies**: `@supabase/supabase-js@2.86.0`, Zustand 5.0.8, React Router 7.9.6, shadcn/ui + Tailwind  
**Storage**: Supabase (PostgreSQL + Auth + Realtime). Data isolation via RLS (`group_id` for shared finance data; this feature adds user-scoped notifications).  
**Testing**: Vitest (unit), Playwright (E2E + visual). Local email capture via Inbucket (Supabase local).  
**Target Platform**: Web app (Vercel deployment) + Supabase Edge Functions for trusted server-side work (email sending).  
**Project Type**: Web application (single Vite/React frontend; Supabase backend).  
**Performance Goals**: New notifications appear in-app within ~5s under normal connectivity (SC-003); unread count updates within ~2s after marking read (SC-004).  
**Constraints**:
- All new UI copy must be pt-BR (placeholders acceptable).
- No secrets in the browser; email sending must be server-controlled (FR-012).
- Privacy: notifications are per-user; must never leak across users (FR-019).
**Scale/Scope**: First iteration: one notification type (“welcome”), inbox + read state, one email preference toggle, minimal Profile page.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- ✅ **UI language**: all user-facing strings introduced by this feature are pt-BR (placeholders allowed).
- ✅ **Code language**: identifiers and comments remain English.
- ✅ **Security**: no service role keys in the browser; email sending only from trusted server environment (Supabase Edge Function).
- ✅ **Privacy (RLS)**: notifications are scoped to `auth.uid()`; other users (including same group members) cannot read or mutate them.
- ✅ **Reuse patterns / minimal change**: follow existing Supabase (PostgREST/RPC + Realtime) usage patterns and repo conventions.

**Design artifacts (this plan)**:
- Phase 0: [research.md](./research.md)
- Phase 1: [data-model.md](./data-model.md)
- Phase 1: `contracts/` (OpenAPI)
- Phase 1: `quickstart.md` (local verification guide)

## Project Structure

### Documentation (this feature)

```text
.specify/specs/028-notifications-profile/
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
│   ├── layout/                 # header/nav (add Notifications + Profile links)
│   ├── notifications/          # inbox list + items (new)
│   └── profile/                # profile settings form (new)
├── hooks/
│   ├── use-notifications.ts    # fetch + realtime subscription + unread count (new)
│   └── use-profile.ts          # profile + email pref read/write helpers (new)
├── lib/
│   ├── supabase.ts             # add RPC/helper wrappers (e.g., ensure welcome)
│   └── theme-service.ts        # update to use `group_preferences` table (rename)
├── pages/
│   ├── notifications.tsx       # inbox route (new)
│   └── profile.tsx             # profile settings route (new)
└── stores/
    └── notifications-store.ts  # optional: shared state for indicator (new if needed)

supabase/
├── migrations/                 # DB schema/RLS for notifications + preference split
└── functions/                  # Edge Functions for email sending (welcome email)

e2e/
└── tests/                      # add coverage for inbox + profile flows (Playwright)
```

**Structure Decision**: Single Vite/React app with Supabase backend. Implement UI in `src/pages/` + `src/components/`, data access and realtime in `src/hooks/`/`src/lib/`, schema/RLS in `supabase/migrations/`, and trusted email sending via a Supabase Edge Function in `supabase/functions/`.

## Complexity Tracking

No constitution violations requiring justification were identified for this feature.
