# Quickstart: Cashflow Calculation Engine

**Feature**: 003-cashflow-engine  
**Date**: 2025-11-26

## Overview

The Cashflow Calculation Engine is a pure TypeScript module that projects daily cashflow balances over a configurable period. It calculates two parallel scenarios (optimistic and pessimistic) and identifies danger days.

## Installation

```bash
# Add date-fns dependency (if not already installed)
cd /home/delucca/Workspaces/src/sandbox/family-finance
pnpm add date-fns@4.1.0
```

## Basic Usage

```typescript
import { calculateCashflow } from '@/lib/cashflow'
import type { CashflowProjection } from '@/lib/cashflow/types'

// Prepare input data (typically from Dexie.js)
const projection = calculateCashflow({
  accounts: [
    { id: '1', name: 'Checking', type: 'checking', balance: 500000, ... },
    { id: '2', name: 'Savings', type: 'savings', balance: 1000000, ... },
  ],
  projects: [
    { id: '1', name: 'Salary', amount: 300000, paymentDay: 15, frequency: 'monthly', certainty: 'guaranteed', isActive: true, ... },
    { id: '2', name: 'Freelance', amount: 100000, paymentDay: 1, frequency: 'monthly', certainty: 'uncertain', isActive: true, ... },
  ],
  expenses: [
    { id: '1', name: 'Rent', amount: 150000, dueDay: 1, isActive: true, ... },
  ],
  creditCards: [
    { id: '1', name: 'Visa', statementBalance: 50000, dueDay: 20, ... },
  ],
  options: {
    startDate: new Date(), // Optional, defaults to today
    projectionDays: 30,    // Optional, defaults to 30
  }
})
```

## Reading Results

### Daily Balances

```typescript
// Get balance for a specific day
const day5 = projection.days[5]
console.log(`Day 5 optimistic: $${day5.optimisticBalance / 100}`)
console.log(`Day 5 pessimistic: $${day5.pessimisticBalance / 100}`)

// Check for danger
if (day5.isPessimisticDanger) {
  console.log('Warning: Pessimistic scenario shows negative balance!')
}
```

### Income/Expense Events

```typescript
// See what happens on a specific day
const day15 = projection.days[15]

for (const income of day15.incomeEvents) {
  console.log(`Income: ${income.projectName} - $${income.amount / 100}`)
}

for (const expense of day15.expenseEvents) {
  console.log(`Expense: ${expense.sourceName} - $${expense.amount / 100}`)
}
```

### Scenario Summaries

```typescript
// Optimistic scenario (all active income)
console.log(`Total income: $${projection.optimistic.totalIncome / 100}`)
console.log(`Total expenses: $${projection.optimistic.totalExpenses / 100}`)
console.log(`End balance: $${projection.optimistic.endBalance / 100}`)
console.log(`Danger days: ${projection.optimistic.dangerDayCount}`)

// Pessimistic scenario (guaranteed income only)
console.log(`Guaranteed income: $${projection.pessimistic.totalIncome / 100}`)
console.log(`Danger days: ${projection.pessimistic.dangerDayCount}`)

// List specific danger days
for (const danger of projection.pessimistic.dangerDays) {
  console.log(`${danger.date.toDateString()}: $${danger.balance / 100}`)
}
```

## Integration with React

```typescript
import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { calculateCashflow } from '@/lib/cashflow'

function CashflowChart() {
  // Fetch data from IndexedDB
  const accounts = useLiveQuery(() => db.accounts.toArray())
  const projects = useLiveQuery(() => db.projects.toArray())
  const expenses = useLiveQuery(() => db.expenses.toArray())
  const creditCards = useLiveQuery(() => db.creditCards.toArray())

  // Calculate projection when data is ready
  const projection = useMemo(() => {
    if (!accounts || !projects || !expenses || !creditCards) return null
    
    return calculateCashflow({
      accounts,
      projects,
      expenses,
      creditCards,
      options: { projectionDays: 30 }
    })
  }, [accounts, projects, expenses, creditCards])

  if (!projection) return <div>Loading...</div>

  // Render with Recharts or other visualization
  return (
    <div>
      <h2>30-Day Cashflow Projection</h2>
      <p>Starting: ${projection.startingBalance / 100}</p>
      <p>Ending (optimistic): ${projection.optimistic.endBalance / 100}</p>
      <p>Ending (pessimistic): ${projection.pessimistic.endBalance / 100}</p>
      {/* Chart component here */}
    </div>
  )
}
```

## Key Concepts

### Scenarios

- **Optimistic**: Includes all active income sources (guaranteed + probable + uncertain)
- **Pessimistic**: Includes only guaranteed income sources

### Danger Days

A "danger day" is any day where the projected balance goes negative. Each scenario tracks danger days independently.

### Frequency Handling

- **Monthly**: Payment occurs on the specified day each month (with month-end adjustment)
- **Biweekly**: Payment occurs every 14 days from the first occurrence in the projection
- **Weekly**: Payment occurs every 7 days from the first occurrence in the projection

### Month-End Edge Cases

If a payment day exceeds the month's length (e.g., day 31 in February), the payment occurs on the last day of that month.

## Error Handling

```typescript
import { CashflowCalculationError, CashflowErrorCode } from '@/lib/cashflow/types'

try {
  const projection = calculateCashflow(input)
} catch (error) {
  if (error instanceof CashflowCalculationError) {
    switch (error.code) {
      case CashflowErrorCode.INVALID_AMOUNT:
        console.error('Invalid amount:', error.details)
        break
      case CashflowErrorCode.INVALID_DAY:
        console.error('Invalid payment day:', error.details)
        break
      // ... handle other cases
    }
  }
}
```

## File Structure

```
src/lib/cashflow/
├── index.ts           # Main export (calculateCashflow)
├── types.ts           # Engine-specific types
├── calculate.ts       # Core calculation logic
├── frequencies.ts     # Payment frequency handlers
└── validators.ts      # Input validation
```

## Testing

```bash
# Run cashflow engine tests
pnpm test src/lib/cashflow

# Run with coverage
pnpm test:coverage src/lib/cashflow
```

