# Data Model: Invite-Only Magic Link Authentication

**Feature Branch**: `010-invite-auth`  
**Date**: 2025-11-27

## New Entities

### allowed_emails

Pre-approved email addresses for invite-only access control.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `email` | CITEXT | NOT NULL, UNIQUE | Email address (case-insensitive) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | When the email was added |
| `created_by` | TEXT | NULLABLE | Optional audit: who added this email |

**Indexes**:
- Primary key on `id`
- Unique index on `email` (implicit from UNIQUE constraint)

**RLS Policies**:
- No public access (admin-only via Supabase dashboard)
- Service role can read (for Edge Function)

**Validation Rules**:
- Email must be valid email format
- Email must be unique (case-insensitive via citext)

---

## Modified Entities

### accounts (MODIFIED)

**Changes**:
- REMOVE `user_id` column and foreign key constraint
- REMOVE `accounts_user_id_idx` index
- UPDATE RLS policies for shared access

**Before**:
```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- REMOVE
  name TEXT NOT NULL,
  ...
);
```

**After**:
```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- user_id removed
  name TEXT NOT NULL,
  ...
);
```

**New RLS Policies**:
```sql
-- All authenticated users can manage all accounts
CREATE POLICY "Authenticated users full access"
ON accounts FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
```

---

### projects (MODIFIED)

**Changes**: Same as accounts
- REMOVE `user_id` column
- REMOVE `projects_user_id_idx` index
- UPDATE RLS policies

---

### expenses (MODIFIED)

**Changes**: Same as accounts
- REMOVE `user_id` column
- REMOVE `expenses_user_id_idx` index
- UPDATE RLS policies

---

### credit_cards (MODIFIED)

**Changes**: Same as accounts
- REMOVE `user_id` column
- REMOVE `credit_cards_user_id_idx` index
- UPDATE RLS policies

---

## TypeScript Type Changes

### Remove user_id from Row Types

```typescript
// src/lib/supabase.ts - BEFORE
export interface AccountRow {
  id: string
  user_id: string  // REMOVE
  name: string
  type: 'checking' | 'savings' | 'investment'
  balance: number
  balance_updated_at: string | null
  created_at: string
  updated_at: string
}

// src/lib/supabase.ts - AFTER
export interface AccountRow {
  id: string
  // user_id removed
  name: string
  type: 'checking' | 'savings' | 'investment'
  balance: number
  balance_updated_at: string | null
  created_at: string
  updated_at: string
}
```

Same changes for `ProjectRow`, `ExpenseRow`, `CreditCardRow`.

---

### New Auth Types

```typescript
// src/types/auth.ts (NEW FILE)
export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

export interface User {
  id: string
  email: string
  createdAt: Date
}

export interface LoginFormData {
  email: string
}

export interface AuthError {
  code: string
  message: string
}
```

---

## State Transitions

### User Authentication Flow

```
[Unauthenticated] 
    │
    ▼ (enter email, request Magic Link)
[Magic Link Requested]
    │
    ▼ (click link in email)
[Callback Processing]
    │
    ├─── (valid link, approved email) ──▶ [Authenticated]
    │
    └─── (invalid/expired link) ──▶ [Error State] ──▶ [Unauthenticated]

[Authenticated]
    │
    ▼ (click sign out)
[Unauthenticated]
```

### Magic Link States

```
[Not Sent]
    │
    ▼ (user submits email)
[Sending]
    │
    ├─── (success) ──▶ [Sent] ──▶ (1 hour) ──▶ [Expired]
    │
    └─── (error) ──▶ [Error]
```

---

## Migration Strategy

### Migration File: `002_invite_auth.sql`

> ⚠️ **DESTRUCTIVE MIGRATION WARNING**
> 
> This migration removes the `user_id` column from all data tables. This is **only safe for fresh deployments** or after a verified backup. Existing user-scoped data will become shared or orphaned.

**Pre-Migration Checklist**:
1. **Backup**: Export affected tables (accounts, projects, expenses, credit_cards) via Supabase dashboard or `pg_dump`
2. **Verify**: Confirm this is a fresh deployment OR existing data can be abandoned
3. **Communicate**: Notify any users that data will be reset

**Order of Operations**:

1. Enable `citext` extension
2. Create `allowed_emails` table
3. Drop old RLS policies on all tables
4. Drop `user_id` columns from all tables
5. Create new shared RLS policies
6. Update realtime publication (no changes needed, already includes tables)

**Migration SQL Header** (to be included in actual migration file):
```sql
-- ⚠️ DESTRUCTIVE: Removes user_id column from all tables.
-- This migration is ONLY safe for fresh deployments.
-- Existing user data will be lost or become shared.
-- Run a backup before proceeding.
```

**Rollback Strategy**:
- This is a destructive migration (removes user_id, loses user isolation)
- Rollback requires re-adding user_id columns and restoring old policies
- Per spec: data loss is acceptable (fresh start approach)

---

## Entity Relationship Diagram

```
┌─────────────────────┐
│   allowed_emails    │
├─────────────────────┤
│ id: UUID (PK)       │
│ email: CITEXT (UQ)  │
│ created_at: TSTZ    │
│ created_by: TEXT    │
└─────────────────────┘
        │
        │ (validated by before-user-created hook)
        ▼
┌─────────────────────┐
│    auth.users       │
│   (Supabase Auth)   │
├─────────────────────┤
│ id: UUID (PK)       │
│ email: TEXT         │
│ ...                 │
└─────────────────────┘
        │
        │ (authenticated session)
        ▼
┌───────────────────────────────────────────────────────────┐
│                    SHARED DATA                             │
│  (all authenticated users have full access)                │
├───────────────┬───────────────┬──────────────┬────────────┤
│   accounts    │   projects    │   expenses   │credit_cards│
└───────────────┴───────────────┴──────────────┴────────────┘
```

---

## Data Validation Rules

### allowed_emails

| Field | Validation |
|-------|------------|
| email | Required, valid email format, unique (case-insensitive) |
| created_by | Optional, max 100 characters |

### Login Form

| Field | Validation |
|-------|------------|
| email | Required, valid email format |

---

## Audit Considerations

**Out of Scope** (per spec):
- No `created_by` or `updated_by` tracking on data tables
- No change history or audit logs
- `allowed_emails.created_by` is optional for admin convenience only

