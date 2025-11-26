# Research: Core Data Management Layer

**Feature**: 002-data-management  
**Date**: 2025-11-26  
**Status**: Complete

## Research Questions

This document captures research findings for key technical decisions in the data management layer implementation.

---

## 1. Zustand + Dexie.js Integration Pattern

### Question
What is the best pattern for integrating Zustand state management with Dexie.js IndexedDB persistence?

### Decision
**Hybrid approach**: Zustand for write actions, Dexie `useLiveQuery` for reactive reads.

### Rationale

After researching integration patterns, the recommended approach is:

1. **Dexie as source of truth** - IndexedDB holds the canonical data
2. **Zustand for actions only** - Store provides async action methods (add, update, delete)
3. **`useLiveQuery` for reads** - Components subscribe directly to Dexie queries

This avoids the anti-pattern of duplicating state in both Zustand and Dexie.

### Implementation Pattern

```typescript
// stores/finance-store.ts
import { create } from 'zustand'
import { db } from '../db'
import { BankAccountInput } from '../types'

interface FinanceActions {
  addAccount: (account: BankAccountInput) => Promise<string>
  updateAccount: (id: string, updates: Partial<BankAccountInput>) => Promise<void>
  deleteAccount: (id: string) => Promise<void>
  // ... similar for other entities
}

export const useFinanceStore = create<FinanceActions>()((set, get) => ({
  addAccount: async (account) => {
    const validated = BankAccountInputSchema.parse(account)
    const id = crypto.randomUUID()
    await db.accounts.add({ ...validated, id, createdAt: new Date(), updatedAt: new Date() })
    return id
  },
  // ...
}))

// components/AccountList.tsx
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

function AccountList() {
  // Reactive - auto-updates when db.accounts changes
  const accounts = useLiveQuery(() => db.accounts.toArray())
  // ...
}
```

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| Zustand persist middleware to IndexedDB | Stores entire state as blob, loses queryability |
| Zustand mirrors Dexie state | Duplication, sync complexity, stale data risk |
| Dexie-only (no Zustand) | Loses centralized action organization |

### Sources
- Dexie.js docs: `useLiveQuery` for React integration
- Zustand docs: async actions pattern
- Community patterns for local-first apps

---

## 2. Dexie.js Schema Versioning

### Question
What are the best practices for Dexie.js schema versioning and future migrations?

### Decision
**Start with version 1, define upgrade path pattern for future changes.**

### Best Practices

1. **Incremental versioning** - Each schema change gets a new version number
2. **Upgrade functions** - Transform data when schema changes
3. **Index only queryable fields** - Don't index large data or non-queried fields
4. **Keep all versions** - Dexie needs version chain for upgrades

### Implementation Pattern

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
    super('FamilyFinanceDB')
    
    // Version 1: Initial schema
    this.version(1).stores({
      accounts: 'id, name, type',           // id = primary key, name & type indexed
      projects: 'id, name, isActive',       // query by active status
      expenses: 'id, name, isActive',       // query by active status
      creditCards: 'id, name'               // simple queries
    })
    
    // Future version example (commented):
    // this.version(2).stores({
    //   accounts: 'id, name, type, institution'  // Added institution index
    // }).upgrade(tx => {
    //   return tx.table('accounts').toCollection().modify(account => {
    //     account.institution = account.institution || 'Unknown'
    //   })
    // })
  }
}

export const db = new FinanceDB()
```

### Index Strategy

| Table | Indexed Fields | Rationale |
|-------|---------------|-----------|
| accounts | id, name, type | Query by type for cashflow calc |
| projects | id, name, isActive | Filter active for projections |
| expenses | id, name, isActive | Filter active for projections |
| creditCards | id, name | Simple lookups only |

### What NOT to Index
- `balance`, `amount`, `statementBalance` - numeric, rarely queried by value
- `createdAt`, `updatedAt` - timestamps not queried
- `paymentDay`, `dueDay` - small range, full scan acceptable

---

## 3. Zod + Dexie Type Inference

### Question
How to use Zod schemas as single source of truth for both validation and TypeScript types?

### Decision
**Define Zod schemas in `src/types/index.ts`, infer TS types, validate before Dexie writes.**

### Implementation Pattern

```typescript
// types/index.ts
import { z } from 'zod'

// === Bank Account ===
export const BankAccountInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['checking', 'savings', 'investment']),
  balance: z.number().min(0, 'Balance cannot be negative'),
})

export const BankAccountSchema = BankAccountInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Infer types from schemas
export type BankAccountInput = z.infer<typeof BankAccountInputSchema>
export type BankAccount = z.infer<typeof BankAccountSchema>

// === Project ===
export const ProjectInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: z.number().positive('Amount must be positive'),
  paymentDay: z.number().int().min(1).max(31),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
  certainty: z.enum(['guaranteed', 'probable', 'uncertain']),
  isActive: z.boolean().default(true),
})

export const ProjectSchema = ProjectInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type ProjectInput = z.infer<typeof ProjectInputSchema>
export type Project = z.infer<typeof ProjectSchema>

// ... similar for FixedExpense and CreditCard
```

### Validation Flow

```
User Input → Zod.parse() → Valid Data → Dexie.add/put() → IndexedDB
                ↓
           Validation Error → Display to User
```

### Benefits

1. **Single source of truth** - Schema defines both validation rules and TS types
2. **Runtime safety** - Invalid data never reaches IndexedDB
3. **Type safety** - Compile-time checks throughout codebase
4. **Self-documenting** - Validation rules visible in schema

---

## 4. Dexie React Hooks (`dexie-react-hooks`)

### Question
How to use Dexie's React hooks for reactive UI updates?

### Decision
**Use `useLiveQuery` from `dexie-react-hooks` for all read operations.**

### Key Findings

1. **`useLiveQuery`** - Creates reactive subscription to Dexie queries
2. **Auto-updates** - Component re-renders when underlying data changes
3. **Dependency array** - Pass variables that affect the query
4. **Loading state** - Returns `undefined` while loading

### Implementation Pattern

```typescript
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

function AccountList() {
  const accounts = useLiveQuery(() => db.accounts.toArray())
  
  if (accounts === undefined) return <Loading />
  if (accounts.length === 0) return <EmptyState />
  
  return (
    <ul>
      {accounts.map(account => (
        <li key={account.id}>{account.name}: ${account.balance}</li>
      ))}
    </ul>
  )
}

// With filtering
function ActiveProjects() {
  const projects = useLiveQuery(
    () => db.projects.where('isActive').equals(1).toArray()
  )
  // ...
}

// With dependencies
function ProjectsByStatus({ showActive }: { showActive: boolean }) {
  const projects = useLiveQuery(
    () => db.projects.where('isActive').equals(showActive ? 1 : 0).toArray(),
    [showActive]  // Re-run query when showActive changes
  )
  // ...
}
```

### Dependency Required

```bash
pnpm add dexie-react-hooks@5.0.0
```

Note: `dexie-react-hooks` version should match major Dexie version (4.x → 5.x hooks work).

---

## 5. Error Handling Strategy

### Question
How to handle IndexedDB errors gracefully?

### Decision
**Wrap Dexie operations in try-catch, surface errors via return values or state.**

### Error Types

| Error | Cause | Handling |
|-------|-------|----------|
| `QuotaExceededError` | Storage full | Show error, suggest clearing data |
| `ConstraintError` | Unique violation | Show validation error |
| `NotFoundError` | Record missing | Graceful fallback |
| `InvalidStateError` | DB closed/blocked | Retry or reload |

### Implementation Pattern

```typescript
// In Zustand store
addAccount: async (input) => {
  try {
    const validated = BankAccountInputSchema.parse(input)
    const id = crypto.randomUUID()
    await db.accounts.add({ ...validated, id, createdAt: new Date(), updatedAt: new Date() })
    return { success: true, id }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', details: error.errors }
    }
    if (error.name === 'QuotaExceededError') {
      return { success: false, error: 'Storage full. Please delete some data.' }
    }
    return { success: false, error: 'Failed to save account' }
  }
}
```

---

## Summary of Decisions

| Topic | Decision |
|-------|----------|
| State + DB integration | Zustand actions + Dexie `useLiveQuery` reads |
| Schema versioning | Start v1, upgrade functions for migrations |
| Type system | Zod schemas → `z.infer` for TS types |
| React reactivity | `dexie-react-hooks` `useLiveQuery` |
| Error handling | Try-catch with typed error responses |
| Store organization | Single unified `finance-store.ts` |

