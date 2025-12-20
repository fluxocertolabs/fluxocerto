# Data Model: Local Development Auth Bypass

**Feature**: 024-local-dev-auth-bypass  
**Date**: 2025-12-03

## Overview

This feature does not introduce new database entities. It utilizes existing tables (`households`, `profiles`, `accounts`) to create seed data for the dev user. This document defines the expected data shape and relationships.

---

## Entities Used

### Dev User (auth.users)

Created via Supabase Admin API in the local auth.users table.

```typescript
interface DevUser {
  id: string           // UUID, auto-generated
  email: 'dev@local'   // Fixed email for dev user
  email_confirmed_at: Date  // Set during creation
  // password set programmatically, not stored in code
}
```

**Constraints**:
- Email must be `dev@local` (idempotent creation)
- Email must be confirmed (for auth to work)

### Dev Household (households table)

```typescript
interface DevHousehold {
  id: string           // UUID, auto-generated
  name: 'Dev Household' // Fixed name
  created_at: Date
  updated_at: Date
}
```

**Constraints**:
- Name check: 1-100 characters (per existing constraint)
- Created only if no household linked to `dev@local` profile exists

### Dev Profile (profiles table)

Links the auth user to a household for RLS policy resolution.

```typescript
interface DevProfile {
  id: string           // UUID, auto-generated
  name: 'Dev User'     // Descriptive name
  email: 'dev@local'   // Must match auth user email (citext)
  household_id: string // FK to dev household
  created_at: Date
  created_by: null     // No creating user for initial setup
}
```

**Constraints**:
- email is CITEXT (case-insensitive)
- household_id is NOT NULL (FK to households)

### Dev Account (accounts table)

Minimal seed data for immediate RLS verification.

```typescript
interface DevAccount {
  id: string           // UUID, auto-generated
  name: 'Dev Checking' // Descriptive name
  type: 'checking'     // Most common for cashflow
  balance: 1000000     // 10,000.00 in cents
  balance_updated_at: Date
  owner_id: string     // FK to dev profile
  household_id: string // FK to dev household
  created_at: Date
  updated_at: Date
}
```

**Constraints**:
- type enum: 'checking' | 'savings' | 'investment'
- balance in cents (integer)
- household_id required (NOT NULL)

---

## Entity Relationships

```
┌──────────────────┐       ┌──────────────────┐
│   auth.users     │       │   households     │
├──────────────────┤       ├──────────────────┤
│ id: UUID (PK)    │       │ id: UUID (PK)    │
│ email: dev@local │       │ name: text       │
└──────────────────┘       └────────┬─────────┘
                                    │
                                    │ 1:N
                                    ▼
                           ┌──────────────────┐
                           │    profiles      │
                           ├──────────────────┤
                           │ id: UUID (PK)    │
                           │ email: citext    │◄── must match auth.users.email
                           │ household_id: FK │
                           │ name: text       │
                           └────────┬─────────┘
                                    │
                                    │ 1:N (owner)
                                    ▼
                           ┌──────────────────┐
                           │    accounts      │
                           ├──────────────────┤
                           │ id: UUID (PK)    │
                           │ name: text       │
                           │ type: enum       │
                           │ balance: integer │
                           │ household_id: FK │
                           │ owner_id: FK     │
                           └──────────────────┘
```

---

## RLS Policy Flow

```
1. Frontend calls setSession() with dev tokens
2. User makes DB query (e.g., SELECT * FROM accounts)
3. RLS policy executes: household_id = get_user_household_id()
4. get_user_household_id() extracts email from JWT
5. Looks up: SELECT household_id FROM profiles WHERE email = jwt.email
6. Returns dev_household_id
7. Query filtered to only dev household's accounts
```

---

## State Transitions

This feature manages a one-time setup state:

```
┌─────────────┐   script runs   ┌─────────────┐
│  NO DEV     │ ───────────────►│  DEV USER   │
│  USER       │                 │  EXISTS     │
└─────────────┘                 └─────────────┘
                                      │
                                      │ tokens generated
                                      ▼
                                ┌─────────────┐
                                │  TOKENS IN  │
                                │    .env     │
                                └─────────────┘
                                      │
                                      │ app starts in DEV
                                      ▼
                                ┌─────────────┐
                                │  AUTO       │
                                │  LOGGED IN  │
                                └─────────────┘
```

---

## Validation Rules

| Field | Rule | Error |
|-------|------|-------|
| Profile.email | Must match auth user | FK/lookup fails silently |
| Account.household_id | Must match user's household | RLS blocks access |
| Tokens | Must be valid Supabase JWT | setSession() throws |

---

## Notes

- No new migrations required - uses existing schema
- Data created by script is local-only (dev Supabase instance)
- Idempotent: Running script multiple times reuses existing entities

