# Research: Account Owner Assignment

**Feature Branch**: `017-account-owner`  
**Date**: 2025-11-28

## Research Tasks

### 1. Database Schema Design for Profiles Table

**Question**: How should the `profiles` table be structured, given it replaces `allowed_emails`?

**Decision**: Rename `allowed_emails` to `profiles` and add a `name` column.

**Rationale**:
- The existing `allowed_emails` table already has the structure we need (id, email, created_at, created_by)
- Adding a `name` column allows displaying human-readable owner names
- Using CITEXT for email preserves case-insensitive uniqueness
- The FK constraint from accounts/credit_cards to profiles with `ON DELETE SET NULL` handles profile deletion gracefully

**Schema**:
```sql
-- Rename table
ALTER TABLE allowed_emails RENAME TO profiles;

-- Add name column (required for display)
ALTER TABLE profiles ADD COLUMN name TEXT NOT NULL DEFAULT '';

-- Update existing rows with seed data
UPDATE profiles SET name = 'Daniel' WHERE email ILIKE '%daniel%';
UPDATE profiles SET name = 'Aryane' WHERE email ILIKE '%aryane%';
```

**Alternatives Considered**:
- Create a separate `profiles` table with FK to `allowed_emails`: Rejected due to unnecessary complexity
- Store owner as a simple TEXT field: Rejected because FK ensures referential integrity

---

### 2. Foreign Key Strategy for owner_id

**Question**: How should the `owner_id` FK be implemented on accounts and credit_cards?

**Decision**: Add nullable UUID FK column with `ON DELETE SET NULL`.

**Rationale**:
- Nullable allows existing accounts to remain unassigned (backward compatible)
- `ON DELETE SET NULL` automatically clears ownership if a profile is deleted
- UUID matches the existing `profiles.id` type
- Index on `owner_id` for filter performance

**Schema**:
```sql
-- Add owner_id to accounts
ALTER TABLE accounts 
ADD COLUMN owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX accounts_owner_id_idx ON accounts(owner_id);

-- Add owner_id to credit_cards  
ALTER TABLE credit_cards
ADD COLUMN owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX credit_cards_owner_id_idx ON credit_cards(owner_id);
```

**Alternatives Considered**:
- `ON DELETE CASCADE`: Rejected because deleting a profile shouldn't delete accounts
- `ON DELETE RESTRICT`: Rejected because it would prevent profile deletion
- Non-nullable with default: Rejected because existing accounts should remain unassigned

---

### 3. Supabase Query Pattern for Joined Data

**Question**: How to fetch accounts with their owner profile data efficiently?

**Decision**: Use Supabase's nested select syntax for foreign key joins.

**Rationale**:
- Supabase/PostgREST automatically detects FK relationships
- Single query returns both account and owner data
- No N+1 query problem

**Pattern** (from Context7 research):
```typescript
const { data: accounts, error } = await supabase
  .from('accounts')
  .select(`
    id,
    name,
    type,
    balance,
    owner:profiles!owner_id(id, name)
  `)
```

**Response Shape**:
```typescript
{
  id: string
  name: string
  type: 'checking' | 'savings' | 'investment'
  balance: number
  owner: { id: string; name: string } | null
}
```

---

### 4. Zod Schema for Nullable Optional Fields

**Question**: How to properly type the optional owner_id in Zod schemas?

**Decision**: Use `.nullable()` for the owner_id field and a nested object for the joined owner.

**Rationale** (from Context7 Zod docs):
- `.nullable()` allows `null` values (database NULL)
- `.optional()` allows `undefined` (field not provided in input)
- For database fields, `.nullable()` is the correct choice

**Schema**:
```typescript
// Input schema (for forms)
export const BankAccountInputSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['checking', 'savings', 'investment']),
  balance: z.number().min(0),
  ownerId: z.string().uuid().nullable(), // nullable for "unassigned"
})

// Full schema (from database)
export const BankAccountSchema = BankAccountInputSchema.extend({
  id: z.string().uuid(),
  owner: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }).nullable(), // null when no owner assigned
  createdAt: z.date(),
  updatedAt: z.date(),
})
```

---

### 5. UI Pattern for Owner Selection

**Question**: How should the owner dropdown be implemented?

**Decision**: Use existing shadcn/ui Select component with "Não atribuído" as default.

**Rationale**:
- Consistent with existing form patterns (see `account-form.tsx` type dropdown)
- Select component already handles accessibility
- Empty string value represents "unassigned"

**Implementation Pattern**:
```tsx
<Select
  value={ownerId ?? ''}
  onValueChange={(value) => setOwnerId(value === '' ? null : value)}
>
  <SelectTrigger>
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
```

---

### 6. Owner Badge Display Pattern

**Question**: How should the owner badge be displayed in list views?

**Decision**: Create a reusable `OwnerBadge` component with conditional rendering.

**Rationale**:
- Consistent styling across accounts and credit cards lists
- Handle null/undefined gracefully (show nothing or "Não atribuído")
- Small, non-intrusive badge that doesn't overwhelm the UI

**Implementation Pattern**:
```tsx
interface OwnerBadgeProps {
  owner: { name: string } | null
  showUnassigned?: boolean
}

export function OwnerBadge({ owner, showUnassigned = false }: OwnerBadgeProps) {
  if (!owner) {
    return showUnassigned ? (
      <span className="text-xs text-muted-foreground">Não atribuído</span>
    ) : null
  }
  
  return (
    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
      {owner.name}
    </span>
  )
}
```

---

### 7. Filter Implementation Pattern

**Question**: How should the owner filter work in list views?

**Decision**: Client-side filtering with URL state (optional) for shareability.

**Rationale**:
- Data set is small (< 50 accounts/cards), client-side filtering is efficient
- No additional Supabase queries needed
- Filter state can be stored in component state (simple) or URL params (shareable)

**Implementation Pattern**:
```tsx
const [ownerFilter, setOwnerFilter] = useState<string | null>(null) // null = "Todos"

const filteredAccounts = useMemo(() => {
  if (ownerFilter === null) return accounts // Show all
  if (ownerFilter === 'unassigned') return accounts.filter(a => !a.owner)
  return accounts.filter(a => a.owner?.id === ownerFilter)
}, [accounts, ownerFilter])
```

---

### 8. Profiles Data Loading Strategy

**Question**: How should profiles be loaded and made available to components?

**Decision**: Add profiles to the existing `useFinanceData` hook with realtime subscription.

**Rationale**:
- Consistent with existing data loading pattern
- Profiles rarely change, but realtime ensures consistency
- Single source of truth for all components

**Implementation**:
```typescript
// In useFinanceData hook
const [profiles, setProfiles] = useState<Profile[]>([])

useEffect(() => {
  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name')
      .order('name')
    setProfiles(data ?? [])
  }
  fetchProfiles()
  
  // Subscribe to changes (rare but possible)
  const subscription = supabase
    .channel('profiles-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchProfiles)
    .subscribe()
    
  return () => subscription.unsubscribe()
}, [])
```

---

## Summary of Decisions

| Topic | Decision | Key Rationale |
|-------|----------|---------------|
| Profiles table | Rename `allowed_emails`, add `name` column | Minimal migration, preserves existing data |
| owner_id FK | Nullable UUID with `ON DELETE SET NULL` | Backward compatible, graceful deletion |
| Data fetching | Supabase nested select joins | Single query, no N+1 |
| Zod schemas | `.nullable()` for owner_id | Matches database NULL semantics |
| UI dropdown | shadcn/ui Select with empty value | Consistent with existing patterns |
| Owner badge | Reusable component with conditional render | DRY, consistent styling |
| Filtering | Client-side with useMemo | Small dataset, no extra queries |
| Profile loading | Add to useFinanceData hook | Single source of truth |

---

## Open Questions (Resolved)

All questions from the spec have been resolved:

1. ✅ Database schema design → Rename + add column
2. ✅ FK strategy → Nullable with SET NULL
3. ✅ Query pattern → Nested select joins
4. ✅ Type definitions → Zod nullable
5. ✅ UI patterns → Existing shadcn/ui components

