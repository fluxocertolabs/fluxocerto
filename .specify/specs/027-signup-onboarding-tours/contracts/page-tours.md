# Page Tours (Coachmarks) Contract

**Feature**: 027-signup-onboarding-tours  
**Type**: Persisted per-user tour state + UI behavior  
**Scope**: Dashboard, Manage, History tours (spec FR-014–FR-018)

## Tour Scope (Pages)

In scope:

- `dashboard`
- `manage`
- `history`

Out of scope:

- Any additional pages

## Persistence Contract (Server-side)

### Table: `tour_states`

Key:
- `(user_id, tour_key)` unique

Fields (minimum required):
- `user_id`: UUID FK → `auth.users(id)`
- `tour_key`: `'dashboard' | 'manage' | 'history'`
- `status`: `'completed' | 'dismissed'`
- `version`: integer
- timestamps (`completed_at`, `dismissed_at`, `updated_at`, `created_at`)

RLS:
- Users may read/write only their own tour rows: `user_id = auth.uid()`.

### Versioning

Each tour has a `CURRENT_TOUR_VERSION` integer in the client code.

Eligibility:
- If no row exists → eligible to auto-show.
- If row exists with `version < CURRENT_TOUR_VERSION` → eligible to auto-show (tour definition changed).
- If row exists with `version == CURRENT_TOUR_VERSION` → not eligible to auto-show if `status` is present.

## UX Contract (Client)

### Auto-start rule

On the user’s first visit to a target page:

- If onboarding wizard is NOT active → tour auto-starts.
- If onboarding wizard IS active → do not auto-start; defer until onboarding is completed or dismissed, then auto-start on the next eligible visit.

### Controls

Tours must support:
- Next
- Back
- Skip/Close

Completed/dismissed tours must not auto-show again (unless version bumped).

### Manual replay

Provide an explicit user action “Mostrar tour” that replays the tour even if it is already completed/dismissed.

### Missing targets (FR-018)

Each step targets an element that may be missing (responsive layout, conditional UI).

Rules:
- If a step target cannot be found, the tour runner must **skip** that step and continue.
- If all remaining steps are missing, the tour should end gracefully (and may record as dismissed/completed depending on product decision; default: dismissed).

## Suggested Implementation Shape (internal)

- A `TourDefinition` per page (steps array, selectors, copy in pt-BR, version).
- A small `tour runner` component that:
  - Resolves targets per step
  - Positions a coachmark near the target
  - Coordinates with global “wizard active” state


