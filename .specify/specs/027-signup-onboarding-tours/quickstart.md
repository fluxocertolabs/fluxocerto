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
  - Retry
  - Sign out
  - Help

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


