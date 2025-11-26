# Quickstart: Core Data Management Layer

**Feature**: 001-data-management  
**Date**: 2025-11-26

## Prerequisites

- Node.js 20+
- pnpm 10+
- Modern browser with IndexedDB support

## Setup

### 1. Install Additional Dependency

```bash
cd /home/delucca/Workspaces/src/sandbox/family-finance
pnpm add dexie-react-hooks@4.2.0
```

Note: Zod is already in `package.json` per CONSTITUTION.md (version 4.1.13).

### 2. Verify Existing Dependencies

```bash
pnpm list dexie zustand zod
```

Expected output shows:
- `dexie@4.2.1`
- `zustand@5.0.8`
- `zod@4.1.13` (if not present, add with `pnpm add zod@4.1.13`)

### 3. Start Development Server

```bash
pnpm dev
```

Server runs at http://localhost:5173

## File Structure to Create

```
src/
├── types/
│   └── index.ts          # Zod schemas + inferred types
├── db/
│   └── index.ts          # Dexie database instance
└── stores/
    ├── index.ts          # Store exports
    └── finance-store.ts  # Unified Zustand store
```

## Implementation Order

### Step 1: Types (`src/types/index.ts`)

Create Zod schemas first - they're the foundation:

```typescript
import { z } from 'zod'

// Bank Account
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

export type BankAccountInput = z.infer<typeof BankAccountInputSchema>
export type BankAccount = z.infer<typeof BankAccountSchema>

// ... Add Project, FixedExpense, CreditCard schemas
// See data-model.md for complete definitions
```

### Step 2: Database (`src/db/index.ts`)

Create Dexie database with typed tables:

```typescript
import Dexie, { type Table } from 'dexie'
import type { BankAccount, Project, FixedExpense, CreditCard } from '../types'

export class FinanceDB extends Dexie {
  accounts!: Table<BankAccount, string>
  projects!: Table<Project, string>
  expenses!: Table<FixedExpense, string>
  creditCards!: Table<CreditCard, string>

  constructor() {
    super('FamilyFinanceDB')
    
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

### Step 3: Store (`src/stores/finance-store.ts`)

Create Zustand store with async actions:

```typescript
import { create } from 'zustand'
import { db } from '../db'
import { 
  BankAccountInputSchema, 
  type BankAccountInput,
  // ... other imports
} from '../types'

type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }

interface FinanceStore {
  addAccount: (input: BankAccountInput) => Promise<Result<string>>
  updateAccount: (id: string, input: Partial<BankAccountInput>) => Promise<Result<void>>
  deleteAccount: (id: string) => Promise<Result<void>>
  // ... other actions
}

export const useFinanceStore = create<FinanceStore>()(() => ({
  addAccount: async (input) => {
    try {
      const validated = BankAccountInputSchema.parse(input)
      const id = crypto.randomUUID()
      const now = new Date()
      await db.accounts.add({
        ...validated,
        id,
        createdAt: now,
        updatedAt: now,
      })
      return { success: true, data: id }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: 'Validation failed', details: error.errors }
      }
      return { success: false, error: 'Failed to add account' }
    }
  },
  // ... implement other actions
}))
```

### Step 4: Store Exports (`src/stores/index.ts`)

```typescript
export { useFinanceStore } from './finance-store'
```

## Usage in Components

### Reading Data (Reactive)

```typescript
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

function AccountList() {
  const accounts = useLiveQuery(() => db.accounts.toArray())
  
  if (accounts === undefined) {
    return <div>Loading...</div>
  }
  
  return (
    <ul>
      {accounts.map(account => (
        <li key={account.id}>
          {account.name}: ${account.balance.toFixed(2)}
        </li>
      ))}
    </ul>
  )
}
```

### Writing Data (Actions)

```typescript
import { useFinanceStore } from '../stores'

function AddAccountForm() {
  const { addAccount } = useFinanceStore()
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await addAccount({
      name: 'My Checking',
      type: 'checking',
      balance: 1000,
    })
    
    if (result.success) {
      // Account added, useLiveQuery will auto-update lists
      console.log('Created:', result.data)
    } else {
      // Show error to user
      console.error(result.error)
    }
  }
  
  return <form onSubmit={handleSubmit}>...</form>
}
```

## Testing

### Run Tests

```bash
pnpm test
```

### Test Dexie Operations

```typescript
// src/db/index.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './index'

describe('FinanceDB', () => {
  beforeEach(async () => {
    await db.accounts.clear()
  })

  it('should add and retrieve an account', async () => {
    const id = crypto.randomUUID()
    await db.accounts.add({
      id,
      name: 'Test Account',
      type: 'checking',
      balance: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const account = await db.accounts.get(id)
    expect(account?.name).toBe('Test Account')
  })
})
```

### Test Zod Validation

```typescript
// src/types/index.test.ts
import { describe, it, expect } from 'vitest'
import { BankAccountInputSchema } from './index'

describe('BankAccountInputSchema', () => {
  it('should validate valid input', () => {
    const result = BankAccountInputSchema.safeParse({
      name: 'My Account',
      type: 'checking',
      balance: 1000,
    })
    expect(result.success).toBe(true)
  })

  it('should reject negative balance', () => {
    const result = BankAccountInputSchema.safeParse({
      name: 'My Account',
      type: 'checking',
      balance: -100,
    })
    expect(result.success).toBe(false)
  })
})
```

## Debugging

### View IndexedDB Data

1. Open browser DevTools (F12)
2. Go to Application tab
3. Expand IndexedDB → FamilyFinanceDB
4. Click on tables to view data

### Clear Database

```typescript
// In browser console or test
await db.delete()
```

Or via DevTools: Application → IndexedDB → Right-click database → Delete

### Check Dexie Version

```typescript
console.log('Dexie version:', Dexie.version)
console.log('DB version:', db.verno)
```

## Common Issues

### "Database is blocked"

Another tab has the database open with an older version. Close other tabs or refresh.

### "QuotaExceededError"

Browser storage is full. Clear IndexedDB data or request more quota.

### Types not matching

Ensure Zod schemas match Dexie table types. The `BankAccount` type should be used for both.

### useLiveQuery returns undefined forever

Check that the database is initialized and the query is valid. Add error handling:

```typescript
const accounts = useLiveQuery(
  async () => {
    try {
      return await db.accounts.toArray()
    } catch (e) {
      console.error('Query failed:', e)
      return []
    }
  }
)
```

## Next Steps

After implementing the data layer:

1. Create UI components for each entity type
2. Add form components with Zod validation
3. Implement the cashflow calculation engine (next feature)
4. Add data export/import functionality (future)

