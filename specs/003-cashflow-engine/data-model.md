# Data Model: Cashflow Calculation Engine

**Feature**: 003-cashflow-engine  
**Date**: 2025-11-26  
**Status**: Complete

## Entity Overview

The cashflow engine operates on **input entities** (existing domain types) and produces **output entities** (engine-specific types).

## Input Entities (Existing - from `src/types/index.ts`)

These types already exist in the codebase. The engine receives them as input.

### BankAccount

```typescript
interface BankAccount {
  id: string                                    // UUID
  name: string                                  // "My Checking", "Joint Savings"
  type: 'checking' | 'savings' | 'investment'  // Only 'checking' used for cashflow
  balance: number                               // Current balance in cents
  createdAt: Date
  updatedAt: Date
}
```

**Engine Usage**: Sum of all `checking` accounts = starting balance

### Project (Income Source)

```typescript
interface Project {
  id: string                                           // UUID
  name: string                                         // "Client X Retainer"
  amount: number                                       // Payment amount in cents
  paymentDay: number                                   // Day of month (1-31)
  frequency: 'weekly' | 'biweekly' | 'monthly'        // Payment schedule
  certainty: 'guaranteed' | 'probable' | 'uncertain'  // Income certainty
  isActive: boolean                                    // Include in calculations
  createdAt: Date
  updatedAt: Date
}
```

**Engine Usage**: 
- Optimistic: All active projects
- Pessimistic: Only `certainty === 'guaranteed'` projects
- Note: Engine treats `probable` same as `uncertain` for pessimistic

### FixedExpense

```typescript
interface FixedExpense {
  id: string          // UUID
  name: string        // "Mortgage", "Netflix"
  amount: number      // Amount in cents
  dueDay: number      // Day of month (1-31)
  isActive: boolean   // Include in calculations
  createdAt: Date
  updatedAt: Date
}
```

**Engine Usage**: Deducted on due day (monthly frequency only)

### CreditCard

```typescript
interface CreditCard {
  id: string                // UUID
  name: string              // "Amex", "Visa"
  statementBalance: number  // Current statement in cents
  dueDay: number            // Day of month (1-31)
  createdAt: Date
  updatedAt: Date
}
```

**Engine Usage**: Treated as monthly expense on due day

## Output Entities (New - engine-specific)

These types are created by the engine and returned to callers.

### CashflowProjection (Root Output)

```typescript
interface CashflowProjection {
  startDate: Date              // First day of projection
  endDate: Date                // Last day of projection
  startingBalance: number      // Sum of checking accounts (cents)
  days: DailySnapshot[]        // Array of daily snapshots
  optimistic: ScenarioSummary  // Summary for optimistic scenario
  pessimistic: ScenarioSummary // Summary for pessimistic scenario
}
```

### DailySnapshot

```typescript
interface DailySnapshot {
  date: Date                      // Calendar date
  dayOffset: number               // 0-indexed offset from start
  optimisticBalance: number       // Running balance (optimistic) in cents
  pessimisticBalance: number      // Running balance (pessimistic) in cents
  incomeEvents: IncomeEvent[]     // Income received this day
  expenseEvents: ExpenseEvent[]   // Expenses paid this day
  isOptimisticDanger: boolean     // optimisticBalance < 0
  isPessimisticDanger: boolean    // pessimisticBalance < 0
}
```

### IncomeEvent

```typescript
interface IncomeEvent {
  projectId: string                                   // Reference to Project
  projectName: string                                 // Display name
  amount: number                                      // Amount in cents
  certainty: 'guaranteed' | 'probable' | 'uncertain' // From Project
}
```

### ExpenseEvent

```typescript
interface ExpenseEvent {
  sourceId: string                        // Reference to FixedExpense or CreditCard
  sourceName: string                      // Display name
  sourceType: 'expense' | 'credit_card'   // Distinguish source
  amount: number                          // Amount in cents
}
```

### ScenarioSummary

```typescript
interface ScenarioSummary {
  totalIncome: number      // Sum of all income events (cents)
  totalExpenses: number    // Sum of all expense events (cents)
  endBalance: number       // Final day's balance (cents)
  dangerDays: DangerDay[]  // Days with negative balance
  dangerDayCount: number   // Length of dangerDays array
}
```

### DangerDay

```typescript
interface DangerDay {
  date: Date        // Calendar date
  dayOffset: number // 0-indexed offset from start
  balance: number   // Negative balance amount (cents)
}
```

## Engine Input Configuration

```typescript
interface CashflowEngineInput {
  accounts: BankAccount[]
  projects: Project[]
  expenses: FixedExpense[]
  creditCards: CreditCard[]
  startDate?: Date           // Default: today
  projectionDays?: number    // Default: 30
}
```

## Validation Rules

### Input Validation (Zod Schemas)

| Field | Rule | Error Message |
|-------|------|---------------|
| `BankAccount.balance` | >= 0 | "Balance cannot be negative" |
| `Project.amount` | > 0 | "Amount must be positive" |
| `Project.paymentDay` | 1-31 | "Payment day must be 1-31" |
| `Project.frequency` | enum | "Invalid frequency" |
| `Project.certainty` | enum | "Invalid certainty level" |
| `FixedExpense.amount` | > 0 | "Amount must be positive" |
| `FixedExpense.dueDay` | 1-31 | "Due day must be 1-31" |
| `CreditCard.statementBalance` | >= 0 | "Balance cannot be negative" |
| `CreditCard.dueDay` | 1-31 | "Due day must be 1-31" |
| `projectionDays` | > 0 | "Projection days must be positive" |

### Business Rules

1. **Starting Balance**: Sum of `balance` from accounts where `type === 'checking'`
2. **Active Filter**: Only entities with `isActive === true` (Projects, FixedExpenses)
3. **Certainty Filter (Pessimistic)**: Only `certainty === 'guaranteed'` projects
4. **Month-End Handling**: `effectiveDay = Math.min(paymentDay, daysInMonth)`
5. **Frequency Calculation**:
   - Monthly: Day of month match
   - Biweekly: Every 14 days from first occurrence
   - Weekly: Every 7 days from first occurrence

## State Transitions

The engine is stateless - no state transitions within the engine itself.

**External State Flow** (how data flows to/from engine):

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   IndexedDB     │────▶│ Cashflow Engine  │────▶│   UI/Charts     │
│  (Dexie.js)     │     │  (Pure Function) │     │   (Recharts)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                        │
        │                        │                        │
   BankAccount[]            CashflowProjection       Visualization
   Project[]                                         
   FixedExpense[]                                    
   CreditCard[]                                      
```

## Relationships

```
BankAccount ──────────────────────────────────────┐
                                                  │
Project ─────────────────────────────────────────┐│
                                                 ││
FixedExpense ───────────────────────────────────┐││
                                                │││
CreditCard ────────────────────────────────────┐│││
                                               ││││
                                               ▼▼▼▼
                                    ┌─────────────────────┐
                                    │ CashflowEngineInput │
                                    └─────────────────────┘
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │  calculateCashflow  │
                                    └─────────────────────┘
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │ CashflowProjection  │
                                    └─────────────────────┘
                                               │
                        ┌──────────────────────┼──────────────────────┐
                        ▼                      ▼                      ▼
               ┌────────────────┐    ┌────────────────┐    ┌────────────────┐
               │ DailySnapshot[]│    │ScenarioSummary │    │ScenarioSummary │
               │                │    │  (optimistic)  │    │  (pessimistic) │
               └────────────────┘    └────────────────┘    └────────────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
   ┌────────────┐ ┌────────────┐ ┌────────────┐
   │IncomeEvent │ │ExpenseEvent│ │ DangerDay  │
   └────────────┘ └────────────┘ └────────────┘
```

