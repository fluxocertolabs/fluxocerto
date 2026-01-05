# Quickstart: Self-Serve Signup, Onboarding & Tours

This quickstart is for validating **027-signup-onboarding-tours** locally.

## Prerequisites

- Node.js `>= 20`
- pnpm `10.12.1`
- Local Supabase via `npx supabase` (repo scripts)

## Run locally

From repo root:

```bash
pnpm db:start
pnpm dev:app -- --port 5174
```

Notes:
- Local Supabase redirect allowlist is configured for `http://localhost:5174` (see `supabase/config.toml`).
- Local email capture UI (Inbucket) is at `http://localhost:54324`.

## Validate User Story 1: Unified Magic Link sign-in/sign-up

### 1) Existing email

- Open `http://localhost:5174/login`
- Request a Magic Link with a known email
- Confirm the UI shows a generic “Verifique seu e-mail” success state
- Open Inbucket (`http://localhost:54324`) and click the Magic Link
- Confirm you land in the app

### 2) Brand-new email

- From a logged-out/Incognito browser, request a Magic Link with a never-before-seen email
- Confirm the same generic success UI
- Click the Magic Link from Inbucket
- Confirm you land in the app without errors

### 3) Invalid/expired link recovery

- From a logged-out state, open a malformed or tampered confirmation URL (e.g., take a valid Magic Link URL from Inbucket and change the token/hash portion before opening it).

Expected:
- You see a pt-BR error state (e.g., “Link inválido ou expirado”) with an action like “Solicitar novo link” to return to the login screen and request a new Magic Link.

## Validate User Story 2: No orphaned first login

With a fresh email signup:

- Immediately refresh the page after landing in the app
- Navigate to:
  - Dashboard (`/`)
  - Manage (`/manage`)
  - History (`/history`)

Expected:
- No “missing membership/profile/group” errors.
- If provisioning fails, you should see a recoverable error with:
  - “Tentar novamente”
  - “Sair”
  - “Ajuda” (com “Copiar detalhes”)

## Validate User Story 3: Onboarding wizard

Using a brand-new user (empty group):

- On first app entry, the onboarding wizard should auto-open (skippable).
- Complete a couple steps, then refresh the browser.

Expected:
- Wizard resumes progress after refresh (server-side persistence).
- If you dismiss/skip the wizard before completing minimum setup:
  - Wizard does not auto-show again.
  - App remains usable.
  - You can re-enter via “Continuar configuração” and/or empty-state CTAs.

## Validate User Story 4: Page tours

After onboarding is completed or dismissed:

- Visit each page for the first time:
  - Dashboard
  - Manage
  - History

Expected:
- Tour auto-starts on first eligible visit.
- Skip/Close ends the tour and it does not auto-show again on revisit.
- “Mostrar tour” replays the tour even if previously completed/dismissed.
- Missing targets (responsive/conditional) are skipped gracefully.

Optional (version bump sanity):
- In `src/lib/tours/definitions.ts`, increment the `CURRENT_TOUR_VERSION` for one tour (e.g., `dashboard`) and reload.
- Expected: that page’s tour becomes eligible to auto-start once again (once per page per version).

## Validate cross-device persistence (NFR-003)

Using the same email, across two browsers/profiles (e.g., normal + Incognito, or Browser A + Browser B):

1. On Browser A: dismiss onboarding (or complete it) and dismiss/complete at least one page tour.
2. On Browser B: sign in with the same email and navigate to the same page(s).

Expected:
- Onboarding/tour state behaves consistently (no re-auto-show for already dismissed/completed items, unless a tour version was bumped).

## Validate dev auth bypass (must remain)

From repo root:

```bash
pnpm db:start
pnpm run gen:token
pnpm dev:app -- --port 5174
```

Expected:
- App loads authenticated immediately (no manual login).
- Onboarding/tours do not block rendering or navigation.

## Tests

Unit tests:

```bash
pnpm test:unit
```

E2E tests:

```bash
pnpm test:e2e:run
```

## Success Criteria Measurement Protocol

### SC-001: First Projection Within 5 Minutes

**Goal**: A new user can complete onboarding and see their first cashflow projection within 5 minutes.

**Test Protocol**:
1. Start a timer when opening `http://localhost:5174/login`
2. Use a brand-new email address
3. Complete the Magic Link flow (check Inbucket)
4. Complete the onboarding wizard (add account, income, expense)
5. Stop timer when the Dashboard shows a cashflow projection chart

**Pass Criteria**: Total time ≤ 5 minutes

**Notes**:
- Exclude email delivery time (Inbucket is instant locally)
- Include all user interaction time
- User should not need external documentation

### SC-002: No Dead-End States

**Goal**: Users never encounter unrecoverable errors during signup or onboarding.

**Test Protocol**:
1. Complete signup flow with a new email
2. Refresh the page at various points:
   - After clicking Magic Link
   - During onboarding wizard (mid-step)
   - After dismissing onboarding
3. Navigate between Dashboard, Manage, and History pages
4. Verify no "missing group/profile" errors appear

**Pass Criteria**:
- All error states show recovery actions ("Tentar novamente", "Sair", "Ajuda")
- App remains functional after refresh at any point
- Navigation between pages works without errors


