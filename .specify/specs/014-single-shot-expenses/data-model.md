# Data Model: Single-Shot Expenses

**Feature**: 014-single-shot-expenses  
**Date**: 2025-11-28  
**Status**: Complete

## Overview

This document defines the data model changes required to support single-shot (one-time) expenses alongside existing fixed (recurring) expenses.

---

## Entity Changes

### Expense (Extended)

**Source**: `src/types/index.ts` (to be extended)

The existing `FixedExpense` type is replaced with a discriminated union `Expense` type that supports both fixed and single-shot expense types.

#### Base Fields (All Expense Types)

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| id | string (UUID) | Auto-generated | Primary key |
| name | string | Required, 1-100 chars | Display name |
| amount | number | Positive integer | Amount in cents |
| type | 'fixed' \| 'single_shot' | Required | Discriminator |
| createdAt | Date | Auto-set | Creation timestamp |
| updatedAt | Date | Auto-updated | Last modification |

#### Fixed Expense Fields (when `type = 'fixed'`)

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| dueDay | number | 1-31 | Day of month expense is due |
| isActive | boolean | Default: true | Include in cashflow calculations |

#### Single-Shot Expense Fields (when `type = 'single_shot'`)

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| date | Date | Required | Specific calendar date |

**Note**: Single-shot expenses have no `isActive` field - they are always included when within the projection period.

---

## Zod Schemas

### ExpenseType Enum

```typescript
export const ExpenseTypeSchema = z.enum(['fixed', 'single_shot'])
export type ExpenseType = z.infer<typeof ExpenseTypeSchema>
```

### Fixed Expense Schemas

```typescript
// Input schema for creating/updating fixed expenses
export const FixedExpenseInputSchema = z.object({
  type: z.literal('fixed'),
  name: z.string().min(1, 'Nome da despesa é obrigatório').max(100),
  amount: z.number().positive('Valor deve ser positivo'),
  dueDay: z.number().int().min(1).max(31, 'Dia deve ser entre 1 e 31'),
  isActive: z.boolean().default(true),
})

// Full schema with system fields
export const FixedExpenseSchema = FixedExpenseInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type FixedExpenseInput = z.infer<typeof FixedExpenseInputSchema>
export type FixedExpense = z.infer<typeof FixedExpenseSchema>
```

### Single-Shot Expense Schemas

```typescript
// Input schema for creating/updating single-shot expenses
export const SingleShotExpenseInputSchema = z.object({
  type: z.literal('single_shot'),
  name: z.string().min(1, 'Nome da despesa é obrigatório').max(100),
  amount: z.number().positive('Valor deve ser positivo'),
  date: z.coerce.date(), // Coerces ISO string to Date
})

// Full schema with system fields
export const SingleShotExpenseSchema = SingleShotExpenseInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type SingleShotExpenseInput = z.infer<typeof SingleShotExpenseInputSchema>
export type SingleShotExpense = z.infer<typeof SingleShotExpenseSchema>
```

### Unified Expense Schemas

```typescript
// Discriminated union for expense input
export const ExpenseInputSchema = z.discriminatedUnion('type', [
  FixedExpenseInputSchema,
  SingleShotExpenseInputSchema,
])

// Discriminated union for full expense
export const ExpenseSchema = z.discriminatedUnion('type', [
  FixedExpenseSchema,
  SingleShotExpenseSchema,
])

export type ExpenseInput = z.infer<typeof ExpenseInputSchema>
export type Expense = z.infer<typeof ExpenseSchema>
```

---

## Database Schema

### Migration: 003_single_shot_expenses.sql

```sql
-- Migration: 003_single_shot_expenses
-- Feature: 014-single-shot-expenses
-- Date: 2025-11-28
-- Description: Add support for single-shot (one-time) expenses

-- ============================================================================
-- STEP 1: Add type column with default for existing rows
-- ============================================================================

ALTER TABLE expenses 
  ADD COLUMN type TEXT NOT NULL DEFAULT 'fixed' 
  CHECK (type IN ('fixed', 'single_shot'));

-- ============================================================================
-- STEP 2: Add date column for single-shot expenses
-- ============================================================================

ALTER TABLE expenses ADD COLUMN date DATE;

-- ============================================================================
-- STEP 3: Make due_day nullable (required only for fixed expenses)
-- ============================================================================

ALTER TABLE expenses ALTER COLUMN due_day DROP NOT NULL;

-- ============================================================================
-- STEP 4: Add constraint to enforce type-specific field requirements
-- ============================================================================

ALTER TABLE expenses ADD CONSTRAINT expense_type_fields CHECK (
  (type = 'fixed' AND due_day IS NOT NULL) OR
  (type = 'single_shot' AND date IS NOT NULL)
);

-- ============================================================================
-- STEP 5: Add index for date-based queries on single-shot expenses
-- ============================================================================

CREATE INDEX IF NOT EXISTS expenses_date_idx 
  ON expenses(date) 
  WHERE type = 'single_shot';

-- ============================================================================
-- STEP 6: Add index for type-based filtering
-- ============================================================================

CREATE INDEX IF NOT EXISTS expenses_type_idx ON expenses(type);
```

### Final Table Structure

```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  amount INTEGER NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL DEFAULT 'fixed' CHECK (type IN ('fixed', 'single_shot')),
  -- Fixed expense field (required when type = 'fixed')
  due_day SMALLINT CHECK (due_day BETWEEN 1 AND 31),
  -- Single-shot expense field (required when type = 'single_shot')
  date DATE,
  -- Fixed expense toggle (only applies to fixed expenses)
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Constraint: type determines required fields
  CONSTRAINT expense_type_fields CHECK (
    (type = 'fixed' AND due_day IS NOT NULL) OR
    (type = 'single_shot' AND date IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX expenses_user_id_idx ON expenses(user_id);
CREATE INDEX expenses_is_active_idx ON expenses(is_active);
CREATE INDEX expenses_type_idx ON expenses(type);
CREATE INDEX expenses_date_idx ON expenses(date) WHERE type = 'single_shot';
```

---

## Database Row Types

### ExpenseRow (Supabase Response)

```typescript
// In src/lib/supabase.ts
export interface ExpenseRow {
  id: string
  user_id: string
  name: string
  amount: number
  type: 'fixed' | 'single_shot'
  due_day: number | null      // Present for fixed, null for single_shot
  date: string | null         // ISO date string, present for single_shot, null for fixed
  is_active: boolean
  created_at: string
  updated_at: string
}
```

---

## Type Mapping Functions

### Database → TypeScript

```typescript
// In src/hooks/use-finance-data.ts

function mapExpenseFromDb(row: ExpenseRow): Expense {
  const base = {
    id: row.id,
    name: row.name,
    amount: row.amount,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }

  if (row.type === 'fixed') {
    return {
      ...base,
      type: 'fixed' as const,
      dueDay: row.due_day!,
      isActive: row.is_active,
    }
  }

  return {
    ...base,
    type: 'single_shot' as const,
    date: new Date(row.date!),
  }
}
```

### TypeScript → Database (Insert/Update)

```typescript
// In src/stores/finance-store.ts

function mapFixedExpenseToDb(input: FixedExpenseInput) {
  return {
    name: input.name,
    amount: input.amount,
    type: 'fixed',
    due_day: input.dueDay,
    is_active: input.isActive,
    date: null,
  }
}

function mapSingleShotExpenseToDb(input: SingleShotExpenseInput) {
  return {
    name: input.name,
    amount: input.amount,
    type: 'single_shot',
    date: input.date.toISOString().split('T')[0], // YYYY-MM-DD format
    due_day: null,
    is_active: true, // Always active for single-shot
  }
}
```

---

## Business Rules

### Fixed Expenses
- Recur monthly on `dueDay`
- Can be toggled active/inactive via `isActive`
- Inactive expenses excluded from cashflow calculations
- Due day handles month-end gracefully (31st → last day of short months)

### Single-Shot Expenses
- Occur once on specific `date`
- Always included in cashflow (no `isActive` toggle)
- Automatically considered "past" when `date < today`
- Appear in both optimistic and pessimistic scenarios (certain expenses)
- Past expenses displayed with muted styling in list

### Validation Rules
- Name: 1-100 characters, required
- Amount: Positive integer (cents), required
- Fixed: `dueDay` required (1-31)
- Single-shot: `date` required (any valid calendar date)

---

## State Shape

### useFinanceData Hook Return

```typescript
interface UseFinanceDataReturn {
  accounts: BankAccount[]
  projects: Project[]
  expenses: Expense[]           // Now includes both types
  fixedExpenses: FixedExpense[] // Filtered convenience property
  singleShotExpenses: SingleShotExpense[] // Filtered convenience property
  creditCards: CreditCard[]
  isLoading: boolean
  error: string | null
  retry: () => void
}
```

### Filtering Helpers

```typescript
// Type guards for filtering
function isFixedExpense(expense: Expense): expense is FixedExpense {
  return expense.type === 'fixed'
}

function isSingleShotExpense(expense: Expense): expense is SingleShotExpense {
  return expense.type === 'single_shot'
}

// Usage in hook
const fixedExpenses = expenses.filter(isFixedExpense)
const singleShotExpenses = expenses.filter(isSingleShotExpense)
```

---

## Cashflow Engine Integration

### Input Types

```typescript
// In src/lib/cashflow/validators.ts
export interface CashflowEngineInput {
  accounts: BankAccount[]
  projects: Project[]
  expenses: Expense[]           // Now accepts both types
  creditCards: CreditCard[]
  options?: CashflowEngineOptions
  projectionDays?: number
}
```

### Validated Input

```typescript
export interface ValidatedInput {
  accounts: BankAccount[]
  activeProjects: Project[]
  guaranteedProjects: Project[]
  activeFixedExpenses: FixedExpense[]      // Filtered by isActive
  singleShotExpenses: SingleShotExpense[]  // All (always active)
  creditCards: CreditCard[]
  options: ValidatedOptions
}
```

### Expense Event Generation

The `createExpenseEvents` function will be extended to handle both types:

```typescript
function createExpenseEvents(
  date: Date,
  fixedExpenses: FixedExpense[],
  singleShotExpenses: SingleShotExpense[],
  creditCards: CreditCard[]
): ExpenseEvent[] {
  const events: ExpenseEvent[] = []
  const dayOfMonth = getDate(date)

  // Fixed expenses: check day of month match
  for (const expense of fixedExpenses) {
    if (getEffectiveDay(expense.dueDay, date) === dayOfMonth) {
      events.push({
        sourceId: expense.id,
        sourceName: expense.name,
        sourceType: 'expense',
        amount: expense.amount,
      })
    }
  }

  // Single-shot expenses: check exact date match
  for (const expense of singleShotExpenses) {
    if (isSameDay(expense.date, date)) {
      events.push({
        sourceId: expense.id,
        sourceName: expense.name,
        sourceType: 'expense',
        amount: expense.amount,
      })
    }
  }

  // Credit cards (unchanged)
  for (const card of creditCards) {
    if (card.statementBalance > 0 && getEffectiveDay(card.dueDay, date) === dayOfMonth) {
      events.push({
        sourceId: card.id,
        sourceName: card.name,
        sourceType: 'credit_card',
        amount: card.statementBalance,
      })
    }
  }

  return events
}
```

