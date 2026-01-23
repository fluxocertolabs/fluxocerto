# KNOWLEDGE_BASE.md

**Durable, high-signal knowledge about this repository (for humans and AI agents).**

> **Universal collaboration protocols**: see `../../AGENTS.md`  
> **Project-specific facts** (language rules, currency, stack): see `../../.specify/memory/constitution.md`

---

## How to use this doc

- This is a **living knowledge base**. Keep it **current** and **actionable**.
- Prefer **durable abstractions** over one-off incidents:
  - Architecture and boundaries
  - Invariants and constraints
  - Conventions and patterns
  - Workflows (dev/test/build/release)
  - Gotchas and sharp edges
- Avoid secrets and sensitive data.

---

## Repository overview

### Purpose
Fluxo Certo is a cashflow projection app for **groups** (“grupos”) managing shared finances with variable income. It shows a 30/60/90-day projection and flags “danger days” (scenario balance < 0) so users can act early (move money, delay expenses, etc.).

### Who uses it
- Groups with variable income streams (freelancers, contractors, project-based workers).
- Users who want cashflow visibility without heavy budgeting/categorization workflows.

---

## Architecture (high-level)

### Key components
- **`src/pages/`**: route-level pages (`dashboard`, `manage`, `history`, auth callback).
- **`src/components/`**: UI components, including cashflow visualization and CRUD forms.
- **`src/hooks/`**: derived-data hooks (projection, finance data, etc.).
- **`src/stores/`**: Zustand stores for persisted app state and Supabase-backed CRUD.
- **`src/lib/`**: core domain logic (cashflow engine, Supabase/auth helpers, formatting, onboarding/tours).
- **`supabase/`**: database migrations + RLS, local dev config, Edge Functions, email templates.
- **`e2e/`**: Playwright E2E + visual regression tests (fixtures + page objects).
- **`scripts/`**: dev tooling (e.g. dev token generator, email template build/deploy, Supabase auth allowlist updates for previews).

### Data / control flow
```
UI interaction → Zustand store actions → Supabase (PostgREST/RPC + Realtime) → store updates
  → derived hooks (cashflow projection, health indicator) → charts + warnings
```

### “Source of truth” pointers
- **Configuration**: `package.json`, `vite.config.ts`, `supabase/config.toml`, `vercel.json`
- **CI/CD**: GitHub Actions workflows live in `.github/workflows/` (notably `ci.yml`, `email-templates.yml`, `update-snapshots.yml`).
- **Entry point(s)**: `src/main.tsx`, `src/App.tsx`
- **Core domain logic**: `src/lib/cashflow/calculate.ts` (+ `src/lib/cashflow/*`), `src/hooks/use-cashflow-projection.ts`
- **Finance data + realtime**: `src/hooks/use-finance-data.ts` (fetches + subscribes to accounts, credit cards, etc.; applies sorting)
- **Finance CRUD operations**: `src/stores/finance-store.ts` (Zustand store with Supabase mutations)
- **Supabase client + auth**: `src/lib/supabase.ts`
- **DB schema + RLS**: `supabase/migrations/*.sql` (notably `20251220222000_rename_household_to_group.sql`, `20260105123000_self_serve_signup_provisioning.sql`, `20260105123100_onboarding_and_tour_state.sql`, `20260109120000_group_and_user_preferences_split.sql`)
- **Notifications**: `src/stores/notifications-store.ts`, `src/components/notifications/`, `supabase/functions/send-welcome-email/`, `supabase/migrations/20260109120100_notifications.sql`
- **Dev auth bypass**: `scripts/generate-dev-token.ts`, `src/main.tsx`, `src/lib/supabase.ts`
- **Local Supabase readiness check**: `scripts/ensure-supabase.ts` (used by `pnpm db:ensure`)
- **Support chat (Tawk.to)**: `src/lib/support-chat/tawk.ts` (wrapper), `src/components/help/floating-help-button.tsx` (UI integration)
- **E2E auth flow**: `e2e/fixtures/auth.setup.ts`, `e2e/fixtures/auth.ts`, `e2e/playwright.config.ts`
- **Balance freshness utilities**: `src/components/manage/shared/format-utils.ts` → `getBalanceFreshness()`

---

## Key workflows

### Setup
```bash
pnpm install
pnpm db:start          # starts local Supabase (Postgres + Auth + Studio + Mailpit email UI/API on :54324)
```

If you're running tests, prefer:

```bash
pnpm db:ensure         # starts Supabase if needed AND verifies required keys are available
```

### Run (dev)
```bash
pnpm db:start
pnpm dev:app
```

**Local auth redirects:** Supabase local config uses `auth.site_url = http://localhost:5173` and allowlists `/auth/confirm` redirects (see `supabase/config.toml`). If you run the app/tests on a different port and see “redirect URL not allowed”, update `supabase/config.toml` accordingly.

### Local dev auth bypass (recommended for AI/dev speed)
```bash
pnpm db:start
pnpm run gen:token     # writes VITE_DEV_ACCESS_TOKEN + VITE_DEV_REFRESH_TOKEN into .env
pnpm dev:app           # reloads authenticated
```

Notes:
- The bypass is guarded by `import.meta.env.DEV` and will not run in production builds.
- You can disable the dev bypass for a single page load with `?disableDevAuth=1` (used by auth/login visual tests).
- `gen:token` also seeds a **group-level billing subscription** in `billing_subscriptions` (status `trialing`, 14-day trial) so the billing gate/paywall doesn’t block local dev or CI smoke tests.

### Test
```bash
pnpm test               # Prints guidance; choose a specific test target
pnpm test:unit          # Vitest (jsdom)
pnpm test:e2e           # Playwright smoke E2E (starts/stops Supabase)
pnpm test:e2e:auth      # Playwright auth E2E (magic link flow)
pnpm test:visual        # Playwright visual regression
pnpm test:all           # Runs unit + e2e + auth + visual sequentially
```

### Build / Release / Deploy
```bash
pnpm build
pnpm preview
```

Deployment notes:
- Vercel Git deployments are disabled (`vercel.json`), so deploys run via GitHub Actions + Vercel CLI.
- CI applies Supabase migrations to staging on PRs and to production on `main` merges (see `.github/workflows/ci.yml`).
- CI deploys Supabase Edge Functions to production on `main` merges (see `.github/workflows/ci.yml` → `deploy-edge-functions` job).
- Preview deployments add the preview URL to the Supabase redirect allowlist via `scripts/update-supabase-auth-urls.ts`.

---

## Conventions & patterns

- **Project structure**:
  - Route pages: `src/pages/`
  - UI components: `src/components/`
  - State: `src/stores/` (Zustand)
  - Domain logic: `src/lib/` (cashflow + auth + formatting)
  - Supabase schema + RLS: `supabase/migrations/`
- **Imports**: use the `@/` alias for `src/` (configured in `vite.config.ts` + `vitest.config.ts`).
- **UI text**: must be pt-BR (see `../../.specify/memory/constitution.md`).
- **Product terminology**: prefer **“Grupo”** in UI copy; avoid **“Família”** (legacy term).
- **Code identifiers**: English (files, variables, functions, types).
- **Money**: stored as integer cents (DB `INTEGER`, app types/formatters should preserve this).
- **Testing strategy**:
  - Unit tests: `src/**/*.test.{ts,tsx}` via Vitest (`vitest.config.ts`).
  - E2E/visual: Playwright (`e2e/playwright.config.ts`) with a small smoke suite plus auth flow tests.
  - **Test suite philosophy**: Prefer fewer, high-value tests over exhaustive coverage.
  - E2E/visual seed data uses direct Postgres (`pg`) helpers to avoid PostgREST schema cache flakiness.
  - Smoke tests use the dev-auth bypass; the Playwright `webServer` injects `VITE_DEV_ACCESS_TOKEN` and `VITE_DEV_REFRESH_TOKEN` from `.env` to ensure the Vite dev server has tokens.
- **Third-party integrations**:
  - **Tawk.to** (support chat): Configured via `VITE_TAWK_PROPERTY_ID` and `VITE_TAWK_WIDGET_ID` env vars. Widget appearance is configured in the Tawk.to dashboard, not code.
  - **Canny.io** (feedback): External link to `https://fluxo-certo.canny.io`. No code integration required.
  - **PostHog** (product analytics): Initialized in `src/main.tsx` with a wrapper in `src/lib/analytics/posthog.ts`. Controlled by `VITE_POSTHOG_KEY`, optional `VITE_POSTHOG_HOST`, and `VITE_POSTHOG_DISABLED`. User preferences live in `user_preferences` (`analytics_enabled`, `session_recordings_enabled`) and are surfaced in `src/pages/profile.tsx`. Session recordings are enabled by default but masked (all inputs + all text).
  - **Stripe** (billing): Group-level subscription state lives in `billing_subscriptions`. Checkout session creation and webhook handling live in Supabase Edge Functions (`supabase/functions/create-stripe-checkout-session`, `supabase/functions/stripe-webhook`).
  - Customer portal access is handled by `supabase/functions/create-stripe-customer-portal-session` (deploy this function to avoid 404s on the hosted project).
    - Edge Function **timeouts**: Prefer bounded Stripe API calls. `create-stripe-checkout-session` uses a ~15s timeout (via `AbortSignal.timeout` when available, with a safe fallback).
    - Edge Function **CORS vs redirects**: Browser `Origin` headers never include a path. `APP_BASE_URL` *can* include a path (e.g. `https://example.com/app`), so `create-stripe-checkout-session` normalizes allowlist matching against the **origin** while still preserving the **full base URL** (including path) for `success_url`/`cancel_url` when the request origin matches.
    - Webhook analytics: `stripe-webhook` posts best-effort PostHog events and ensures request timers are always cleaned up (clear timeout in `finally`) to avoid stray abort timers.

- **Billing access gating UX**:
  - Paywall gating: `src/components/billing/billing-gate.tsx` can block the app for authenticated users when onboarding is complete but billing access is not granted.
  - Stripe return flow: The app uses a sessionStorage flag (`src/components/billing/billing-success-flag.ts`) + overlay (`src/components/billing/billing-success-overlay.tsx`) to cover the post-checkout “waiting for access” period while webhooks propagate.
    - The overlay shows **only a loading animation** and closes once access is granted; it is written to handle re-activation safely (does not get stuck if triggered multiple times in a session).
- **Array utility functions**: `src/lib/utils/array.ts` contains helpers like `upsertUniqueById()` which must be immutable (never mutate the input array).
- **List ordering**: Accounts and credit cards are sorted alphabetically by name (pt-BR locale-aware via `Intl.Collator`), with ties broken by ID. This ensures stable, deterministic ordering even during realtime updates. See `src/hooks/use-finance-data.ts` → `sortByNameThenId()`.
- **Balance freshness tracking**: The `balance_updated_at` field tracks when account/card balances were last updated. This field must be set:
  - On creation (`addAccount`, `addCreditCard`)
  - On balance update via dedicated functions (`updateAccountBalance`, `updateCreditCardBalance`)
  - On balance update via general update functions (`updateAccount`, `updateCreditCard`) when balance is included in the update
- **E2E test parallelism**:
  - `e2e/playwright.config.ts` currently runs with `fullyParallel: false` and `workers: 1` for stability/simplicity.
  - The auth suite in `e2e/tests/auth.spec.ts` is explicitly `mode: 'serial'` to avoid mailbox/rate-limit interference.
  - If you increase worker count in the future, re-validate: email polling timing, mailbox isolation, and any assumptions about DB state.

---

## Invariants, constraints, and gotchas

- **Danger days are scenario-specific**:
  - A “danger day” is any day where the scenario balance is **< 0** (in cents).
  - The engine tracks flags separately: `isOptimisticDanger` and `isPessimisticDanger` (see `src/lib/cashflow/calculate.ts`).
  - Chart shading groups contiguous danger ranges and labels them as `optimistic`, `pessimistic`, or `both` (see `src/hooks/use-cashflow-projection.ts` → `getDangerRanges()`).
- **Group-based multi-tenancy (RLS)**:
  - Current data isolation is scoped by `group_id` across tables (see `supabase/migrations/*rename_household_to_group*.sql`).
  - RLS uses `get_user_group_id()` which resolves group membership from the **JWT email claim** → `profiles.email`.
- **Membership model (current vs intended)**:
  - **Current**: a profile is keyed by `profiles.email` (unique) and contains a single `group_id` → an email can belong to **at most one** group at a time.
    - The invite flow enforces this and blocks inviting an email that already belongs to another group (see `src/lib/supabase.ts` → `inviteUser()`).
  - **Intended (not implemented yet)**: users can be members of **multiple** groups and groups can have an **admin/role** concept.
    - This likely requires introducing a membership join table (e.g. `group_memberships`) + a “current group” selector, and updating RLS helpers accordingly.
- **Signup provisioning must be idempotent**:
  - `ensure_current_user_group()` (SECURITY DEFINER) ensures a user always has a `profiles` row and a valid `groups` row (see `20260105123000_self_serve_signup_provisioning.sql`).
  - A best-effort trigger on `auth.users` tries to provision immediately; the client can also call the RPC for recovery.
- **Onboarding + tours are persisted server-side**:
  - `onboarding_states` (per user + group) and `tour_states` (per user + tour key) are real tables with RLS (see `20260105123100_onboarding_and_tour_state.sql`).
  - E2E setup often marks onboarding completed and tours dismissed to avoid overlays blocking tests.
  - **Auth callback must not force-open wizard**: The onboarding wizard auto-shows based on `canAutoShow()` in `src/lib/onboarding/steps.ts` (checks status, `autoShownAt`, and `isMinimumSetupComplete`). Do not add code to `src/pages/auth-callback.tsx` that calls `openWizard()`—this breaks E2E tests that authenticate via magic link and rely on the natural auto-show flow.
- **Third-party widget styling (Tawk.to, etc.)**:
  - Widgets like Tawk.to use **cross-origin iframes** that cannot be styled from our application code.
  - CSS injection, `MutationObserver` tricks, and `contentDocument` access are blocked by browser security policies.
  - Widget appearance (colors, buttons, padding, branding) must be configured in the vendor's dashboard.
  - We can only control: (1) when to load the script, (2) when to show/hide the widget container, (3) visitor attributes passed via their API.
  - See `src/lib/support-chat/tawk.ts` for the implementation pattern.
- **Preferences are split into two tables**:
  - `group_preferences`: group-scoped settings (keyed by `group_id` + `key`). Examples: theme preference, display preferences.
  - `user_preferences`: user-scoped settings (keyed by `user_id` + `key`). Examples: `email_notifications_enabled`.
  - **E2E DB cleanup gotcha**: `user_preferences` and `notifications` are **per-user** (no `group_id`). Group-scoped cleanup must delete by mapping `profiles.group_id` → `profiles.email` → `auth.users.id` → `user_preferences.user_id` / `notifications.user_id`. `group_preferences` is group-scoped and can be deleted by `group_id`.
  - **Opt-out semantics**: For `email_notifications_enabled`, missing row = enabled (opt-out default). Writing `value='false'` disables; deleting the row re-enables. **Rationale**: Opt-out defaults maximize user engagement for transactional emails (e.g., welcome emails) while respecting user choice when they explicitly disable. This follows common SaaS patterns where beneficial notifications are on by default.
- **Expense/income types**:
  - `expenses.type ∈ {fixed, single_shot}`; fixed uses `due_day`, single-shot uses `date`.
  - `projects.type ∈ {recurring, single_shot}`; recurring uses frequency + schedule, single-shot uses `date`.
- **Balance updates must set `balance_updated_at`**:
  - When updating account/card balance via any method (edit dialog, inline edit, quick update), the `balance_updated_at` field must be set to `new Date().toISOString()`.
  - The `updateAccount`/`updateCreditCard` functions conditionally set this field only when the balance field is included in the update payload.
  - The dedicated `updateAccountBalance`/`updateCreditCardBalance` functions always set it.
  - **Gotcha**: If you add a new balance update path, ensure it sets `balance_updated_at` or the freshness indicator will show stale data.
- **Auth hook**:
  - The `before-user-created` Edge Function currently allows self-serve signups but fails closed if `BEFORE_USER_CREATED_HOOK_SECRET` is missing.
- **Edge Functions and RLS**:
  - Edge Functions using `supabaseServiceKey` bypass RLS entirely. When querying user-specific data, always add explicit filters (e.g., `.eq('user_id', user.id)`) to enforce data isolation.
  - The `send-welcome-email` function demonstrates this pattern for `user_preferences` queries.
- **Realtime subscriptions**:
  - Tables must be added to `supabase_realtime` publication to receive change events.
  - `ALTER PUBLICATION ... ADD TABLE ...` can fail if re-applied when the table is already in the publication. Consider guarding with a `DO` block check in migrations.
  - Subscriptions refetch on `SUBSCRIBED` status to handle reconnection scenarios where events may have been missed.
- **Ports (local Supabase)**:
  - API: `54321`, DB: `54322`, Studio: `54323`, Mailpit email UI/API: `54324` (configured under `[inbucket]` in `supabase/config.toml`; the code uses legacy names `InbucketClient` + `INBUCKET_URL` for backwards compatibility, but the actual server is Mailpit).
- **Supabase “status” can be a false positive**:
  - Some environments can print “Supabase is not running” while still returning a successful exit code from `npx supabase status`.
  - Tests require the Supabase keys to be present (anon + service role). Use `pnpm db:ensure` (see `scripts/ensure-supabase.ts`) instead of relying on `status || start` logic.
- **Vite file watchers can hit OS limits (`ENOSPC`)**:
  - If the pnpm store lives inside the repo (e.g. `.pnpm-store/`), Vite’s watcher can traverse it and exceed the system watcher limit.
  - `vite.config.ts` explicitly ignores `.pnpm-store/` in `server.watch.ignored` to avoid Playwright webServer startup crashes.

### E2E test patterns and gotchas

- **Test isolation**: Each test should call `db.clear()` at the start if it depends on a specific initial state (e.g., toggle tests that assume a default value). The `_perTestDbReset` auto-fixture was removed to reduce DB contention—isolation is now explicit per-test.
- **Visual test state**: Visual regression tests for toggles/switches must reset state before capturing screenshots to avoid order-dependent failures.
- **ESLint guardrails for E2E tests**: The ESLint config (`eslint.config.js`) enforces restrictions on flaky patterns in `e2e/**` files:
  - `page.waitForTimeout()` is disallowed — use assertion-based waits instead.
  - `locator.isVisible({ timeout })` conditionals are disallowed — use strict `expect()` assertions.
  - Run `pnpm lint` to catch these patterns before committing.
- **Avoid long `networkidle` waits in Playwright**:
  - The app uses long-lived connections and third-party widgets (notably Tawk.to in cross-origin iframes) which can keep the page from ever reaching “network idle”.
  - Prefer `domcontentloaded` + **UI-based readiness** (e.g. dashboard heading visible vs login form visible).
  - If you use `networkidle`, keep it **bounded** (e.g. `timeout: 2000`) and treat it as best-effort.
- **BillingGate can block dashboard E2E flows**:
  - Many authenticated routes expect a “hasAccess” state derived from `billing_subscriptions.status` (client code treats `trialing`/`active` as access; see `src/hooks/use-billing-status.ts`).
  - If an E2E test needs the dashboard to be interactable after login/reload, seed a billing subscription row for the test group (typically with status `active`) using the DB fixtures (`seedBillingSubscription()` in `e2e/fixtures/*-test-base.ts`) or equivalent SQL seeding.
- **Visual test determinism** (see `e2e/fixtures/visual-test-base.ts`):
  - **Fixed date**: `VISUAL_TEST_FIXED_DATE` is set to `'2025-01-15T12:00:00.000Z'` (explicit UTC) to ensure consistent timestamps across all environments.
  - **Animations disabled**: CSS `* { animation: none !important; transition: none !important; }` is injected.
  - **Theme setting**: Theme is set via `localStorage` and the root `<html>` class list; tests should wait for the expected class to be applied (avoid fixed sleeps).
- **Visual snapshot updates**:
  - Local update command: `pnpm test:visual:update`.
  - CI provides an “Update Visual Snapshots” workflow (`.github/workflows/update-snapshots.yml`) that generates snapshots in the Playwright Docker image (`mcr.microsoft.com/playwright:v1.57.0-jammy`).
  - Snapshot PNGs are stored under `e2e/tests/visual/*-snapshots/` and are not tracked in git (they’re expected to be present locally/CI via generation or artifacts).
- **Playwright element waiting**:
  - ❌ `element.isVisible({ timeout })` - The timeout parameter is deprecated and ineffective for waiting.
  - ✅ `element.waitFor({ state: 'visible', timeout })` - Properly waits for element visibility.
  - ✅ `expect(element).toBeVisible()` - Use explicit assertions instead of conditionals to catch missing elements.
- **Currency parsing in tests**:
  - Use the `parseBRL()` helper from `e2e/utils/format.ts` to convert BRL strings to cents.
  - ❌ `parseInt(text.replace(/[^\d]/g, ''))` - Strips decimals incorrectly (e.g., "R$ 800,00" → 80000 instead of 80000 cents = R$ 800).
  - ✅ `parseBRL(text)` - Correctly handles Brazilian format with comma as decimal separator.
- **Idempotency testing**: When testing idempotent operations (e.g., email sending), account for dev/preview modes where side effects may be skipped. Use conditional assertions based on environment.
- **Async persistence timing**: When testing state that persists via async API calls (e.g., toggling preferences), wait for the API call to complete before reloading. `networkidle` may fire before the DB transaction commits—add a small buffer or poll for expected state.
- **Modal data loading**: When testing modal content (e.g., Quick Update), wait for section headings to appear before asserting on specific items. Data may load asynchronously after the modal opens.
- **Prefer polling assertions over fixed timeouts**:
  - ❌ `await page.waitForTimeout(1000)` - Arbitrary delays are flaky and slow.
  - ✅ `await expect(element).toHaveAttribute('aria-checked', 'false', { timeout: 5000 })` - Assertion-based waits are deterministic.
  - ✅ `await expect.poll(() => getState()).toBe(expected)` - For complex conditions.

- **Floating Help button interaction** (see `e2e/utils/floating-help.ts`):
  - The Floating Help component has different behaviors on **desktop** (hover) vs **mobile** (click).
  - **Container vs FAB**: The `data-testid="floating-help-button"` is a `<div>` wrapper — do NOT click it directly. Click the inner FAB button (`getByRole('button', { name: /abrir ajuda/i })`).
  - **Desktop (hover-capable)**: Hover the container to open the menu, then click the tour option.
  - **Mobile (touch)**: Tap the inner FAB button to toggle the menu open (`locator.tap()` in Playwright).
    - `click()` can move the mouse and trigger hover handlers; in visual tests where animations are effectively 0ms, that can instantly animate the FAB off-screen and cause "outside of viewport" flakes.
  - **Use the shared helper**: Import `openFloatingHelpMenu()`, `startTourViaFloatingHelp()`, etc. from `e2e/utils/floating-help.ts` instead of writing ad-hoc interactions.
  - **Verify state via aria attributes**: After opening, assert `aria-expanded="true"` on the FAB before interacting with menu items.
  - **Always-visible entry point (authenticated routes)**: The menu always includes the Canny feedback option, so the Floating Help button renders anywhere the authenticated layout is used. Public routes (e.g., `/login`) do not mount the component. Tawk chat appears only when `VITE_TAWK_PROPERTY_ID` + `VITE_TAWK_WIDGET_ID` are set.

- **Fresh group rotation** (see `e2e/fixtures/db.ts`):
  - `db.clear()` and `db.resetDatabase()` create a **new empty group** for the worker user, avoiding expensive per-test DELETE cascades.
  - The previous group is renamed to `{groupName} (archived {timestamp} #{counter})` to preserve uniqueness.
  - Onboarding is auto-completed and tours are auto-dismissed for fresh groups to avoid blocking tests. Tests that need to exercise onboarding/tours must explicitly clear those states.
- **Page tour tests** (`e2e/tests/page-tours.spec.ts`):
  - Use DB-driven state via `db.clearTourState()` + `db.seedAccounts/Projects/Expenses` instead of magic-link authentication.
  - Dashboard must have data (accounts, income, expenses) for `TourRunner` to render—empty state skips tour rendering.
  - Clear localStorage tour cache in tests to avoid stale client-side state: `localStorage.removeItem('fluxocerto:tour:...')`.
  - Force full React state reset between tests by navigating to `about:blank` before the target URL.
- **Tour selector contract tests** (`e2e/tests/tour-selector-contract.spec.ts`):
  - The comprehensive check must wait for page-specific tour targets, not just page headings.
  - History page: wait for `[data-tour="snapshot-list"]` (only renders after loading completes, not during loading/error states).
- **Onboarding wizard tests** (`e2e/tests/onboarding-wizard.spec.ts`):
  - These tests authenticate **new users via magic link** (not worker fixtures) and expect the wizard to auto-show based on database state.
  - **Do not** add code to `auth-callback.tsx` that force-opens the wizard—this breaks the existing onboarding E2E tests which rely on the natural auto-show flow.
- **Always run the full test suite** (`pnpm test`) before declaring changes complete. Running only a subset (e.g., `pnpm test:visual`) can miss regressions in other test categories.

### Test suite optimization principles

The test suite is intentionally lean. When adding or reviewing tests, follow these principles:

- **Visual tests**:
  - Currently limited to `dashboard.visual.spec.ts` and `login.visual.spec.ts` (light theme only).
  - Prefer **populated states** over empty states when possible.
  - Skip visual tests for simple components (buttons, badges, simple forms) that have low regression risk.

- **E2E functional tests**:
  - **One CRUD test file per pattern** (`accounts.spec.ts`), not per entity type. Credit cards, expenses, and projects use the same UI patterns—testing all four is redundant.
  - **Mobile functional tests are redundant** with desktop tests; keep mobile coverage lean.
  - Dashboard smoke coverage lives in `dashboard.spec.ts`.

- **Database isolation**:
  - Tests that need a clean state must call `db.clear()` explicitly at the start.

- **Current test counts**: not tracked here; rely on `pnpm test:unit` / Playwright output for real totals.

### Unit test patterns

- **Mock state reset**: Use `beforeEach` to reset mock state to defaults. Avoid manual resets at the end of individual tests—they won't run if the test fails.
- **Listener cleanup**: Wrap event listener tests in `try/finally` to guarantee `removeEventListener` is called even if assertions fail.
- **Immutability tests**: When testing functions that should not mutate inputs, assert both the return value and that the original input is unchanged.

---

## Glossary

- **Group**: the tenant boundary for data isolation. Most user data rows include `group_id` and are filtered by RLS.
- **Profile**: membership row keyed by email that links a user to a group (`profiles.email`, `profiles.group_id`).
- **Optimistic**: projection scenario that includes all income (guaranteed + non-guaranteed).
- **Pessimistic**: projection scenario that includes guaranteed income only.
- **Danger day**: a day where the scenario balance is < 0 (tracked independently for optimistic and pessimistic).
- **Account**: bank account (checking/savings/investment) used for balances and projections. Has `balanceUpdatedAt` for freshness tracking.
- **Project**: income source (recurring or one-time).
- **Expense**: expense (fixed monthly or one-time).
- **Credit Card**: card with statement balance + due day; can also have **future statements**. Has `balanceUpdatedAt` for freshness tracking.
- **Balance freshness**: visual indicator showing how recently a balance was updated:
  - **Fresh** (green): updated today or yesterday (0-1 days)
  - **Warning** (yellow): updated 2-7 days ago
  - **Stale** (red): updated >7 days ago or never (`balanceUpdatedAt` is null/undefined)
- **Future statement**: pre-defined credit card statement balances for a specific future month/year (`future_statements`).
- **Projection snapshot**: saved historical projection payload (`projection_snapshots.data`) for later inspection.
- **Onboarding wizard**: guided setup flow persisted via `onboarding_states`.
- **Page tour**: per-page guided tour persisted via `tour_states`.
- **Notification**: in-app message stored in `notifications` table. Has `type`, `title`, `message`, `read_at`, `email_sent_at`. Currently, `type` is constrained to `'welcome'` only; additional types (e.g., `system`) may be added in the future. Realtime subscriptions push INSERT/UPDATE/DELETE events to the client.
- **Welcome notification**: auto-created notification for new users; can trigger a welcome email via `send-welcome-email` Edge Function.
- **UserPreferenceKey**: typed union for valid `user_preferences.key` values (e.g., `'email_notifications_enabled'`). See `src/types/index.ts`.
- **Floating Help button**: contextual help FAB (`?` icon) that shows page tours, support chat, and feedback options. See `src/components/help/floating-help-button.tsx`.
- **Support chat**: Tawk.to live chat integration for user support. Widget is preloaded in background for instant opening. See `src/lib/support-chat/tawk.ts`.
- **Feedback portal**: External Canny.io board for user suggestions and bug reports (`https://fluxo-certo.canny.io`).

---

## How to extend safely

- **Where to add new code**:
  - New page/route: `src/pages/`
  - New UI component: `src/components/`
  - New state or persistence: `src/stores/`
  - New business logic: `src/lib/` (especially `src/lib/cashflow/`)
  - Shared utility functions: `src/lib/utils/`
  - DB schema/RLS changes: `supabase/migrations/`
  - E2E coverage: `e2e/tests/` (+ fixtures under `e2e/fixtures/`)
  - E2E shared helpers: `e2e/utils/` (e.g., `floating-help.ts` for Floating Help/tour/chat interactions, `auth-helper.ts` for authentication flows)
  - Dev tooling scripts: `scripts/` (e.g., `detect-flaky-tests.ts`, `generate-dev-token.ts`)
- **What to avoid**:
  - Storing money as floats (always use cents/integer).
  - Bypassing RLS in the client (service role keys must never ship to the browser).
  - Adding English UI strings (pt-BR required).
  - Adding “fix it later” hacks; fix root causes (see `../../AGENTS.md`).
- **Verification checklist**:
  - [ ] `pnpm lint`
  - [ ] `pnpm typecheck`
  - [ ] `pnpm test:unit`
  - [ ] `pnpm test:e2e` (and `pnpm test:visual` for UI changes)
  - [ ] `pnpm build`


