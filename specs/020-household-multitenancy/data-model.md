# Data Model: Household Multi-Tenancy

**Feature Branch**: `020-household-multitenancy`  
**Date**: 2025-12-01

## Entity Relationship Diagram

```
┌─────────────────────┐
│     households      │
├─────────────────────┤
│ id (PK, UUID)       │
│ name (TEXT)         │
│ created_at          │
│ updated_at          │
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────┴──────────┐
│      profiles       │
├─────────────────────┤
│ id (PK, UUID)       │◄────── auth.users.id
│ household_id (FK)   │
│ name (TEXT)         │
│ email (CITEXT)      │
│ created_at          │
│ created_by          │
└──────────┬──────────┘
           │
    ┌──────┴──────┬──────────────┬──────────────┬──────────────┬───────────────┐
    │             │              │              │              │               │
    ▼             ▼              ▼              ▼              ▼               ▼
┌────────┐   ┌────────┐   ┌──────────┐   ┌───────────┐   ┌──────────┐   ┌──────────────┐
│accounts│   │projects│   │ expenses │   │credit_cards│  │user_prefs│   │    (All have │
└────────┘   └────────┘   └──────────┘   └───────────┘   └──────────┘   │ household_id)│
                                                                        └──────────────┘
```

## New Entity: households

### Table Definition

```sql
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### TypeScript Type

```typescript
// Zod Schema
export const HouseholdSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Household = z.infer<typeof HouseholdSchema>
```

### Supabase Row Type

```typescript
export interface HouseholdRow {
  id: string
  name: string
  created_at: string
  updated_at: string
}
```

## Modified Entity: profiles

### Schema Changes

```sql
-- Add household_id FK to profiles
ALTER TABLE profiles 
ADD COLUMN household_id UUID NOT NULL 
REFERENCES households(id) ON DELETE RESTRICT;

-- Add index for efficient lookups
CREATE INDEX profiles_household_id_idx ON profiles(household_id);
```

### TypeScript Type Update

```typescript
// Extended Profile Schema
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email().nullable(),
  householdId: z.string().uuid(),
})

export type Profile = z.infer<typeof ProfileSchema>
```

### Supabase Row Type Update

```typescript
export interface ProfileRow {
  id: string
  name: string
  email: string | null
  household_id: string
  created_at: string
  created_by: string | null
}
```

## Modified Entities: Financial Tables

All financial tables receive the same modification pattern:

### accounts

```sql
ALTER TABLE accounts 
ADD COLUMN household_id UUID NOT NULL 
REFERENCES households(id) ON DELETE RESTRICT;

CREATE INDEX accounts_household_id_idx ON accounts(household_id);
```

### projects

```sql
ALTER TABLE projects 
ADD COLUMN household_id UUID NOT NULL 
REFERENCES households(id) ON DELETE RESTRICT;

CREATE INDEX projects_household_id_idx ON projects(household_id);
```

### expenses

```sql
ALTER TABLE expenses 
ADD COLUMN household_id UUID NOT NULL 
REFERENCES households(id) ON DELETE RESTRICT;

CREATE INDEX expenses_household_id_idx ON expenses(household_id);
```

### credit_cards

```sql
ALTER TABLE credit_cards 
ADD COLUMN household_id UUID NOT NULL 
REFERENCES households(id) ON DELETE RESTRICT;

CREATE INDEX credit_cards_household_id_idx ON credit_cards(household_id);
```

### user_preferences

```sql
ALTER TABLE user_preferences 
ADD COLUMN household_id UUID NOT NULL 
REFERENCES households(id) ON DELETE RESTRICT;

CREATE INDEX user_preferences_household_id_idx ON user_preferences(household_id);

-- Update unique constraint to be per-household instead of per-user
ALTER TABLE user_preferences DROP CONSTRAINT user_preferences_user_id_key_key;
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_household_key_key UNIQUE(household_id, key);
```

## RLS Policy Updates

### Pattern: Household-Based Access

All tables use the same RLS pattern for household-based isolation:

```sql
-- Helper function for efficient household lookup
CREATE OR REPLACE FUNCTION get_user_household_id()
RETURNS UUID AS $$
  SELECT household_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;
```

### households RLS

```sql
ALTER TABLE households ENABLE ROW LEVEL SECURITY;

-- Users can only read their own household
CREATE POLICY "Users can read own household"
ON households FOR SELECT
TO authenticated
USING (id = get_user_household_id());

-- No insert/update/delete via app (admin-only)
```

### profiles RLS

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON profiles;

-- Users can read profiles in their household
CREATE POLICY "Users can read household profiles"
ON profiles FOR SELECT
TO authenticated
USING (household_id = get_user_household_id());

-- No direct profile modifications via app (managed by auth flow)
```

### accounts RLS

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can read all accounts" ON accounts;
DROP POLICY IF EXISTS "Authenticated users can insert accounts" ON accounts;
DROP POLICY IF EXISTS "Authenticated users can update accounts" ON accounts;
DROP POLICY IF EXISTS "Authenticated users can delete accounts" ON accounts;

-- New household-based policies
CREATE POLICY "Users can read household accounts"
ON accounts FOR SELECT
TO authenticated
USING (household_id = get_user_household_id());

CREATE POLICY "Users can insert household accounts"
ON accounts FOR INSERT
TO authenticated
WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can update household accounts"
ON accounts FOR UPDATE
TO authenticated
USING (household_id = get_user_household_id())
WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can delete household accounts"
ON accounts FOR DELETE
TO authenticated
USING (household_id = get_user_household_id());
```

### Same pattern for: projects, expenses, credit_cards, user_preferences

(Exact same policy structure as accounts, with table-specific names)

## Validation Rules

### Household

| Field | Rule |
|-------|------|
| name | Required, 1-100 characters |
| id | UUID, auto-generated |

### Profile (updated)

| Field | Rule |
|-------|------|
| household_id | Required, valid FK to households |
| name | Required, 1-100 characters |
| email | Optional, unique when present |

### Financial Entities (new constraint)

| Field | Rule |
|-------|------|
| household_id | Required, valid FK to households, auto-assigned from user's profile |

## State Transitions

### User Lifecycle

```
[No Account] 
    │
    │ Invite sent (household_id assigned)
    ▼
[Profile Created - Pending Auth]
    │
    │ Magic link clicked
    ▼
[Authenticated - Full Access to Household Data]
```

### Household Data Lifecycle

```
[Household Created by Admin]
    │
    │ Users assigned via invite
    ▼
[Active Household with Members]
    │
    │ Financial data created by members
    ▼
[Household with Shared Financial Data]
```

## Migration Data Flow

```
BEFORE:
┌─────────────────────────────────────────────────────────────┐
│ profiles     │ accounts    │ projects   │ expenses         │
│ (Daniel)     │ (no FK)     │ (no FK)    │ (no FK)          │
│ (Aryane)     │             │            │                  │
│              │ All data visible to all authenticated users │
└─────────────────────────────────────────────────────────────┘

AFTER:
┌─────────────────────────────────────────────────────────────┐
│ households: "Fonseca Floriano" (default)                   │
│     │                                                       │
│     ├── profiles: Daniel, Aryane (household_id = default)  │
│     ├── accounts: All existing (household_id = default)    │
│     ├── projects: All existing (household_id = default)    │
│     ├── expenses: All existing (household_id = default)    │
│     └── credit_cards: All (household_id = default)         │
│                                                            │
│ Data isolated by household_id in RLS policies              │
└─────────────────────────────────────────────────────────────┘
```

## Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| households | PRIMARY KEY (id) | Unique identifier |
| profiles | household_id_idx | Efficient RLS filtering |
| accounts | household_id_idx | Efficient RLS filtering |
| projects | household_id_idx | Efficient RLS filtering |
| expenses | household_id_idx | Efficient RLS filtering |
| credit_cards | household_id_idx | Efficient RLS filtering |
| user_preferences | household_id_idx | Efficient RLS filtering |

## Constraints Summary

| Constraint | Table(s) | Purpose |
|------------|----------|---------|
| `profiles_household_id_fkey` | profiles | Ensure valid household reference |
| `accounts_household_id_fkey` | accounts | Ensure valid household reference |
| `projects_household_id_fkey` | projects | Ensure valid household reference |
| `expenses_household_id_fkey` | expenses | Ensure valid household reference |
| `credit_cards_household_id_fkey` | credit_cards | Ensure valid household reference |
| `user_preferences_household_id_fkey` | user_preferences | Ensure valid household reference |
| `ON DELETE RESTRICT` | All FKs | Prevent orphaned data on household deletion |

