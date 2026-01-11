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
        const emailPattern =
          workerIndex !== undefined
            ? `%e2e-test-%-worker-${workerIndex}@example.com`
            : `%e2e-test-%-worker-%@example.com`;

        await executeSQL(
          `
            DELETE FROM public.user_preferences up
            USING auth.users u
            WHERE u.email LIKE $1
              AND up.user_id = u.id
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

      // Try to find existing group
      const { data: existing, error: selectError } = await client
        .from('groups')
        .select('id')
        .eq('name', groupName)
        .maybeSingle();

      if (selectError) {
        throw new Error(`Failed to query worker group: ${selectError.message}`);
      }

      if (existing) {
        cachedWorkerGroupIds.set(groupName, existing.id);
        return existing.id;
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
        // user_preferences is per-user and does NOT have group_id.
        // Clear all user preferences for users belonging to this group by mapping:
        // profiles (group_id) -> auth.users (email) -> user_preferences (user_id).
        await executeSQL(
          `
            DELETE FROM public.user_preferences up
            USING public.profiles p, auth.users u
            WHERE p.group_id = $1
              AND p.email IS NOT NULL
              AND u.email = p.email::text
              AND up.user_id = u.id
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
  
  const { error } = await client
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`);
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
 * Seed user preferences with test data
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

  const { data, error } = await client.from('user_preferences').insert(records).select();

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
 * Get user ID by email from auth.users
 */
export async function getUserIdByEmail(email: string): Promise<string | null> {
  try {
    const result = await executeSQLWithResult<{ id: string }>(
      `SELECT id FROM auth.users WHERE email = $1 LIMIT 1`,
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

  // Track whether this worker's database has been modified since last reset
  // This allows optimizing away redundant resets (which are expensive network operations)
  let isDirty = true; // Start dirty so first reset actually runs

  // Helper to get this worker's group ID (cached after first call)
  const getWorkerGroupId = async () => {
    return getOrCreateWorkerGroup(workerIndex, groupName);
  };

  // Mark the database as dirty (data has been added)
  const markDirty = () => {
    isDirty = true;
  };

  return {
    /**
     * Reset database by clearing this worker's group data.
     * Uses group_id for reliable isolation instead of name patterns.
     * This always resets regardless of dirty state - use clear() for optimized resets.
     */
    resetDatabase: async () => {
      const groupId = await getWorkerGroupId();
      await resetGroupData(groupId);
      isDirty = false;
    },

    /**
     * Clear database only if data has been seeded since last clear/reset.
     * This is an optimized version of resetDatabase() that skips the expensive
     * DELETE operations if the database is already clean.
     * 
     * Use this in tests that need empty state - it's instant if no data was added.
     */
    clear: async () => {
      if (!isDirty) {
        // Database is already clean, skip expensive reset
        return;
      }
      const groupId = await getWorkerGroupId();
      await resetGroupData(groupId);
      isDirty = false;
    },

    /**
     * Check if database has been modified since last reset/clear
     */
    isDirty: () => isDirty,
    ensureTestUser: async (userEmail?: string) => {
      const groupId = await getWorkerGroupId();
      return ensureTestUser(userEmail ?? email, workerIndex, groupId);
    },
    removeTestUser: (userEmail?: string) => removeTestUser(userEmail ?? email, workerIndex),
    // CRITICAL: Pass group ID directly to avoid fallback to default group
    // All seed methods mark the database as dirty
    seedAccounts: async (accounts: TestAccount[]) => {
      const groupId = await getWorkerGroupId();
      const result = await seedAccountsWithGroup(accounts, workerIndex, groupId);
      markDirty();
      return result;
    },
    setCheckingAccountsBalanceUpdatedAt: async (balanceUpdatedAt: string | null) => {
      const groupId = await getWorkerGroupId();
      await setCheckingAccountsBalanceUpdatedAtForGroup(groupId, balanceUpdatedAt);
      markDirty();
    },
    setAccountsBalanceUpdatedAt: async (balanceUpdatedAt: string | null) => {
      const groupId = await getWorkerGroupId();
      await setAccountsBalanceUpdatedAtForGroup(groupId, balanceUpdatedAt);
      markDirty();
    },
    setCreditCardsBalanceUpdatedAt: async (balanceUpdatedAt: string | null) => {
      const groupId = await getWorkerGroupId();
      await setCreditCardsBalanceUpdatedAtForGroup(groupId, balanceUpdatedAt);
      markDirty();
    },
    seedExpenses: async (expenses: TestExpense[]) => {
      const groupId = await getWorkerGroupId();
      const result = await seedExpensesWithGroup(expenses, workerIndex, groupId);
      markDirty();
      return result;
    },
    seedSingleShotExpenses: async (expenses: TestSingleShotExpense[]) => {
      const groupId = await getWorkerGroupId();
      const result = await seedSingleShotExpensesWithGroup(expenses, workerIndex, groupId);
      markDirty();
      return result;
    },
    seedProjects: async (projects: TestProject[]) => {
      const groupId = await getWorkerGroupId();
      const result = await seedProjectsWithGroup(projects, workerIndex, groupId);
      markDirty();
      return result;
    },
    seedSingleShotIncome: async (income: TestSingleShotIncome[]) => {
      const groupId = await getWorkerGroupId();
      const result = await seedSingleShotIncomeWithGroup(income, workerIndex, groupId);
      markDirty();
      return result;
    },
    seedCreditCards: async (cards: TestCreditCard[]) => {
      const groupId = await getWorkerGroupId();
      const result = await seedCreditCardsWithGroup(cards, workerIndex, groupId);
      markDirty();
      return result;
    },
    seedFutureStatements: async (statements: TestFutureStatement[]) => {
      const groupId = await getWorkerGroupId();
      const result = await seedFutureStatementsWithGroup(statements, groupId);
      markDirty();
      return result;
    },
    seedSnapshots: async (snapshots: { name: string; data: object }[]) => {
      const groupId = await getWorkerGroupId();
      const result = await seedSnapshotsWithGroup(snapshots, groupId);
      markDirty();
      return result;
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
      markDirty();
    },
    seedGroups: async (groups: TestGroup[]) => {
      const result = await seedGroups(groups, workerIndex);
      markDirty();
      return result;
    },
    // Notification helpers (per-user, not per-group)
    seedNotifications,
    getNotificationsForUser,
    getUnreadNotificationCount,
    markNotificationAsRead,
    deleteNotificationsForUser,
    notificationExistsByDedupeKey,
    // User preference helpers (per-user, not per-group)
    seedUserPreferences,
    getUserPreference,
    setUserPreference,
    deleteUserPreferencesForUser,
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
