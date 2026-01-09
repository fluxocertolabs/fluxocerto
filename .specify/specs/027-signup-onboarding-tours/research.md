# Research: Self-Serve Signup, Onboarding & Tours

**Feature**: 027-signup-onboarding-tours  
**Date**: 2026-01-05

## Overview

This feature touches three core areas:

1. **Auth model**: migrate from invite-only semantics to **self-serve** Magic Link signup (no email enumeration).
2. **First-login provisioning**: guarantee that a brand-new authenticated user always has a usable **group + profile membership** so group-scoped pages never error.
3. **Guided UX**: add a persisted **onboarding wizard** and per-page **tours** that coordinate overlays and behave consistently across devices.

The specification itself contains no remaining clarifications; this research resolves implementation decisions and risks surfaced by the current codebase.

## Decision 1: How to prevent “orphaned” first login (group/profile provisioning)

**Decision**: Create an idempotent database-side provisioning path:

- A `SECURITY DEFINER` SQL function (callable via `supabase.rpc`) to **ensure** that the current authenticated user has a profile row and a group.
- A trigger on `auth.users` insert to call the same logic at user-creation time (best-effort).

**Rationale**:

- The app is **group-scoped** via RLS (`get_user_group_id()` reads `profiles.group_id` by email). Without a `profiles` row, group-scoped queries return “no rows” / permission errors (see `src/hooks/use-group.ts` orphan handling).
- Client-only provisioning is not safe because it cannot use the service role and would require weakening RLS.
- A callable, idempotent function supports the required **recoverable error** path (“Retry provisioning”) without leaking secrets.

**Key design points**:

- Use the authenticated user’s `auth.uid()` as the **deterministic group id** for self-serve signups, making provisioning idempotent and avoiding orphaned groups from races.
- For users that already have a `profiles` row (e.g. legacy/invited), do **not** create a new group; simply ensure the group exists and that the profile has a `group_id`.

**Alternatives considered**:

- **Frontend-only self-heal**: rejected because it cannot safely create group/profile without privileged access.
- **Edge Function only**: possible, but adds an additional deployment/runtime dependency and still needs idempotency/race handling. SQL function + trigger keeps the invariant close to the data.

## Decision 2: How to implement self-serve signup without email enumeration

**Decision**: Keep the existing Magic Link flow (`signInWithOtp`, `shouldCreateUser: true`) and remove invite-only gating.

**Rationale**:

- The current UI already shows a generic post-submit success state (`src/components/auth/login-form.tsx`), which satisfies the “no enumeration” requirement when signup is allowed.
- The current invite-only gating is implemented via a “before-user-created” hook/function that blocks unapproved emails (`supabase/functions/before-user-created/index.ts`). This must be disabled/removed for self-serve signups.

**Alternatives considered**:

- **Keep allowlist but hide errors**: rejected because it violates the spec’s self-serve scope and still blocks acquisition.
- **Split signup vs login UI**: rejected because the spec requires a unified flow.

## Decision 3: Where to persist onboarding state (server-side, per user + group)

**Decision**: Add a dedicated `onboarding_states` table keyed by `(user_id, group_id)` that stores:

- status (`in_progress | dismissed | completed`)
- `auto_shown_at` (to enforce “auto-show only once” per user+group)
- a minimal progress payload (`current_step`, plus optional metadata)
- timestamps (`dismissed_at`, `completed_at`, `updated_at`)

**Rationale**:

- Requirements mandate server-side persistence and group-awareness (FR-010/FR-011).
- Computing progress solely from existing entities (accounts/projects/expenses) is tempting but loses the “dismissed vs never-started” nuance and makes “resume where you left off” less reliable.

**Alternatives considered**:

- **Store in `user_preferences`**: rejected because the table is group-scoped (unique per group + key) and not per-user in the current schema, and it’s not designed for multi-field progress payloads.
- **Derive everything from entities**: rejected because it cannot represent “dismissed once” and “resume step index” cleanly.

## Decision 4: Where to persist tour state (server-side, per user + page + version)

**Decision**: Add a `tour_states` table keyed by `(user_id, tour_key)` storing:

- status (`completed | dismissed`)
- version (integer) so new releases can re-trigger tours safely
- timestamps (`completed_at`/`dismissed_at`, `updated_at`)

**Rationale**:

- Requirements mandate server-side persistence across devices (FR-017) and versioning (spec clarifications).
- Per-user state avoids multi-member groups repeatedly interrupting each other.

**Alternatives considered**:

- **LocalStorage**: rejected (not cross-device).
- **Group-scoped storage**: rejected (multi-member groups must not interrupt each person).

## Decision 5: Tour UI implementation approach

**Decision**: Implement a lightweight in-house “tour runner” (no new dependency) that:

- Locates step targets via selectors (or explicit refs)
- Anchors a coachmark card near the target (best-effort positioning)
- Supports Next/Back/Skip/Close
- Skips missing targets gracefully (FR-018)

**Rationale**:

- Avoids introducing a potentially React-version-sensitive dependency into a React 19 codebase.
- Keeps styling consistent with existing Tailwind/shadcn/ui primitives.

**Alternatives considered**:

- **driver.js / react-joyride / reactour**: viable, but increases dependency surface and may require non-trivial styling overrides; defer until custom implementation proves insufficient.

## Decision 6: Overlay coordination (wizard vs tours)

**Decision**: Treat “onboarding wizard active” as a global UI state (wizard open) and gate tours behind it:

- If wizard is open → never auto-start tours.
- After wizard is **completed or dismissed** → tours may auto-start on the next eligible page visit.

**Rationale**:

- Matches spec clarification: defer tours while wizard is active; allow tours after completion/dismissal.
- Prevents competing overlays and preserves navigation.

## Implementation Risks & Mitigations

- **Race conditions in provisioning**: mitigate by deterministic group id = `auth.uid()` and idempotent SQL function.
- **Redirect URL mismatch in local dev**: local Supabase config restricts redirects to port `5174` (`supabase/config.toml`). Mitigate by standardizing local dev to `pnpm dev:app -- --port 5174` (documented in `quickstart.md`) or updating the redirect allowlist if project conventions change.
- **Missing tour targets**: mitigate by pre-resolving each step target; if absent, skip to next step and record telemetry (console in dev) without crashing.


