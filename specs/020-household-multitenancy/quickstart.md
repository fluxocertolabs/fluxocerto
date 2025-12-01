# Quickstart: Household Multi-Tenancy Implementation

**Feature Branch**: `020-household-multitenancy`  
**Date**: 2025-12-01

## Overview

This guide provides step-by-step implementation instructions for household multi-tenancy. Follow in order - each section builds on the previous.

## Prerequisites

- [ ] Branch `020-household-multitenancy` checked out
- [ ] Local Supabase linked and running (or using cloud project)
- [ ] Existing migrations (001-008) applied
- [ ] Development server running (`pnpm dev`)

## Implementation Order

### Phase A: Database Migration (Backend)

**Estimated Time**: 30 minutes

#### Step 1: Create Migration File

```bash
# Create new migration file
touch supabase/migrations/009_households.sql
```

#### Step 2: Write Migration

The migration should contain:

1. **Helper function** for RLS policies
2. **households table** creation
3. **Default household** insertion ("Fonseca Floriano")
4. **Add household_id** to all existing tables
5. **Drop old RLS policies**
6. **Create new RLS policies**
7. **Update existing data** to reference default household

**Key SQL Patterns**:

```sql
-- 1. Helper function
CREATE OR REPLACE FUNCTION get_user_household_id()
RETURNS UUID AS $$
  SELECT household_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 2. households table
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Insert default household
INSERT INTO households (id, name) VALUES 
  (gen_random_uuid(), 'Fonseca Floriano')
RETURNING id INTO default_household_id;

-- 4-7. See data-model.md for complete SQL
```

#### Step 3: Apply Migration

```bash
# Local Supabase
supabase db push

# Or cloud Supabase
supabase db push --linked
```

#### Step 4: Verify Migration

```sql
-- Check households table
SELECT * FROM households;

-- Check profiles have household_id
SELECT id, name, household_id FROM profiles;

-- Test RLS (should only see own household data)
SELECT * FROM accounts; -- Should work for authenticated user
```

---

### Phase B: TypeScript Types (Frontend)

**Estimated Time**: 15 minutes

#### Step 1: Add Household Type to `src/types/index.ts`

```typescript
// === Household ===
export const HouseholdSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Household = z.infer<typeof HouseholdSchema>
```

#### Step 2: Update Profile Type

```typescript
// Update ProfileSchema to include householdId
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  householdId: z.string().uuid(), // NEW
})

export type Profile = z.infer<typeof ProfileSchema>
```

#### Step 3: Update Supabase Row Types in `src/lib/supabase.ts`

```typescript
export interface HouseholdRow {
  id: string
  name: string
  created_at: string
  updated_at: string
}

// Update ProfileRow
export interface ProfileRow {
  id: string
  name: string
  email: string | null
  household_id: string  // NEW
  created_at: string
  created_by: string | null
}
```

---

### Phase C: Household Hook (Frontend)

**Estimated Time**: 30 minutes

#### Step 1: Create `src/hooks/use-household.ts`

```typescript
import { useState, useEffect, useCallback } from 'react'
import { getSupabase, isSupabaseConfigured, type HouseholdRow, type ProfileRow } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type { Profile } from '@/types'

export interface HouseholdInfo {
  id: string
  name: string
}

export interface HouseholdMember extends Profile {
  isCurrentUser: boolean
}

export interface UseHouseholdReturn {
  household: HouseholdInfo | null
  members: HouseholdMember[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useHousehold(): UseHouseholdReturn {
  const [household, setHousehold] = useState<HouseholdInfo | null>(null)
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  
  const { isAuthenticated, user } = useAuth()
  
  const refetch = useCallback(() => {
    setRetryCount(c => c + 1)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured() || !isAuthenticated) {
      setIsLoading(false)
      return
    }

    async function fetchHouseholdData() {
      try {
        setError(null)
        const client = getSupabase()
        
        // Fetch household via profiles join
        const { data: householdData, error: householdError } = await client
          .from('households')
          .select('id, name')
          .single()
        
        if (householdError) throw householdError
        
        setHousehold({
          id: householdData.id,
          name: householdData.name,
        })
        
        // Fetch members
        const { data: membersData, error: membersError } = await client
          .from('profiles')
          .select('id, name, household_id')
          .order('name')
        
        if (membersError) throw membersError
        
        setMembers(
          (membersData ?? []).map(m => ({
            id: m.id,
            name: m.name,
            householdId: m.household_id,
            isCurrentUser: m.id === user?.id,
          }))
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Falha ao carregar residência'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHouseholdData()
  }, [isAuthenticated, user?.id, retryCount])

  return { household, members, isLoading, error, refetch }
}
```

---

### Phase D: UI Components (Frontend)

**Estimated Time**: 45 minutes

#### Step 1: Create `src/components/household/household-badge.tsx`

```typescript
interface HouseholdBadgeProps {
  name: string
}

export function HouseholdBadge({ name }: HouseholdBadgeProps) {
  return (
    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
      {name}
    </span>
  )
}
```

#### Step 2: Create `src/components/household/members-list.tsx`

```typescript
import type { HouseholdMember } from '@/hooks/use-household'

interface MembersListProps {
  members: HouseholdMember[]
}

export function MembersList({ members }: MembersListProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Membros da Residência</h3>
      <ul className="space-y-1">
        {members.map(member => (
          <li key={member.id} className="flex items-center gap-2 text-sm">
            <span>{member.name}</span>
            {member.isCurrentUser && (
              <span className="text-xs text-muted-foreground">(Você)</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

#### Step 3: Update `src/components/layout/header.tsx`

```typescript
import { useHousehold } from '@/hooks/use-household'
import { HouseholdBadge } from '@/components/household/household-badge'

export function Header() {
  const { household, isLoading: householdLoading } = useHousehold()
  // ... existing code ...

  return (
    <header className="border-b bg-background">
      <nav className="container mx-auto flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="font-semibold text-lg">
            Finanças da Família
          </Link>
          {household && !householdLoading && (
            <HouseholdBadge name={household.name} />
          )}
        </div>
        {/* ... rest of header ... */}
      </nav>
    </header>
  )
}
```

#### Step 4: Add Members Section to `src/pages/manage.tsx`

```typescript
import { useHousehold } from '@/hooks/use-household'
import { MembersList } from '@/components/household/members-list'

export function ManagePage() {
  const { members, isLoading: householdLoading } = useHousehold()
  
  return (
    <div>
      {/* ... existing tabs ... */}
      
      {/* Members section - add as new tab or section */}
      <Card>
        <CardHeader>
          <CardTitle>Membros da Residência</CardTitle>
        </CardHeader>
        <CardContent>
          {householdLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <MembersList members={members} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

---

### Phase E: Store Updates (Frontend)

**Estimated Time**: 30 minutes

#### Step 1: Update `src/stores/finance-store.ts`

Add household context to mutations:

```typescript
// Option A: Pass household_id explicitly
addAccount: async (input: BankAccountInput, householdId: string) => {
  // ... validation ...
  const { data, error } = await getSupabase()
    .from('accounts')
    .insert({
      name: validated.name,
      type: validated.type,
      balance: validated.balance,
      owner_id: validated.ownerId ?? null,
      household_id: householdId, // NEW
    })
    .select('id')
    .single()
  // ...
}

// Option B: Fetch household_id internally (simpler API)
addAccount: async (input: BankAccountInput) => {
  const userId = (await getSupabase().auth.getUser()).data.user?.id
  const { data: profile } = await getSupabase()
    .from('profiles')
    .select('household_id')
    .eq('id', userId)
    .single()
  
  // ... insert with profile.household_id ...
}
```

**Recommendation**: Option B for simpler component code, but consider caching the household_id.

#### Step 2: Update `src/hooks/use-finance-data.ts`

Update profile mapping:

```typescript
export function mapProfileFromDb(row: ProfileRow): Profile {
  return {
    id: row.id,
    name: row.name,
    householdId: row.household_id, // NEW
  }
}
```

---

### Phase F: Testing

**Estimated Time**: 1 hour

#### Unit Tests

1. Test `useHousehold` hook mocking Supabase responses
2. Test updated store mutations with household_id
3. Test profile mapping with new householdId field

#### Integration Tests

1. Test RLS isolation:
   - Create two households
   - Create users in each
   - Verify User A cannot see User B's data

2. Test invite flow:
   - Invite new email with household_id
   - Verify new user joins correct household

#### E2E Tests

1. Test household badge displays in header
2. Test members list displays all household members
3. Test data isolation between households (if test environment supports)

---

## Verification Checklist

After implementation, verify:

- [ ] Migration applied without errors
- [ ] Default household "Fonseca Floriano" created
- [ ] All existing data assigned to default household
- [ ] RLS policies block cross-household access
- [ ] Household name displays in header
- [ ] Members list shows all household members
- [ ] Current user marked with "(Você)"
- [ ] New data created with correct household_id
- [ ] Realtime updates still work (filtered by household)
- [ ] No console errors
- [ ] TypeScript compiles without errors
- [ ] All existing tests pass

## Rollback Plan

If issues occur:

1. **Database rollback**: 
   ```sql
   -- Drop new columns (destructive!)
   ALTER TABLE profiles DROP COLUMN household_id;
   ALTER TABLE accounts DROP COLUMN household_id;
   -- ... etc for all tables
   DROP TABLE households;
   DROP FUNCTION get_user_household_id;
   -- Re-apply old RLS policies from 002_invite_auth.sql
   ```

2. **Frontend rollback**:
   ```bash
   git checkout main -- src/types/index.ts
   git checkout main -- src/lib/supabase.ts
   # Remove new files
   rm -rf src/components/household
   rm src/hooks/use-household.ts
   ```

## Common Issues

| Issue | Solution |
|-------|----------|
| "column household_id does not exist" | Migration not applied - run `supabase db push` |
| Empty household returned | User profile missing household_id - check migration |
| "permission denied" errors | RLS policies not updated - verify policy SQL |
| Members list empty | profiles RLS not updated - check policy on profiles table |
| Data not filtering | household_id column exists but not indexed - add index |

