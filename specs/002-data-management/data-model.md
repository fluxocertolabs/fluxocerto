# Data Model: Core Data Management Layer

**Feature**: 002-data-management  
**Date**: 2025-11-26  
**Source of Truth**: Zod schemas in `src/types/index.ts`

## Overview

This document defines the data model for the Fluxo Certo application's core entities. All schemas are defined using Zod, with TypeScript types inferred from them.

---

## Entity Definitions

### 1. Bank Account

Represents a financial account at a bank or institution.

```typescript
// Zod Schema
export const BankAccountInputSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  type: z.enum(['checking', 'savings', 'investment']),
  balance: z.number().min(0, 'Balance cannot be negative'),
})

export const BankAccountSchema = BankAccountInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Inferred Types
export type BankAccountInput = z.infer<typeof BankAccountInputSchema>
export type BankAccount = z.infer<typeof BankAccountSchema>
```

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `string` (UUID) | Primary key, auto-generated | Unique identifier |
| `name` | `string` | Required, 1-100 chars | Display name (e.g., "Main Checking") |
| `type` | `enum` | `checking`, `savings`, `investment` | Account classification |
| `balance` | `number` | >= 0 | Current balance in user's currency |
| `createdAt` | `Date` | Auto-set on create | Creation timestamp |
| `updatedAt` | `Date` | Auto-set on create/update | Last modification timestamp |

**Business Rules**:
- Only `checking` accounts are used in cashflow calculations
- `savings` and `investment` are display-only for net worth awareness
- Balance stored as number (e.g., 1500.50), not cents

---

### 2. Project (Income Source)

Represents a source of income (job, freelance work, side gig).

```typescript
// Zod Schema
export const ProjectInputSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  amount: z.number().positive('Amount must be positive'),
  paymentDay: z.number().int().min(1).max(31, 'Payment day must be 1-31'),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
  certainty: z.enum(['guaranteed', 'probable', 'uncertain']),
  isActive: z.boolean().default(true),
})

export const ProjectSchema = ProjectInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Inferred Types
export type ProjectInput = z.infer<typeof ProjectInputSchema>
export type Project = z.infer<typeof ProjectSchema>
```

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `string` (UUID) | Primary key, auto-generated | Unique identifier |
| `name` | `string` | Required, 1-100 chars | Display name (e.g., "Consulting") |
| `amount` | `number` | > 0 | Payment amount per occurrence |
| `paymentDay` | `number` | 1-31, integer | Day of month payment expected |
| `frequency` | `enum` | `weekly`, `biweekly`, `monthly` | Payment frequency |
| `certainty` | `enum` | `guaranteed`, `probable`, `uncertain` | Income reliability |
| `isActive` | `boolean` | Defaults to `true` | Whether included in calculations |
| `createdAt` | `Date` | Auto-set on create | Creation timestamp |
| `updatedAt` | `Date` | Auto-set on create/update | Last modification timestamp |

**Business Rules**:
- `guaranteed` income always included in pessimistic scenario
- `probable` and `uncertain` only in optimistic scenario
- Inactive projects excluded from all calculations
- New projects default to active

---

### 3. Fixed Expense

Represents a recurring bill or expense.

```typescript
// Zod Schema
export const FixedExpenseInputSchema = z.object({
  name: z.string().min(1, 'Expense name is required').max(100),
  amount: z.number().positive('Amount must be positive'),
  dueDay: z.number().int().min(1).max(31, 'Due day must be 1-31'),
  isActive: z.boolean().default(true),
})

export const FixedExpenseSchema = FixedExpenseInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Inferred Types
export type FixedExpenseInput = z.infer<typeof FixedExpenseInputSchema>
export type FixedExpense = z.infer<typeof FixedExpenseSchema>
```

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `string` (UUID) | Primary key, auto-generated | Unique identifier |
| `name` | `string` | Required, 1-100 chars | Display name (e.g., "Rent") |
| `amount` | `number` | > 0 | Monthly expense amount |
| `dueDay` | `number` | 1-31, integer | Day of month expense is due |
| `isActive` | `boolean` | Defaults to `true` | Whether included in calculations |
| `createdAt` | `Date` | Auto-set on create | Creation timestamp |
| `updatedAt` | `Date` | Auto-set on create/update | Last modification timestamp |

**Business Rules**:
- Fixed expenses are always included in both scenarios (pessimistic and optimistic)
- Inactive expenses excluded from calculations
- New expenses default to active

---

### 4. Credit Card

Represents a credit card with a statement balance due.

```typescript
// Zod Schema
export const CreditCardInputSchema = z.object({
  name: z.string().min(1, 'Card name is required').max(100),
  statementBalance: z.number().min(0, 'Balance cannot be negative'),
  dueDay: z.number().int().min(1).max(31, 'Due day must be 1-31'),
})

export const CreditCardSchema = CreditCardInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Inferred Types
export type CreditCardInput = z.infer<typeof CreditCardInputSchema>
export type CreditCard = z.infer<typeof CreditCardSchema>
```

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `string` (UUID) | Primary key, auto-generated | Unique identifier |
| `name` | `string` | Required, 1-100 chars | Display name (e.g., "Visa") |
| `statementBalance` | `number` | >= 0 | Current statement balance owed |
| `dueDay` | `number` | 1-31, integer | Day of month payment is due |
| `createdAt` | `Date` | Auto-set on create | Creation timestamp |
| `updatedAt` | `Date` | Auto-set on create/update | Last modification timestamp |

**Business Rules**:
- Statement balance is the amount due this month (updated monthly by user)
- Credit cards are always included in cashflow (no active/inactive toggle)
- Balance of 0 means no payment due

---

## Database Schema (Dexie.js)

```typescript
// db/index.ts
import Dexie, { Table } from 'dexie'
import type { BankAccount, Project, FixedExpense, CreditCard } from '../types'

export class FinanceDB extends Dexie {
  accounts!: Table<BankAccount, string>
  projects!: Table<Project, string>
  expenses!: Table<FixedExpense, string>
  creditCards!: Table<CreditCard, string>

  constructor() {
    super('FluxoCertoDB')
    
    this.version(1).stores({
      accounts: 'id, name, type',
      projects: 'id, name, isActive',
      expenses: 'id, name, isActive',
      creditCards: 'id, name'
    })
  }
}

export const db = new FinanceDB()
```

### Index Strategy

| Table | Primary Key | Indexed Fields | Query Use Cases |
|-------|-------------|----------------|-----------------|
| `accounts` | `id` | `name`, `type` | Filter checking for cashflow |
| `projects` | `id` | `name`, `isActive` | Filter active for projections |
| `expenses` | `id` | `name`, `isActive` | Filter active for projections |
| `creditCards` | `id` | `name` | Simple lookups |

---

## Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                     No Foreign Key Relationships                │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ BankAccount  │  │   Project    │  │ FixedExpense │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────┐                                               │
│  │  CreditCard  │                                               │
│  └──────────────┘                                               │
│                                                                 │
│  All entities are independent - no referential integrity        │
│  Relationships computed at runtime by cashflow engine           │
└─────────────────────────────────────────────────────────────────┘
```

**Design Decision**: No foreign keys between entities in this feature. The cashflow calculation engine (future feature) will combine data from all entities at runtime.

---

## State Transitions

### Active/Inactive Toggle (Projects & Expenses)

```
┌────────────┐    toggle()    ┌────────────┐
│   Active   │ ◄────────────► │  Inactive  │
│ isActive=1 │                │ isActive=0 │
└────────────┘                └────────────┘
     │                              │
     │ Included in                  │ Excluded from
     │ cashflow calculations        │ cashflow calculations
     │                              │
     │ Visible in                   │ Visible in
     │ active list                  │ inactive list
     ▼                              ▼
```

---

## Validation Rules Summary

| Entity | Field | Rule | Error Message |
|--------|-------|------|---------------|
| All | `name` | Required, 1-100 chars | "Name is required" |
| BankAccount | `balance` | >= 0 | "Balance cannot be negative" |
| Project | `amount` | > 0 | "Amount must be positive" |
| Project | `paymentDay` | 1-31, integer | "Payment day must be 1-31" |
| FixedExpense | `amount` | > 0 | "Amount must be positive" |
| FixedExpense | `dueDay` | 1-31, integer | "Due day must be 1-31" |
| CreditCard | `statementBalance` | >= 0 | "Balance cannot be negative" |
| CreditCard | `dueDay` | 1-31, integer | "Due day must be 1-31" |

---

## Type Exports

All types exported from `src/types/index.ts`:

```typescript
// Input types (for forms/creation)
export type BankAccountInput
export type ProjectInput
export type FixedExpenseInput
export type CreditCardInput

// Full types (with id and timestamps)
export type BankAccount
export type Project
export type FixedExpense
export type CreditCard

// Schemas (for validation)
export const BankAccountInputSchema
export const BankAccountSchema
export const ProjectInputSchema
export const ProjectSchema
export const FixedExpenseInputSchema
export const FixedExpenseSchema
export const CreditCardInputSchema
export const CreditCardSchema
```

