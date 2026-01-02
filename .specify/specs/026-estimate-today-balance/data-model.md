# Data Model: Today's estimated balance

**Feature**: 026-estimate-today-balance  
**Date**: 2025-12-29

## Overview

This feature is a **derived-calculation + UI signaling** change. It introduces no new database entities. The Dashboard computes a **today estimate** from existing data, then rebases the projection to start from that estimate while keeping historical snapshots frozen.

## Existing Entities (Source Data)

All monetary values are stored as **integer cents**.

### `accounts` (BankAccount)

Relevant fields:
- `type`: `'checking' | 'savings' | 'investment'`
- `balance`: integer cents (stored balance as last entered)
- `balance_updated_at`: `timestamptz | null` (used as last-update base signal)

Dashboard usage:
- Only `type === 'checking'` contributes to the cash starting balance.
- `balance_updated_at` is used to derive the “base date” (date-only, `America/Sao_Paulo`).

### `projects` (Income)

Used as:
- Recurring income (`type === 'recurring'`, `frequency`, `payment_schedule`)
- Single-shot income (`type === 'single_shot'`, `date`)

Relevant fields:
- `amount`: integer cents
- `certainty`: `'guaranteed' | 'probable' | 'uncertain'`

Scenario usage:
- Optimistic includes guaranteed + probable + uncertain
- Pessimistic includes guaranteed only

### `expenses` (Expense)

Used as:
- Fixed/recurring expenses (`type === 'fixed'`, `due_day`)
- Single-shot expenses (`type === 'single_shot'`, `date`)

Relevant fields:
- `amount`: integer cents
- `is_active`: boolean

### `credit_cards` + `future_statements` (Obligations)

Used to generate cash decrements on due dates.

Relevant fields:
- `credit_cards.statement_balance`: integer cents
- `credit_cards.due_day`: day-of-month
- `credit_cards.balance_updated_at`: `timestamptz | null` (used for staleness UI and “update” flows)
- `future_statements.amount`: integer cents for future months

Notes:
- Past-month obligations are approximated using current `statement_balance` (consistent with current engine logic).

### `projection_snapshots` (Historical snapshots)

Snapshots store a frozen projection payload. This feature must not mutate or recompute snapshot projections.

## New Derived View Models (No DB Changes)

### `BalanceUpdateBase` (derived)

Represents the base used for “since last update” calculations.

```typescript
type BalanceUpdateBase =
  | {
      kind: 'single'
      date: Date // date-only in America/Sao_Paulo
    }
  | {
      kind: 'range'
      from: Date // min date-only
      to: Date   // max date-only
    }
```

### `EstimatedTodayBalance` (derived)

```typescript
interface EstimatedTodayBalance {
  today: Date // date-only in America/Sao_Paulo
  hasBase: boolean
  base?: BalanceUpdateBase
  optimisticCents: number
  pessimisticCents: number
  isEstimated: {
    optimistic: boolean
    pessimistic: boolean
    any: boolean
  }
}
```

### `DashboardProjectionWithEstimate` (derived)

The Dashboard continues to render the chart and summary from a `CashflowProjection` but also needs metadata for the indicator:

```typescript
interface DashboardProjectionWithEstimate {
  projection: CashflowProjection
  estimate: EstimatedTodayBalance
}
```

## Data Transformations

### Date-only normalization (timezone-aware)

- “Today” and “base date” are computed as date-only values in `America/Sao_Paulo`.
- These date-only values are used for comparisons and `addDays`-style arithmetic.

### Interval definition (start exclusive, end inclusive)

Given:
- `baseDate` (date-only) from `balance_updated_at`
- `today` (date-only)

We apply movements for dates in:

```
(baseDate, today]
```

### Projection rebasing

- If the balance is estimated, future projection starts **tomorrow** and is prefixed with a synthetic “today” point equal to the estimated balances.
- This avoids double counting movements already included in the estimate.

## State Transitions (UI)

```
┌─────────────────────────────────────────────────────────┐
│ Dashboard balance states                                 │
├─────────────────────────────────────────────────────────┤
│ No base: show “comece atualizando os saldos” + CTA       │
│ Base exists + no movements: show normal balance (no pill)│
│ Base exists + movements: show “Saldo estimado” + base +  │
│ CTA to Atualizar Saldos                                  │
└─────────────────────────────────────────────────────────┘
```

## Validation Rules

No new user input. Existing engine validation (Zod) continues to validate input entities.





