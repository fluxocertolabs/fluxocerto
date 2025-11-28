# Quickstart: Single-Shot Expenses Implementation

**Feature**: 014-single-shot-expenses  
**Date**: 2025-11-28  
**Status**: Complete

## Overview

This guide provides step-by-step implementation instructions for adding single-shot (one-time) expenses to the Family Finance app.

---

## Prerequisites

- Existing codebase with fixed expenses working
- Supabase migrations 001 and 002 applied
- Development environment running (`pnpm dev`)

---

## Implementation Steps

### Step 1: Database Migration

Create and apply the schema migration.

**File**: `supabase/migrations/003_single_shot_expenses.sql`

```sql
-- Migration: 003_single_shot_expenses
-- Feature: 014-single-shot-expenses
-- Date: 2025-11-28
-- Description: Add support for single-shot (one-time) expenses

-- Add type column with default for existing rows
ALTER TABLE expenses 
  ADD COLUMN type TEXT NOT NULL DEFAULT 'fixed' 
  CHECK (type IN ('fixed', 'single_shot'));

-- Add date column for single-shot expenses
ALTER TABLE expenses ADD COLUMN date DATE;

-- Make due_day nullable (required only for fixed expenses)
ALTER TABLE expenses ALTER COLUMN due_day DROP NOT NULL;

-- Add constraint to enforce type-specific field requirements
ALTER TABLE expenses ADD CONSTRAINT expense_type_fields CHECK (
  (type = 'fixed' AND due_day IS NOT NULL) OR
  (type = 'single_shot' AND date IS NOT NULL)
);

-- Add index for date-based queries on single-shot expenses
CREATE INDEX IF NOT EXISTS expenses_date_idx 
  ON expenses(date) 
  WHERE type = 'single_shot';

-- Add index for type-based filtering
CREATE INDEX IF NOT EXISTS expenses_type_idx ON expenses(type);
```

Apply via Supabase dashboard or CLI.

---

### Step 2: Update TypeScript Types

Extend the expense types to support both fixed and single-shot expenses.

**File**: `src/types/index.ts`

```typescript
// === Expense Types ===

// Expense type discriminator
export const ExpenseTypeSchema = z.enum(['fixed', 'single_shot'])
export type ExpenseType = z.infer<typeof ExpenseTypeSchema>

// Fixed Expense (existing, updated with explicit type)
export const FixedExpenseInputSchema = z.object({
  type: z.literal('fixed').default('fixed'),
  name: z.string().min(1, 'Nome da despesa é obrigatório').max(100),
  amount: z.number().positive('Valor deve ser positivo'),
  dueDay: z.number().int().min(1).max(31, 'Dia deve ser entre 1 e 31'),
  isActive: z.boolean().default(true),
})

export const FixedExpenseSchema = FixedExpenseInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type FixedExpenseInput = z.infer<typeof FixedExpenseInputSchema>
export type FixedExpense = z.infer<typeof FixedExpenseSchema>

// Single-Shot Expense (new)
export const SingleShotExpenseInputSchema = z.object({
  type: z.literal('single_shot'),
  name: z.string().min(1, 'Nome da despesa é obrigatório').max(100),
  amount: z.number().positive('Valor deve ser positivo'),
  date: z.coerce.date(),
})

export const SingleShotExpenseSchema = SingleShotExpenseInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type SingleShotExpenseInput = z.infer<typeof SingleShotExpenseInputSchema>
export type SingleShotExpense = z.infer<typeof SingleShotExpenseSchema>

// Unified Expense types
export const ExpenseInputSchema = z.discriminatedUnion('type', [
  FixedExpenseInputSchema,
  SingleShotExpenseInputSchema,
])

export const ExpenseSchema = z.discriminatedUnion('type', [
  FixedExpenseSchema,
  SingleShotExpenseSchema,
])

export type ExpenseInput = z.infer<typeof ExpenseInputSchema>
export type Expense = z.infer<typeof ExpenseSchema>

// Type guards
export function isFixedExpense(expense: Expense): expense is FixedExpense {
  return expense.type === 'fixed'
}

export function isSingleShotExpense(expense: Expense): expense is SingleShotExpense {
  return expense.type === 'single_shot'
}
```

---

### Step 3: Update Supabase Types

Add the extended row type for expenses.

**File**: `src/lib/supabase.ts`

```typescript
// Update ExpenseRow to include new fields
export interface ExpenseRow {
  id: string
  user_id: string
  name: string
  amount: number
  type: 'fixed' | 'single_shot'
  due_day: number | null
  date: string | null  // ISO date string
  is_active: boolean
  created_at: string
  updated_at: string
}
```

---

### Step 4: Update Data Mapping Hook

Update the mapping function to handle both expense types.

**File**: `src/hooks/use-finance-data.ts`

```typescript
import type { Expense, FixedExpense, SingleShotExpense } from '@/types'

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

// Update hook return type and add filtered properties
export interface UseFinanceDataReturn {
  accounts: BankAccount[]
  projects: Project[]
  expenses: Expense[]
  fixedExpenses: FixedExpense[]
  singleShotExpenses: SingleShotExpense[]
  creditCards: CreditCard[]
  isLoading: boolean
  error: string | null
  retry: () => void
}

// In the hook, derive filtered lists
const fixedExpenses = expenses.filter(isFixedExpense)
const singleShotExpenses = expenses.filter(isSingleShotExpense)
```

---

### Step 5: Add Store Actions

Add single-shot expense actions to the finance store.

**File**: `src/stores/finance-store.ts`

```typescript
import { SingleShotExpenseInputSchema, type SingleShotExpenseInput } from '@/types'

// Add to store interface
interface FinanceStore {
  // ... existing actions ...
  
  // Single-Shot Expense Actions
  addSingleShotExpense: (input: SingleShotExpenseInput) => Promise<Result<string>>
  updateSingleShotExpense: (id: string, input: Partial<Omit<SingleShotExpenseInput, 'type'>>) => Promise<Result<void>>
  deleteSingleShotExpense: (id: string) => Promise<Result<void>>
}

// Implement actions
addSingleShotExpense: async (input) => {
  const configError = checkSupabaseConfigured()
  if (configError) return configError

  try {
    const validated = SingleShotExpenseInputSchema.parse(input)

    const { data, error } = await getSupabase()
      .from('expenses')
      .insert({
        name: validated.name,
        amount: validated.amount,
        type: 'single_shot',
        date: validated.date.toISOString().split('T')[0],
        due_day: null,
        is_active: true,
      })
      .select('id')
      .single()

    if (error) {
      return handleSupabaseError(error)
    }

    return { success: true, data: data.id }
  } catch (error) {
    return handleDatabaseError(error)
  }
},

updateSingleShotExpense: async (id, input) => {
  const configError = checkSupabaseConfigured()
  if (configError) return configError

  try {
    const updateData: Record<string, unknown> = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.amount !== undefined) updateData.amount = input.amount
    if (input.date !== undefined) updateData.date = input.date.toISOString().split('T')[0]

    const { error } = await getSupabase()
      .from('expenses')
      .update(updateData)
      .eq('id', id)
      .eq('type', 'single_shot')

    if (error) {
      return handleSupabaseError(error)
    }

    return { success: true, data: undefined }
  } catch (error) {
    return handleDatabaseError(error)
  }
},

deleteSingleShotExpense: async (id) => {
  const configError = checkSupabaseConfigured()
  if (configError) return configError

  try {
    const { error } = await getSupabase()
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('type', 'single_shot')

    if (error) {
      return handleSupabaseError(error)
    }

    return { success: true, data: undefined }
  } catch (error) {
    return handleDatabaseError(error)
  }
},

// Update existing addExpense to explicitly set type
addExpense: async (input) => {
  // ... existing validation ...
  
  const { data, error } = await getSupabase()
    .from('expenses')
    .insert({
      name: validated.name,
      amount: validated.amount,
      type: 'fixed',  // Explicitly set type
      due_day: validated.dueDay,
      is_active: validated.isActive,
      date: null,
    })
    .select('id')
    .single()
  
  // ... rest of implementation ...
},
```

---

### Step 6: Update Cashflow Engine

Extend the cashflow calculation to include single-shot expenses.

**File**: `src/lib/cashflow/validators.ts`

```typescript
import { isFixedExpense, isSingleShotExpense, type Expense, type FixedExpense, type SingleShotExpense } from '@/types'

export interface ValidatedInput {
  accounts: BankAccount[]
  activeProjects: Project[]
  guaranteedProjects: Project[]
  activeFixedExpenses: FixedExpense[]
  singleShotExpenses: SingleShotExpense[]
  creditCards: CreditCard[]
  options: ValidatedOptions
}

export function validateAndFilterInput(input: CashflowEngineInput): ValidatedInput {
  // ... existing validation ...

  // Separate and filter expenses by type
  const activeFixedExpenses: FixedExpense[] = []
  const singleShotExpenses: SingleShotExpense[] = []

  for (const expense of input.expenses) {
    if (isFixedExpense(expense)) {
      if (expense.isActive) {
        activeFixedExpenses.push(expense)
      }
    } else if (isSingleShotExpense(expense)) {
      // Single-shot expenses are always included
      singleShotExpenses.push(expense)
    }
  }

  return {
    // ... other fields ...
    activeFixedExpenses,
    singleShotExpenses,
    // ...
  }
}
```

**File**: `src/lib/cashflow/calculate.ts`

```typescript
import { isSameDay } from 'date-fns'

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

---

### Step 7: Create UI Components

#### Single-Shot Expense Form

**File**: `src/components/manage/expenses/single-shot-expense-form.tsx`

```typescript
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SingleShotExpense, SingleShotExpenseInput } from '@/types'
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/format'

interface SingleShotExpenseFormProps {
  expense?: SingleShotExpense
  onSubmit: (data: Omit<SingleShotExpenseInput, 'type'>) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

export function SingleShotExpenseForm({
  expense,
  onSubmit,
  onCancel,
  isSubmitting,
}: SingleShotExpenseFormProps) {
  const [name, setName] = useState(expense?.name ?? '')
  const [amount, setAmount] = useState(expense ? formatCurrencyInput(expense.amount) : '')
  const [date, setDate] = useState(
    expense ? expense.date.toISOString().split('T')[0] : ''
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    }

    const parsedAmount = parseCurrencyInput(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      newErrors.amount = 'Valor deve ser positivo'
    }

    if (!date) {
      newErrors.date = 'Data é obrigatória'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    await onSubmit({
      name: name.trim(),
      amount: parsedAmount!,
      date: new Date(date),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: IPVA 2025"
          maxLength={100}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Valor</Label>
        <Input
          id="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="R$ 0,00"
        />
        {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Data</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : expense ? 'Salvar' : 'Adicionar'}
        </Button>
      </div>
    </form>
  )
}
```

#### Single-Shot Expense List Item

**File**: `src/components/manage/expenses/single-shot-expense-list-item.tsx`

```typescript
import { format, isBefore, isSameDay, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'
import type { SingleShotExpense } from '@/types'
import { cn } from '@/lib/utils'

interface SingleShotExpenseListItemProps {
  expense: SingleShotExpense
  onEdit: () => void
  onDelete: () => void
}

function getExpenseStatus(date: Date): 'past' | 'today' | 'future' {
  const today = startOfDay(new Date())
  const expenseDate = startOfDay(date)
  
  if (isBefore(expenseDate, today)) return 'past'
  if (isSameDay(expenseDate, today)) return 'today'
  return 'future'
}

export function SingleShotExpenseListItem({
  expense,
  onEdit,
  onDelete,
}: SingleShotExpenseListItemProps) {
  const status = getExpenseStatus(expense.date)
  const isPast = status === 'past'
  const isToday = status === 'today'

  return (
    <Card className={cn('p-4', isPast && 'opacity-60')}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className={cn('font-medium', isPast && 'text-muted-foreground')}>
              {expense.name}
            </h3>
            {isPast && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                Vencido
              </span>
            )}
            {isToday && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                Hoje
              </span>
            )}
          </div>
          <p className={cn('text-sm', isPast ? 'text-muted-foreground' : 'text-foreground')}>
            {formatCurrency(expense.amount)}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(expense.date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Editar
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            Excluir
          </Button>
        </div>
      </div>
    </Card>
  )
}
```

#### Updated Expense Section with Tabs

**File**: `src/components/manage/expenses/expense-section.tsx`

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExpenseList } from './expense-list'
import { SingleShotExpenseList } from './single-shot-expense-list'
import type { FixedExpense, SingleShotExpense } from '@/types'

interface ExpenseSectionProps {
  fixedExpenses: FixedExpense[]
  singleShotExpenses: SingleShotExpense[]
  onAddFixed: () => void
  onAddSingleShot: () => void
  onEditFixed: (expense: FixedExpense) => void
  onEditSingleShot: (expense: SingleShotExpense) => void
  onDeleteFixed: (id: string) => void
  onDeleteSingleShot: (id: string) => void
  onToggleFixedActive: (id: string) => void
}

export function ExpenseSection({
  fixedExpenses,
  singleShotExpenses,
  onAddFixed,
  onAddSingleShot,
  onEditFixed,
  onEditSingleShot,
  onDeleteFixed,
  onDeleteSingleShot,
  onToggleFixedActive,
}: ExpenseSectionProps) {
  return (
    <Tabs defaultValue="fixed" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="fixed">Fixas</TabsTrigger>
        <TabsTrigger value="single_shot">Pontuais</TabsTrigger>
      </TabsList>
      
      <TabsContent value="fixed">
        <ExpenseList
          expenses={fixedExpenses}
          onAdd={onAddFixed}
          onEdit={onEditFixed}
          onDelete={onDeleteFixed}
          onToggleActive={onToggleFixedActive}
        />
      </TabsContent>
      
      <TabsContent value="single_shot">
        <SingleShotExpenseList
          expenses={singleShotExpenses}
          onAdd={onAddSingleShot}
          onEdit={onEditSingleShot}
          onDelete={onDeleteSingleShot}
        />
      </TabsContent>
    </Tabs>
  )
}
```

---

### Step 8: Update Manage Page

Update the manage page to use the new expense section with tabs.

**File**: `src/pages/manage.tsx`

Key changes:
1. Import new components and types
2. Add dialog states for single-shot expenses
3. Add handlers for single-shot CRUD operations
4. Replace `ExpenseList` with `ExpenseSection`

---

## Testing Checklist

### Unit Tests

- [ ] `SingleShotExpenseInputSchema` validates correctly
- [ ] `mapExpenseFromDb` handles both types
- [ ] `isFixedExpense` and `isSingleShotExpense` type guards work
- [ ] Cashflow calculation includes single-shot expenses on correct dates
- [ ] Single-shot expenses appear in both scenarios (optimistic/pessimistic)

### Integration Tests

- [ ] Create single-shot expense persists to database
- [ ] Update single-shot expense updates database
- [ ] Delete single-shot expense removes from database
- [ ] Realtime updates reflect single-shot changes

### E2E Tests

- [ ] Navigate to single-shot expenses tab
- [ ] Create expense with name, amount, date
- [ ] Edit existing expense
- [ ] Delete expense with confirmation
- [ ] Verify expense appears in cashflow on correct date
- [ ] Past expenses show "Vencido" badge
- [ ] Today's expenses show "Hoje" badge

---

## Verification Steps

1. **Database**: Run migration and verify schema changes
2. **Types**: Run `pnpm typecheck` - no errors
3. **Lint**: Run `pnpm lint` - no errors
4. **Tests**: Run `pnpm test` - all pass
5. **Manual**: Create, edit, delete single-shot expense via UI
6. **Cashflow**: Verify expense appears on correct date in chart

