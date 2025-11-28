# Data Model: Single-Shot Income

**Feature**: 018-single-shot-income  
**Date**: 2025-11-28  
**Status**: Complete

## Overview

This document defines the data model changes required to support single-shot (one-time) income alongside existing recurring projects (income sources).

---

## Entity Changes

### Project (Extended)

**Source**: `src/types/index.ts` (to be extended)

The existing `Project` type is replaced with a discriminated union `Project` type that supports both recurring and single-shot income types.

#### Base Fields (All Project Types)

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| id | string (UUID) | Auto-generated | Primary key |
| name | string | Required, 1-100 chars | Display name |
| amount | number | Positive integer | Amount in cents |
| type | 'recurring' \| 'single_shot' | Required | Discriminator |
| certainty | 'guaranteed' \| 'probable' \| 'uncertain' | Required | Affects scenario visibility |
| createdAt | Date | Auto-set | Creation timestamp |
| updatedAt | Date | Auto-updated | Last modification |

#### Recurring Project Fields (when `type = 'recurring'`)

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| frequency | 'weekly' \| 'biweekly' \| 'twice-monthly' \| 'monthly' | Required | Payment frequency |
| paymentSchedule | PaymentSchedule | Required | Schedule configuration |
| isActive | boolean | Default: true | Include in cashflow calculations |

#### Single-Shot Income Fields (when `type = 'single_shot'`)

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| date | Date | Required | Specific calendar date |

**Note**: Single-shot income has no `isActive` field - it is always included when within the projection period. Past status is derived from comparing `date` to current date.

---

## Zod Schemas

### ProjectType Enum

```typescript
export const ProjectTypeSchema = z.enum(['recurring', 'single_shot'])
export type ProjectType = z.infer<typeof ProjectTypeSchema>
```

### Recurring Project Schemas

```typescript
// Input schema for creating/updating recurring projects
export const RecurringProjectInputSchema = z.object({
  type: z.literal('recurring'),
  name: z.string().min(1, 'Nome do projeto é obrigatório').max(100),
  amount: z.number().positive('Valor deve ser positivo'),
  frequency: FrequencySchema,
  paymentSchedule: PaymentScheduleSchema,
  certainty: z.enum(['guaranteed', 'probable', 'uncertain']),
  isActive: z.boolean().default(true),
}).refine(
  (data) => validateFrequencyScheduleMatch(data.frequency, data.paymentSchedule),
  {
    message: 'Payment schedule type must match frequency',
    path: ['paymentSchedule'],
  }
)

// Full schema with system fields
export const RecurringProjectSchema = RecurringProjectInputSchema.innerType().extend({
  id: z.string().uuid(),
  paymentDay: z.number().int().min(1).max(31).optional(), // Legacy field
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type RecurringProjectInput = z.infer<typeof RecurringProjectInputSchema>
export type RecurringProject = z.infer<typeof RecurringProjectSchema>
```

### Single-Shot Income Schemas

```typescript
// Input schema for creating/updating single-shot income
export const SingleShotIncomeInputSchema = z.object({
  type: z.literal('single_shot'),
  name: z.string().min(1, 'Nome da receita é obrigatório').max(100),
  amount: z.number().positive('Valor deve ser positivo'),
  date: z.coerce.date(),
  certainty: z.enum(['guaranteed', 'probable', 'uncertain']),
})

// Full schema with system fields
export const SingleShotIncomeSchema = SingleShotIncomeInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type SingleShotIncomeInput = z.infer<typeof SingleShotIncomeInputSchema>
export type SingleShotIncome = z.infer<typeof SingleShotIncomeSchema>
```

### Unified Project Types

```typescript
// Input discriminated union
export const ProjectInputSchema = z.discriminatedUnion('type', [
  RecurringProjectInputSchema,
  SingleShotIncomeInputSchema,
])

// Full discriminated union
export const ProjectSchema = z.discriminatedUnion('type', [
  RecurringProjectSchema,
  SingleShotIncomeSchema,
])

export type ProjectInput = z.infer<typeof ProjectInputSchema>
export type Project = z.infer<typeof ProjectSchema>
```

### Type Guards

```typescript
export function isRecurringProject(project: Project): project is RecurringProject {
  return project.type === 'recurring'
}

export function isSingleShotIncome(project: Project): project is SingleShotIncome {
  return project.type === 'single_shot'
}
```

---

## Database Schema

### Migration: 008_single_shot_income.sql

```sql
-- Migration: 008_single_shot_income
-- Feature: 018-single-shot-income
-- Date: 2025-11-28
-- Description: Add support for single-shot (one-time) income

-- ============================================================================
-- STEP 1: Add type column with default for existing rows
-- ============================================================================

ALTER TABLE projects 
  ADD COLUMN type TEXT NOT NULL DEFAULT 'recurring' 
  CHECK (type IN ('recurring', 'single_shot'));

-- ============================================================================
-- STEP 2: Add date column for single-shot income
-- ============================================================================

ALTER TABLE projects ADD COLUMN date DATE;

-- ============================================================================
-- STEP 3: Make recurring-specific fields nullable (required only for recurring)
-- ============================================================================

ALTER TABLE projects ALTER COLUMN frequency DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN payment_schedule DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN is_active DROP NOT NULL;

-- ============================================================================
-- STEP 4: Add constraint to enforce type-specific field requirements
-- ============================================================================

ALTER TABLE projects ADD CONSTRAINT project_type_fields CHECK (
  (type = 'recurring' AND frequency IS NOT NULL AND payment_schedule IS NOT NULL AND is_active IS NOT NULL) OR
  (type = 'single_shot' AND date IS NOT NULL)
);

-- ============================================================================
-- STEP 5: Add index for date-based queries on single-shot income
-- ============================================================================

CREATE INDEX IF NOT EXISTS projects_date_idx 
  ON projects(date) 
  WHERE type = 'single_shot';

-- ============================================================================
-- STEP 6: Add index for type-based filtering
-- ============================================================================

CREATE INDEX IF NOT EXISTS projects_type_idx ON projects(type);
```

### Final Table Structure

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  amount INTEGER NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL DEFAULT 'recurring' CHECK (type IN ('recurring', 'single_shot')),
  -- Recurring project fields (required when type = 'recurring')
  frequency TEXT CHECK (frequency IN ('weekly', 'biweekly', 'twice-monthly', 'monthly')),
  payment_schedule JSONB,
  is_active BOOLEAN DEFAULT true,
  -- Single-shot income field (required when type = 'single_shot')
  date DATE,
  -- Common fields
  certainty TEXT NOT NULL CHECK (certainty IN ('guaranteed', 'probable', 'uncertain')),
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Constraint: type determines required fields
  CONSTRAINT project_type_fields CHECK (
    (type = 'recurring' AND frequency IS NOT NULL AND payment_schedule IS NOT NULL AND is_active IS NOT NULL) OR
    (type = 'single_shot' AND date IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX projects_user_id_idx ON projects(user_id);
CREATE INDEX projects_is_active_idx ON projects(is_active);
CREATE INDEX projects_type_idx ON projects(type);
CREATE INDEX projects_date_idx ON projects(date) WHERE type = 'single_shot';
```

---

## Database Row Types

### ProjectRow (Supabase Response)

```typescript
// In src/lib/supabase.ts
export interface ProjectRow {
  id: string
  name: string
  amount: number
  type: 'recurring' | 'single_shot'
  frequency: 'weekly' | 'biweekly' | 'twice-monthly' | 'monthly' | null
  payment_schedule: PaymentScheduleJson | null
  certainty: 'guaranteed' | 'probable' | 'uncertain'
  is_active: boolean | null
  date: string | null  // ISO date string, present for single_shot, null for recurring
  created_at: string
  updated_at: string
}

type PaymentScheduleJson = 
  | { type: 'dayOfWeek'; dayOfWeek: number }
  | { type: 'dayOfMonth'; dayOfMonth: number }
  | { type: 'twiceMonthly'; firstDay: number; secondDay: number; firstAmount?: number; secondAmount?: number }
```

---

## Type Mapping Functions

### Database → TypeScript

```typescript
// In src/hooks/use-finance-data.ts

function mapProjectFromDb(row: ProjectRow): Project {
  const base = {
    id: row.id,
    name: row.name,
    amount: row.amount,
    certainty: row.certainty,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }

  if (row.type === 'single_shot') {
    return {
      ...base,
      type: 'single_shot' as const,
      date: new Date(row.date!),
    }
  }

  return {
    ...base,
    type: 'recurring' as const,
    frequency: row.frequency!,
    paymentSchedule: row.payment_schedule!,
    isActive: row.is_active!,
    paymentDay: undefined, // Legacy field, not used
  }
}
```

### TypeScript → Database

```typescript
// In src/stores/finance-store.ts

function mapRecurringProjectToDb(input: RecurringProjectInput) {
  return {
    type: 'recurring',
    name: input.name,
    amount: input.amount,
    frequency: input.frequency,
    payment_schedule: input.paymentSchedule,
    certainty: input.certainty,
    is_active: input.isActive,
    date: null,
  }
}

function mapSingleShotIncomeToDb(input: SingleShotIncomeInput) {
  return {
    type: 'single_shot',
    name: input.name,
    amount: input.amount,
    date: input.date.toISOString().split('T')[0], // YYYY-MM-DD
    certainty: input.certainty,
    frequency: null,
    payment_schedule: null,
    is_active: null,
  }
}
```

---

## Validation Rules

### Single-Shot Income

| Field | Rule | Error Message |
|-------|------|---------------|
| name | Required, 1-100 chars | "Nome da receita é obrigatório" |
| amount | Positive integer (cents) | "Valor deve ser positivo" |
| date | Valid date (any calendar date allowed) | "Data é obrigatória" |
| certainty | One of: guaranteed, probable, uncertain | "Certeza é obrigatória" |

### Business Rules

1. **Date flexibility**: Any valid calendar date is allowed (past, present, or future)
2. **Past detection**: Derived from comparing `date` to current date at render time
3. **Certainty behavior**: 
   - `guaranteed` → Appears in both optimistic and pessimistic scenarios
   - `probable` / `uncertain` → Appears only in optimistic scenario
4. **No manual "received" status**: Past status is automatic based on date

---

## State Transitions

Single-shot income has no explicit state machine. The only implicit state is:

| State | Condition | Visual Treatment |
|-------|-----------|------------------|
| Upcoming | `date >= today` | Normal styling |
| Past | `date < today` | Muted styling + "Recebido" badge |

---

## Relationships

```
Project (unified table)
├── type: 'recurring'
│   ├── frequency (required)
│   ├── payment_schedule (required)
│   └── is_active (required)
│
└── type: 'single_shot'
    └── date (required)
```

---

## Migration Strategy

1. **Non-destructive**: Adds columns and constraints without removing existing data
2. **Default values**: Existing rows get `type = 'recurring'` automatically
3. **Backward compatible**: Existing recurring projects continue to work unchanged
4. **RLS unchanged**: Existing RLS policies apply to all project types

