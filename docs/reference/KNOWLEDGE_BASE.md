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
- **CI/CD**: `.github/workflows/ci.yml`, `.github/workflows/email-templates.yml`, `.github/workflows/update-snapshots.yml`
- **Entry point(s)**: `src/main.tsx`, `src/App.tsx`
- **Core domain logic**: `src/lib/cashflow/calculate.ts` (+ `src/lib/cashflow/*`), `src/hooks/use-cashflow-projection.ts`
- **Supabase client + auth**: `src/lib/supabase.ts`
- **DB schema + RLS**: `supabase/migrations/*.sql` (notably `20251220222000_rename_household_to_group.sql`, `20260105123000_self_serve_signup_provisioning.sql`, `20260105123100_onboarding_and_tour_state.sql`, `20260109120000_group_and_user_preferences_split.sql`)
- **Notifications**: `src/stores/notifications-store.ts`, `src/components/notifications/`, `supabase/functions/send-welcome-email/`, `supabase/migrations/20260109120100_notifications.sql`
- **Dev auth bypass**: `scripts/generate-dev-token.ts`, `src/main.tsx`, `src/lib/supabase.ts`
- **E2E auth flow**: `e2e/fixtures/auth.setup.ts`, `e2e/fixtures/auth.ts`, `e2e/playwright.config.ts`

---

## Key workflows

### Setup
```bash
pnpm install
pnpm db:start          # starts local Supabase (Postgres + Auth + Studio + Mailpit email UI/API on :54324)
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
- E2E tests explicitly disable the bypass by unsetting `VITE_DEV_ACCESS_TOKEN`/`VITE_DEV_REFRESH_TOKEN` in the Playwright `webServer` command.

### Test
```bash
pnpm test:unit          # Vitest (jsdom)
pnpm test:e2e           # Playwright functional E2E
pnpm test:visual        # Playwright visual regression (Docker locally/CI)
pnpm test               # unit + visual + e2e (starts/stops Supabase)
```

### Build / Release / Deploy
```bash
pnpm build
pnpm preview
```

Deployment notes:
- Vercel Git deployments are disabled (`vercel.json`), so deploys run via GitHub Actions + Vercel CLI.
- CI applies Supabase migrations to staging on PRs and to production on `main` merges (see `.github/workflows/ci.yml`).
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
  - E2E/visual: Playwright (`e2e/playwright.config.ts`), with per-worker group isolation.
- **Array utility functions**: `src/lib/utils/array.ts` contains helpers like `upsertUniqueById()` which must be immutable (never mutate the input array).
- **E2E test parallelism**:
  - Auth tests (`auth.spec.ts`) run **serially** with 1 worker to avoid email rate limiting (`fullyParallel: false`).
  - All other tests (visual, functional E2E, mobile) run in **parallel** with multiple workers (default: 4 locally, up to 8 in CI).
  - Worker count is controlled via `e2e/fixtures/worker-count.ts`; override with `PW_WORKERS` env var.

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
- **Preferences are split into two tables**:
  - `group_preferences`: group-scoped settings (keyed by `group_id` + `key`). Examples: theme preference, display preferences.
  - `user_preferences`: user-scoped settings (keyed by `user_id` + `key`). Examples: `email_notifications_enabled`.
  - **E2E DB cleanup gotcha**: `user_preferences` and `notifications` are **per-user** (no `group_id`). Group-scoped cleanup must delete by mapping `profiles.group_id` → `profiles.email` → `auth.users.id` → `user_preferences.user_id` / `notifications.user_id`. `group_preferences` is group-scoped and can be deleted by `group_id`.
  - **Opt-out semantics**: For `email_notifications_enabled`, missing row = enabled (opt-out default). Writing `value='false'` disables; deleting the row re-enables.
- **Expense/income types**:
  - `expenses.type ∈ {fixed, single_shot}`; fixed uses `due_day`, single-shot uses `date`.
  - `projects.type ∈ {recurring, single_shot}`; recurring uses frequency + schedule, single-shot uses `date`.
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
  - API: `54321`, DB: `54322`, Studio: `54323`, Mailpit email UI/API: `54324` (configured under `[inbucket]` in `supabase/config.toml`; E2E uses `InbucketClient` + `INBUCKET_URL` for backwards compatibility).

### E2E test patterns and gotchas

- **Test isolation**: Each test should call `db.clear()` or `db.reset()` at the start if it depends on a specific initial state (e.g., toggle tests that assume a default value).
- **Visual test state**: Visual regression tests for toggles/switches must reset state before capturing screenshots to avoid order-dependent failures.
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
- **Account**: bank account (checking/savings/investment) used for balances and projections.
- **Project**: income source (recurring or one-time).
- **Expense**: expense (fixed monthly or one-time).
- **Credit Card**: card with statement balance + due day; can also have **future statements**.
- **Future statement**: pre-defined credit card statement balances for a specific future month/year (`future_statements`).
- **Projection snapshot**: saved historical projection payload (`projection_snapshots.data`) for later inspection.
- **Onboarding wizard**: guided setup flow persisted via `onboarding_states`.
- **Page tour**: per-page guided tour persisted via `tour_states`.
- **Notification**: in-app message stored in `notifications` table. Has `type`, `title`, `message`, `read_at`, `email_sent_at`. Currently, `type` is constrained to `'welcome'` only; additional types (e.g., `system`) may be added in the future. Realtime subscriptions push INSERT/UPDATE/DELETE events to the client.
- **Welcome notification**: auto-created notification for new users; can trigger a welcome email via `send-welcome-email` Edge Function.
- **UserPreferenceKey**: typed union for valid `user_preferences.key` values (e.g., `'email_notifications_enabled'`). See `src/types/index.ts`.

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
  - E2E shared helpers: `e2e/utils/` (consider extracting duplicated test helpers here)
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


