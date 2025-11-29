/**
 * Database fixture for test isolation and seeding
 * Implements IDatabaseFixture contract from specs/019-e2e-testing/contracts/fixtures.ts
 */

import { getAdminClient, getUserIdFromEmail, resetAdminClient } from '../utils/supabase-admin';
import type {
  TestAccount,
  TestExpense,
  TestSingleShotExpense,
  TestProject,
  TestSingleShotIncome,
  TestCreditCard,
} from '../utils/test-data';

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'e2e-test@example.com';

/**
 * Delete all data from test tables in correct order (respecting foreign keys)
 */
export async function resetDatabase(): Promise<void> {
  const client = getAdminClient();

  // Delete in order to respect foreign key constraints
  const tables = [
    'single_shot_expenses',
    'credit_cards',
    'expenses',
    'projects', // includes both recurring and single-shot income (type='single_shot')
    'accounts',
  ] as const;

  for (const table of tables) {
    const { error } = await client.from(table).delete().gte('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      // Ignore "table not found" errors - table might not exist yet
      if (!error.message.includes('schema cache') && !error.message.includes('does not exist')) {
        throw new Error(`Failed to reset table ${table}: ${error.message}`);
      }
    }
  }
}

/**
 * Ensure test user email exists in profiles table (formerly allowed_emails)
 */
export async function ensureTestUser(email: string): Promise<void> {
  const client = getAdminClient();
  const name = email.split('@')[0]; // Use email prefix as name
  const { error } = await client
    .from('profiles')
    .upsert({ email, name }, { onConflict: 'email' });
  if (error) {
    throw new Error(`Failed to ensure test user: ${error.message}`);
  }
}

/**
 * Remove test user from profiles table
 */
export async function removeTestUser(email: string): Promise<void> {
  const client = getAdminClient();
  const { error } = await client.from('profiles').delete().eq('email', email);
  if (error) {
    throw new Error(`Failed to remove test user: ${error.message}`);
  }
}

/**
 * Seed accounts with test data
 */
export async function seedAccounts(accounts: TestAccount[]): Promise<TestAccount[]> {
  const client = getAdminClient();
  const { data, error } = await client
    .from('accounts')
    .insert(accounts.map((a) => ({
      name: a.name,
      type: a.type,
      balance: a.balance,
      owner_id: a.owner_id ?? null,
    })))
    .select();

  if (error) {
    throw new Error(`Failed to seed accounts: ${error.message}`);
  }

  return data as TestAccount[];
}

/**
 * Seed fixed expenses with test data
 */
export async function seedExpenses(expenses: TestExpense[]): Promise<TestExpense[]> {
  const client = getAdminClient();
  const { data, error } = await client
    .from('expenses')
    .insert(expenses.map((e) => ({
      name: e.name,
      amount: e.amount,
      due_day: e.due_day,
      is_active: e.is_active,
    })))
    .select();

  if (error) {
    throw new Error(`Failed to seed expenses: ${error.message}`);
  }

  return data as TestExpense[];
}

/**
 * Seed single-shot expenses with test data
 */
export async function seedSingleShotExpenses(
  expenses: TestSingleShotExpense[]
): Promise<TestSingleShotExpense[]> {
  const client = getAdminClient();
  const { data, error } = await client
    .from('single_shot_expenses')
    .insert(expenses.map((e) => ({
      name: e.name,
      amount: e.amount,
      date: e.date,
    })))
    .select();

  if (error) {
    throw new Error(`Failed to seed single-shot expenses: ${error.message}`);
  }

  return data as TestSingleShotExpense[];
}

/**
 * Seed projects/income with test data
 */
export async function seedProjects(projects: TestProject[]): Promise<TestProject[]> {
  const client = getAdminClient();
  const userId = await getUserIdFromEmail(TEST_USER_EMAIL);
  
  const { data, error } = await client
    .from('projects')
    .insert(projects.map((p) => ({
      user_id: userId,
      type: 'recurring', // All test projects are recurring by default
      name: p.name,
      amount: p.amount,
      frequency: p.frequency,
      payment_schedule: p.payment_schedule,
      certainty: p.certainty,
      is_active: p.is_active,
    })))
    .select();

  if (error) {
    throw new Error(`Failed to seed projects: ${error.message}`);
  }

  return data as TestProject[];
}

/**
 * Seed single-shot income with test data
 * Single-shot income is stored in the projects table with type='single_shot'
 */
export async function seedSingleShotIncome(
  income: TestSingleShotIncome[]
): Promise<TestSingleShotIncome[]> {
  const client = getAdminClient();
  const userId = await getUserIdFromEmail(TEST_USER_EMAIL);
  
  const { data, error } = await client
    .from('projects')
    .insert(income.map((i) => ({
      user_id: userId,
      type: 'single_shot',
      name: i.name,
      amount: i.amount,
      date: i.date,
      certainty: i.certainty,
      // Single-shot doesn't need these recurring fields
      frequency: null,
      payment_schedule: null,
      is_active: null,
    })))
    .select();

  if (error) {
    throw new Error(`Failed to seed single-shot income: ${error.message}`);
  }

  return data as TestSingleShotIncome[];
}

/**
 * Seed credit cards with test data
 */
export async function seedCreditCards(cards: TestCreditCard[]): Promise<TestCreditCard[]> {
  const client = getAdminClient();
  const { data, error } = await client
    .from('credit_cards')
    .insert(cards.map((c) => ({
      name: c.name,
      statement_balance: c.statement_balance,
      due_day: c.due_day,
    })))
    .select();

  if (error) {
    throw new Error(`Failed to seed credit cards: ${error.message}`);
  }

  return data as TestCreditCard[];
}

/**
 * Seed complete test scenario with all entity types
 */
export async function seedFullScenario(data: {
  accounts?: TestAccount[];
  expenses?: TestExpense[];
  singleShotExpenses?: TestSingleShotExpense[];
  projects?: TestProject[];
  singleShotIncome?: TestSingleShotIncome[];
  creditCards?: TestCreditCard[];
}): Promise<void> {
  if (data.accounts?.length) {
    await seedAccounts(data.accounts);
  }
  if (data.expenses?.length) {
    await seedExpenses(data.expenses);
  }
  if (data.singleShotExpenses?.length) {
    await seedSingleShotExpenses(data.singleShotExpenses);
  }
  if (data.projects?.length) {
    await seedProjects(data.projects);
  }
  if (data.singleShotIncome?.length) {
    await seedSingleShotIncome(data.singleShotIncome);
  }
  if (data.creditCards?.length) {
    await seedCreditCards(data.creditCards);
  }
}

/**
 * Database fixture object for use with Playwright fixtures
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

