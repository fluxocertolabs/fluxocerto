# Store API Contract: Finance Store

**Feature**: 001-data-management  
**Date**: 2025-11-26  
**Location**: `src/stores/finance-store.ts`

## Overview

This document defines the API contract for the unified Zustand finance store. The store provides action methods for all CRUD operations on financial entities.

---

## Store Interface

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

  // === Credit Card Actions ===
  addCreditCard: (input: CreditCardInput) => Promise<Result<string>>
  updateCreditCard: (id: string, input: Partial<CreditCardInput>) => Promise<Result<void>>
  deleteCreditCard: (id: string) => Promise<Result<void>>
}
```

---

## Result Type

All actions return a `Result` type for explicit error handling:

```typescript
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }
```

---

## Action Specifications

### Bank Account Actions

#### `addAccount(input: BankAccountInput): Promise<Result<string>>`

Creates a new bank account.

**Parameters:**
- `input.name` - Account display name (required, 1-100 chars)
- `input.type` - Account type: `'checking' | 'savings' | 'investment'`
- `input.balance` - Current balance (>= 0)

**Returns:**
- Success: `{ success: true, data: "<uuid>" }` - The new account ID
- Failure: `{ success: false, error: "Validation failed", details: ZodError }`

**Side Effects:**
- Generates UUID for `id`
- Sets `createdAt` and `updatedAt` to current timestamp
- Persists to IndexedDB via Dexie

---

#### `updateAccount(id: string, input: Partial<BankAccountInput>): Promise<Result<void>>`

Updates an existing bank account.

**Parameters:**
- `id` - Account UUID to update
- `input` - Partial object with fields to update

**Returns:**
- Success: `{ success: true, data: undefined }`
- Failure: `{ success: false, error: "Account not found" }` or validation error

**Side Effects:**
- Updates `updatedAt` to current timestamp
- Persists changes to IndexedDB

---

#### `deleteAccount(id: string): Promise<Result<void>>`

Permanently deletes a bank account.

**Parameters:**
- `id` - Account UUID to delete

**Returns:**
- Success: `{ success: true, data: undefined }`
- Failure: `{ success: false, error: "Account not found" }`

**Side Effects:**
- Removes record from IndexedDB

---

### Project Actions

#### `addProject(input: ProjectInput): Promise<Result<string>>`

Creates a new income project.

**Parameters:**
- `input.name` - Project display name (required, 1-100 chars)
- `input.amount` - Payment amount (> 0)
- `input.paymentDay` - Day of month (1-31)
- `input.frequency` - `'weekly' | 'biweekly' | 'monthly'`
- `input.certainty` - `'guaranteed' | 'probable' | 'uncertain'`
- `input.isActive` - Active status (defaults to `true`)

**Returns:**
- Success: `{ success: true, data: "<uuid>" }` - The new project ID
- Failure: `{ success: false, error: "Validation failed", details: ZodError }`

---

#### `updateProject(id: string, input: Partial<ProjectInput>): Promise<Result<void>>`

Updates an existing project.

**Parameters:**
- `id` - Project UUID to update
- `input` - Partial object with fields to update

**Returns:**
- Success: `{ success: true, data: undefined }`
- Failure: `{ success: false, error: "Project not found" }` or validation error

---

#### `deleteProject(id: string): Promise<Result<void>>`

Permanently deletes a project.

**Parameters:**
- `id` - Project UUID to delete

**Returns:**
- Success: `{ success: true, data: undefined }`
- Failure: `{ success: false, error: "Project not found" }`

---

#### `toggleProjectActive(id: string): Promise<Result<void>>`

Toggles a project's active status.

**Parameters:**
- `id` - Project UUID to toggle

**Returns:**
- Success: `{ success: true, data: undefined }`
- Failure: `{ success: false, error: "Project not found" }`

**Side Effects:**
- Flips `isActive` from `true` to `false` or vice versa
- Updates `updatedAt` timestamp

---

### Fixed Expense Actions

#### `addExpense(input: FixedExpenseInput): Promise<Result<string>>`

Creates a new fixed expense.

**Parameters:**
- `input.name` - Expense display name (required, 1-100 chars)
- `input.amount` - Monthly amount (> 0)
- `input.dueDay` - Day of month (1-31)
- `input.isActive` - Active status (defaults to `true`)

**Returns:**
- Success: `{ success: true, data: "<uuid>" }` - The new expense ID
- Failure: `{ success: false, error: "Validation failed", details: ZodError }`

---

#### `updateExpense(id: string, input: Partial<FixedExpenseInput>): Promise<Result<void>>`

Updates an existing expense.

**Parameters:**
- `id` - Expense UUID to update
- `input` - Partial object with fields to update

**Returns:**
- Success: `{ success: true, data: undefined }`
- Failure: `{ success: false, error: "Expense not found" }` or validation error

---

#### `deleteExpense(id: string): Promise<Result<void>>`

Permanently deletes an expense.

**Parameters:**
- `id` - Expense UUID to delete

**Returns:**
- Success: `{ success: true, data: undefined }`
- Failure: `{ success: false, error: "Expense not found" }`

---

#### `toggleExpenseActive(id: string): Promise<Result<void>>`

Toggles an expense's active status.

**Parameters:**
- `id` - Expense UUID to toggle

**Returns:**
- Success: `{ success: true, data: undefined }`
- Failure: `{ success: false, error: "Expense not found" }`

---

### Credit Card Actions

#### `addCreditCard(input: CreditCardInput): Promise<Result<string>>`

Creates a new credit card.

**Parameters:**
- `input.name` - Card display name (required, 1-100 chars)
- `input.statementBalance` - Current statement balance (>= 0)
- `input.dueDay` - Day of month (1-31)

**Returns:**
- Success: `{ success: true, data: "<uuid>" }` - The new card ID
- Failure: `{ success: false, error: "Validation failed", details: ZodError }`

---

#### `updateCreditCard(id: string, input: Partial<CreditCardInput>): Promise<Result<void>>`

Updates an existing credit card.

**Parameters:**
- `id` - Card UUID to update
- `input` - Partial object with fields to update

**Returns:**
- Success: `{ success: true, data: undefined }`
- Failure: `{ success: false, error: "Credit card not found" }` or validation error

---

#### `deleteCreditCard(id: string): Promise<Result<void>>`

Permanently deletes a credit card.

**Parameters:**
- `id` - Card UUID to delete

**Returns:**
- Success: `{ success: true, data: undefined }`
- Failure: `{ success: false, error: "Credit card not found" }`

---

## Query Hooks (Dexie React Hooks)

Data reading is done via `useLiveQuery` from `dexie-react-hooks`, not through the store:

```typescript
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

// All accounts
const accounts = useLiveQuery(() => db.accounts.toArray())

// Accounts by type
const checkingAccounts = useLiveQuery(
  () => db.accounts.where('type').equals('checking').toArray()
)

// Active projects only
const activeProjects = useLiveQuery(
  () => db.projects.where('isActive').equals(1).toArray()
)

// All expenses (with loading state)
const expenses = useLiveQuery(() => db.expenses.toArray())
if (expenses === undefined) return <Loading />

// Single entity by ID
const account = useLiveQuery(() => db.accounts.get(accountId), [accountId])
```

---

## Usage Example

```typescript
import { useFinanceStore } from '../stores/finance-store'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

function AccountManager() {
  // Read data reactively
  const accounts = useLiveQuery(() => db.accounts.toArray())
  
  // Get store actions
  const { addAccount, deleteAccount } = useFinanceStore()
  
  const handleAdd = async () => {
    const result = await addAccount({
      name: 'New Checking',
      type: 'checking',
      balance: 1000
    })
    
    if (result.success) {
      console.log('Created account:', result.data)
    } else {
      console.error('Failed:', result.error)
    }
  }
  
  const handleDelete = async (id: string) => {
    const result = await deleteAccount(id)
    if (!result.success) {
      alert(result.error)
    }
  }
  
  // ... render
}
```

---

## Error Codes

| Error | Cause | Resolution |
|-------|-------|------------|
| `"Validation failed"` | Input doesn't match Zod schema | Check `details` for field errors |
| `"Account not found"` | ID doesn't exist | Verify ID before operation |
| `"Project not found"` | ID doesn't exist | Verify ID before operation |
| `"Expense not found"` | ID doesn't exist | Verify ID before operation |
| `"Credit card not found"` | ID doesn't exist | Verify ID before operation |
| `"Storage full"` | IndexedDB quota exceeded | Clear old data or export |

