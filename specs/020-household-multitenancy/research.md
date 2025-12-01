# Research: Household Multi-Tenancy

**Feature Branch**: `020-household-multitenancy`  
**Date**: 2025-12-01

## Research Questions

### 1. How should RLS policies be structured for household-based isolation?

**Decision**: Use profile-to-household lookup via `auth.uid()` for all RLS policies.

**Rationale**: 
- Current RLS uses `USING (true)` which allows all authenticated users full access
- New RLS must filter by `household_id` matching the current user's household
- User's household is determined by their profile record: `profiles.household_id WHERE profiles.id = auth.uid()`
- All financial tables will have a direct `household_id` FK for efficient filtering

**Pattern**:
```sql
-- Example RLS policy pattern
CREATE POLICY "Users can access household data"
ON accounts FOR ALL
TO authenticated
USING (
  household_id = (
    SELECT household_id FROM profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  household_id = (
    SELECT household_id FROM profiles WHERE id = auth.uid()
  )
);
```

**Alternatives Considered**:
1. **Join through profiles on every query**: Rejected - performance overhead, complex queries
2. **Store household_id in JWT claims**: Rejected - requires Edge Functions, adds complexity
3. **Use security definer functions**: Rejected - overkill for this use case

### 2. How should existing data be migrated to the default household?

**Decision**: Single atomic migration that creates household and updates all references.

**Rationale**:
- All existing data belongs to a single implicit household ("Fonseca Floriano")
- Migration must be atomic to prevent inconsistent state
- No downtime required since adding columns with defaults is non-blocking
- Existing RLS policies must be dropped and recreated after column addition

**Migration Strategy**:
1. Create `households` table
2. Insert default household "Fonseca Floriano"
3. Add `household_id` column to `profiles` with NOT NULL constraint defaulting to the new household
4. Add `household_id` column to all financial tables with FK to households
5. Drop old RLS policies (the `USING (true)` ones)
6. Create new household-based RLS policies
7. Update existing records to reference the default household

**Alternatives Considered**:
1. **Multi-step migration**: Rejected - risk of inconsistent state between steps
2. **Leave old data orphaned**: Rejected - spec requires all data assigned to household

### 3. How should the invite flow assign household_id to new users?

**Decision**: Pass `household_id` via Supabase auth metadata, read in trigger or on first profile access.

**Rationale**:
- Magic link auth allows `data` parameter for custom metadata
- When existing user invites new email, include inviter's `household_id` in magic link
- On profile creation (either via trigger or first app access), use this `household_id`
- If no `household_id` in metadata, reject login (orphan protection)

**Implementation**:
```typescript
// When inviting
const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
  data: { household_id: inviterHouseholdId }
})

// Alternative: Store pending invite in DB
// allowed_emails table extended with household_id
```

**Current Flow Analysis**:
- Current `allowed_emails` table (renamed to `profiles`) pre-approves emails
- New invite flow should add `household_id` to profile at invite time
- When user authenticates, profile already has correct `household_id`

**Alternatives Considered**:
1. **Create profile in frontend after auth**: Rejected - race condition risk, security issue
2. **Use Supabase Edge Function**: Rejected - adds infrastructure complexity
3. **Require household_id selection after login**: Rejected - contradicts spec requirement

### 4. What is the best pattern for fetching/displaying household data?

**Decision**: Create dedicated `useHousehold` hook that fetches household + members on auth.

**Rationale**:
- Household data needed in header (name) and settings (members)
- Data is relatively static - no need for realtime updates initially
- Separate hook keeps concerns isolated from finance data

**Implementation**:
```typescript
interface UseHouseholdReturn {
  household: { id: string; name: string } | null
  members: Profile[]
  isLoading: boolean
  error: string | null
}

function useHousehold(): UseHouseholdReturn {
  // Fetch household from profiles.household_id -> households
  // Fetch all profiles with same household_id
}
```

**Alternatives Considered**:
1. **Include in useFinanceData**: Rejected - unrelated to finance data, bloats hook
2. **Store in auth context**: Rejected - household can change, shouldn't be tied to session
3. **Global state via Zustand**: Viable but hook is simpler for read-only data

### 5. How should user_preferences handle household_id?

**Decision**: Keep `user_preferences` user-scoped (not household-scoped).

**Rationale**:
- Feature spec says "User preferences are household-specific"
- However, current implementation uses `user_id` for personal settings (theme)
- **Clarification from spec assumptions**: "user_preferences are household-specific (each household can have different preferences)"
- This implies shared preferences per household, not per user
- Will add `household_id` to user_preferences for shared preferences (like projection days)
- Theme preference should remain user-specific - this seems like a spec oversight

**Implementation**:
- Add `household_id` to `user_preferences` table
- RLS filters by household for household-level preferences
- Individual preferences (theme) remain user-scoped via separate mechanism or stay as-is

**Alternatives Considered**:
1. **All preferences user-scoped**: Rejected - spec explicitly says household-specific
2. **Separate tables for user vs household prefs**: Viable but over-engineering for now

### 6. How to handle edge case: user tries to access with deleted/orphaned household?

**Decision**: Block access at RLS level, show error message in UI.

**Rationale**:
- If a user's profile.household_id references a non-existent household, RLS will return no data
- Frontend should detect empty household state and show appropriate error
- Admin intervention required to fix (reassign user or delete profile)

**Implementation**:
- RLS policies naturally block access to orphaned users
- `useHousehold` hook returns `household: null` for orphaned users
- UI shows error state: "Sua conta está desassociada. Entre em contato com o administrador."

**Alternatives Considered**:
1. **Cascade delete users when household deleted**: Rejected - too destructive
2. **Auto-create new household for orphaned users**: Rejected - spec says no self-service creation

## Technology Decisions

### Supabase RLS Best Practices for Multi-Tenancy

**Source**: Supabase documentation, existing migration patterns

**Key Points**:
1. Always use `auth.uid()` for current user identification
2. Subqueries in RLS policies are evaluated per-row - use carefully for performance
3. Consider creating a helper function for household lookup if used across many policies
4. Add indexes on `household_id` columns for efficient filtering

**Helper Function Pattern** (optional optimization):
```sql
CREATE OR REPLACE FUNCTION get_user_household_id()
RETURNS UUID AS $$
  SELECT household_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Then in policies:
USING (household_id = get_user_household_id())
```

### UI Patterns for Household Display

**Decision**: 
- Header: Show household name as a subtle badge next to app title
- Members section: Dedicated section in Manage page with list of members

**PT-BR Translations**:
- "household" → "residência"
- "members" → "membros"
- "Membros da Residência" → section title
- "Você" → indicator for current user in members list

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Migration breaks existing data access | Low | High | Test migration in staging first, atomic transaction |
| RLS subquery performance | Medium | Medium | Index on household_id, monitor query times |
| User orphaned after household delete | Low | Medium | Admin-only household deletion, clear error messages |
| Invite flow race condition | Low | High | Store household_id at invite time, not auth time |

## Dependencies

No new npm dependencies required. All functionality uses existing:
- @supabase/supabase-js for database operations
- React hooks for state management
- Existing UI components (shadcn/ui)

## Open Questions (All Resolved)

All technical questions have been resolved through research. Ready for Phase 1 design.

