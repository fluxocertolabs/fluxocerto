/**
 * Database fixture for test isolation and seeding
 * Implements IDatabaseFixture contract from specs/019-e2e-testing/contracts/fixtures.ts
 * Uses data prefixing for parallel test isolation (each worker prefixes its data)
 */

import { getAdminClient } from '../utils/supabase-admin';
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
  TestHousehold,
  TestProfile,
} from '../utils/test-data';

/**
 * Delete all data from test tables in correct order (respecting foreign keys)
 * When workerIndex is provided, only deletes data with that worker's prefix
 */
export async function resetDatabase(workerIndex?: number): Promise<void> {
  const client = getAdminClient();

  // Delete in order to respect foreign key constraints
  const tables = [
    'user_preferences',
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
        // user_preferences uses email pattern matching
        const { error } = await client.from(table).delete().like('email', pattern);
        if (error && !error.message.includes('does not exist')) {
          console.warn(`Warning: Failed to reset ${table}: ${error.message}`);
        }
      } else {
        // Other tables use name pattern matching
        const { error } = await client.from(table).delete().like('name', pattern);
        if (error && !error.message.includes('does not exist')) {
          console.warn(`Warning: Failed to reset ${table}: ${error.message}`);
        }
      }
    } catch (err) {
      // Ignore errors during cleanup
      console.warn(`Warning: Exception resetting ${table}:`, err);
    }
  }
}

// Cache for household IDs to avoid repeated queries
let cachedDefaultHouseholdId: string | null = null;
const cachedUserHouseholdIds: Map<string, string> = new Map();
const cachedWorkerHouseholdIds: Map<number, string> = new Map();

// Mutex to prevent race conditions during worker household creation/lookup
const workerHouseholdMutex = new Map<number, Promise<string>>();

/**
 * Get or create the default test household
 * Returns the household ID for the "Fonseca Floriano" household created by migration
 */
export async function getDefaultHouseholdId(): Promise<string> {
  if (cachedDefaultHouseholdId) {
    return cachedDefaultHouseholdId;
  }

  const client = getAdminClient();
  
  // First try to get the existing default household
  const { data: existingHousehold, error: selectError } = await client
    .from('households')
    .select('id')
    .eq('name', 'Fonseca Floriano')
    .maybeSingle();

  if (selectError) {
    throw new Error(`Failed to query default household: ${selectError.message}`);
  }

  if (existingHousehold) {
    cachedDefaultHouseholdId = existingHousehold.id;
    return existingHousehold.id;
  }

  // If not found (shouldn't happen after migration), create it
  const { data: newHousehold, error: insertError } = await client
    .from('households')
    .insert({ name: 'Fonseca Floriano' })
    .select('id')
    .single();

  if (insertError) {
    throw new Error(`Failed to create default household: ${insertError.message}`);
  }

  cachedDefaultHouseholdId = newHousehold.id;
  return newHousehold.id;
}

/**
 * Get household ID for a specific user by email
 * Falls back to default household if user doesn't have one
 */
export async function getHouseholdIdForUser(email: string): Promise<string> {
  // Check cache first
  const cached = cachedUserHouseholdIds.get(email);
  if (cached) {
    return cached;
  }

  const client = getAdminClient();
  
  const { data: profile, error } = await client
    .from('profiles')
    .select('household_id')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.warn(`Warning getting household for ${email}: ${error.message}`);
    return getDefaultHouseholdId();
  }

  if (profile?.household_id) {
    cachedUserHouseholdIds.set(email, profile.household_id);
    return profile.household_id;
  }

  // Fall back to default household
  return getDefaultHouseholdId();
}

/**
 * Clear household ID caches (call after database reset)
 */
export function clearHouseholdCache(): void {
  cachedDefaultHouseholdId = null;
  cachedUserHouseholdIds.clear();
  cachedWorkerHouseholdIds.clear();
}

/**
 * Get or create a worker-specific household for test isolation.
 * Each worker gets its own household, ensuring complete data isolation via RLS.
 *
 * @param workerIndex - The worker index (0-based)
 * @param householdName - The household name (e.g., "Test Worker 0")
 * @returns The household ID
 */
export async function getOrCreateWorkerHousehold(workerIndex: number, householdName: string): Promise<string> {
  // Check cache first
  const cached = cachedWorkerHouseholdIds.get(workerIndex);
  if (cached) {
    return cached;
  }

  // Check if there is a pending operation for this worker
  const pending = workerHouseholdMutex.get(workerIndex);
  if (pending) {
    return pending;
  }

  // Start new operation and store in mutex
  const promise = (async () => {
    try {
      const client = getAdminClient();

      // Try to find existing household
      const { data: existing, error: selectError } = await client
        .from('households')
        .select('id')
        .eq('name', householdName)
        .maybeSingle();

      if (selectError) {
        throw new Error(`Failed to query worker household: ${selectError.message}`);
      }

      if (existing) {
        cachedWorkerHouseholdIds.set(workerIndex, existing.id);
        return existing.id;
      }

      // Create new household for this worker
      const { data: newHousehold, error: insertError } = await client
        .from('households')
        .insert({ name: householdName })
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Failed to create worker household: ${insertError.message}`);
      }

      cachedWorkerHouseholdIds.set(workerIndex, newHousehold.id);
      return newHousehold.id;
    } finally {
      // Clean up mutex entry
      workerHouseholdMutex.delete(workerIndex);
    }
  })();

  workerHouseholdMutex.set(workerIndex, promise);
  return promise;
}

/**
 * Delete all data for a specific worker's household.
 * This is more reliable than name-pattern matching for cleanup.
 *
 * @param householdId - The household ID to clean up
 */
export async function resetHouseholdData(householdId: string): Promise<void> {
  const client = getAdminClient();
  console.log(`[DB] Resetting data for household ${householdId}...`);

  // Delete in order to respect foreign key constraints
  // Note: We don't delete profiles to preserve auth linkage
  const tables = [
    'projection_snapshots',
    'user_preferences',
    'future_statements',
    'credit_cards',
    'expenses',
    'projects',
    'accounts',
  ] as const;

  for (const table of tables) {
    try {
      const start = Date.now();
      const { error } = await client.from(table).delete().eq('household_id', householdId);
      const duration = Date.now() - start;
      if (duration > 1000) {
        console.warn(`[DB] Slow delete on ${table} for household ${householdId}: ${duration}ms`);
      }
      
      if (error && !error.message.includes('does not exist')) {
        console.warn(`Warning: Failed to reset ${table} for household ${householdId}: ${error.message}`);
      }
    } catch (err) {
      console.warn(`Warning: Exception resetting ${table}:`, err);
    }
  }
  console.log(`[DB] Reset complete for household ${householdId}`);
}

/**
 * Ensure test user email exists in profiles table with household assignment.
 * For parallel execution, assigns user to their worker-specific household.
 *
 * @param email - The test user email
 * @param workerIndex - Optional worker index for household assignment
 * @param householdId - Optional explicit household ID (overrides worker lookup)
 */
export async function ensureTestUser(
  email: string,
  workerIndex?: number,
  householdId?: string
): Promise<void> {
  const client = getAdminClient();
  const name = email.split('@')[0]; // Use email prefix as name

  // Determine household ID:
  // 1. Use explicit householdId if provided
  // 2. Otherwise use worker's household if workerIndex provided
  // 3. Fall back to default household
  let targetHouseholdId = householdId;
  if (!targetHouseholdId && workerIndex !== undefined) {
    // Check if we have a cached worker household
    targetHouseholdId = cachedWorkerHouseholdIds.get(workerIndex);
  }
  if (!targetHouseholdId) {
    targetHouseholdId = await getDefaultHouseholdId();
  }

  const { error } = await client.from('profiles').upsert(
    { email, name, household_id: targetHouseholdId },
    { onConflict: 'email' }
  );

  if (error) {
    throw new Error(`Failed to ensure test user: ${error.message}`);
  }

  // Update the user household cache
  cachedUserHouseholdIds.set(email, targetHouseholdId);
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
 * Seed accounts with test data using explicit household ID
 * This is the preferred method for worker-scoped fixtures to ensure correct isolation
 */
export async function seedAccountsWithHousehold(
  accounts: TestAccount[],
  workerIndex: number,
  householdId: string
): Promise<TestAccount[]> {
  const client = getAdminClient();
  
  const records = accounts.map((a) => ({
    name: addWorkerPrefix(a.name, workerIndex),
    type: a.type,
    balance: a.balance,
    owner_id: a.owner_id ?? null,
    household_id: householdId,
  }));

  const { data, error } = await client.from('accounts').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed accounts: ${error.message}`);
  }

  return data as TestAccount[];
}

/**
 * Seed accounts with test data (legacy - uses email lookup)
 * When workerIndex is provided, prefixes names with worker identifier
 * When userEmail is provided, uses that user's household
 * @deprecated Use seedAccountsWithHousehold for better isolation
 */
export async function seedAccounts(
  accounts: TestAccount[],
  workerIndex?: number,
  userEmail?: string
): Promise<TestAccount[]> {
  const client = getAdminClient();
  
  // Get household ID for seeding - use user's household if email provided
  const householdId = userEmail
    ? await getHouseholdIdForUser(userEmail)
    : await getDefaultHouseholdId();
  
  const records = accounts.map((a) => ({
    name: workerIndex !== undefined ? addWorkerPrefix(a.name, workerIndex) : a.name,
    type: a.type,
    balance: a.balance,
    owner_id: a.owner_id ?? null,
    household_id: householdId,
  }));

  const { data, error } = await client.from('accounts').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed accounts: ${error.message}`);
  }

  return data as TestAccount[];
}

/**
 * Seed fixed expenses with test data using explicit household ID
 */
export async function seedExpensesWithHousehold(
  expenses: TestExpense[],
  workerIndex: number,
  householdId: string
): Promise<TestExpense[]> {
  const client = getAdminClient();
  
  const records = expenses.map((e) => ({
    name: addWorkerPrefix(e.name, workerIndex),
    amount: e.amount,
    due_day: e.due_day,
    is_active: e.is_active,
    type: 'fixed',
    household_id: householdId,
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
 * @deprecated Use seedExpensesWithHousehold for better isolation
 */
export async function seedExpenses(
  expenses: TestExpense[],
  workerIndex?: number,
  userEmail?: string
): Promise<TestExpense[]> {
  const client = getAdminClient();
  
  // Get household ID for seeding - use user's household if email provided
  const householdId = userEmail
    ? await getHouseholdIdForUser(userEmail)
    : await getDefaultHouseholdId();
  
  const records = expenses.map((e) => ({
    name: workerIndex !== undefined ? addWorkerPrefix(e.name, workerIndex) : e.name,
    amount: e.amount,
    due_day: e.due_day,
    is_active: e.is_active,
    type: 'fixed',
    household_id: householdId,
  }));

  const { data, error } = await client.from('expenses').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed expenses: ${error.message}`);
  }

  return data as TestExpense[];
}

/**
 * Seed single-shot expenses with test data using explicit household ID
 */
export async function seedSingleShotExpensesWithHousehold(
  expenses: TestSingleShotExpense[],
  workerIndex: number,
  householdId: string
): Promise<TestSingleShotExpense[]> {
  const client = getAdminClient();
  
  const records = expenses.map((e) => ({
    name: addWorkerPrefix(e.name, workerIndex),
    amount: e.amount,
    date: e.date,
    type: 'single_shot',
    due_day: null,
    household_id: householdId,
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
 * @deprecated Use seedSingleShotExpensesWithHousehold for better isolation
 */
export async function seedSingleShotExpenses(
  expenses: TestSingleShotExpense[],
  workerIndex?: number,
  userEmail?: string
): Promise<TestSingleShotExpense[]> {
  const client = getAdminClient();
  
  // Get household ID for seeding - use user's household if email provided
  const householdId = userEmail
    ? await getHouseholdIdForUser(userEmail)
    : await getDefaultHouseholdId();
  
  const records = expenses.map((e) => ({
    name: workerIndex !== undefined ? addWorkerPrefix(e.name, workerIndex) : e.name,
    amount: e.amount,
    date: e.date,
    type: 'single_shot',
    due_day: null,
    household_id: householdId,
  }));

  const { data, error } = await client.from('expenses').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed single-shot expenses: ${error.message}`);
  }

  return data as TestSingleShotExpense[];
}

/**
 * Seed projects/income with test data using explicit household ID
 */
export async function seedProjectsWithHousehold(
  projects: TestProject[],
  workerIndex: number,
  householdId: string
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
    household_id: householdId,
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
 * @deprecated Use seedProjectsWithHousehold for better isolation
 */
export async function seedProjects(
  projects: TestProject[],
  workerIndex?: number,
  userEmail?: string
): Promise<TestProject[]> {
  const client = getAdminClient();
  
  // Get household ID for seeding - use user's household if email provided
  const householdId = userEmail
    ? await getHouseholdIdForUser(userEmail)
    : await getDefaultHouseholdId();
  
  const records = projects.map((p) => ({
    type: 'recurring',
    name: workerIndex !== undefined ? addWorkerPrefix(p.name, workerIndex) : p.name,
    amount: p.amount,
    frequency: p.frequency,
    payment_schedule: p.payment_schedule,
    certainty: p.certainty,
    is_active: p.is_active,
    household_id: householdId,
  }));

  const { data, error } = await client.from('projects').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed projects: ${error.message}`);
  }

  return data as TestProject[];
}

/**
 * Seed single-shot income with test data using explicit household ID
 */
export async function seedSingleShotIncomeWithHousehold(
  income: TestSingleShotIncome[],
  workerIndex: number,
  householdId: string
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
    household_id: householdId,
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
 * @deprecated Use seedSingleShotIncomeWithHousehold for better isolation
 */
export async function seedSingleShotIncome(
  income: TestSingleShotIncome[],
  workerIndex?: number,
  userEmail?: string
): Promise<TestSingleShotIncome[]> {
  const client = getAdminClient();
  
  // Get household ID for seeding - use user's household if email provided
  const householdId = userEmail
    ? await getHouseholdIdForUser(userEmail)
    : await getDefaultHouseholdId();
  
  const records = income.map((i) => ({
    type: 'single_shot',
    name: workerIndex !== undefined ? addWorkerPrefix(i.name, workerIndex) : i.name,
    amount: i.amount,
    date: i.date,
    certainty: i.certainty,
    frequency: null,
    payment_schedule: null,
    is_active: null,
    household_id: householdId,
  }));

  const { data, error } = await client.from('projects').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed single-shot income: ${error.message}`);
  }

  return data as TestSingleShotIncome[];
}

/**
 * Seed credit cards with test data using explicit household ID
 */
export async function seedCreditCardsWithHousehold(
  cards: TestCreditCard[],
  workerIndex: number,
  householdId: string
): Promise<TestCreditCard[]> {
  const client = getAdminClient();
  
  const records = cards.map((c) => ({
    name: addWorkerPrefix(c.name, workerIndex),
    statement_balance: c.statement_balance,
    due_day: c.due_day,
    household_id: householdId,
  }));

  const { data, error } = await client.from('credit_cards').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed credit cards: ${error.message}`);
  }

  return data as TestCreditCard[];
}

/**
 * Seed credit cards with test data (legacy - uses email lookup)
 * @deprecated Use seedCreditCardsWithHousehold for better isolation
 */
export async function seedCreditCards(
  cards: TestCreditCard[],
  workerIndex?: number,
  userEmail?: string
): Promise<TestCreditCard[]> {
  const client = getAdminClient();
  
  // Get household ID for seeding - use user's household if email provided
  const householdId = userEmail
    ? await getHouseholdIdForUser(userEmail)
    : await getDefaultHouseholdId();
  
  const records = cards.map((c) => ({
    name: workerIndex !== undefined ? addWorkerPrefix(c.name, workerIndex) : c.name,
    statement_balance: c.statement_balance,
    due_day: c.due_day,
    household_id: householdId,
  }));

  const { data, error } = await client.from('credit_cards').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed credit cards: ${error.message}`);
  }

  return data as TestCreditCard[];
}

/**
 * Seed future statements with test data using explicit household ID
 */
export async function seedFutureStatementsWithHousehold(
  statements: TestFutureStatement[],
  householdId: string
): Promise<TestFutureStatement[]> {
  const client = getAdminClient();
  
  const records = statements.map((s) => ({
    credit_card_id: s.credit_card_id,
    target_month: s.target_month,
    target_year: s.target_year,
    amount: s.amount,
    household_id: householdId,
  }));

  const { data, error } = await client.from('future_statements').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed future statements: ${error.message}`);
  }

  return data as TestFutureStatement[];
}

/**
 * Seed future statements with test data (legacy - uses email lookup)
 * @deprecated Use seedFutureStatementsWithHousehold for better isolation
 */
export async function seedFutureStatements(
  statements: TestFutureStatement[],
  userEmail?: string
): Promise<TestFutureStatement[]> {
  const client = getAdminClient();
  
  // Get household ID for seeding - use user's household if email provided
  const householdId = userEmail
    ? await getHouseholdIdForUser(userEmail)
    : await getDefaultHouseholdId();
  
  const records = statements.map((s) => ({
    credit_card_id: s.credit_card_id,
    target_month: s.target_month,
    target_year: s.target_year,
    amount: s.amount,
    household_id: householdId,
  }));

  const { data, error } = await client.from('future_statements').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed future statements: ${error.message}`);
  }

  return data as TestFutureStatement[];
}

/**
 * Seed households with test data
 * Used for multi-tenancy isolation tests
 */
export async function seedHouseholds(households: TestHousehold[], workerIndex?: number): Promise<TestHousehold[]> {
  const client = getAdminClient();
  const records = households.map((h) => ({
    name: workerIndex !== undefined ? addWorkerPrefix(h.name, workerIndex) : h.name,
  }));

  const { data, error } = await client.from('households').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed households: ${error.message}`);
  }

  return data as TestHousehold[];
}

/**
 * Get the household ID for a test user by email
 */
export async function getHouseholdIdByEmail(email: string): Promise<string | null> {
  const client = getAdminClient();
  const { data, error } = await client
    .from('profiles')
    .select('household_id')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.warn(`Warning getting household ID: ${error.message}`);
    return null;
  }

  return data?.household_id ?? null;
}

/**
 * Get household info by ID
 */
export async function getHouseholdById(id: string): Promise<TestHousehold | null> {
  const client = getAdminClient();
  const { data, error } = await client
    .from('households')
    .select('id, name, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.warn(`Warning getting household: ${error.message}`);
    return null;
  }

  return data as TestHousehold | null;
}

/**
 * Get all members of a household
 */
export async function getHouseholdMembers(householdId: string): Promise<TestProfile[]> {
  const client = getAdminClient();
  const { data, error } = await client
    .from('profiles')
    .select('id, name, email, household_id')
    .eq('household_id', householdId)
    .order('name');

  if (error) {
    throw new Error(`Failed to get household members: ${error.message}`);
  }

  return data as TestProfile[];
}

/**
 * Create a profile with a specific household assignment
 * Used for invite flow testing
 */
export async function createProfileInHousehold(
  email: string,
  name: string,
  householdId: string
): Promise<TestProfile> {
  const client = getAdminClient();
  const { data, error } = await client
    .from('profiles')
    .insert({ email, name, household_id: householdId })
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
 * Seed complete test scenario with all entity types using explicit household ID
 */
export async function seedFullScenarioWithHousehold(
  data: {
    accounts?: TestAccount[];
    expenses?: TestExpense[];
    singleShotExpenses?: TestSingleShotExpense[];
    projects?: TestProject[];
    singleShotIncome?: TestSingleShotIncome[];
    creditCards?: TestCreditCard[];
  },
  workerIndex: number,
  householdId: string
): Promise<void> {
  if (data.accounts?.length) {
    await seedAccountsWithHousehold(data.accounts, workerIndex, householdId);
  }
  if (data.expenses?.length) {
    await seedExpensesWithHousehold(data.expenses, workerIndex, householdId);
  }
  if (data.singleShotExpenses?.length) {
    await seedSingleShotExpensesWithHousehold(data.singleShotExpenses, workerIndex, householdId);
  }
  if (data.projects?.length) {
    await seedProjectsWithHousehold(data.projects, workerIndex, householdId);
  }
  if (data.singleShotIncome?.length) {
    await seedSingleShotIncomeWithHousehold(data.singleShotIncome, workerIndex, householdId);
  }
  if (data.creditCards?.length) {
    await seedCreditCardsWithHousehold(data.creditCards, workerIndex, householdId);
  }
}

/**
 * Seed complete test scenario with all entity types (legacy - uses email lookup)
 * @deprecated Use seedFullScenarioWithHousehold for better isolation
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
 * Seed projection snapshots with test data using explicit household ID
 */
export async function seedSnapshotsWithHousehold(
  snapshots: { name: string; data: object }[],
  householdId: string
): Promise<{ id: string; name: string }[]> {
  const client = getAdminClient();
  
  const records = snapshots.map((s) => ({
    name: s.name,
    schema_version: 1,
    data: s.data,
    household_id: householdId,
  }));

  const { data, error } = await client.from('projection_snapshots').insert(records).select('id, name');

  if (error) {
    throw new Error(`Failed to seed snapshots: ${error.message}`);
  }

  return data as { id: string; name: string }[];
}

/**
 * Get all snapshots for a household
 */
export async function getSnapshotsForHousehold(householdId: string): Promise<{ id: string; name: string; created_at: string }[]> {
  const client = getAdminClient();
  
  const { data, error } = await client
    .from('projection_snapshots')
    .select('id, name, created_at')
    .eq('household_id', householdId)
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
 * Delete all snapshots for a household
 */
export async function deleteSnapshotsForHousehold(householdId: string): Promise<void> {
  const client = getAdminClient();
  const { error } = await client.from('projection_snapshots').delete().eq('household_id', householdId);
  if (error) {
    throw new Error(`Failed to delete snapshots: ${error.message}`);
  }
}

/**
 * Create a worker-scoped database fixture
 * This returns a fixture object that prefixes all data with the worker identifier
 * and uses the worker's household for data isolation via RLS
 */
export function createWorkerDbFixture(workerContext: IWorkerContext) {
  const { workerIndex, email, dataPrefix, householdName } = workerContext;

  // Helper to get this worker's household ID (cached after first call)
  const getWorkerHouseholdId = async () => {
    return getOrCreateWorkerHousehold(workerIndex, householdName);
  };

  return {
    /**
     * Reset database by clearing this worker's household data.
     * Uses household_id for reliable isolation instead of name patterns.
     */
    resetDatabase: async () => {
      const householdId = await getWorkerHouseholdId();
      await resetHouseholdData(householdId);
    },
    ensureTestUser: async (userEmail?: string) => {
      const householdId = await getWorkerHouseholdId();
      return ensureTestUser(userEmail ?? email, workerIndex, householdId);
    },
    removeTestUser: (userEmail?: string) => removeTestUser(userEmail ?? email, workerIndex),
    // CRITICAL: Pass household ID directly to avoid fallback to default household
    seedAccounts: async (accounts: TestAccount[]) => {
      const householdId = await getWorkerHouseholdId();
      return seedAccountsWithHousehold(accounts, workerIndex, householdId);
    },
    seedExpenses: async (expenses: TestExpense[]) => {
      const householdId = await getWorkerHouseholdId();
      return seedExpensesWithHousehold(expenses, workerIndex, householdId);
    },
    seedSingleShotExpenses: async (expenses: TestSingleShotExpense[]) => {
      const householdId = await getWorkerHouseholdId();
      return seedSingleShotExpensesWithHousehold(expenses, workerIndex, householdId);
    },
    seedProjects: async (projects: TestProject[]) => {
      const householdId = await getWorkerHouseholdId();
      return seedProjectsWithHousehold(projects, workerIndex, householdId);
    },
    seedSingleShotIncome: async (income: TestSingleShotIncome[]) => {
      const householdId = await getWorkerHouseholdId();
      return seedSingleShotIncomeWithHousehold(income, workerIndex, householdId);
    },
    seedCreditCards: async (cards: TestCreditCard[]) => {
      const householdId = await getWorkerHouseholdId();
      return seedCreditCardsWithHousehold(cards, workerIndex, householdId);
    },
    seedFutureStatements: async (statements: TestFutureStatement[]) => {
      const householdId = await getWorkerHouseholdId();
      return seedFutureStatementsWithHousehold(statements, householdId);
    },
    seedSnapshots: async (snapshots: { name: string; data: object }[]) => {
      const householdId = await getWorkerHouseholdId();
      return seedSnapshotsWithHousehold(snapshots, householdId);
    },
    getSnapshots: async () => {
      const householdId = await getWorkerHouseholdId();
      return getSnapshotsForHousehold(householdId);
    },
    deleteSnapshots: async () => {
      const householdId = await getWorkerHouseholdId();
      return deleteSnapshotsForHousehold(householdId);
    },
    seedFullScenario: async (data: Parameters<typeof seedFullScenario>[0]) => {
      const householdId = await getWorkerHouseholdId();
      return seedFullScenarioWithHousehold(data, workerIndex, householdId);
    },
    seedHouseholds: (households: TestHousehold[]) => seedHouseholds(households, workerIndex),
    expenseExists,
    projectExists,
    accountExists,
    snapshotExists,
    profileExists,
    getHouseholdIdByEmail,
    getHouseholdById,
    getHouseholdMembers,
    createProfileInHousehold,
    deleteProfileByEmail,
    getDefaultHouseholdId,
    getHouseholdIdForUser,
    getWorkerHouseholdId,
    getOrCreateWorkerHousehold: () => getOrCreateWorkerHousehold(workerIndex, householdName),
    clearHouseholdCache,
    /** The data prefix for this worker (e.g., "[W0] ") */
    dataPrefix,
    /** Worker index */
    workerIndex,
    /** Worker email */
    email,
    /** Worker household name */
    householdName,
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
