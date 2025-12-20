# Data Model: Data Management UI

**Feature**: 005-data-management-ui  
**Date**: 2025-11-26  
**Status**: Complete

## Overview

This feature uses the **existing data model** defined in `src/types/index.ts` and persisted via `src/db/index.ts`. No schema changes are required. This document serves as a reference for the existing entities and their validation rules.

## Existing Entities

### BankAccount

**Source**: `src/types/index.ts` (lines 4-17)

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| id | string (UUID) | Auto-generated | Primary key |
| name | string | Required, max 100 chars | Display name |
| type | enum | 'checking' \| 'savings' \| 'investment' | Account classification |
| balance | number | Non-negative | Current balance in dollars |
| createdAt | Date | Auto-set | Creation timestamp |
| updatedAt | Date | Auto-updated | Last modification |

**Business Rules**:
- Only `checking` accounts contribute to cashflow starting balance
- `savings` and `investment` are display-only in cashflow

**Zod Schema**: `BankAccountInputSchema`, `BankAccountSchema`

---

### Project (Income Source)

**Source**: `src/types/index.ts` (lines 19-36)

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| id | string (UUID) | Auto-generated | Primary key |
| name | string | Required, max 100 chars | Display name |
| amount | number | Positive | Payment amount in dollars |
| paymentDay | number | 1-31 | Day of month for payment |
| frequency | enum | 'weekly' \| 'biweekly' \| 'monthly' | Payment schedule |
| certainty | enum | 'guaranteed' \| 'probable' \| 'uncertain' | Likelihood of payment |
| isActive | boolean | Default: true | Include in cashflow calculations |
| createdAt | Date | Auto-set | Creation timestamp |
| updatedAt | Date | Auto-updated | Last modification |

**Business Rules**:
- New projects default to `isActive: true`
- Inactive projects excluded from cashflow calculations
- `guaranteed` projects included in pessimistic scenario
- `probable` and `uncertain` only in optimistic scenario

**Zod Schema**: `ProjectInputSchema`, `ProjectSchema`

---

### FixedExpense

**Source**: `src/types/index.ts` (lines 38-53)

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| id | string (UUID) | Auto-generated | Primary key |
| name | string | Required, max 100 chars | Display name |
| amount | number | Positive | Expense amount in dollars |
| dueDay | number | 1-31 | Day of month expense is due |
| isActive | boolean | Default: true | Include in cashflow calculations |
| createdAt | Date | Auto-set | Creation timestamp |
| updatedAt | Date | Auto-updated | Last modification |

**Business Rules**:
- New expenses default to `isActive: true`
- Inactive expenses excluded from cashflow calculations
- Due day handles month-end gracefully (31st → last day of short months)

**Zod Schema**: `FixedExpenseInputSchema`, `FixedExpenseSchema`

---

### CreditCard

**Source**: `src/types/index.ts` (lines 55-69)

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| id | string (UUID) | Auto-generated | Primary key |
| name | string | Required, max 100 chars | Card name |
| statementBalance | number | Non-negative | Current statement balance |
| dueDay | number | 1-31 | Day of month payment is due |
| createdAt | Date | Auto-set | Creation timestamp |
| updatedAt | Date | Auto-updated | Last modification |

**Business Rules**:
- Statement balance represents amount to be paid
- Balance of 0 is valid (paid-off card)
- No active/inactive toggle (always included if balance > 0)

**Zod Schema**: `CreditCardInputSchema`, `CreditCardSchema`

---

## Database Schema

**Source**: `src/db/index.ts`

```typescript
this.version(1).stores({
  accounts: 'id, name, type',
  projects: 'id, name, isActive',
  expenses: 'id, name, isActive',
  creditCards: 'id, name',
})
```

**Indexes**:
- All tables indexed by `id` (primary key)
- All tables indexed by `name` (for potential search)
- `projects` and `expenses` indexed by `isActive` (for filtering)

---

## State Management

**Source**: `src/stores/finance-store.ts`

### Available Actions

| Entity | Add | Update | Delete | Toggle Active |
|--------|-----|--------|--------|---------------|
| BankAccount | `addAccount` | `updateAccount` | `deleteAccount` | N/A |
| Project | `addProject` | `updateProject` | `deleteProject` | `toggleProjectActive` |
| FixedExpense | `addExpense` | `updateExpense` | `deleteExpense` | `toggleExpenseActive` |
| CreditCard | `addCreditCard` | `updateCreditCard` | `deleteCreditCard` | N/A |

### Result Type

All actions return `Promise<Result<T>>`:
```typescript
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }
```

---

## Form Field Mappings

### Add Bank Account Form

| UI Field | Schema Field | Input Type | Validation |
|----------|--------------|------------|------------|
| Account Name | `name` | text | Required, max 100 |
| Account Type | `type` | select | Required, enum |
| Current Balance | `balance` | number | Required, ≥ 0 |

### Add Project Form

| UI Field | Schema Field | Input Type | Validation |
|----------|--------------|------------|------------|
| Project Name | `name` | text | Required, max 100 |
| Payment Amount | `amount` | number | Required, > 0 |
| Payment Day | `paymentDay` | number | Required, 1-31 |
| Frequency | `frequency` | select | Required, enum |
| Certainty | `certainty` | select | Required, enum |

### Add Expense Form

| UI Field | Schema Field | Input Type | Validation |
|----------|--------------|------------|------------|
| Expense Name | `name` | text | Required, max 100 |
| Amount | `amount` | number | Required, > 0 |
| Due Day | `dueDay` | number | Required, 1-31 |

### Add Credit Card Form

| UI Field | Schema Field | Input Type | Validation |
|----------|--------------|------------|------------|
| Card Name | `name` | text | Required, max 100 |
| Statement Balance | `statementBalance` | number | Required, ≥ 0 |
| Due Day | `dueDay` | number | Required, 1-31 |

---

## No Schema Changes Required

The existing data model fully supports all feature requirements:
- ✅ All entity types defined with Zod validation
- ✅ All CRUD operations available in store
- ✅ Active/inactive toggle for projects and expenses
- ✅ Database schema supports required queries
- ✅ Timestamps for audit trail

