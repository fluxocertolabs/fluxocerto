# Store API Contract: Single-Shot Income

**Feature**: 018-single-shot-income  
**Date**: 2025-11-28  
**Status**: Complete

## Overview

This document defines the Zustand store API contract for single-shot income operations. The store handles CRUD operations with Supabase persistence.

---

## Store Interface

### State Shape

```typescript
interface FinanceState {
  // Existing state...
  accounts: BankAccount[]
  projects: RecurringProject[]  // Renamed from projects for clarity
  singleShotIncome: SingleShotIncome[]  // NEW
  expenses: FixedExpense[]
  singleShotExpenses: SingleShotExpense[]
  creditCards: CreditCard[]
  
  // Loading states
  isLoading: boolean
  error: string | null
}
```

### Actions

```typescript
interface FinanceActions {
  // Existing actions...
  
  // Single-Shot Income CRUD (NEW)
  addSingleShotIncome: (input: SingleShotIncomeInput) => Promise<Result<SingleShotIncome>>
  updateSingleShotIncome: (id: string, input: Partial<SingleShotIncomeInput>) => Promise<Result<SingleShotIncome>>
  deleteSingleShotIncome: (id: string) => Promise<Result<void>>
}
```

---

## Operation Contracts

### addSingleShotIncome

**Purpose**: Create a new single-shot income entry.

**Signature**:
```typescript
addSingleShotIncome(input: SingleShotIncomeInput): Promise<Result<SingleShotIncome>>
```

**Input**:
```typescript
interface SingleShotIncomeInput {
  type: 'single_shot'
  name: string      // 1-100 chars
  amount: number    // Positive integer (cents)
  date: Date        // Any valid calendar date
  certainty: 'guaranteed' | 'probable' | 'uncertain'
}
```

**Success Response**:
```typescript
{
  success: true,
  data: {
    id: string,
    type: 'single_shot',
    name: string,
    amount: number,
    date: Date,
    certainty: 'guaranteed' | 'probable' | 'uncertain',
    createdAt: Date,
    updatedAt: Date
  }
}
```

**Error Response**:
```typescript
{
  success: false,
  error: string,
  details?: unknown
}
```

**Error Cases**:
| Error | Cause |
|-------|-------|
| "Nome da receita é obrigatório" | Empty or missing name |
| "Valor deve ser positivo" | Amount <= 0 |
| "Data é obrigatória" | Missing or invalid date |
| "Certeza é obrigatória" | Missing certainty level |
| "Unable to connect..." | Network error |
| "You don't have permission..." | RLS policy violation |

**Side Effects**:
- Inserts row into `projects` table with `type = 'single_shot'`
- Updates local store state
- Triggers realtime subscription update

---

### updateSingleShotIncome

**Purpose**: Update an existing single-shot income entry.

**Signature**:
```typescript
updateSingleShotIncome(id: string, input: Partial<SingleShotIncomeInput>): Promise<Result<SingleShotIncome>>
```

**Input**:
```typescript
// All fields optional except type
interface PartialSingleShotIncomeInput {
  type?: 'single_shot'  // Must remain single_shot if provided
  name?: string
  amount?: number
  date?: Date
  certainty?: 'guaranteed' | 'probable' | 'uncertain'
}
```

**Success Response**:
```typescript
{
  success: true,
  data: SingleShotIncome  // Updated record
}
```

**Error Cases**:
| Error | Cause |
|-------|-------|
| "Record not found." | Invalid ID |
| "Nome da receita é obrigatório" | Empty name provided |
| "Valor deve ser positivo" | Amount <= 0 provided |
| Network/permission errors | Same as addSingleShotIncome |

**Side Effects**:
- Updates row in `projects` table
- Updates `updated_at` timestamp automatically
- Updates local store state
- Triggers realtime subscription update

---

### deleteSingleShotIncome

**Purpose**: Delete a single-shot income entry.

**Signature**:
```typescript
deleteSingleShotIncome(id: string): Promise<Result<void>>
```

**Success Response**:
```typescript
{
  success: true,
  data: undefined
}
```

**Error Cases**:
| Error | Cause |
|-------|-------|
| "Record not found." | Invalid ID |
| Network/permission errors | Same as addSingleShotIncome |

**Side Effects**:
- Deletes row from `projects` table
- Updates local store state
- Triggers realtime subscription update

---

## Supabase Operations

### Insert

```typescript
const { data, error } = await supabase
  .from('projects')
  .insert({
    type: 'single_shot',
    name: input.name,
    amount: input.amount,
    date: input.date.toISOString().split('T')[0],
    certainty: input.certainty,
    frequency: null,
    payment_schedule: null,
    is_active: null,
  })
  .select()
  .single()
```

### Update

```typescript
const { data, error } = await supabase
  .from('projects')
  .update({
    name: input.name,
    amount: input.amount,
    date: input.date?.toISOString().split('T')[0],
    certainty: input.certainty,
  })
  .eq('id', id)
  .eq('type', 'single_shot')  // Safety check
  .select()
  .single()
```

### Delete

```typescript
const { error } = await supabase
  .from('projects')
  .delete()
  .eq('id', id)
  .eq('type', 'single_shot')  // Safety check
```

### Fetch All (for realtime subscription)

```typescript
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .order('created_at', { ascending: false })

// Then filter in memory:
const recurring = data?.filter(p => p.type === 'recurring') ?? []
const singleShot = data?.filter(p => p.type === 'single_shot') ?? []
```

---

## Realtime Subscription

The existing `projects` table subscription handles both types. The `use-finance-data.ts` hook maps rows to the appropriate type based on the `type` discriminator.

```typescript
// In use-finance-data.ts
supabase
  .channel('projects-changes')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'projects' },
    (payload) => {
      // Handle insert/update/delete
      // Map to RecurringProject or SingleShotIncome based on type
    }
  )
  .subscribe()
```

---

## Type Conversions

### Database Row → TypeScript

```typescript
function mapProjectRowToType(row: ProjectRow): RecurringProject | SingleShotIncome {
  if (row.type === 'single_shot') {
    return {
      id: row.id,
      type: 'single_shot',
      name: row.name,
      amount: row.amount,
      date: new Date(row.date!),
      certainty: row.certainty,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }
  
  return {
    id: row.id,
    type: 'recurring',
    name: row.name,
    amount: row.amount,
    frequency: row.frequency!,
    paymentSchedule: row.payment_schedule!,
    certainty: row.certainty,
    isActive: row.is_active!,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}
```

### TypeScript → Database Insert

```typescript
function mapSingleShotIncomeToInsert(input: SingleShotIncomeInput): ProjectInsert {
  return {
    type: 'single_shot',
    name: input.name,
    amount: input.amount,
    date: input.date.toISOString().split('T')[0],
    certainty: input.certainty,
    frequency: null,
    payment_schedule: null,
    is_active: null,
  }
}
```

---

## Validation

All validation uses Zod schemas defined in `src/types/index.ts`:

```typescript
// Before insert/update
const result = SingleShotIncomeInputSchema.safeParse(input)
if (!result.success) {
  return {
    success: false,
    error: result.error.errors[0]?.message ?? 'Validation failed',
    details: result.error.flatten(),
  }
}
```

---

## Error Handling

Uses existing `handleSupabaseError` from `src/lib/supabase.ts`:

```typescript
try {
  const { data, error } = await supabase.from('projects').insert(...)
  if (error) {
    return handleSupabaseError(error)
  }
  return { success: true, data: mapProjectRowToType(data) }
} catch (error) {
  return handleSupabaseError(error)
}
```

