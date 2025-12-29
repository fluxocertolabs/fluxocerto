# Quickstart: Today's estimated balance

This quickstart is for validating **026-estimate-today-balance** locally.

## Prerequisites

- Node.js `>= 20`
- pnpm `10.12.1`
- Local Supabase via `npx supabase` (used by existing repo scripts)

## Run locally (with dev auth bypass)

From repo root:

```bash
pnpm db:start
pnpm run gen:token
pnpm dev:app
```

The app should auto-authenticate in DEV mode (see `AGENTS.md`).

## Create a reproducible dataset

### 1) Create a real “base”

- Open the Dashboard
- Click **Atualizar Saldos**
- Enter balances and click **Concluir**

This will set `balance_updated_at` on all accounts/cards.

### 2) Backdate the base (simulate “days after last update”)

In Supabase Studio SQL editor (find URL via `npx supabase status`), run:

```sql
update accounts
set balance_updated_at = now() - interval '10 days'
where type = 'checking';
```

### 3) Add movements within the interval

Using the Manage page (or directly in Supabase tables):
- Add a **single-shot expense** dated within the last 10 days
- Add a **single-shot income** dated within the last 10 days
- Add at least one income with `certainty = 'probable'` or `'uncertain'` to validate scenario divergence

### 4) Verify on Dashboard

Expected:
- A clear **“Saldo estimado”** indicator is shown when there is ≥1 included movement since base.
- Indicator explains the base date (or date range) and offers a direct path to **Atualizar Saldos**.
- The projection chart starts from the **estimated today** value (rebased) and does not double count already-applied movements.
- Snapshot pages remain unchanged/frozen (no estimated marker).

## Tests

Unit tests:

```bash
pnpm test:unit
```

Unit tests (with coverage):

```bash
pnpm test:unit:coverage
```

E2E tests:

```bash
pnpm test:e2e:run
```

Visual regression tests (local):

```bash
pnpm test:visual:local
```

If you intentionally changed UI visuals, update visual snapshots:

```bash
pnpm test:visual:update
```


