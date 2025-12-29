# Estimated Balance Contract

**Feature**: 026-estimate-today-balance  
**Module**: `src/lib/cashflow/estimate-today.ts`  
**Type**: Pure functions (no side effects)

## Overview

This module defines the pure computation needed to:

- Derive the “base” (last balance update) from checking accounts
- Compute **today’s estimated balance** for both scenarios
- Decide whether the Dashboard must show the **“Saldo estimado”** indicator
- Produce a rebased projection that avoids double counting already-applied movements

No new external API endpoints are introduced; all inputs come from existing Supabase tables via `useFinanceData()`.

## Core Types

```typescript
export type BalanceUpdateBase =
  | { kind: 'single'; date: Date }
  | { kind: 'range'; from: Date; to: Date }

export interface EstimatedTodayBalance {
  today: Date
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

**Consumption rule**:
- Use `isEstimated.optimistic` / `isEstimated.pessimistic` for scenario-specific UI behavior (e.g., whether to show “Saldo estimado” for the active scenario).
- `isEstimated.any` is a convenience aggregate and MUST NOT be used to decide scenario-specific UI display.

## Public Functions

### `getCheckingBalanceUpdateBase(accounts, timeZone)`

Derives the base date/range for “since last update” computations.

```typescript
export function getCheckingBalanceUpdateBase(
  accounts: BankAccount[],
  timeZone: string
): { base: BalanceUpdateBase; baseForComputation: Date } | null
```

**Rules**:
- Only `accounts` with `type === 'checking'` are considered.
- `balanceUpdatedAt` is converted to **date-only** in `timeZone`.
- If any checking account lacks `balanceUpdatedAt`, return `null` (no reliable base).
- `baseForComputation` is the earliest date-only in the set (best-effort when range exists).

---

### `calculateEstimatedTodayBalance(input)`

Computes estimated balances for “today” by applying movements in the interval `(baseDate, today]`.

```typescript
export interface EstimateTodayInput {
  accounts: BankAccount[]
  projects: Project[]
  fixedExpenses: FixedExpense[]
  singleShotExpenses: SingleShotExpense[]
  singleShotIncome: SingleShotIncome[]
  creditCards: CreditCard[]
  futureStatements: FutureStatement[]
  timeZone: string
}

export function calculateEstimatedTodayBalance(
  input: EstimateTodayInput
): EstimatedTodayBalance
```

**Rules**:
- `today` is computed in `timeZone` (date-only).
- Interval is **start exclusive** and **end inclusive**: `(baseDate, today]`.
- Scenario rules match the existing engine:
  - optimistic: guaranteed + probable + uncertain income
  - pessimistic: guaranteed income only
  - expenses/obligations always included
- `isEstimated.optimistic` is true if any income/expense event exists in the interval.
- `isEstimated.pessimistic` is true if any expense exists or any **guaranteed** income exists in the interval.
- `isEstimated.any = optimistic || pessimistic`.

---

### `rebaseProjectionFromEstimatedToday(input)`

Produces a projection rebased from the estimated today value without double counting.

```typescript
export interface RebaseProjectionInput {
  projectionDays: number
  estimatedToday: EstimatedTodayBalance
  // Same entity inputs as the cashflow engine:
  accounts: BankAccount[]
  projects: Project[]
  fixedExpenses: FixedExpense[]
  singleShotExpenses: SingleShotExpense[]
  singleShotIncome: SingleShotIncome[]
  creditCards: CreditCard[]
  futureStatements: FutureStatement[]
}

export function rebaseProjectionFromEstimatedToday(
  input: RebaseProjectionInput
): CashflowProjection
```

**Rules**:
- Forward projection starts **tomorrow** and runs for `projectionDays - 1`.
- A synthetic “today” snapshot is prepended so the chart period remains `projectionDays` inclusive of today.
- Because `calculateCashflow()` uses a single starting balance, pessimistic is used as the engine base; then an `optimisticOffset` is applied to optimistic balances and derived danger-day detection/end balance.

## Non-Goals / Out of Scope

- No new database tables or columns.
- No per-account allocation of movements (schema currently has no account linkage for projects/expenses).
- No changes to historical snapshot rendering paths.


