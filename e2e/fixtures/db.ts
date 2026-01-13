/**
 * Database fixture for test isolation and seeding
 * Implements IDatabaseFixture contract from specs/019-e2e-testing/contracts/fixtures.ts
 * Uses data prefixing for parallel test isolation (each worker prefixes its data)
 */

import { executeSQL, executeSQLWithResult, getAdminClient } from '../utils/supabase-admin';
import type { IWorkerContext } from './worker-context';
import { addWorkerPrefix, getWorkerPrefixPattern, ALL_WORKERS_PATTERN } from './worker-context';
import type {
  TestAccount,
  TestExpense,
  TestSingleShotExpense,
  TestProject,
  TestSingleShotIncome,
  TestCreditCard,
  TestFutureStatement,
  TestGroup,
  TestProfile,
  TestNotification,
  TestUserPreference,
} from '../utils/test-data';

/**
 * Delete all data from test tables in correct order (respecting foreign keys)
 * When workerIndex is provided, only deletes data with that worker's prefix
 */
export async function resetDatabase(workerIndex?: number): Promise<void> {
  const client = getAdminClient();

  // Delete in order to respect foreign key constraints
  const tables = [
    'notifications',
    'user_preferences',
    'group_preferences',
    'future_statements',
    'credit_cards',
    'expenses',
    'projects',
    'accounts',
    // 'profiles', // Don't delete profiles to preserve auth linkage with existing sessions
  ] as const;

  // Determine the pattern to match for deletion
  const pattern = workerIndex !== undefined ? getWorkerPrefixPattern(workerIndex) : ALL_WORKERS_PATTERN;

  for (const table of tables) {
    try {
      if (table === 'user_preferences') {
        // user_preferences is keyed by auth user_id (no group_id / name / email columns).
        // Best-effort cleanup for legacy prefixed test data:
        // delete preferences for any auth user whose email matches our test worker pattern.
        //
        // NOTE: The pattern for other tables is "[W0]%" etc, which does NOT apply to auth emails.
        // When workerIndex is provided, delete only that worker's test user.
        // Anchored pattern (no leading %) to avoid accidental matches.
        const emailPattern =
          workerIndex !== undefined
            ? `e2e-test-%-worker-${workerIndex}@example.com`
            : `e2e-test-%-worker-%@example.com`;

        await executeSQL(
          `
            DELETE FROM public.user_preferences up
            USING auth.users u
            WHERE lower(u.email) LIKE lower($1)
              AND up.user_id = u.id
          `,
          [emailPattern]
        );
        continue;
      }

      if (table === 'notifications') {
        // notifications is keyed by auth user_id (no group_id / name / email columns).
        // Best-effort cleanup for legacy prefixed test data via auth.users email pattern.
        // Anchored pattern (no leading %) to avoid accidental matches.
        const emailPattern =
          workerIndex !== undefined
            ? `e2e-test-%-worker-${workerIndex}@example.com`
            : `e2e-test-%-worker-%@example.com`;

        await executeSQL(
          `
            DELETE FROM public.notifications n
            USING auth.users u
            WHERE lower(u.email) LIKE lower($1)
              AND n.user_id = u.id
          `,
          [emailPattern]
        );
        continue;
      }

      if (table === 'group_preferences') {
        // group_preferences no longer has a `name` column; preferences are keyed by (group_id, key).
        // Delete any pref rows created by legacy prefixed tests by matching key/value.
        //
        // This is best-effort only; group-scoped cleanup should use resetGroupData(groupId).
        const { error } = await client
          .from(table)
          .delete()
          .or(`key.like.${pattern},value.like.${pattern}`);
        if (error && !error.message.includes('does not exist')) {
          console.warn(`Warning: Failed to reset ${table}: ${error.message}`);
        }
        continue;
      }

      // Other tables use name pattern matching
      const { error } = await client.from(table).delete().like('name', pattern);
      if (error && !error.message.includes('does not exist')) {
        console.warn(`Warning: Failed to reset ${table}: ${error.message}`);
      }
    } catch (err) {
      // Ignore errors during cleanup
      console.warn(`Warning: Exception resetting ${table}:`, err);
    }
  }
}

// Cache for group IDs to avoid repeated queries
let cachedDefaultGroupId: string | null = null;
const cachedUserGroupIds: Map<string, string> = new Map();
// Keyed by groupName (NOT workerIndex) to avoid cross-project collisions.
const cachedWorkerGroupIds: Map<string, string> = new Map();

// Mutex to prevent race conditions during worker group creation/lookup
// Keyed by groupName to avoid cross-project collisions.
const workerGroupMutex = new Map<string, Promise<string>>();

/**
 * Get or create the default test group
 * Returns the group ID for the "Fonseca Floriano" group created by migration
 */
export async function getDefaultGroupId(): Promise<string> {
  if (cachedDefaultGroupId) {
    return cachedDefaultGroupId;
  }

  const client = getAdminClient();
  
  // First try to get the existing default group
  const { data: existingGroup, error: selectError } = await client
    .from('groups')
    .select('id')
    .eq('name', 'Fonseca Floriano')
    .maybeSingle();

  if (selectError) {
    throw new Error(`Failed to query default group: ${selectError.message}`);
  }

  if (existingGroup) {
    cachedDefaultGroupId = existingGroup.id;
    return existingGroup.id;
  }

  // If not found (shouldn't happen after migration), create it
  const { data: newGroup, error: insertError } = await client
    .from('groups')
    .insert({ name: 'Fonseca Floriano' })
    .select('id')
    .single();

  if (insertError) {
    throw new Error(`Failed to create default group: ${insertError.message}`);
  }

  cachedDefaultGroupId = newGroup.id;
  return newGroup.id;
}

/**
 * Get group ID for a specific user by email
 * Falls back to default group if user doesn't have one
 */
export async function getGroupIdForUser(email: string): Promise<string> {
  // Check cache first
  const cached = cachedUserGroupIds.get(email);
  if (cached) {
    return cached;
  }

  const client = getAdminClient();
  
  const { data: profile, error } = await client
    .from('profiles')
    .select('group_id')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.warn(`Warning getting group for ${email}: ${error.message}`);
    return getDefaultGroupId();
  }

  if (profile?.group_id) {
    cachedUserGroupIds.set(email, profile.group_id);
    return profile.group_id;
  }

  // Fall back to default group
  return getDefaultGroupId();
}

/**
 * Clear group ID caches (call after database reset)
 */
export function clearGroupCache(): void {
  cachedDefaultGroupId = null;
  cachedUserGroupIds.clear();
  cachedWorkerGroupIds.clear();
}

/**
 * Get or create a worker-specific group for test isolation.
 * Each worker gets its own group, ensuring complete data isolation via RLS.
 *
 * @param workerIndex - The worker index (0-based)
 * @param groupName - The group name (e.g., "Test Worker 0")
 * @returns The group ID
 */
export async function getOrCreateWorkerGroup(workerIndex: number, groupName: string): Promise<string> {
  // Check cache first
  const cached = cachedWorkerGroupIds.get(groupName);
  if (cached) {
    return cached;
  }

  // Check if there is a pending operation for this worker
  const pending = workerGroupMutex.get(groupName);
  if (pending) {
    return pending;
  }

  // Start new operation and store in mutex
  const promise = (async () => {
    try {
      const client = getAdminClient();

      // Try to find existing groups.
      //
      // IMPORTANT:
      // - Group names are not globally unique in the product (users can name groups anything).
      // - Our test harness uses deterministic worker group names (e.g. "Test chromium Worker 0")
      //   and expects them to behave as unique identifiers.
      //
      // If duplicates exist (usually from a prior flaky/aborted run), `.maybeSingle()` throws.
      // We self-heal by picking the newest group and renaming the rest, but ONLY for test groups.
      const { data: existingGroups, error: selectError } = await client
        .from('groups')
        .select('id, created_at')
        .eq('name', groupName)
        .order('created_at', { ascending: false });

      if (selectError) {
        throw new Error(`Failed to query worker group: ${selectError.message}`);
      }

      if (existingGroups && existingGroups.length > 0) {
        const primary = existingGroups[0];

        if (existingGroups.length > 1 && groupName.startsWith('Test ')) {
          console.warn(
            `[DB] Found ${existingGroups.length} groups named "${groupName}". Deduping to keep setup deterministic.`
          );
          const ts = Date.now();
          for (let i = 1; i < existingGroups.length; i++) {
            const dupId = existingGroups[i].id;
            const newName = `${groupName} (archived ${ts} #${i})`;
            await executeSQL(`UPDATE public.groups SET name = $1 WHERE id = $2`, [newName, dupId]);
          }
        }

        cachedWorkerGroupIds.set(groupName, primary.id);
        return primary.id;
      }

      // Create new group for this worker
      const { data: newGroup, error: insertError } = await client
        .from('groups')
        .insert({ name: groupName })
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Failed to create worker group: ${insertError.message}`);
      }

      cachedWorkerGroupIds.set(groupName, newGroup.id);
      return newGroup.id;
    } finally {
      // Clean up mutex entry
      workerGroupMutex.delete(groupName);
    }
  })();

  workerGroupMutex.set(groupName, promise);
  return promise;
}

/**
 * Delete all data for a specific worker's group.
 * This is more reliable than name-pattern matching for cleanup.
 *
 * @param groupId - The group ID to clean up
 */
export async function resetGroupData(groupId: string): Promise<void> {
  const client = getAdminClient();
  console.log(`[DB] Resetting data for group ${groupId}...`);

  // Delete in order to respect foreign key constraints
  // Note: We don't delete profiles to preserve auth linkage
  const tables = [
    'projection_snapshots',
    'notifications',
    'user_preferences',
    'group_preferences',
    'future_statements',
    'credit_cards',
    'expenses',
    'projects',
    'accounts',
  ] as const;

  for (const table of tables) {
    try {
      if (table === 'user_preferences') {
        // user_preferences is per-user (keyed by auth user_id) and does NOT have group_id.
        // Clear all user preferences for users belonging to this group by mapping:
        // profiles (group_id) -> auth.users (email) -> user_preferences (user_id).
        await executeSQL(
          `
            DELETE FROM public.user_preferences up
            USING public.profiles p, auth.users u
            WHERE p.group_id = $1
              AND p.email IS NOT NULL
              AND lower(u.email) = lower(p.email::text)
              AND up.user_id = u.id
          `,
          [groupId]
        );
        continue;
      }

      if (table === 'notifications') {
        // notifications is per-user and does NOT have group_id (see migrations/20260109120100_notifications.sql).
        // Clear notifications for users belonging to this group by mapping:
        // profiles (group_id) -> auth.users (email) -> notifications (user_id).
        // Use lower() for case-insensitive email comparison to avoid missed deletes.
        await executeSQL(
          `
            DELETE FROM public.notifications n
            USING public.profiles p, auth.users u
            WHERE p.group_id = $1
              AND p.email IS NOT NULL
              AND lower(u.email) = lower(p.email::text)
              AND n.user_id = u.id
          `,
          [groupId]
        );
        continue;
      }

      const start = Date.now();
      const { error } = await client.from(table).delete().eq('group_id', groupId);
      const duration = Date.now() - start;
      if (duration > 1000) {
        console.warn(`[DB] Slow delete on ${table} for group ${groupId}: ${duration}ms`);
      }
      
      if (error && !error.message.includes('does not exist')) {
        console.warn(`Warning: Failed to reset ${table} for group ${groupId}: ${error.message}`);
      }
    } catch (err) {
      console.warn(`Warning: Exception resetting ${table}:`, err);
    }
  }
  console.log(`[DB] Reset complete for group ${groupId}`);
}

/**
 * Ensure test user email exists in profiles table with group assignment.
 * For parallel execution, assigns user to their worker-specific group.
 *
 * @param email - The test user email
 * @param workerIndex - Optional worker index for group assignment
 * @param groupId - Optional explicit group ID (overrides worker lookup)
 */
export async function ensureTestUser(
  email: string,
  workerIndex?: number,
  groupId?: string
): Promise<void> {
  const client = getAdminClient();
  const name = email.split('@')[0]; // Use email prefix as name

  // Determine group ID:
  // 1. Use explicit groupId if provided
  // 2. Fall back to default group
  //
  // NOTE: We intentionally do NOT try to infer a worker group from workerIndex here.
  // workerIndex is per Playwright project, so "worker 0" exists in multiple projects
  // (chromium, chromium-mobile, visual, etc.). Inferring by index alone would create
  // cross-project data races.
  let targetGroupId = groupId;
  if (!targetGroupId) {
    targetGroupId = await getDefaultGroupId();
  }

  const { error } = await client.from('profiles').upsert(
    { email, name, group_id: targetGroupId },
    { onConflict: 'email' }
  );

  if (error) {
    throw new Error(`Failed to ensure test user: ${error.message}`);
  }

  // Update the user group cache
  cachedUserGroupIds.set(email, targetGroupId);
}

/**
 * Remove test user from profiles table
 */
export async function removeTestUser(email: string, workerIndex?: number): Promise<void> {
  const client = getAdminClient();
  const { error } = await client.from('profiles').delete().eq('email', email);
  if (error) {
    throw new Error(`Failed to remove test user: ${error.message}`);
  }
}

/**
 * Seed accounts with test data using explicit group ID
 * This is the preferred method for worker-scoped fixtures to ensure correct isolation
 */
export async function seedAccountsWithGroup(
  accounts: TestAccount[],
  workerIndex: number,
  groupId: string
): Promise<TestAccount[]> {
  const client = getAdminClient();
  
  const records = accounts.map((a) => ({
    name: addWorkerPrefix(a.name, workerIndex),
    type: a.type,
    balance: a.balance,
    owner_id: a.owner_id ?? null,
    group_id: groupId,
  }));

  const { data, error } = await client.from('accounts').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed accounts: ${error.message}`);
  }

  return data as TestAccount[];
}

/**
 * Set `balance_updated_at` for all checking accounts in a specific group.
 * Useful for tests that need a deterministic "last balance update" base.
 */
export async function setCheckingAccountsBalanceUpdatedAtForGroup(
  groupId: string,
  balanceUpdatedAt: string | null
): Promise<void> {
  const client = getAdminClient();

  const { error } = await client
    .from('accounts')
    .update({ balance_updated_at: balanceUpdatedAt })
    .eq('group_id', groupId)
    .eq('type', 'checking');

  if (error) {
    throw new Error(`Failed to update accounts.balance_updated_at: ${error.message}`);
  }
}

/**
 * Set `balance_updated_at` for ALL accounts in a specific group.
 * Useful for tests that want to avoid stale-data banners.
 */
export async function setAccountsBalanceUpdatedAtForGroup(
  groupId: string,
  balanceUpdatedAt: string | null
): Promise<void> {
  const client = getAdminClient();

  const { error } = await client
    .from('accounts')
    .update({ balance_updated_at: balanceUpdatedAt })
    .eq('group_id', groupId);

  if (error) {
    throw new Error(`Failed to update accounts.balance_updated_at: ${error.message}`);
  }
}

/**
 * Set `balance_updated_at` for ALL credit cards in a specific group.
 * Useful for tests that want to avoid stale-data banners.
 */
export async function setCreditCardsBalanceUpdatedAtForGroup(
  groupId: string,
  balanceUpdatedAt: string | null
): Promise<void> {
  const client = getAdminClient();

  const { error } = await client
    .from('credit_cards')
    .update({ balance_updated_at: balanceUpdatedAt })
    .eq('group_id', groupId);

  if (error) {
    throw new Error(`Failed to update credit_cards.balance_updated_at: ${error.message}`);
  }
}

/**
 * Seed accounts with test data (legacy - uses email lookup)
 * When workerIndex is provided, prefixes names with worker identifier
 * When userEmail is provided, uses that user's group
 * @deprecated Use seedAccountsWithGroup for better isolation
 */
export async function seedAccounts(
  accounts: TestAccount[],
  workerIndex?: number,
  userEmail?: string
): Promise<TestAccount[]> {
  const client = getAdminClient();
  
  // Get group ID for seeding - use user's group if email provided
  const groupId = userEmail
    ? await getGroupIdForUser(userEmail)
    : await getDefaultGroupId();
  
  const records = accounts.map((a) => ({
    name: workerIndex !== undefined ? addWorkerPrefix(a.name, workerIndex) : a.name,
    type: a.type,
    balance: a.balance,
    owner_id: a.owner_id ?? null,
    group_id: groupId,
  }));

  const { data, error } = await client.from('accounts').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed accounts: ${error.message}`);
  }

  return data as TestAccount[];
}

/**
 * Seed fixed expenses with test data using explicit group ID
 */
export async function seedExpensesWithGroup(
  expenses: TestExpense[],
  workerIndex: number,
  groupId: string
): Promise<TestExpense[]> {
  const client = getAdminClient();
  
  const records = expenses.map((e) => ({
    name: addWorkerPrefix(e.name, workerIndex),
    amount: e.amount,
    due_day: e.due_day,
    is_active: e.is_active,
    type: 'fixed',
    group_id: groupId,
  }));

  const { data, error } = await client.from('expenses').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed expenses: ${error.message}`);
  }

  return data as TestExpense[];
}

/**
 * Seed fixed expenses with test data (legacy - uses email lookup)
 * Note: Fixed expenses are stored in the 'expenses' table with type='fixed'
 * @deprecated Use seedExpensesWithGroup for better isolation
 */
export async function seedExpenses(
  expenses: TestExpense[],
  workerIndex?: number,
  userEmail?: string
): Promise<TestExpense[]> {
  const client = getAdminClient();
  
  // Get group ID for seeding - use user's group if email provided
  const groupId = userEmail
    ? await getGroupIdForUser(userEmail)
    : await getDefaultGroupId();
  
  const records = expenses.map((e) => ({
    name: workerIndex !== undefined ? addWorkerPrefix(e.name, workerIndex) : e.name,
    amount: e.amount,
    due_day: e.due_day,
    is_active: e.is_active,
    type: 'fixed',
    group_id: groupId,
  }));

  const { data, error } = await client.from('expenses').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed expenses: ${error.message}`);
  }

  return data as TestExpense[];
}

/**
 * Seed single-shot expenses with test data using explicit group ID
 */
export async function seedSingleShotExpensesWithGroup(
  expenses: TestSingleShotExpense[],
  workerIndex: number,
  groupId: string
): Promise<TestSingleShotExpense[]> {
  const client = getAdminClient();
  
  const records = expenses.map((e) => ({
    name: addWorkerPrefix(e.name, workerIndex),
    amount: e.amount,
    date: e.date,
    type: 'single_shot',
    due_day: null,
    group_id: groupId,
  }));

  const { data, error } = await client.from('expenses').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed single-shot expenses: ${error.message}`);
  }

  return data as TestSingleShotExpense[];
}

/**
 * Seed single-shot expenses with test data (legacy - uses email lookup)
 * Note: Single-shot expenses are stored in the 'expenses' table with type='single_shot'
 * @deprecated Use seedSingleShotExpensesWithGroup for better isolation
 */
export async function seedSingleShotExpenses(
  expenses: TestSingleShotExpense[],
  workerIndex?: number,
  userEmail?: string
): Promise<TestSingleShotExpense[]> {
  const client = getAdminClient();
  
  // Get group ID for seeding - use user's group if email provided
  const groupId = userEmail
    ? await getGroupIdForUser(userEmail)
    : await getDefaultGroupId();
  
  const records = expenses.map((e) => ({
    name: workerIndex !== undefined ? addWorkerPrefix(e.name, workerIndex) : e.name,
    amount: e.amount,
    date: e.date,
    type: 'single_shot',
    due_day: null,
    group_id: groupId,
  }));

  const { data, error } = await client.from('expenses').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed single-shot expenses: ${error.message}`);
  }

  return data as TestSingleShotExpense[];
}

/**
 * Seed projects/income with test data using explicit group ID
 */
export async function seedProjectsWithGroup(
  projects: TestProject[],
  workerIndex: number,
  groupId: string
): Promise<TestProject[]> {
  const client = getAdminClient();
  
  const records = projects.map((p) => ({
    type: 'recurring',
    name: addWorkerPrefix(p.name, workerIndex),
    amount: p.amount,
    frequency: p.frequency,
    payment_schedule: p.payment_schedule,
    certainty: p.certainty,
    is_active: p.is_active,
    group_id: groupId,
  }));

  const { data, error } = await client.from('projects').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed projects: ${error.message}`);
  }

  return data as TestProject[];
}

/**
 * Seed projects/income with test data (legacy - uses email lookup)
 * Note: user_id column was removed in migration 002_invite_auth.sql
 * Projects are now shared among all authenticated family members
 * @deprecated Use seedProjectsWithGroup for better isolation
 */
export async function seedProjects(
  projects: TestProject[],
  workerIndex?: number,
  userEmail?: string
): Promise<TestProject[]> {
  const client = getAdminClient();
  
  // Get group ID for seeding - use user's group if email provided
  const groupId = userEmail
    ? await getGroupIdForUser(userEmail)
    : await getDefaultGroupId();
  
  const records = projects.map((p) => ({
    type: 'recurring',
    name: workerIndex !== undefined ? addWorkerPrefix(p.name, workerIndex) : p.name,
    amount: p.amount,
    frequency: p.frequency,
    payment_schedule: p.payment_schedule,
    certainty: p.certainty,
    is_active: p.is_active,
    group_id: groupId,
  }));

  const { data, error } = await client.from('projects').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed projects: ${error.message}`);
  }

  return data as TestProject[];
}

/**
 * Seed single-shot income with test data using explicit group ID
 */
export async function seedSingleShotIncomeWithGroup(
  income: TestSingleShotIncome[],
  workerIndex: number,
  groupId: string
): Promise<TestSingleShotIncome[]> {
  const client = getAdminClient();
  
  const records = income.map((i) => ({
    type: 'single_shot',
    name: addWorkerPrefix(i.name, workerIndex),
    amount: i.amount,
    date: i.date,
    certainty: i.certainty,
    frequency: null,
    payment_schedule: null,
    is_active: null,
    group_id: groupId,
  }));

  const { data, error } = await client.from('projects').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed single-shot income: ${error.message}`);
  }

  return data as TestSingleShotIncome[];
}

/**
 * Seed single-shot income with test data (legacy - uses email lookup)
 * Single-shot income is stored in the projects table with type='single_shot'
 * Note: user_id column was removed in migration 002_invite_auth.sql
 * @deprecated Use seedSingleShotIncomeWithGroup for better isolation
 */
export async function seedSingleShotIncome(
  income: TestSingleShotIncome[],
  workerIndex?: number,
  userEmail?: string
): Promise<TestSingleShotIncome[]> {
  const client = getAdminClient();
  
  // Get group ID for seeding - use user's group if email provided
  const groupId = userEmail
    ? await getGroupIdForUser(userEmail)
    : await getDefaultGroupId();
  
  const records = income.map((i) => ({
    type: 'single_shot',
    name: workerIndex !== undefined ? addWorkerPrefix(i.name, workerIndex) : i.name,
    amount: i.amount,
    date: i.date,
    certainty: i.certainty,
    frequency: null,
    payment_schedule: null,
    is_active: null,
    group_id: groupId,
  }));

  const { data, error } = await client.from('projects').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed single-shot income: ${error.message}`);
  }

  return data as TestSingleShotIncome[];
}

/**
 * Seed credit cards with test data using explicit group ID
 */
export async function seedCreditCardsWithGroup(
  cards: TestCreditCard[],
  workerIndex: number,
  groupId: string
): Promise<TestCreditCard[]> {
  const client = getAdminClient();
  
  const records = cards.map((c) => ({
    name: addWorkerPrefix(c.name, workerIndex),
    statement_balance: c.statement_balance,
    due_day: c.due_day,
    owner_id: c.owner_id ?? null,
    group_id: groupId,
  }));

  const { data, error } = await client.from('credit_cards').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed credit cards: ${error.message}`);
  }

  return data as TestCreditCard[];
}

/**
 * Seed credit cards with test data (legacy - uses email lookup)
 * @deprecated Use seedCreditCardsWithGroup for better isolation
 */
export async function seedCreditCards(
  cards: TestCreditCard[],
  workerIndex?: number,
  userEmail?: string
): Promise<TestCreditCard[]> {
  const client = getAdminClient();
  
  // Get group ID for seeding - use user's group if email provided
  const groupId = userEmail
    ? await getGroupIdForUser(userEmail)
    : await getDefaultGroupId();
  
  const records = cards.map((c) => ({
    name: workerIndex !== undefined ? addWorkerPrefix(c.name, workerIndex) : c.name,
    statement_balance: c.statement_balance,
    due_day: c.due_day,
    owner_id: c.owner_id ?? null,
    group_id: groupId,
  }));

  const { data, error } = await client.from('credit_cards').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed credit cards: ${error.message}`);
  }

  return data as TestCreditCard[];
}

/**
 * Seed future statements with test data using explicit group ID
 */
export async function seedFutureStatementsWithGroup(
  statements: TestFutureStatement[],
  groupId: string
): Promise<TestFutureStatement[]> {
  const client = getAdminClient();
  
  const records = statements.map((s) => ({
    credit_card_id: s.credit_card_id,
    target_month: s.target_month,
    target_year: s.target_year,
    amount: s.amount,
    group_id: groupId,
  }));

  const { data, error } = await client.from('future_statements').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed future statements: ${error.message}`);
  }

  return data as TestFutureStatement[];
}

/**
 * Seed future statements with test data (legacy - uses email lookup)
 * @deprecated Use seedFutureStatementsWithGroup for better isolation
 */
export async function seedFutureStatements(
  statements: TestFutureStatement[],
  userEmail?: string
): Promise<TestFutureStatement[]> {
  const client = getAdminClient();
  
  // Get group ID for seeding - use user's group if email provided
  const groupId = userEmail
    ? await getGroupIdForUser(userEmail)
    : await getDefaultGroupId();
  
  const records = statements.map((s) => ({
    credit_card_id: s.credit_card_id,
    target_month: s.target_month,
    target_year: s.target_year,
    amount: s.amount,
    group_id: groupId,
  }));

  const { data, error } = await client.from('future_statements').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed future statements: ${error.message}`);
  }

  return data as TestFutureStatement[];
}

/**
 * Seed groups with test data
 * Used for multi-tenancy isolation tests
 */
export async function seedGroups(groups: TestGroup[], workerIndex?: number): Promise<TestGroup[]> {
  const client = getAdminClient();
  const records = groups.map((g) => ({
    name: workerIndex !== undefined ? addWorkerPrefix(g.name, workerIndex) : g.name,
  }));

  const { data, error } = await client.from('groups').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed groups: ${error.message}`);
  }

  return data as TestGroup[];
}

/**
 * Get the group ID for a test user by email
 */
export async function getGroupIdByEmail(email: string): Promise<string | null> {
  const client = getAdminClient();
  const { data, error } = await client
    .from('profiles')
    .select('group_id')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.warn(`Warning getting group ID: ${error.message}`);
    return null;
  }

  return data?.group_id ?? null;
}

/**
 * Get group info by ID
 */
export async function getGroupById(id: string): Promise<TestGroup | null> {
  const client = getAdminClient();
  const { data, error } = await client
    .from('groups')
    .select('id, name, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.warn(`Warning getting group: ${error.message}`);
    return null;
  }

  return data as TestGroup | null;
}

/**
 * Get all members of a group
 */
export async function getGroupMembers(groupId: string): Promise<TestProfile[]> {
  const client = getAdminClient();
  const { data, error } = await client
    .from('profiles')
    .select('id, name, email, group_id')
    .eq('group_id', groupId)
    .order('name');

  if (error) {
    throw new Error(`Failed to get group members: ${error.message}`);
  }

  return data as TestProfile[];
}

/**
 * Create a profile with a specific group assignment
 * Used for invite flow testing
 */
export async function createProfileInGroup(
  email: string,
  name: string,
  groupId: string
): Promise<TestProfile> {
  const client = getAdminClient();
  const { data, error } = await client
    .from('profiles')
    .insert({ email, name, group_id: groupId })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create profile: ${error.message}`);
  }

  return data as TestProfile;
}

/**
 * Check if a profile exists by email
 */
export async function profileExists(email: string): Promise<boolean> {
  const client = getAdminClient();
  const { data, error } = await client
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.warn(`Warning checking profile existence: ${error.message}`);
    return false;
  }

  return data !== null;
}

/**
 * Delete a profile by email
 */
export async function deleteProfileByEmail(email: string): Promise<void> {
  const client = getAdminClient();
  const { error } = await client.from('profiles').delete().eq('email', email);

  if (error) {
    throw new Error(`Failed to delete profile: ${error.message}`);
  }
}

/**
 * Seed complete test scenario with all entity types using explicit group ID
 */
export async function seedFullScenarioWithGroup(
  data: {
    accounts?: TestAccount[];
    expenses?: TestExpense[];
    singleShotExpenses?: TestSingleShotExpense[];
    projects?: TestProject[];
    singleShotIncome?: TestSingleShotIncome[];
    creditCards?: TestCreditCard[];
  },
  workerIndex: number,
  groupId: string
): Promise<void> {
  if (data.accounts?.length) {
    await seedAccountsWithGroup(data.accounts, workerIndex, groupId);
  }
  if (data.expenses?.length) {
    await seedExpensesWithGroup(data.expenses, workerIndex, groupId);
  }
  if (data.singleShotExpenses?.length) {
    await seedSingleShotExpensesWithGroup(data.singleShotExpenses, workerIndex, groupId);
  }
  if (data.projects?.length) {
    await seedProjectsWithGroup(data.projects, workerIndex, groupId);
  }
  if (data.singleShotIncome?.length) {
    await seedSingleShotIncomeWithGroup(data.singleShotIncome, workerIndex, groupId);
  }
  if (data.creditCards?.length) {
    await seedCreditCardsWithGroup(data.creditCards, workerIndex, groupId);
  }
}

/**
 * Seed complete test scenario with all entity types (legacy - uses email lookup)
 * @deprecated Use seedFullScenarioWithGroup for better isolation
 */
export async function seedFullScenario(
  data: {
    accounts?: TestAccount[];
    expenses?: TestExpense[];
    singleShotExpenses?: TestSingleShotExpense[];
    projects?: TestProject[];
    singleShotIncome?: TestSingleShotIncome[];
    creditCards?: TestCreditCard[];
  },
  workerIndex?: number,
  userEmail?: string
): Promise<void> {
  if (data.accounts?.length) {
    await seedAccounts(data.accounts, workerIndex, userEmail);
  }
  if (data.expenses?.length) {
    await seedExpenses(data.expenses, workerIndex, userEmail);
  }
  if (data.singleShotExpenses?.length) {
    await seedSingleShotExpenses(data.singleShotExpenses, workerIndex, userEmail);
  }
  if (data.projects?.length) {
    await seedProjects(data.projects, workerIndex, userEmail);
  }
  if (data.singleShotIncome?.length) {
    await seedSingleShotIncome(data.singleShotIncome, workerIndex, userEmail);
  }
  if (data.creditCards?.length) {
    await seedCreditCards(data.creditCards, workerIndex, userEmail);
  }
}

/**
 * Check if an expense exists in the database by name
 */
export async function expenseExists(name: string): Promise<boolean> {
  const client = getAdminClient();
  const { data, error } = await client.from('expenses').select('id').eq('name', name).maybeSingle();
  if (error) {
    console.warn(`Warning checking expense existence: ${error.message}`);
    return false;
  }
  return data !== null;
}

/**
 * Check if a project exists in the database by name
 */
export async function projectExists(name: string): Promise<boolean> {
  const client = getAdminClient();
  const { data, error } = await client.from('projects').select('id').eq('name', name).maybeSingle();
  if (error) {
    console.warn(`Warning checking project existence: ${error.message}`);
    return false;
  }
  return data !== null;
}

/**
 * Get project by ID (uses admin client to bypass RLS)
 */
export async function getProjectById(id: string): Promise<{ id: string; name: string; certainty: string; type: string } | null> {
  const client = getAdminClient();
  const { data, error } = await client.from('projects').select('id, name, certainty, type').eq('id', id).maybeSingle();
  if (error) {
    console.warn(`Warning getting project by ID: ${error.message}`);
    return null;
  }
  return data;
}

/**
 * Update project certainty using admin client (bypasses RLS)
 * Use for testing when browser RLS may not be properly configured
 */
export async function updateProjectCertainty(id: string, certainty: 'guaranteed' | 'probable' | 'uncertain'): Promise<boolean> {
  const client = getAdminClient();
  const { error } = await client.from('projects').update({ certainty }).eq('id', id);
  if (error) {
    console.warn(`Warning updating project certainty: ${error.message}`);
    return false;
  }
  return true;
}

/**
 * Check if an account exists in the database by name
 */
export async function accountExists(name: string): Promise<boolean> {
  const client = getAdminClient();
  const { data, error } = await client.from('accounts').select('id').eq('name', name).maybeSingle();
  if (error) {
    console.warn(`Warning checking account existence: ${error.message}`);
    return false;
  }
  return data !== null;
}

/**
 * Seed projection snapshots with test data using explicit group ID
 */
export async function seedSnapshotsWithGroup(
  snapshots: { name: string; data: object }[],
  groupId: string
): Promise<{ id: string; name: string }[]> {
  const client = getAdminClient();
  
  // IMPORTANT (visual determinism):
  // Many visual regression screenshots render snapshot `created_at` (e.g. "Salvo em ...").
  // If we let Postgres default `now()` populate this field, screenshots will vary by run time
  // (and even by worker execution order), causing flaky visual diffs.
  //
  // We set a deterministic timestamp and increment per inserted row to keep ordering stable.
  const baseCreatedAtMs = new Date('2025-01-15T12:00:00.000Z').getTime();

  const records = snapshots.map((s, index) => ({
    name: s.name,
    schema_version: 1,
    data: s.data,
    group_id: groupId,
    created_at: new Date(baseCreatedAtMs + index * 60_000).toISOString(),
  }));

  const { data, error } = await client.from('projection_snapshots').insert(records).select('id, name');

  if (error) {
    throw new Error(`Failed to seed snapshots: ${error.message}`);
  }

  return data as { id: string; name: string }[];
}

/**
 * Get all snapshots for a group
 */
export async function getSnapshotsForGroup(groupId: string): Promise<{ id: string; name: string; created_at: string }[]> {
  const client = getAdminClient();
  
  const { data, error } = await client
    .from('projection_snapshots')
    .select('id, name, created_at')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get snapshots: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Check if a snapshot exists by ID
 */
export async function snapshotExists(id: string): Promise<boolean> {
  const client = getAdminClient();
  const { data, error } = await client.from('projection_snapshots').select('id').eq('id', id).maybeSingle();
  if (error) {
    console.warn(`Warning checking snapshot existence: ${error.message}`);
    return false;
  }
  return data !== null;
}

/**
 * Delete all snapshots for a group
 */
export async function deleteSnapshotsForGroup(groupId: string): Promise<void> {
  const client = getAdminClient();
  const { error } = await client.from('projection_snapshots').delete().eq('group_id', groupId);
  if (error) {
    throw new Error(`Failed to delete snapshots: ${error.message}`);
  }
}

// ============================================================================
// NOTIFICATION HELPERS
// ============================================================================

/**
 * Seed notifications with test data
 * Note: Notifications are per-user (user_id), not per-group
 */
export async function seedNotifications(
  notifications: TestNotification[]
): Promise<TestNotification[]> {
  const client = getAdminClient();
  
  const records = notifications.map((n) => ({
    user_id: n.user_id,
    type: n.type,
    title: n.title,
    body: n.body,
    primary_action_label: n.primary_action_label ?? null,
    primary_action_href: n.primary_action_href ?? null,
    dedupe_key: n.dedupe_key ?? null,
    read_at: n.read_at ?? null,
    email_sent_at: n.email_sent_at ?? null,
  }));

  const { data, error } = await client.from('notifications').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed notifications: ${error.message}`);
  }

  return data as TestNotification[];
}

/**
 * Get notifications for a user
 */
export async function getNotificationsForUser(userId: string): Promise<TestNotification[]> {
  const client = getAdminClient();
  
  const { data, error } = await client
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get notifications: ${error.message}`);
  }

  return data as TestNotification[];
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const client = getAdminClient();
  
  const { count, error } = await client
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    throw new Error(`Failed to get unread count: ${error.message}`);
  }

  return count ?? 0;
}

/**
 * Mark a notification as read (admin bypass)
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const client = getAdminClient();
  
  const { data, error } = await client
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .select('id');

  if (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(`Notification not found: ${notificationId}`);
  }
}

/**
 * Delete all notifications for a user
 */
export async function deleteNotificationsForUser(userId: string): Promise<void> {
  const client = getAdminClient();
  const { error } = await client.from('notifications').delete().eq('user_id', userId);
  if (error) {
    throw new Error(`Failed to delete notifications: ${error.message}`);
  }
}

/**
 * Check if a notification exists by dedupe_key for a user
 */
export async function notificationExistsByDedupeKey(
  userId: string,
  dedupeKey: string
): Promise<boolean> {
  const client = getAdminClient();
  const { data, error } = await client
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('dedupe_key', dedupeKey)
    .maybeSingle();

  if (error) {
    console.warn(`Warning checking notification existence: ${error.message}`);
    return false;
  }

  return data !== null;
}

// ============================================================================
// USER PREFERENCE HELPERS
// ============================================================================

/**
 * Seed user preferences with test data (idempotent via upsert)
 */
export async function seedUserPreferences(
  preferences: TestUserPreference[]
): Promise<TestUserPreference[]> {
  const client = getAdminClient();
  
  const records = preferences.map((p) => ({
    user_id: p.user_id,
    key: p.key,
    value: p.value,
  }));

  const { data, error } = await client
    .from('user_preferences')
    .upsert(records, { onConflict: 'user_id,key' })
    .select();

  if (error) {
    throw new Error(`Failed to seed user preferences: ${error.message}`);
  }

  return data as TestUserPreference[];
}

/**
 * Get a user preference by key
 */
export async function getUserPreference(
  userId: string,
  key: string
): Promise<string | null> {
  const client = getAdminClient();
  
  const { data, error } = await client
    .from('user_preferences')
    .select('value')
    .eq('user_id', userId)
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.warn(`Warning getting user preference: ${error.message}`);
    return null;
  }

  return data?.value ?? null;
}

/**
 * Set a user preference (upsert)
 */
export async function setUserPreference(
  userId: string,
  key: string,
  value: string
): Promise<void> {
  const client = getAdminClient();
  
  const { error } = await client.from('user_preferences').upsert(
    { user_id: userId, key, value },
    { onConflict: 'user_id,key' }
  );

  if (error) {
    throw new Error(`Failed to set user preference: ${error.message}`);
  }
}

/**
 * Delete all user preferences for a user
 */
export async function deleteUserPreferencesForUser(userId: string): Promise<void> {
  const client = getAdminClient();
  const { error } = await client.from('user_preferences').delete().eq('user_id', userId);
  if (error) {
    throw new Error(`Failed to delete user preferences: ${error.message}`);
  }
}

/**
 * Get user ID by email from auth.users (case-insensitive)
 */
export async function getUserIdByEmail(email: string): Promise<string | null> {
  try {
    const result = await executeSQLWithResult<{ id: string }>(
      `SELECT id FROM auth.users WHERE lower(email) = lower($1) LIMIT 1`,
      [email]
    );
    
    if (result && result.length > 0 && result[0].id) {
      return result[0].id;
    }
    return null;
  } catch (err) {
    console.warn(`Warning getting user ID by email: ${err}`);
    return null;
  }
}

/**
 * Clear onboarding state for a group.
 * This will cause the onboarding wizard to appear on next page load.
 */
export async function clearOnboardingStateForGroup(groupId: string): Promise<void> {
  const client = getAdminClient();
  const { error } = await client.from('onboarding_states').delete().eq('group_id', groupId);
  if (error && !error.message.includes('does not exist')) {
    throw new Error(`Failed to clear onboarding state: ${error.message}`);
  }
}

/**
 * Clear tour state for a group.
 * This will cause tours to appear as "not seen" on next page load.
 */
export async function clearTourStateForGroup(groupId: string): Promise<void> {
  // NOTE:
  // - `tour_states` is keyed by (user_id, tour_key) and does NOT have `group_id`.
  // - `profiles.id` is NOT the auth user id (it originated from `allowed_emails`), so we can't
  //   map `group_id -> profiles.id -> tour_states.user_id`.
  //
  // We instead clear tour states by mapping the group's profile emails -> auth.users ids.
  try {
    await executeSQL(`
      DELETE FROM public.tour_states ts
      USING public.profiles p, auth.users u
      WHERE p.group_id = $1
        AND p.email IS NOT NULL
        AND u.email = p.email::text
        AND ts.user_id = u.id
    `, [groupId]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('does not exist')) {
      throw new Error(`Failed to clear tour state: ${message}`);
    }
  }
}

/**
 * Create a worker-scoped database fixture
 * This returns a fixture object that prefixes all data with the worker identifier
 * and uses the worker's group for data isolation via RLS
 */
export function createWorkerDbFixture(workerContext: IWorkerContext) {
  const { workerIndex, email, dataPrefix, groupName } = workerContext;

  // Current group for this worker user.
  // We intentionally rotate groups during the suite to avoid expensive per-test DELETEs,
  // which cause DB/PostgREST contention under full parallelism.
  let currentGroupId: string | null = null;
  let freshGroupCounter = 0;
  let cachedAuthUserId: string | null = null;

  // Helper to get this worker's group ID (cached after first call)
  const getWorkerGroupId = async () => {
    if (currentGroupId) return currentGroupId;
    // Fallback to the long-lived worker group (created in setup).
    // Most tests will call resetDatabase() first, which rotates to a fresh group.
    currentGroupId = await getOrCreateWorkerGroup(workerIndex, groupName);
    return currentGroupId;
  };

  const getAuthUserId = async (): Promise<string> => {
    if (cachedAuthUserId) return cachedAuthUserId;
    const id = await getUserIdByEmail(email);
    if (!id) {
      throw new Error(`Failed to resolve auth user id for ${email} (auth.users row missing)`);
    }
    cachedAuthUserId = id;
    return id;
  };

  const createFreshGroupForTest = async (): Promise<string> => {
    freshGroupCounter += 1;
    // IMPORTANT:
    // - Group names must be unique because setup uses eq(name).maybeSingle().
    // - Visual snapshots assume the *current* group name is stable (it affects layout).
    //
    // Strategy:
    // - Rename the current group to an archived unique name.
    // - Create a new empty group reusing the stable worker group name.
    //
    // This keeps UI layout stable while still guaranteeing uniqueness in the DB.
    const previousGroupId = await getWorkerGroupId();
    const archivedGroupName = `${groupName} (archived ${Date.now()} #${freshGroupCounter})`;

    const archived = await executeSQLWithResult<{ id: string }>(
      `UPDATE public.groups SET name = $1 WHERE id = $2 RETURNING id`,
      [archivedGroupName, previousGroupId]
    );
    if (!archived?.[0]?.id) {
      throw new Error(`Failed to archive previous group (${previousGroupId}) before creating a fresh group`);
    }

    const rows = await executeSQLWithResult<{ id: string }>(
      `INSERT INTO public.groups (name) VALUES ($1) RETURNING id`,
      [groupName]
    );
    const groupId = rows?.[0]?.id;
    if (!groupId) {
      throw new Error('Failed to create fresh test group (no id returned)');
    }
    // Keep the worker-group cache consistent for any code paths that still call getOrCreateWorkerGroup().
    cachedWorkerGroupIds.set(groupName, groupId);

    // Assign this worker user to the new group (RLS uses JWT email -> profiles.group_id).
    // Do it via direct SQL to avoid admin API contention under parallel load.
    const profileName = email.split('@')[0];
    await executeSQL(
      `
        INSERT INTO public.profiles (email, name, group_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name,
            group_id = EXCLUDED.group_id
      `,
      [email, profileName, groupId]
    );

    // Clear per-user tables that can leak across tests (these are NOT group-scoped).
    const userId = await getAuthUserId();
    await executeSQL(`DELETE FROM public.notifications WHERE user_id = $1`, [userId]);
    await executeSQL(`DELETE FROM public.user_preferences WHERE user_id = $1`, [userId]);

    // Prevent UI-blocking onboarding wizard and auto-tours for the worker user in this fresh group.
    // (Some tests explicitly clear these states when they need to exercise onboarding/tours.)
    try {
      await executeSQL(
        `
          INSERT INTO public.onboarding_states (user_id, group_id, status, current_step, auto_shown_at, completed_at)
          VALUES ($1, $2, 'completed', 'done', now(), now())
          ON CONFLICT (user_id, group_id) DO UPDATE
          SET status = 'completed',
              current_step = 'done',
              auto_shown_at = now(),
              completed_at = now()
        `,
        [userId, groupId]
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('does not exist')) {
        throw new Error(`Failed to upsert onboarding state for fresh group: ${message}`);
      }
    }

    try {
      await executeSQL(
        `
          INSERT INTO public.tour_states (user_id, tour_key, status, version, dismissed_at, completed_at)
          VALUES
            ($1, 'dashboard', 'dismissed', 1, now(), NULL),
            ($1, 'manage', 'dismissed', 1, now(), NULL)
          ON CONFLICT (user_id, tour_key) DO UPDATE
          SET status = EXCLUDED.status,
              version = EXCLUDED.version,
              dismissed_at = EXCLUDED.dismissed_at,
              completed_at = EXCLUDED.completed_at
        `,
        [userId]
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('does not exist')) {
        throw new Error(`Failed to upsert tour state for fresh group: ${message}`);
      }
    }

    currentGroupId = groupId;
    return groupId;
  };

  return {
    /**
     * Reset database for this worker by switching the worker user to a fresh, empty group.
     *
     * Root-cause fix:
     * - Avoids per-test DELETE cascades across many tables, which cause DB contention under
     *   full parallelism and lead to UI hydration flakes (tabs/charts never render).
     * - Keeps isolation strong because RLS is group-scoped.
     */
    resetDatabase: async () => {
      await createFreshGroupForTest();
    },

    /**
     * Clear this worker's data for the current test.
     *
     * IMPORTANT: UI-driven writes are not tracked, so "smart clear" based on a local dirty flag
     * is not reliable. For determinism, we always switch to a fresh group.
     */
    clear: async () => {
      await createFreshGroupForTest();
    },

    ensureTestUser: async (userEmail?: string) => {
      const groupId = await getWorkerGroupId();
      return ensureTestUser(userEmail ?? email, workerIndex, groupId);
    },
    removeTestUser: (userEmail?: string) => removeTestUser(userEmail ?? email, workerIndex),
    // CRITICAL: Pass group ID directly to avoid fallback to default group
    seedAccounts: async (accounts: TestAccount[]) => {
      const groupId = await getWorkerGroupId();
      return seedAccountsWithGroup(accounts, workerIndex, groupId);
    },
    setCheckingAccountsBalanceUpdatedAt: async (balanceUpdatedAt: string | null) => {
      const groupId = await getWorkerGroupId();
      await setCheckingAccountsBalanceUpdatedAtForGroup(groupId, balanceUpdatedAt);
    },
    setAccountsBalanceUpdatedAt: async (balanceUpdatedAt: string | null) => {
      const groupId = await getWorkerGroupId();
      await setAccountsBalanceUpdatedAtForGroup(groupId, balanceUpdatedAt);
    },
    setCreditCardsBalanceUpdatedAt: async (balanceUpdatedAt: string | null) => {
      const groupId = await getWorkerGroupId();
      await setCreditCardsBalanceUpdatedAtForGroup(groupId, balanceUpdatedAt);
    },
    seedExpenses: async (expenses: TestExpense[]) => {
      const groupId = await getWorkerGroupId();
      return seedExpensesWithGroup(expenses, workerIndex, groupId);
    },
    seedSingleShotExpenses: async (expenses: TestSingleShotExpense[]) => {
      const groupId = await getWorkerGroupId();
      return seedSingleShotExpensesWithGroup(expenses, workerIndex, groupId);
    },
    seedProjects: async (projects: TestProject[]) => {
      const groupId = await getWorkerGroupId();
      return seedProjectsWithGroup(projects, workerIndex, groupId);
    },
    seedSingleShotIncome: async (income: TestSingleShotIncome[]) => {
      const groupId = await getWorkerGroupId();
      return seedSingleShotIncomeWithGroup(income, workerIndex, groupId);
    },
    seedCreditCards: async (cards: TestCreditCard[]) => {
      const groupId = await getWorkerGroupId();
      return seedCreditCardsWithGroup(cards, workerIndex, groupId);
    },
    seedFutureStatements: async (statements: TestFutureStatement[]) => {
      const groupId = await getWorkerGroupId();
      return seedFutureStatementsWithGroup(statements, groupId);
    },
    seedSnapshots: async (snapshots: { name: string; data: object }[]) => {
      const groupId = await getWorkerGroupId();
      return seedSnapshotsWithGroup(snapshots, groupId);
    },
    getSnapshots: async () => {
      const groupId = await getWorkerGroupId();
      return getSnapshotsForGroup(groupId);
    },
    deleteSnapshots: async () => {
      const groupId = await getWorkerGroupId();
      return deleteSnapshotsForGroup(groupId);
    },
    /**
     * Clear onboarding state for this worker's group.
     * This will cause the onboarding wizard to appear on next page load.
     */
    clearOnboardingState: async () => {
      const groupId = await getWorkerGroupId();
      await clearOnboardingStateForGroup(groupId);
    },
    /**
     * Clear tour state for this worker's group.
     * This will cause tours to appear as "not seen" on next page load.
     */
    clearTourState: async () => {
      const groupId = await getWorkerGroupId();
      await clearTourStateForGroup(groupId);
    },
    seedFullScenario: async (data: Parameters<typeof seedFullScenario>[0]) => {
      const groupId = await getWorkerGroupId();
      await seedFullScenarioWithGroup(data, workerIndex, groupId);
    },
    seedGroups: async (groups: TestGroup[]) => {
      return seedGroups(groups, workerIndex);
    },
    // Notification helpers (per-user, not per-group)
    seedNotifications: async (notifications: TestNotification[]) => {
      return seedNotifications(notifications);
    },
    getNotificationsForUser,
    getUnreadNotificationCount,
    markNotificationAsRead: async (notificationId: string) => {
      await markNotificationAsRead(notificationId);
    },
    deleteNotificationsForUser: async (userId: string) => {
      await deleteNotificationsForUser(userId);
    },
    notificationExistsByDedupeKey,
    // User preference helpers (per-user, not per-group)
    seedUserPreferences: async (preferences: TestUserPreference[]) => {
      return seedUserPreferences(preferences);
    },
    getUserPreference,
    setUserPreference: async (userId: string, key: string, value: string) => {
      await setUserPreference(userId, key, value);
    },
    deleteUserPreferencesForUser: async (userId: string) => {
      await deleteUserPreferencesForUser(userId);
    },
    // User ID helper
    getUserIdByEmail,
    // Existing helpers
    expenseExists,
    projectExists,
    getProjectById,
    updateProjectCertainty,
    accountExists,
    snapshotExists,
    profileExists,
    getGroupIdByEmail,
    getGroupById,
    getGroupMembers,
    createProfileInGroup,
    deleteProfileByEmail,
    getDefaultGroupId,
    getGroupIdForUser,
    getWorkerGroupId,
    getOrCreateWorkerGroup: () => getOrCreateWorkerGroup(workerIndex, groupName),
    clearGroupCache,
    /** The data prefix for this worker (e.g., "[W0] ") */
    dataPrefix,
    /** Worker index */
    workerIndex,
    /** Worker email */
    email,
    /** Worker group name */
    groupName,
  };
}

/**
 * Database fixture object for use with Playwright fixtures (legacy - uses public schema)
 */
export const dbFixture = {
  resetDatabase,
  ensureTestUser,
  removeTestUser,
  seedAccounts,
  seedExpenses,
  seedSingleShotExpenses,
  seedProjects,
  seedSingleShotIncome,
  seedCreditCards,
  seedFullScenario,
};

export type DatabaseFixture = typeof dbFixture;
export type WorkerDatabaseFixture = ReturnType<typeof createWorkerDbFixture>;
