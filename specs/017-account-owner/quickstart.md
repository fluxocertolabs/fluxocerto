# Quickstart: Account Owner Assignment

**Feature Branch**: `017-account-owner`  
**Date**: 2025-11-28

## Overview

This guide walks through implementing the Account Owner Assignment feature, which allows assigning bank accounts and credit cards to specific family members (Daniel or Aryane).

## Prerequisites

- [ ] Supabase project running with existing migrations (001-004)
- [ ] Development environment set up (`pnpm install`, `.env` configured)
- [ ] Access to Supabase dashboard for running migrations

## Implementation Steps

### Step 1: Database Migration

**File**: `supabase/migrations/005_account_owner.sql`

1. Create the migration file with the schema changes:
   - Rename `allowed_emails` → `profiles`
   - Add `name` column to profiles
   - Make `email` nullable
   - Add `owner_id` FK to `accounts` and `credit_cards`
   - Add RLS policy for profiles SELECT

2. Run the migration via Supabase dashboard SQL Editor or CLI:
   ```bash
   # If using Supabase CLI
   supabase db push
   ```

3. Seed profile names (run in SQL Editor):
   ```sql
   UPDATE profiles SET name = 'Daniel' WHERE email ILIKE '%daniel%';
   UPDATE profiles SET name = 'Aryane' WHERE email ILIKE '%aryane%';
   ```

### Step 2: Update TypeScript Types

**File**: `src/types/index.ts`

1. Add `Profile` type:
   ```typescript
   // === Profile ===
   export const ProfileSchema = z.object({
     id: z.string().uuid(),
     name: z.string().min(1).max(100),
   })
   
   export type Profile = z.infer<typeof ProfileSchema>
   ```

2. Update `BankAccountInputSchema` to include `ownerId`:
   ```typescript
   export const BankAccountInputSchema = z.object({
     name: z.string().min(1, 'Account name is required').max(100),
     type: z.enum(['checking', 'savings', 'investment']),
     balance: z.number().min(0, 'Balance cannot be negative'),
     ownerId: z.string().uuid().nullable().optional(),
   })
   ```

3. Update `BankAccountSchema` to include joined `owner`:
   ```typescript
   export const BankAccountSchema = BankAccountInputSchema.extend({
     id: z.string().uuid(),
     owner: z.object({
       id: z.string().uuid(),
       name: z.string(),
     }).nullable(),
     createdAt: z.date(),
     updatedAt: z.date(),
     balanceUpdatedAt: z.date().optional(),
   })
   ```

4. Apply same changes to `CreditCardInputSchema` and `CreditCardSchema`.

### Step 3: Update Finance Data Hook

**File**: `src/hooks/use-finance-data.ts`

1. Add profiles state and fetching:
   ```typescript
   const [profiles, setProfiles] = useState<Profile[]>([])
   
   // Fetch profiles
   useEffect(() => {
     const fetchProfiles = async () => {
       const { data } = await supabase
         .from('profiles')
         .select('id, name')
         .order('name')
       setProfiles(data ?? [])
     }
     fetchProfiles()
   }, [])
   ```

2. Update accounts query to include owner join:
   ```typescript
   const { data: accounts } = await supabase
     .from('accounts')
     .select(`
       id, name, type, balance, balance_updated_at,
       owner:profiles!owner_id(id, name),
       created_at, updated_at
     `)
   ```

3. Update credit cards query similarly.

4. Export profiles from the hook.

### Step 4: Update Finance Store

**File**: `src/stores/finance-store.ts`

1. Update `addAccount` to accept `ownerId`:
   ```typescript
   addAccount: async (input) => {
     const validated = BankAccountInputSchema.parse(input)
     const { data, error } = await getSupabase()
       .from('accounts')
       .insert({
         name: validated.name,
         type: validated.type,
         balance: validated.balance,
         owner_id: validated.ownerId ?? null, // NEW
       })
       .select('id')
       .single()
     // ...
   }
   ```

2. Update `updateAccount` to handle `ownerId`:
   ```typescript
   updateAccount: async (id, input) => {
     const validated = BankAccountInputSchema.partial().parse(input)
     const updateData: Record<string, unknown> = {}
     if (validated.name !== undefined) updateData.name = validated.name
     if (validated.type !== undefined) updateData.type = validated.type
     if (validated.balance !== undefined) updateData.balance = validated.balance
     if (validated.ownerId !== undefined) updateData.owner_id = validated.ownerId // NEW
     // ...
   }
   ```

3. Apply same changes to credit card actions.

### Step 5: Create Owner Badge Component

**File**: `src/components/ui/owner-badge.tsx`

```typescript
import { cn } from '@/lib/utils'

interface OwnerBadgeProps {
  owner: { name: string } | null
  showUnassigned?: boolean
  className?: string
}

export function OwnerBadge({ owner, showUnassigned = false, className }: OwnerBadgeProps) {
  if (!owner) {
    return showUnassigned ? (
      <span className={cn('text-xs text-muted-foreground', className)}>
        Não atribuído
      </span>
    ) : null
  }
  
  return (
    <span className={cn(
      'text-xs bg-primary/10 text-primary px-2 py-0.5 rounded',
      className
    )}>
      {owner.name}
    </span>
  )
}
```

### Step 6: Update Account Form

**File**: `src/components/manage/accounts/account-form.tsx`

1. Add owner state and props:
   ```typescript
   interface AccountFormProps {
     account?: BankAccount
     profiles: Profile[]  // NEW
     onSubmit: (data: BankAccountInput) => Promise<void>
     onCancel: () => void
     isSubmitting: boolean
   }
   
   const [ownerId, setOwnerId] = useState<string | null>(account?.owner?.id ?? null)
   ```

2. Add owner dropdown to form:
   ```tsx
   <div className="grid gap-2">
     <Label htmlFor="owner">Proprietário</Label>
     <Select
       value={ownerId ?? ''}
       onValueChange={(value) => setOwnerId(value === '' ? null : value)}
       disabled={isSubmitting}
     >
       <SelectTrigger id="owner">
         <SelectValue placeholder="Selecione o proprietário" />
       </SelectTrigger>
       <SelectContent>
         <SelectItem value="">Não atribuído</SelectItem>
         {profiles.map((profile) => (
           <SelectItem key={profile.id} value={profile.id}>
             {profile.name}
           </SelectItem>
         ))}
       </SelectContent>
     </Select>
   </div>
   ```

3. Include `ownerId` in form submission:
   ```typescript
   const formData = {
     name: name.trim(),
     type,
     balance: Math.round((parseFloat(balance) || 0) * 100),
     ownerId, // NEW
   }
   ```

### Step 7: Update Account List Item

**File**: `src/components/manage/accounts/account-list-item.tsx`

1. Import and use OwnerBadge:
   ```tsx
   import { OwnerBadge } from '@/components/ui/owner-badge'
   
   // In the component:
   <div className="flex items-center gap-2 flex-wrap">
     <span className="font-medium truncate" title={account.name}>
       {account.name}
     </span>
     <span className="text-xs bg-muted px-2 py-0.5 rounded">
       {TYPE_LABELS[account.type]}
     </span>
     <OwnerBadge owner={account.owner} />  {/* NEW */}
   </div>
   ```

### Step 8: Update Account List with Filter

**File**: `src/components/manage/accounts/account-list.tsx`

1. Add filter state:
   ```typescript
   const [ownerFilter, setOwnerFilter] = useState<string | null>(null)
   ```

2. Filter accounts:
   ```typescript
   const filteredAccounts = useMemo(() => {
     if (ownerFilter === null) return accounts
     if (ownerFilter === 'unassigned') return accounts.filter(a => !a.owner)
     return accounts.filter(a => a.owner?.id === ownerFilter)
   }, [accounts, ownerFilter])
   ```

3. Add filter dropdown:
   ```tsx
   <Select
     value={ownerFilter ?? 'all'}
     onValueChange={(value) => setOwnerFilter(
       value === 'all' ? null : value
     )}
   >
     <SelectTrigger className="w-48">
       <SelectValue placeholder="Filtrar por proprietário" />
     </SelectTrigger>
     <SelectContent>
       <SelectItem value="all">Todos</SelectItem>
       <SelectItem value="unassigned">Não atribuído</SelectItem>
       {profiles.map((profile) => (
         <SelectItem key={profile.id} value={profile.id}>
           {profile.name}
         </SelectItem>
       ))}
     </SelectContent>
   </Select>
   ```

### Step 9: Repeat for Credit Cards

Apply the same changes to:
- `src/components/manage/credit-cards/credit-card-form.tsx`
- `src/components/manage/credit-cards/credit-card-list-item.tsx`
- `src/components/manage/credit-cards/credit-card-list.tsx`

### Step 10: Testing

1. **Manual Testing**:
   - Create a new account with owner selected → Verify owner is saved
   - Create a new account without owner → Verify "Não atribuído" works
   - Edit existing account to change owner → Verify change persists
   - View account list → Verify owner badges display correctly
   - Use owner filter → Verify filtering works
   - Repeat all tests for credit cards

2. **Unit Tests** (optional):
   - Test Zod schema validation for ownerId field
   - Test OwnerBadge component rendering

---

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/005_account_owner.sql` | CREATE | Database migration |
| `src/types/index.ts` | MODIFY | Add Profile type, extend Account/CreditCard |
| `src/hooks/use-finance-data.ts` | MODIFY | Add profiles fetching, update queries |
| `src/stores/finance-store.ts` | MODIFY | Handle owner_id in CRUD operations |
| `src/components/ui/owner-badge.tsx` | CREATE | Reusable owner badge component |
| `src/components/manage/accounts/account-form.tsx` | MODIFY | Add owner dropdown |
| `src/components/manage/accounts/account-list-item.tsx` | MODIFY | Display owner badge |
| `src/components/manage/accounts/account-list.tsx` | MODIFY | Add owner filter |
| `src/components/manage/credit-cards/credit-card-form.tsx` | MODIFY | Add owner dropdown |
| `src/components/manage/credit-cards/credit-card-list-item.tsx` | MODIFY | Display owner badge |
| `src/components/manage/credit-cards/credit-card-list.tsx` | MODIFY | Add owner filter |

---

## Verification Checklist

- [ ] Migration runs successfully
- [ ] Profiles table has Daniel and Aryane with names
- [ ] Account form shows owner dropdown
- [ ] Credit card form shows owner dropdown
- [ ] Account list shows owner badges
- [ ] Credit card list shows owner badges
- [ ] Owner filter works on accounts
- [ ] Owner filter works on credit cards
- [ ] Existing accounts show as "Não atribuído"
- [ ] All UI text is in pt-BR

