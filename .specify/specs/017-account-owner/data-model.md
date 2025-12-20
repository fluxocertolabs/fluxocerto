# Data Model: Account Owner Assignment

**Feature Branch**: `017-account-owner`  
**Date**: 2025-11-28

## Overview

This feature extends the existing database schema to support account owner assignment. It involves:
1. Renaming `allowed_emails` table to `profiles` and adding a `name` column
2. Adding `owner_id` foreign key columns to `accounts` and `credit_cards` tables
3. Updating TypeScript types and Zod schemas to support the new fields

## Modified Entities

### profiles (renamed from allowed_emails)

Pre-approved family members who can own financial accounts and (optionally) log in.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `name` | TEXT | NOT NULL | Display name for the profile (e.g., "Daniel", "Aryane") |
| `email` | CITEXT | UNIQUE, NULLABLE | Email address for authentication (case-insensitive) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | When the profile was created |
| `created_by` | TEXT | NULLABLE | Optional audit: who added this profile |

**Changes from `allowed_emails`**:
- Table renamed to `profiles`
- Added `name` column (TEXT NOT NULL)
- `email` column made nullable (profiles can exist without login capability)

**Indexes**:
- Primary key on `id`
- Unique index on `email` (implicit from UNIQUE constraint)

**RLS Policies**:
- Authenticated users can SELECT (read profiles for dropdown)
- No INSERT/UPDATE/DELETE for regular users (admin-only via dashboard)

**Validation Rules**:
- `name` is required, max 100 characters
- `email` must be valid email format if provided, unique (case-insensitive)

---

### accounts (MODIFIED)

Bank accounts extended with optional owner assignment.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Existing |
| `name` | TEXT | NOT NULL | Existing |
| `type` | TEXT | NOT NULL, CHECK | Existing |
| `balance` | INTEGER | NOT NULL | Existing |
| `balance_updated_at` | TIMESTAMPTZ | NULLABLE | Existing |
| **`owner_id`** | UUID | **FK → profiles(id), ON DELETE SET NULL** | **NEW: Optional owner reference** |
| `created_at` | TIMESTAMPTZ | NOT NULL | Existing |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Existing |

**Changes**:
- Added `owner_id` column (UUID, nullable, FK to profiles)
- Added index on `owner_id` for filter performance

**New Index**:
```sql
CREATE INDEX accounts_owner_id_idx ON accounts(owner_id);
```

**FK Behavior**:
- `ON DELETE SET NULL`: If a profile is deleted, accounts owned by that profile become unassigned

---

### credit_cards (MODIFIED)

Credit cards extended with optional owner assignment.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Existing |
| `name` | TEXT | NOT NULL | Existing |
| `statement_balance` | INTEGER | NOT NULL | Existing |
| `due_day` | SMALLINT | NOT NULL | Existing |
| `balance_updated_at` | TIMESTAMPTZ | NULLABLE | Existing |
| **`owner_id`** | UUID | **FK → profiles(id), ON DELETE SET NULL** | **NEW: Optional owner reference** |
| `created_at` | TIMESTAMPTZ | NOT NULL | Existing |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Existing |

**Changes**:
- Added `owner_id` column (UUID, nullable, FK to profiles)
- Added index on `owner_id` for filter performance

**New Index**:
```sql
CREATE INDEX credit_cards_owner_id_idx ON credit_cards(owner_id);
```

---

## TypeScript Type Definitions

### New Types

```typescript
// === Profile ===
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email().nullable(),
  createdAt: z.date(),
})

export type Profile = z.infer<typeof ProfileSchema>
```

### Modified Types

```typescript
// === Bank Account (Modified) ===
export const BankAccountInputSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  type: z.enum(['checking', 'savings', 'investment']),
  balance: z.number().min(0, 'Balance cannot be negative'),
  ownerId: z.string().uuid().nullable().optional(), // NEW: optional owner
})

export const BankAccountSchema = BankAccountInputSchema.extend({
  id: z.string().uuid(),
  owner: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }).nullable(), // Joined owner data
  createdAt: z.date(),
  updatedAt: z.date(),
  balanceUpdatedAt: z.date().optional(),
})

export type BankAccountInput = z.infer<typeof BankAccountInputSchema>
export type BankAccount = z.infer<typeof BankAccountSchema>

// === Credit Card (Modified) ===
export const CreditCardInputSchema = z.object({
  name: z.string().min(1, 'Card name is required').max(100),
  statementBalance: z.number().min(0, 'Balance cannot be negative'),
  dueDay: z.number().int().min(1).max(31, 'Due day must be 1-31'),
  ownerId: z.string().uuid().nullable().optional(), // NEW: optional owner
})

export const CreditCardSchema = CreditCardInputSchema.extend({
  id: z.string().uuid(),
  owner: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }).nullable(), // Joined owner data
  createdAt: z.date(),
  updatedAt: z.date(),
  balanceUpdatedAt: z.date().optional(),
})

export type CreditCardInput = z.infer<typeof CreditCardInputSchema>
export type CreditCard = z.infer<typeof CreditCardSchema>
```

---

## Database Migration

### Migration File: `005_account_owner.sql`

```sql
-- Migration: 005_account_owner
-- Feature: 017-account-owner
-- Date: 2025-11-28
-- Description: Add account owner assignment via profiles table

-- ============================================================================
-- RENAME allowed_emails TO profiles
-- ============================================================================

ALTER TABLE allowed_emails RENAME TO profiles;

-- ============================================================================
-- ADD name COLUMN TO profiles
-- ============================================================================

-- Add name column with temporary default
ALTER TABLE profiles ADD COLUMN name TEXT NOT NULL DEFAULT '';

-- Make email nullable (profiles can exist without login capability)
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;

-- ============================================================================
-- ADD RLS POLICY FOR profiles SELECT
-- ============================================================================

-- Allow authenticated users to read profiles (for dropdown)
CREATE POLICY "Authenticated users can read profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- ADD owner_id TO accounts
-- ============================================================================

ALTER TABLE accounts 
ADD COLUMN owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX accounts_owner_id_idx ON accounts(owner_id);

-- ============================================================================
-- ADD owner_id TO credit_cards
-- ============================================================================

ALTER TABLE credit_cards
ADD COLUMN owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX credit_cards_owner_id_idx ON credit_cards(owner_id);

-- ============================================================================
-- SEED PROFILE NAMES (must be run after migration)
-- ============================================================================
-- Note: This assumes the allowed_emails table has Daniel and Aryane's emails.
-- If not, insert them manually via Supabase dashboard.

-- UPDATE profiles SET name = 'Daniel' WHERE email ILIKE '%daniel%';
-- UPDATE profiles SET name = 'Aryane' WHERE email ILIKE '%aryane%';
```

### Post-Migration: Seed Profile Names

After running the migration, execute via Supabase SQL Editor:

```sql
-- Update existing profiles with names
-- Adjust the WHERE clauses based on actual email addresses in your database

UPDATE profiles SET name = 'Daniel' WHERE email ILIKE '%daniel%';
UPDATE profiles SET name = 'Aryane' WHERE email ILIKE '%aryane%';

-- Or insert new profiles if they don't exist:
-- INSERT INTO profiles (name, email) VALUES ('Daniel', 'daniel@example.com');
-- INSERT INTO profiles (name, email) VALUES ('Aryane', 'aryane@example.com');
```

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           profiles                                   │
│  (renamed from allowed_emails)                                       │
├─────────────────────────────────────────────────────────────────────┤
│  id: UUID (PK)                                                       │
│  name: TEXT (NOT NULL)                          ← NEW                │
│  email: CITEXT (UNIQUE, NULLABLE)               ← MODIFIED           │
│  created_at: TIMESTAMPTZ                                             │
│  created_by: TEXT                                                    │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                │ FK: owner_id → profiles.id
                                │ ON DELETE SET NULL
                                │
        ┌───────────────────────┴───────────────────────┐
        │                                               │
        ▼                                               ▼
┌───────────────────────┐                 ┌───────────────────────┐
│      accounts         │                 │    credit_cards       │
├───────────────────────┤                 ├───────────────────────┤
│ id: UUID (PK)         │                 │ id: UUID (PK)         │
│ name: TEXT            │                 │ name: TEXT            │
│ type: TEXT            │                 │ statement_balance: INT│
│ balance: INTEGER      │                 │ due_day: SMALLINT     │
│ balance_updated_at    │                 │ balance_updated_at    │
│ owner_id: UUID (FK) ← │                 │ owner_id: UUID (FK) ← │
│ created_at            │                 │ created_at            │
│ updated_at            │                 │ updated_at            │
└───────────────────────┘                 └───────────────────────┘
```

---

## Data Validation Rules

### profiles

| Field | Validation |
|-------|------------|
| `name` | Required, 1-100 characters |
| `email` | Optional, valid email format, unique (case-insensitive) |

### accounts.owner_id

| Field | Validation |
|-------|------------|
| `owner_id` | Optional, must be valid UUID referencing profiles.id |

### credit_cards.owner_id

| Field | Validation |
|-------|------------|
| `owner_id` | Optional, must be valid UUID referencing profiles.id |

---

## Query Patterns

### Fetch Accounts with Owner

```typescript
const { data: accounts } = await supabase
  .from('accounts')
  .select(`
    id,
    name,
    type,
    balance,
    balance_updated_at,
    owner:profiles!owner_id(id, name),
    created_at,
    updated_at
  `)
  .order('name')
```

### Fetch Credit Cards with Owner

```typescript
const { data: creditCards } = await supabase
  .from('credit_cards')
  .select(`
    id,
    name,
    statement_balance,
    due_day,
    balance_updated_at,
    owner:profiles!owner_id(id, name),
    created_at,
    updated_at
  `)
  .order('name')
```

### Fetch Profiles for Dropdown

```typescript
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, name')
  .order('name')
```

### Update Account Owner

```typescript
const { error } = await supabase
  .from('accounts')
  .update({ owner_id: profileId }) // or null to unassign
  .eq('id', accountId)
```

---

## Backward Compatibility

- **Existing accounts**: Will have `owner_id = NULL`, displayed as "Não atribuído"
- **Existing queries**: Continue to work; `owner_id` is optional
- **Existing forms**: Will work; owner selection is optional
- **No data migration required**: Existing accounts remain valid with null owner

