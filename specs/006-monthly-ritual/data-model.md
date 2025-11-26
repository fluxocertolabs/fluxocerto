# Data Model: Monthly Ritual Enhancement

**Feature**: 006-monthly-ritual  
**Date**: 2025-11-26  
**Status**: Complete

## Entity Changes

### 1. BankAccount (Extended)

**Change Type**: Schema extension (new optional field)

```typescript
interface BankAccount {
  id: string                          // Existing
  name: string                        // Existing
  type: 'checking' | 'savings' | 'investment'  // Existing
  balance: number                     // Existing (cents)
  createdAt: Date                     // Existing
  updatedAt: Date                     // Existing
  balanceUpdatedAt?: Date             // NEW: When balance was last explicitly updated
}
```

**Field Details**:
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| balanceUpdatedAt | Date | No | undefined | Timestamp of last balance update. Undefined means legacy data (treated as stale). |

**Validation Rules**:
- `balanceUpdatedAt` must be a valid Date when present
- `balanceUpdatedAt` should be <= current time (no future dates)

**Migration Notes**:
- Existing records will have `balanceUpdatedAt: undefined`
- Undefined is treated as stale (needs update) per edge case spec

---

### 2. CreditCard (Extended)

**Change Type**: Schema extension (new optional field)

```typescript
interface CreditCard {
  id: string                          // Existing
  name: string                        // Existing
  statementBalance: number            // Existing (cents)
  dueDay: number                      // Existing (1-31)
  createdAt: Date                     // Existing
  updatedAt: Date                     // Existing
  balanceUpdatedAt?: Date             // NEW: When statement balance was last updated
}
```

**Field Details**:
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| balanceUpdatedAt | Date | No | undefined | Timestamp of last statement balance update. Undefined means legacy data (treated as stale). |

**Validation Rules**:
- Same as BankAccount.balanceUpdatedAt

**Migration Notes**:
- Same as BankAccount

---

### 3. UserPreferences (New Entity)

**Change Type**: New entity (stored in localStorage via Zustand, not IndexedDB)

```typescript
interface UserPreferences {
  projectionDays: 7 | 14 | 30 | 60 | 90
}
```

**Field Details**:
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| projectionDays | number (enum) | Yes | 30 | Number of days for cashflow projection |

**Validation Rules**:
- Must be one of: 7, 14, 30, 60, 90
- Invalid values should fall back to 30

**Storage Notes**:
- Stored in localStorage (not IndexedDB) via Zustand persist middleware
- Key: `family-finance-preferences`
- Simpler than IndexedDB for single-user preferences

---

## Derived Types (No Storage)

### 4. HealthStatus (Computed)

**Type**: Computed from projection data, not stored

```typescript
type HealthStatus = 'good' | 'warning' | 'danger'

interface HealthIndicatorState {
  status: HealthStatus
  message: string
  isStale: boolean
  staleEntities: Array<{ id: string; name: string; type: 'account' | 'card' }>
}
```

**Computation Rules**:
| Condition | Status | Message |
|-----------|--------|---------|
| optimisticDangerDays > 0 | danger | "Danger days exist even in best-case scenario" |
| pessimisticDangerDays > 0 | warning | "{n} danger days in pessimistic scenario" |
| No danger days | good | "No issues detected" |

**Staleness Detection**:
- Entity is stale if `balanceUpdatedAt` is undefined OR > 30 days ago
- If ANY entity is stale, show stale data warning badge

---

### 5. SurplusDeficit (Computed)

**Type**: Computed from projection data, not stored

```typescript
interface SurplusDeficit {
  optimistic: number   // endBalance - startingBalance (can be negative)
  pessimistic: number  // endBalance - startingBalance (can be negative)
}
```

**Display Rules**:
- Positive value: Display as "Surplus of €X" in green
- Negative value: Display as "Deficit of €X" in red
- Show both scenarios when they differ

---

## Zod Schemas (Updated)

### BankAccountInputSchema (Extended)

```typescript
export const BankAccountInputSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  type: z.enum(['checking', 'savings', 'investment']),
  balance: z.number().min(0, 'Balance cannot be negative'),
  // balanceUpdatedAt is set automatically, not user input
})

export const BankAccountSchema = BankAccountInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  balanceUpdatedAt: z.date().optional(),
})
```

### CreditCardInputSchema (Extended)

```typescript
export const CreditCardInputSchema = z.object({
  name: z.string().min(1, 'Card name is required').max(100),
  statementBalance: z.number().min(0, 'Balance cannot be negative'),
  dueDay: z.number().int().min(1).max(31, 'Due day must be 1-31'),
  // balanceUpdatedAt is set automatically, not user input
})

export const CreditCardSchema = CreditCardInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  balanceUpdatedAt: z.date().optional(),
})
```

### ProjectionDaysSchema (New)

```typescript
export const ProjectionDaysSchema = z.union([
  z.literal(7),
  z.literal(14),
  z.literal(30),
  z.literal(60),
  z.literal(90),
])

export type ProjectionDays = z.infer<typeof ProjectionDaysSchema>
```

---

## Database Migration

### Version 2 Schema

```typescript
// db/index.ts
export class FinanceDB extends Dexie {
  accounts!: Table<BankAccount, string>
  projects!: Table<Project, string>
  expenses!: Table<FixedExpense, string>
  creditCards!: Table<CreditCard, string>

  constructor() {
    super('FamilyFinanceDB')

    // Version 1: Original schema
    this.version(1).stores({
      accounts: 'id, name, type',
      projects: 'id, name, isActive',
      expenses: 'id, name, isActive',
      creditCards: 'id, name',
    })

    // Version 2: Add balanceUpdatedAt to accounts and creditCards
    // Note: No index needed on balanceUpdatedAt (only used for staleness check)
    this.version(2).stores({
      accounts: 'id, name, type',      // Schema unchanged, field added to records
      projects: 'id, name, isActive',
      expenses: 'id, name, isActive',
      creditCards: 'id, name',         // Schema unchanged, field added to records
    })
    // No upgrade function needed - new field is optional
    // Existing records will have balanceUpdatedAt: undefined
  }
}
```

---

## State Transitions

### Balance Update Flow

```
[User clicks balance field]
    ↓
[Field becomes editable, shows current value]
    ↓
[User types new value]
    ↓
[User tabs/clicks away (blur)]
    ↓
[Auto-save triggered]
    ↓
┌─────────────────────────────────────┐
│ updateBalance(id, newBalance)       │
│   - Validates input                 │
│   - Updates balance field           │
│   - Sets balanceUpdatedAt = now     │
│   - Sets updatedAt = now            │
└─────────────────────────────────────┘
    ↓
[Success] → [Show saved indicator briefly]
    ↓
[Failure] → [Show inline error with retry button]
```

### Health Status Computation Flow

```
[Dashboard loads / Projection recalculates]
    ↓
[Get danger day counts from projection]
    ↓
[Calculate health status]
    ↓
[Check staleness of all accounts + credit cards]
    ↓
[Render HealthIndicator component]
    ↓
[If stale, clicking badge → opens Quick Balance Update]
```

---

## Relationships

```
┌─────────────────┐
│  BankAccount    │
│  - balance      │──────┐
│  - balanceUpdatedAt    │
└─────────────────┘      │
                         │
┌─────────────────┐      │     ┌─────────────────────┐
│  CreditCard     │      ├────→│  Quick Balance      │
│  - statementBalance    │     │  Update View        │
│  - balanceUpdatedAt    │     │  (displays both)    │
└─────────────────┘──────┘     └─────────────────────┘
                                        │
                                        ↓
                               ┌─────────────────────┐
                               │  Health Indicator   │
                               │  (checks staleness) │
                               └─────────────────────┘

┌─────────────────┐
│ UserPreferences │
│ - projectionDays│──────────→ useCashflowProjection hook
└─────────────────┘            (configures projection period)
    (localStorage)
```

