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
    'credit_cards',
    'expenses',
    'projects',
    'accounts',
    'profiles',
  ] as const;

  // Determine the pattern to match for deletion
  const pattern = workerIndex !== undefined ? getWorkerPrefixPattern(workerIndex) : ALL_WORKERS_PATTERN;

  for (const table of tables) {
    // For profiles, filter by email; for others, filter by name
    const filterColumn = table === 'profiles' || table === 'user_preferences' ? 'email' : 'name';

    try {
      if (table === 'user_preferences') {
        // user_preferences uses email pattern matching
        const { error } = await client.from(table).delete().like('email', pattern);
        if (error && !error.message.includes('does not exist')) {
          console.warn(`Warning: Failed to reset ${table}: ${error.message}`);
        }
      } else if (table === 'profiles') {
        // profiles uses email pattern matching
        const { error } = await client.from(table).delete().like('email', pattern);
        if (error && !error.message.includes('does not exist')) {
          console.warn(`Warning: Failed to reset ${table}: ${error.message}`);
        }
      } else {
        // Other tables use name pattern matching
        const { error } = await client.from(table).delete().like(filterColumn, pattern);
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

/**
 * Ensure test user email exists in profiles table
 * For parallel execution, the email is already prefixed by the worker context
 */
export async function ensureTestUser(email: string, workerIndex?: number): Promise<void> {
  const client = getAdminClient();
  const name = email.split('@')[0]; // Use email prefix as name

  const { error } = await client.from('profiles').upsert({ email, name }, { onConflict: 'email' });

  if (error) {
    throw new Error(`Failed to ensure test user: ${error.message}`);
  }
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
 * Seed accounts with test data
 * When workerIndex is provided, prefixes names with worker identifier
 */
export async function seedAccounts(accounts: TestAccount[], workerIndex?: number): Promise<TestAccount[]> {
  const client = getAdminClient();
  const records = accounts.map((a) => ({
    name: workerIndex !== undefined ? addWorkerPrefix(a.name, workerIndex) : a.name,
    type: a.type,
    balance: a.balance,
    owner_id: a.owner_id ?? null,
  }));

  const { data, error } = await client.from('accounts').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed accounts: ${error.message}`);
  }

  return data as TestAccount[];
}

/**
 * Seed fixed expenses with test data
 * Note: Fixed expenses are stored in the 'expenses' table with type='fixed'
 */
export async function seedExpenses(expenses: TestExpense[], workerIndex?: number): Promise<TestExpense[]> {
  const client = getAdminClient();
  const records = expenses.map((e) => ({
    name: workerIndex !== undefined ? addWorkerPrefix(e.name, workerIndex) : e.name,
    amount: e.amount,
    due_day: e.due_day,
    is_active: e.is_active,
    type: 'fixed',
  }));

  const { data, error } = await client.from('expenses').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed expenses: ${error.message}`);
  }

  return data as TestExpense[];
}

/**
 * Seed single-shot expenses with test data
 * Note: Single-shot expenses are stored in the 'expenses' table with type='single_shot'
 */
export async function seedSingleShotExpenses(
  expenses: TestSingleShotExpense[],
  workerIndex?: number
): Promise<TestSingleShotExpense[]> {
  const client = getAdminClient();
  const records = expenses.map((e) => ({
    name: workerIndex !== undefined ? addWorkerPrefix(e.name, workerIndex) : e.name,
    amount: e.amount,
    date: e.date,
    type: 'single_shot',
    due_day: null,
  }));

  const { data, error } = await client.from('expenses').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed single-shot expenses: ${error.message}`);
  }

  return data as TestSingleShotExpense[];
}

/**
 * Seed projects/income with test data
 * Note: user_id column was removed in migration 002_invite_auth.sql
 * Projects are now shared among all authenticated family members
 */
export async function seedProjects(projects: TestProject[], workerIndex?: number): Promise<TestProject[]> {
  const client = getAdminClient();
  const records = projects.map((p) => ({
    type: 'recurring',
    name: workerIndex !== undefined ? addWorkerPrefix(p.name, workerIndex) : p.name,
    amount: p.amount,
    frequency: p.frequency,
    payment_schedule: p.payment_schedule,
    certainty: p.certainty,
    is_active: p.is_active,
  }));

  const { data, error } = await client.from('projects').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed projects: ${error.message}`);
  }

  return data as TestProject[];
}

/**
 * Seed single-shot income with test data
 * Single-shot income is stored in the projects table with type='single_shot'
 * Note: user_id column was removed in migration 002_invite_auth.sql
 */
export async function seedSingleShotIncome(
  income: TestSingleShotIncome[],
  workerIndex?: number
): Promise<TestSingleShotIncome[]> {
  const client = getAdminClient();
  const records = income.map((i) => ({
    type: 'single_shot',
    name: workerIndex !== undefined ? addWorkerPrefix(i.name, workerIndex) : i.name,
    amount: i.amount,
    date: i.date,
    certainty: i.certainty,
    frequency: null,
    payment_schedule: null,
    is_active: null,
  }));

  const { data, error } = await client.from('projects').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed single-shot income: ${error.message}`);
  }

  return data as TestSingleShotIncome[];
}

/**
 * Seed credit cards with test data
 */
export async function seedCreditCards(cards: TestCreditCard[], workerIndex?: number): Promise<TestCreditCard[]> {
  const client = getAdminClient();
  const records = cards.map((c) => ({
    name: workerIndex !== undefined ? addWorkerPrefix(c.name, workerIndex) : c.name,
    statement_balance: c.statement_balance,
    due_day: c.due_day,
  }));

  const { data, error } = await client.from('credit_cards').insert(records).select();

  if (error) {
    throw new Error(`Failed to seed credit cards: ${error.message}`);
  }

  return data as TestCreditCard[];
}

/**
 * Seed complete test scenario with all entity types
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
  workerIndex?: number
): Promise<void> {
  if (data.accounts?.length) {
    await seedAccounts(data.accounts, workerIndex);
  }
  if (data.expenses?.length) {
    await seedExpenses(data.expenses, workerIndex);
  }
  if (data.singleShotExpenses?.length) {
    await seedSingleShotExpenses(data.singleShotExpenses, workerIndex);
  }
  if (data.projects?.length) {
    await seedProjects(data.projects, workerIndex);
  }
  if (data.singleShotIncome?.length) {
    await seedSingleShotIncome(data.singleShotIncome, workerIndex);
  }
  if (data.creditCards?.length) {
    await seedCreditCards(data.creditCards, workerIndex);
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
 * Create a worker-scoped database fixture
 * This returns a fixture object that prefixes all data with the worker identifier
 */
export function createWorkerDbFixture(workerContext: IWorkerContext) {
  const { workerIndex, email, dataPrefix } = workerContext;

  return {
    resetDatabase: () => resetDatabase(workerIndex),
    ensureTestUser: (userEmail?: string) => ensureTestUser(userEmail ?? email, workerIndex),
    removeTestUser: (userEmail?: string) => removeTestUser(userEmail ?? email, workerIndex),
    seedAccounts: (accounts: TestAccount[]) => seedAccounts(accounts, workerIndex),
    seedExpenses: (expenses: TestExpense[]) => seedExpenses(expenses, workerIndex),
    seedSingleShotExpenses: (expenses: TestSingleShotExpense[]) => seedSingleShotExpenses(expenses, workerIndex),
    seedProjects: (projects: TestProject[]) => seedProjects(projects, workerIndex),
    seedSingleShotIncome: (income: TestSingleShotIncome[]) => seedSingleShotIncome(income, workerIndex),
    seedCreditCards: (cards: TestCreditCard[]) => seedCreditCards(cards, workerIndex),
    seedFullScenario: (data: Parameters<typeof seedFullScenario>[0]) => seedFullScenario(data, workerIndex),
    expenseExists,
    projectExists,
    accountExists,
    /** The data prefix for this worker (e.g., "[W0] ") */
    dataPrefix,
    /** Worker index */
    workerIndex,
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
