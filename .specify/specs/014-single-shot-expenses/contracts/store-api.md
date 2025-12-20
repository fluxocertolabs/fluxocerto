# Store API Contract: Single-Shot Expenses

**Feature**: 014-single-shot-expenses  
**Date**: 2025-11-28  
**Status**: Complete

## Overview

This document defines the Zustand store API contracts for single-shot expense operations. These actions extend the existing `useFinanceStore` hook.

---

## Type Definitions

### Input Types

```typescript
// Single-shot expense input for create/update operations
interface SingleShotExpenseInput {
  type: 'single_shot'
  name: string        // 1-100 characters
  amount: number      // Positive integer (cents)
  date: Date          // Specific calendar date
}

// Partial input for update operations
type SingleShotExpenseUpdate = Partial<Omit<SingleShotExpenseInput, 'type'>>
```

### Result Type

```typescript
// Consistent with existing store patterns
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }
```

---

## Store Actions

### addSingleShotExpense

Creates a new single-shot expense.

**Signature**:
```typescript
addSingleShotExpense: (input: SingleShotExpenseInput) => Promise<Result<string>>
```

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| input | SingleShotExpenseInput | Yes | Expense data to create |

**Returns**:
| Result | Data | Description |
|--------|------|-------------|
| Success | `string` | UUID of created expense |
| Failure | - | Error message |

**Validation**:
- `name`: Non-empty, max 100 characters
- `amount`: Positive integer
- `date`: Valid Date object

**Example**:
```typescript
const store = useFinanceStore()

const result = await store.addSingleShotExpense({
  type: 'single_shot',
  name: 'IPVA 2025',
  amount: 250000, // R$ 2.500,00 in cents
  date: new Date('2025-01-20'),
})

if (result.success) {
  console.log('Created expense:', result.data)
} else {
  console.error('Failed:', result.error)
}
```

**Database Operation**:
```typescript
await getSupabase()
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
```

---

### updateSingleShotExpense

Updates an existing single-shot expense.

**Signature**:
```typescript
updateSingleShotExpense: (
  id: string, 
  input: SingleShotExpenseUpdate
) => Promise<Result<void>>
```

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | UUID of expense to update |
| input | SingleShotExpenseUpdate | Yes | Fields to update |

**Returns**:
| Result | Data | Description |
|--------|------|-------------|
| Success | `void` | Update successful |
| Failure | - | Error message |

**Validation**:
- `name`: If provided, non-empty, max 100 characters
- `amount`: If provided, positive integer
- `date`: If provided, valid Date object

**Example**:
```typescript
const result = await store.updateSingleShotExpense(expenseId, {
  amount: 300000, // R$ 3.000,00
  date: new Date('2025-02-15'),
})
```

**Database Operation**:
```typescript
const updateData: Record<string, unknown> = {}
if (input.name !== undefined) updateData.name = input.name
if (input.amount !== undefined) updateData.amount = input.amount
if (input.date !== undefined) updateData.date = input.date.toISOString().split('T')[0]

await getSupabase()
  .from('expenses')
  .update(updateData)
  .eq('id', id)
  .eq('type', 'single_shot') // Safety: only update single-shot expenses
```

---

### deleteSingleShotExpense

Deletes a single-shot expense.

**Signature**:
```typescript
deleteSingleShotExpense: (id: string) => Promise<Result<void>>
```

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | UUID of expense to delete |

**Returns**:
| Result | Data | Description |
|--------|------|-------------|
| Success | `void` | Deletion successful |
| Failure | - | Error message |

**Example**:
```typescript
const result = await store.deleteSingleShotExpense(expenseId)

if (result.success) {
  console.log('Expense deleted')
}
```

**Database Operation**:
```typescript
await getSupabase()
  .from('expenses')
  .delete()
  .eq('id', id)
  .eq('type', 'single_shot') // Safety: only delete single-shot expenses
```

---

## Error Handling

### Error Codes

| Code | Description | User Message |
|------|-------------|--------------|
| `VALIDATION_FAILED` | Input validation failed | "Dados inválidos: {details}" |
| `NOT_FOUND` | Expense not found | "Despesa não encontrada" |
| `SUPABASE_ERROR` | Database operation failed | "Falha ao salvar. Tente novamente." |
| `NETWORK_ERROR` | Network connectivity issue | "Erro de conexão. Verifique sua internet." |
| `UNAUTHORIZED` | User not authenticated | "Sessão expirada. Faça login novamente." |

### Error Response Format

```typescript
{
  success: false,
  error: "User-friendly error message in pt-BR",
  details: {
    // Optional: validation errors or technical details
    field: "name",
    message: "Nome da despesa é obrigatório"
  }
}
```

---

## Integration with Existing Actions

### Existing Fixed Expense Actions (Unchanged)

These actions continue to work for fixed expenses only:

```typescript
// Existing - no changes needed
addExpense: (input: FixedExpenseInput) => Promise<Result<string>>
updateExpense: (id: string, input: Partial<FixedExpenseInput>) => Promise<Result<void>>
deleteExpense: (id: string) => Promise<Result<void>>
toggleExpenseActive: (id: string) => Promise<Result<void>>
```

**Note**: The existing `addExpense` action should be updated to explicitly set `type: 'fixed'` in the database insert.

### Updated Store Interface

```typescript
interface FinanceStore {
  // === Bank Account Actions ===
  addAccount: (input: BankAccountInput) => Promise<Result<string>>
  updateAccount: (id: string, input: Partial<BankAccountInput>) => Promise<Result<void>>
  deleteAccount: (id: string) => Promise<Result<void>>

  // === Project Actions ===
  addProject: (input: ProjectInput) => Promise<Result<string>>
  updateProject: (id: string, input: Partial<ProjectInput>) => Promise<Result<void>>
  deleteProject: (id: string) => Promise<Result<void>>
  toggleProjectActive: (id: string) => Promise<Result<void>>

  // === Fixed Expense Actions ===
  addExpense: (input: FixedExpenseInput) => Promise<Result<string>>
  updateExpense: (id: string, input: Partial<FixedExpenseInput>) => Promise<Result<void>>
  deleteExpense: (id: string) => Promise<Result<void>>
  toggleExpenseActive: (id: string) => Promise<Result<void>>

  // === Single-Shot Expense Actions (NEW) ===
  addSingleShotExpense: (input: SingleShotExpenseInput) => Promise<Result<string>>
  updateSingleShotExpense: (id: string, input: SingleShotExpenseUpdate) => Promise<Result<void>>
  deleteSingleShotExpense: (id: string) => Promise<Result<void>>

  // === Credit Card Actions ===
  addCreditCard: (input: CreditCardInput) => Promise<Result<string>>
  updateCreditCard: (id: string, input: Partial<CreditCardInput>) => Promise<Result<void>>
  deleteCreditCard: (id: string) => Promise<Result<void>>
}
```

---

## Realtime Updates

Single-shot expenses use the existing realtime subscription on the `expenses` table. The `handleExpenseChange` callback in `use-finance-data.ts` will be updated to handle both expense types:

```typescript
const handleExpenseChange = useCallback((payload: RealtimePostgresChangesPayload<ExpenseRow>) => {
  const { eventType, new: newRecord, old: oldRecord } = payload

  switch (eventType) {
    case 'INSERT':
      if (newRecord) {
        setExpenses(prev => [...prev, mapExpenseFromDb(newRecord as ExpenseRow)])
      }
      break
    case 'UPDATE':
      if (newRecord) {
        setExpenses(prev =>
          prev.map(expense =>
            expense.id === (newRecord as ExpenseRow).id
              ? mapExpenseFromDb(newRecord as ExpenseRow)
              : expense
          )
        )
      }
      break
    case 'DELETE':
      if (oldRecord) {
        setExpenses(prev => prev.filter(expense => expense.id !== (oldRecord as ExpenseRow).id))
      }
      break
  }
}, [])
```

The `mapExpenseFromDb` function handles both types via the discriminator field (see data-model.md).

---

## Validation Schemas

### SingleShotExpenseInputSchema

```typescript
export const SingleShotExpenseInputSchema = z.object({
  type: z.literal('single_shot'),
  name: z.string()
    .min(1, 'Nome da despesa é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  amount: z.number()
    .positive('Valor deve ser positivo')
    .int('Valor deve ser um número inteiro'),
  date: z.coerce.date({
    errorMap: () => ({ message: 'Data inválida' }),
  }),
})
```

### SingleShotExpenseUpdateSchema

```typescript
export const SingleShotExpenseUpdateSchema = z.object({
  name: z.string()
    .min(1, 'Nome da despesa é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .optional(),
  amount: z.number()
    .positive('Valor deve ser positivo')
    .int('Valor deve ser um número inteiro')
    .optional(),
  date: z.coerce.date({
    errorMap: () => ({ message: 'Data inválida' }),
  }).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Pelo menos um campo deve ser fornecido para atualização' }
)
```

