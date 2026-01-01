# Research: Today's estimated balance

**Feature**: 026-estimate-today-balance  
**Date**: 2025-12-29  
**Status**: Complete

## Research Tasks

### 1. Defining “today” in `America/Sao_Paulo` without adding a timezone dependency

**Decision**: Use `Intl.DateTimeFormat` with an explicit `timeZone` to compute a **date-only** “today” (YYYY-MM-DD), then convert that to a `Date` used exclusively for **day-level** arithmetic/comparisons.

**Rationale**:
- The codebase already uses `date-fns` for day arithmetic and comparisons, but does not include `date-fns-tz`.
- `Intl.DateTimeFormat` supports timezones natively in browsers and Node.
- This keeps the “today” boundary consistent with the household/app timezone even if the device timezone differs.

**Alternatives considered**:
- **Add `date-fns-tz`**: rejected for now (new dependency + bundle impact) since the required behavior can be achieved with `Intl`.
- **Temporal API / polyfill**: rejected (not standard everywhere, adds complexity).

---

### 2. Determining the “last balance update” base

**Decision**: Treat “last balance update” as derived from `balance_updated_at` on **checking accounts** (`accounts.type === 'checking'`), converted to a date-only value in `America/Sao_Paulo`.

- If **all checking accounts** share the same update date → display a single base date (“Baseado na última atualização em DD/MM”).
- If checking accounts have **different** update dates → display a range (“Baseado nas últimas atualizações entre DD/MM e DD/MM”).
- If the user has **no valid base** (no checking account has `balance_updated_at`, or some checking accounts are missing it) → do not compute an estimate; guide the user to “Atualizar Saldos”.

**Rationale**:
- There is no separate “balance updates” entity; `balance_updated_at` is the only durable signal.
- Movements (projects/expenses) are not linked to a specific checking account in the current schema, so true per-account estimation is not possible; showing a base **range** provides transparency (FR-012).

**Alternatives considered**:
- **Use latest update date (max)**: rejected (would miss movements that occurred after older updates, risking overestimation).
- **Introduce a `balance_updates` table**: rejected for this feature scope (schema change, more surface area).

---

### 3. Computing today’s estimated balance using the existing cashflow engine

**Decision**: Reuse `src/lib/cashflow/calculateCashflow()` to compute the “since last update” interval:

- Base is **date-only** (start exclusive).
- Run a short projection from `baseDate + 1` through “today” (end inclusive).
- The estimated balances for today are the final day’s:
  - `optimisticBalance` (includes guaranteed + probable + uncertain incomes)
  - `pessimisticBalance` (includes guaranteed incomes only)

**Rationale**:
- Avoid duplicating income/expense/card obligation logic.
- Keeps scenario rules consistent with the projection engine and existing UI.

**Alternatives considered**:
- **Reimplement movement application**: rejected (high risk of divergence and subtle bugs).

---

### 4. Rebasing the projection to start from today’s estimated balance (no double counting)

**Decision**:
- Compute today’s estimate first.
- Compute the forward projection starting **tomorrow**, so movements already applied to “today” are not counted again.
- Keep the user’s configured projection length by computing `projectionDays - 1` days forward and prepending a synthetic “today” point.

**Scenario starting-balance nuance**:
`calculateCashflow()` currently uses a single starting balance for both scenarios. To represent scenario-specific estimated starting balances (FR-003 + FR-004), we will:
- Use the **pessimistic** estimated balance as the engine’s starting balance.
- Compute an `optimisticOffset = optimisticEstimatedToday - pessimisticEstimatedToday` for the “since last update” interval.
- Apply that offset to all optimistic balances (and derived danger-day detection/end balance) in the forward projection output.

**Rationale**:
- Prevents double counting without invasive changes to the core engine.
- Keeps future movement generation unchanged while accurately reflecting a higher optimistic starting point when past “probable/uncertain” incomes are involved.

**Alternatives considered**:
- **Modify engine to accept per-scenario starting balances**: rejected for minimal-change bias, but remains a clean follow-up if the offset approach becomes hard to maintain.

---

### 5. When to show “Saldo estimado”

**Decision**: Show the “Saldo estimado” indicator when there is **≥ 1 included movement** in the interval since the last update (even if net is zero), matching the spec clarification:

- **Expenses/obligations** always count (both scenarios).
- **Incomes** count for the optimistic scenario always; for pessimistic only `certainty === 'guaranteed'`.
- The UI should show the base date/range and provide a direct CTA to “Atualizar Saldos”.

**Alternatives considered**:
- **Show only when the final value changes**: rejected (explicitly contradicted by clarified requirement).

---

### 6. Historical snapshots must remain frozen

**Decision**: Do not apply estimation logic to snapshot rendering (`SnapshotDetailPage` + `useSnapshotProjection`). Estimated markers and rebasing apply only to the live Dashboard view.

**Rationale**:
- Satisfies FR-010 (frozen historical state).
- Snapshot views already read a stored projection from `projection_snapshots.data.projection`.

---

## Summary of Decisions

| Area | Decision |
|------|----------|
| Timezone | Define “today” by `America/Sao_Paulo` using `Intl` (no new deps) |
| Base date | Derive from checking accounts’ `balance_updated_at`; show single date or range |
| Estimation math | Reuse `calculateCashflow` over the “since last update” interval |
| Rebase projection | Start forward projection tomorrow; prepend today; avoid double counting |
| Scenario consistency | Apply constant optimistic offset to represent past uncertain/probable incomes |
| UI signal | Show “Saldo estimado” if ≥1 included movement since base |
| Snapshots | No estimation or rebasing in historical snapshot views |

## Open Questions Resolved

All clarifications from `spec.md` have been resolved via the decisions above.



