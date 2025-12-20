# Research: Supabase Migration

**Feature**: 008-supabase-migration  
**Date**: 2025-11-27

## Research Tasks Completed

### 1. Supabase JavaScript Client Best Practices

**Decision**: Use `@supabase/supabase-js` v2.86.0 (latest stable)

**Rationale**:
- Official client library with TypeScript support
- Built-in Realtime subscriptions for reactive data
- Supports anonymous authentication out of the box
- Well-documented with high Context7 benchmark score (81.5)

**Alternatives Considered**:
- Direct PostgREST calls: Rejected - loses Realtime and auth integration
- Supabase SSR package: Not needed - this is a pure client-side SPA

**Key Patterns from Documentation**:

```typescript
// Client initialization
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
)
```

### 2. Anonymous Authentication Pattern

**Decision**: Use `signInAnonymously()` to establish user sessions

**Rationale**:
- Creates a real user record in Supabase auth
- User gets a UUID that can be used in RLS policies
- Session persists in browser storage automatically
- Can be upgraded to permanent account later (future feature)

**Alternatives Considered**:
- No auth (anon key only): Rejected - no user isolation possible, can't use `auth.uid()` in RLS
- Email/password auth: Rejected - user explicitly requested single-user mode without sign-up

**Implementation Pattern**:

```typescript
// On app startup, ensure anonymous session exists
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
  await supabase.auth.signInAnonymously()
}
```

### 3. Realtime Subscriptions for Reactive Updates

**Decision**: Use Postgres Changes with table-specific subscriptions filtered by user_id

**Rationale**:
- Direct replacement for `useLiveQuery` behavior
- Filter by `user_id` for efficiency (only receive own data changes)
- Supports INSERT, UPDATE, DELETE events
- Works with RLS policies

**Alternatives Considered**:
- Schema-wide subscription (`event: '*', schema: 'public'`): Rejected - receives all tables, less efficient
- Polling: Rejected - higher latency, more network traffic

**Implementation Pattern**:

```typescript
const channel = supabase
  .channel('db-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'accounts',
      filter: `user_id=eq.${userId}`
    },
    (payload) => handleChange(payload)
  )
  .subscribe()
```

### 4. Row Level Security Strategy

**Decision**: Enable RLS with policies that filter by `auth.uid()`

**Rationale**:
- All tables include `user_id` column from the start (future-proof)
- RLS policies use `auth.uid()` to match `user_id`
- Anonymous users get a real `auth.uid()` so policies work
- Prevents data leakage even if client is compromised

**Alternatives Considered**:
- No RLS (trust client): Rejected - security risk
- RLS with `anon` role allowing all: Rejected - no user isolation

**SQL Pattern**:

```sql
-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users (includes anonymous)
CREATE POLICY "Users can manage own accounts"
ON accounts
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### 5. Data Type Mapping: TypeScript to PostgreSQL

**Decision**: Map existing Zod types to PostgreSQL types

| TypeScript/Zod Type | PostgreSQL Type | Notes |
|---------------------|-----------------|-------|
| `string` (UUID) | `UUID` | Primary keys |
| `string` | `TEXT` | Names, etc. |
| `number` (balance) | `INTEGER` | Stored in cents |
| `number` (day 1-31) | `SMALLINT` | Day of month |
| `boolean` | `BOOLEAN` | isActive flags |
| `Date` | `TIMESTAMPTZ` | All timestamps |
| `PaymentSchedule` | `JSONB` | Discriminated union |
| `enum` | `TEXT` with CHECK | Type safety via constraint |

**Rationale**:
- INTEGER for money avoids floating point issues (existing convention)
- JSONB for PaymentSchedule preserves discriminated union structure
- TIMESTAMPTZ for timezone-aware timestamps
- CHECK constraints enforce enum values at database level

### 6. Error Handling Strategy

**Decision**: Map Supabase errors to existing Result<T> type

**Rationale**:
- Maintains existing store interface (FR-007)
- Consistent error handling pattern across app
- Graceful degradation for network errors

**Error Mapping**:

| Supabase Error | User Message |
|----------------|--------------|
| Network error | "Unable to connect. Please check your internet connection." |
| 23505 (unique violation) | "A record with this ID already exists." |
| 42501 (RLS violation) | "You don't have permission to perform this action." |
| PGRST116 (no rows returned) | "{Entity} not found" |
| Other | "An unexpected error occurred." |

*Note: Error codes verified against PostgREST v12 / Supabase JS v2.x documentation.*

### 7. Hook Architecture: Replacing useLiveQuery

**Decision**: Create a custom hook that manages Supabase subscriptions and local state

**Rationale**:
- `useLiveQuery` returns `undefined` while loading, then data
- New hook should match this interface exactly
- Use React state + useEffect for subscription lifecycle
- Return same `UseFinanceDataReturn` interface

**Implementation Pattern**:

```typescript
export function useFinanceData(): UseFinanceDataReturn {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    // Initial fetch
    fetchData()
    
    // Subscribe to changes
    const channel = supabase.channel('...')
      .on('postgres_changes', {...}, handleChange)
      .subscribe()
    
    return () => { channel.unsubscribe() }
  }, [])
  
  return { accounts, ..., isLoading }
}
```

### 8. Environment Variables Configuration

**Decision**: Use Vite's `import.meta.env` with `VITE_` prefix

**Rationale**:
- Vite requires `VITE_` prefix for client-exposed env vars
- Supabase URL and anon key are safe to expose (RLS protects data)
- Service role key must NEVER be used in client

**Variables**:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| How to authenticate without user sign-up? | Use `signInAnonymously()` |
| How to filter Realtime by user? | Use `filter` parameter with `user_id=eq.${userId}` |
| How to handle PaymentSchedule union type? | Store as JSONB, Zod validates on read |
| How to maintain Zustand store interface? | Keep same action signatures, change implementation |
| How to handle offline/network errors? | Return Result<T> with error message, show toast |

