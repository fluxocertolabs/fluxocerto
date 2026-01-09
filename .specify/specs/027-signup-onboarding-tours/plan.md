# Implementation Plan: Self-Serve Signup, Onboarding & Tours

**Branch**: `027-signup-onboarding-tours` | **Date**: 2026-01-05 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/.specify/specs/027-signup-onboarding-tours/spec.md`

## Summary

Implement a **self-serve Magic Link signup/login** flow, guarantee **no orphaned first login** by provisioning new users into a **brand-new group**, and deliver a first-run experience with:

- A **skippable onboarding wizard** that helps the user create the **minimum dataset for a projection** (account + income + expense), with **server-side persisted progress** and “Continuar configuração” re-entry points.
- **First-time page tours** (Dashboard, Manage, History) that auto-start on first visit, are **deferred while onboarding wizard is active**, can be dismissed (Skip/Close) and replayed intentionally, with **server-side persisted completion/dismissal state**.

The plan preserves privacy (no email enumeration), keeps all new UI copy in **pt-BR**, and keeps existing **dev auth bypass** behavior intact.

## Technical Context

**Language/Version**: TypeScript 5.9.3 (React 19.2.0, Vite 7.2.4; Node >= 20)  
**Primary Dependencies**: react-router-dom 7.9.6, @supabase/supabase-js 2.86.0, zustand 5.0.8, zod 4.1.13, Tailwind CSS 4.1.17 (+ shadcn/ui/Radix)  
**Storage**: Supabase PostgreSQL (existing: `groups`, `profiles`, `accounts`, `projects` *(income sources)*, `expenses`, `credit_cards`, …; new: onboarding/tour state tables)  
**Testing**: Vitest 4.0.14 (unit), Playwright 1.57.0 (E2E/visual)  
**Target Platform**: Web SPA (modern browsers; deployed on Vercel)  
**Project Type**: Single SPA with Supabase backend  
**Performance Goals**: On initial authenticated app load, add at most ~2 small reads (onboarding + tour state) beyond existing finance/group reads (measure via browser network requests to Supabase); keep UI overlays responsive (60fps)  
**Constraints**: UI text in pt-BR; code/docs in English; no email enumeration; RLS must remain active; state must persist server-side and behave consistently across devices; dev auth bypass must continue to load the dashboard without manual login  
**Scale/Scope**: Typical household scale (≤100 entities), 3 tour pages, 1 onboarding flow per user+group  
**Provisioning**: `ensure_current_user_group()` is an idempotent RPC that ensures the authenticated user has a valid `profiles` row and membership in exactly one group; for self-serve first login it creates a new `groups` row with deterministic `id = auth.uid()`.

### Validation Notes (NFRs)

- **NFR-001 (Privacy)**: Login UI must not reveal whether an email is new or existing; validate with two emails (known and never-seen) and confirm identical UI states for the Magic Link request step.
- **NFR-002 (Reliability)**: New users must never land in a “missing group/profile” dead-end; validate by signing up with a fresh email and immediately refreshing/navigating across pages.
- **NFR-003 (Cross-device consistency)**: Onboarding progress and tour completion must persist across refreshes and devices; validate by completing/dismissing on one browser, then signing in on another and confirming identical behavior.
- **NFR-004 (Overlay coordination)**: Onboarding wizard and page tours must never overlap; tours are deferred while the wizard is open and may auto-start on the next eligible page visit after completion/dismissal (see `spec.md` FR-010, FR-016).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| **UI Text in pt-BR** | ✅ PASS | All new wizard/tour copy must be pt-BR (see `spec.md` FR-019) |
| **Code in English** | ✅ PASS | New hooks/components/types remain English |
| **Tech Stack Alignment** | ✅ PASS | Uses existing React/Vite/Supabase/Zustand stack |
| **Auth = Magic Link** | ✅ PASS | Remains passwordless Magic Link (see constitution + `spec.md` FR-001) |
| **Auth access control = self-serve** | ✅ PASS | Constitution updated to self-serve; this feature removes invite-only gating while keeping RLS active. |
| **RLS remains active** | ✅ PASS | Provisioning and new state tables use RLS; no “USING true” shortcuts |
| **Dev auth bypass remains available** | ✅ PASS | Must not be blocked by onboarding/tour UX (see `spec.md` FR-020) |

**Gate Result**: ✅ PROCEED

## Project Structure

### Documentation (this feature)

```text
.specify/specs/027-signup-onboarding-tours/
├── plan.md                   # This file
├── research.md               # Phase 0 output
├── data-model.md             # Phase 1 output
├── quickstart.md             # Phase 1 output
├── contracts/                # Phase 1 output (internal/API contracts)
│   ├── auth-provisioning.md
│   ├── onboarding.md
│   └── page-tours.md
└── tasks.md                  # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
supabase/
├── migrations/
│   ├── 20260105123000_self_serve_signup_provisioning.sql  # NEW: ensure group/profile for new users (+ self-heal RPC)
│   └── 20260105123100_onboarding_and_tour_state.sql       # NEW: onboarding + tour state tables, RLS, triggers
└── functions/
    └── before-user-created/                           # Modified or removed: disable invite-only gating for self-serve

src/
├── lib/
│   ├── supabase.ts                                   # Modified: add onboarding/tour state helpers + provisioning retry hook
│   ├── onboarding/                                   # NEW: onboarding constants + state machine helpers
│   └── tours/                                        # NEW: tour definitions (steps/selectors/versioning)
├── hooks/
│   ├── use-group.ts                                  # Modified: surface recoverable error + retry path for provisioning failures
│   ├── use-onboarding-state.ts                       # NEW: fetch/compute onboarding eligibility + progress
│   └── use-page-tour.ts                              # NEW: fetch/compute tour eligibility + run/replay
├── components/
│   ├── auth/
│   │   └── login-form.tsx                             # Modified: keep generic success state; remove invite-only wording
│   ├── onboarding/
│   │   ├── onboarding-wizard.tsx                     # NEW: multi-step wizard UI (pt-BR copy)
│   │   └── continue-setup-cta.tsx                    # NEW: reusable entry point
│   └── tours/
│       ├── tour-runner.tsx                           # NEW: lightweight coachmark runner with skip/next/back
│       └── tour-trigger.tsx                          # NEW: “Mostrar tour” trigger component
├── pages/
│   ├── login.tsx                                     # Modified: self-serve Magic Link copy (no invite-only messaging)
│   ├── auth-callback.tsx                             # Modified: ensure provisioning before entering app (route: /auth/confirm)
│   ├── dashboard.tsx                                 # Modified: auto-start tour (when eligible)
│   ├── manage.tsx                                    # Modified: auto-start tour (when eligible)
│   └── history.tsx                                   # Modified: auto-start tour (when eligible)
└── components/layout/header.tsx                      # Modified: add “Continuar configuração” / “Mostrar tour” entry points

e2e/tests/
├── auth.spec.ts                                      # Modified: add fresh-email signup coverage (no orphaned first login)
├── onboarding-wizard.spec.ts                         # NEW: wizard auto-show/skip/resume behaviors
└── page-tours.spec.ts                                # NEW: tours auto-show once + replay + defer while wizard active
```

**Structure Decision**: Extend the existing single-SPA architecture with additive hooks/components and small, isolated Supabase migrations for provisioning + state persistence. Reuse existing “Manage” entity creation flows (accounts/projects/expenses/credit cards) where possible to keep UX consistent and reduce duplicated validation logic.

## Complexity Tracking

> No unjustified complexity.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | - | - |
