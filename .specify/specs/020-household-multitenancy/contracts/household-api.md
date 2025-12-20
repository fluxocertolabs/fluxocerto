# API Contracts: Household Multi-Tenancy

**Feature Branch**: `020-household-multitenancy`  
**Date**: 2025-12-01

## Overview

This document defines the Supabase database API contracts for household multi-tenancy. Since this is a frontend-only application using Supabase as BaaS, all "API" interactions are Supabase client queries with RLS enforcement.

## Authentication Context

All requests require authenticated user. Household context is derived from:

```typescript
// User's household determined by their profile
const householdId = await supabase
  .from('profiles')
  .select('household_id')
  .eq('id', user.id)
  .single()
```

## Household Operations

### Get Current Household

**Purpose**: Fetch the current user's household information.

**Supabase Query**:
```typescript
const { data, error } = await supabase
  .from('households')
  .select('id, name, created_at, updated_at')
  .single()

// RLS automatically filters to user's household
```

**Response Shape**:
```typescript
interface HouseholdResponse {
  id: string           // UUID
  name: string         // Display name (e.g., "Fonseca Floriano")
  created_at: string   // ISO timestamp
  updated_at: string   // ISO timestamp
}
```

**Error Cases**:
| Code | Condition | User Message |
|------|-----------|--------------|
| `PGRST116` | No household found | "Sua conta não está associada a nenhuma residência." |
| `42501` | Permission denied | "Você não tem permissão para acessar esses dados." |

---

### Get Household Members

**Purpose**: Fetch all members of the current user's household.

**Supabase Query**:
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('id, name, email')
  .order('name')

// RLS automatically filters to user's household
```

**Response Shape**:
```typescript
interface ProfileResponse {
  id: string           // UUID (matches auth.users.id)
  name: string         // Display name
  email: string | null // Email if present
}

type MembersResponse = ProfileResponse[]
```

**Error Cases**:
| Code | Condition | User Message |
|------|-----------|--------------|
| Network | Offline | "Não foi possível carregar os membros. Verifique sua conexão." |

---

## Invite Operations

### Create Invite (Add Profile with Household)

**Purpose**: Invite a new member to the current household.

**Supabase Query**:
```typescript
// Step 1: Create profile with household association
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .insert({
    name: extractNameFromEmail(email),
    email: email,
    household_id: currentUserHouseholdId, // From auth context
  })
  .select()
  .single()

// Step 2: Send magic link (if using Supabase auth admin)
// Note: This may require Edge Function or admin key
```

**Request Shape**:
```typescript
interface InviteRequest {
  email: string  // Email to invite
}
```

**Response Shape**:
```typescript
interface InviteResponse {
  success: true
  profileId: string
}
| {
  success: false
  error: string
}
```

**Validation Rules**:
| Field | Rule | Error Message |
|-------|------|---------------|
| email | Valid email format | "Email inválido" |
| email | Not already in any household | "Este email já pertence a outra residência" |
| email | Not pending invite elsewhere | "Este email já possui um convite pendente" |

**Error Cases**:
| Code | Condition | User Message |
|------|-----------|--------------|
| `23505` | Email already exists | "Este email já está cadastrado no sistema." |
| `23503` | Invalid household_id | "Erro interno. Tente novamente." |

---

## Financial Entity Operations (Updated)

All financial entity operations now include automatic `household_id` assignment:

### Create Account (Updated)

**Supabase Query**:
```typescript
const { data, error } = await supabase
  .from('accounts')
  .insert({
    name: input.name,
    type: input.type,
    balance: input.balance,
    owner_id: input.ownerId ?? null,
    household_id: userHouseholdId, // NEW: Required
  })
  .select('id')
  .single()
```

**Note**: `household_id` is required. Frontend must fetch and pass the user's household ID. RLS `WITH CHECK` validates the household_id matches user's profile.

---

### Read Operations (Filtered by Household)

All read operations are automatically filtered by RLS:

```typescript
// Before (002_invite_auth - all data visible)
const { data } = await supabase.from('accounts').select('*')
// Returns ALL accounts

// After (009_households - household isolation)  
const { data } = await supabase.from('accounts').select('*')
// Returns ONLY accounts where household_id = user's household_id
```

---

## Hook Contracts

### useHousehold Hook

**Interface**:
```typescript
interface UseHouseholdReturn {
  household: {
    id: string
    name: string
  } | null
  members: Array<{
    id: string
    name: string
    email: string | null
    isCurrentUser: boolean  // Derived: id === auth.uid()
  }>
  isLoading: boolean
  error: string | null
  refetch: () => void
}

function useHousehold(): UseHouseholdReturn
```

**Usage**:
```typescript
function Header() {
  const { household, isLoading } = useHousehold()
  
  if (isLoading) return <Skeleton />
  if (!household) return <ErrorBanner />
  
  return <HouseholdBadge name={household.name} />
}
```

---

### useFinanceData Hook (Updated)

**Changes**:
- No query changes needed (RLS handles filtering)
- Add `householdId` to store context for writes

**Updated Interface**:
```typescript
interface UseFinanceDataReturn {
  accounts: BankAccount[]
  projects: Project[]
  // ... existing fields ...
  
  // NEW: Household context for writes
  householdId: string | null
}
```

---

## Store Contract Updates

### useFinanceStore (Updated)

All mutation methods must include `household_id`:

```typescript
// Before
addAccount: async (input: BankAccountInput) => {
  await supabase.from('accounts').insert({
    name: input.name,
    type: input.type,
    balance: input.balance,
  })
}

// After
addAccount: async (input: BankAccountInput, householdId: string) => {
  await supabase.from('accounts').insert({
    name: input.name,
    type: input.type,
    balance: input.balance,
    household_id: householdId, // Required
  })
}
```

**Alternative**: Store could fetch `household_id` internally:
```typescript
addAccount: async (input: BankAccountInput) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single()
  
  await supabase.from('accounts').insert({
    ...input,
    household_id: profile.household_id,
  })
}
```

---

## Error Code Reference

| Supabase Code | PostgreSQL Code | Meaning | User Action |
|---------------|-----------------|---------|-------------|
| `PGRST116` | - | No rows returned | Check if data exists |
| `23505` | unique_violation | Duplicate key | Change unique field |
| `23503` | foreign_key_violation | Invalid FK reference | Check referenced entity |
| `42501` | insufficient_privilege | RLS denied | Check permissions |
| `22001` | string_data_right_truncation | Field too long | Shorten input |

---

## Realtime Subscriptions (Updated)

Channel subscriptions remain unchanged - RLS filters events automatically:

```typescript
// Realtime automatically respects RLS
const channel = supabase
  .channel('finance-data')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'accounts',
    // No filter needed - RLS handles it
  }, handleChange)
  .subscribe()
```

**Note**: Supabase Realtime + RLS only sends events for rows the user can see.

