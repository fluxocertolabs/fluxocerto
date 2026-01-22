/**
 * Simplified Playwright test fixtures for smoke tests.
 * Uses dev-auth-bypass for fast, reliable authentication.
 * Uses direct PostgreSQL connection for database operations (bypasses PostgREST schema cache issues).
 */

import { test as base, expect } from '@playwright/test';
import { Client as PgClient } from 'pg';
import { LoginPage } from '../pages/login-page';
import { DashboardPage } from '../pages/dashboard-page';
import { ManagePage } from '../pages/manage-page';
import { QuickUpdatePage } from '../pages/quick-update-page';
import { HistoryPage } from '../pages/history-page';
import { SnapshotDetailPage } from '../pages/snapshot-detail-page';

/** PostgreSQL connection config for local Supabase */
const PG_CONFIG = {
  host: 'localhost',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
};

/**
 * Execute SQL with parameters
 */
async function executeSQL(sql: string, params?: unknown[]): Promise<void> {
  const client = new PgClient(PG_CONFIG);
  try {
    await client.connect();
    await client.query(sql, params);
  } finally {
    await client.end();
  }
}

/**
 * Execute SQL and return results
 */
async function executeSQLWithResult<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
  const client = new PgClient(PG_CONFIG);
  try {
    await client.connect();
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    await client.end();
  }
}

/**
 * Database fixture for smoke tests.
 * Uses direct PostgreSQL connection to avoid PostgREST schema cache issues.
 * 
 * Schema notes:
 * - accounts: bank accounts (checking, savings, investment)
 * - expenses: both fixed (type='fixed', due_day) and single-shot (type='single_shot', date)
 * - projects: both recurring (type='recurring') and single-shot income (type='single_shot')
 * - credit_cards: credit card accounts
 */
interface SmokeDbFixture {
  /** Clear all test data */
  clear(): Promise<void>;
  /** Seed billing subscription for the group */
  seedBillingSubscription(options?: {
    status?: string;
    trial_end?: string | null;
    current_period_end?: string | null;
    cancel_at_period_end?: boolean;
  }): Promise<void>;
  /** Remove billing subscription for the group */
  clearBillingSubscription(): Promise<void>;
  /** Seed bank accounts */
  seedAccounts(accounts: Array<{
    name: string;
    type?: 'checking' | 'savings' | 'investment';
    balance: number;
    balance_updated_at?: string;
  }>): Promise<Array<{ id: string; name: string }>>;
  /** Seed projects (recurring income) */
  seedProjects(projects: Array<{
    name: string;
    amount: number;
    certainty?: 'guaranteed' | 'probable' | 'uncertain';
    frequency?: 'weekly' | 'biweekly' | 'monthly';
    payment_schedule?: { type: string; dayOfMonth?: number };
  }>): Promise<void>;
  /** Seed fixed expenses */
  seedExpenses(expenses: Array<{
    name: string;
    amount: number;
    due_day?: number;
  }>): Promise<void>;
  /** Seed single-shot expenses */
  seedSingleShotExpenses(expenses: Array<{
    name: string;
    amount: number;
    date: string;
  }>): Promise<void>;
  /** Seed single-shot income */
  seedSingleShotIncome(income: Array<{
    name: string;
    amount: number;
    date: string;
    certainty?: 'guaranteed' | 'probable' | 'uncertain';
  }>): Promise<void>;
  /** Seed credit cards */
  seedCreditCards(cards: Array<{
    name: string;
    statement_balance: number;
    due_day?: number;
  }>): Promise<void>;
  /** Set balance_updated_at for all checking accounts */
  setCheckingAccountsBalanceUpdatedAt(timestamp: string): Promise<void>;
  /** Set balance_updated_at for all accounts */
  setAccountsBalanceUpdatedAt(timestamp: string): Promise<void>;
  /** Set balance_updated_at for all credit cards */
  setCreditCardsBalanceUpdatedAt(timestamp: string): Promise<void>;
}

function createSmokeDbFixture(groupId: string): SmokeDbFixture {
  return {
    async clear() {
      // Clear all data for this group in reverse dependency order
      // Use correct table names based on actual schema
      await executeSQL(`DELETE FROM public.billing_subscriptions WHERE group_id = $1`, [groupId]);
      await executeSQL(`DELETE FROM public.future_statements WHERE group_id = $1`, [groupId]);
      await executeSQL(`DELETE FROM public.expenses WHERE group_id = $1`, [groupId]);
      await executeSQL(`DELETE FROM public.credit_cards WHERE group_id = $1`, [groupId]);
      await executeSQL(`DELETE FROM public.projects WHERE group_id = $1`, [groupId]);
      await executeSQL(`DELETE FROM public.accounts WHERE group_id = $1`, [groupId]);
    },

    async seedBillingSubscription(options) {
      const now = new Date();
      const nextPeriod = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const status = options?.status ?? 'active';
      const trialEnd = options?.trial_end ?? null;
      const currentPeriodEnd = options?.current_period_end ?? nextPeriod;
      const cancelAtPeriodEnd = options?.cancel_at_period_end ?? false;

      await executeSQL(
        `INSERT INTO public.billing_subscriptions (
          group_id,
          status,
          trial_end,
          current_period_end,
          cancel_at_period_end
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (group_id)
        DO UPDATE SET
          status = EXCLUDED.status,
          trial_end = EXCLUDED.trial_end,
          current_period_end = EXCLUDED.current_period_end,
          cancel_at_period_end = EXCLUDED.cancel_at_period_end`,
        [groupId, status, trialEnd, currentPeriodEnd, cancelAtPeriodEnd]
      );
    },

    async clearBillingSubscription() {
      await executeSQL(`DELETE FROM public.billing_subscriptions WHERE group_id = $1`, [groupId]);
    },

    async seedAccounts(accounts) {
      const results: Array<{ id: string; name: string }> = [];
      for (const a of accounts) {
        const rows = await executeSQLWithResult<{ id: string; name: string }>(
          `INSERT INTO public.accounts (group_id, name, type, balance, balance_updated_at)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, name`,
          [groupId, a.name, a.type || 'checking', a.balance, a.balance_updated_at || new Date().toISOString()]
        );
        if (rows.length > 0) results.push(rows[0]);
      }
      return results;
    },

    async seedProjects(projects) {
      for (const p of projects) {
        await executeSQL(
          `INSERT INTO public.projects (group_id, name, amount, certainty, type, frequency, payment_schedule, is_active)
           VALUES ($1, $2, $3, $4, 'recurring', $5, $6, true)`,
          [
            groupId,
            p.name,
            p.amount,
            p.certainty || 'guaranteed',
            p.frequency || 'monthly',
            JSON.stringify(p.payment_schedule || { type: 'dayOfMonth', dayOfMonth: 1 }),
          ]
        );
      }
    },

    async seedExpenses(expenses) {
      for (const e of expenses) {
        await executeSQL(
          `INSERT INTO public.expenses (group_id, name, amount, type, due_day, is_active)
           VALUES ($1, $2, $3, 'fixed', $4, true)`,
          [groupId, e.name, e.amount, e.due_day || 1]
        );
      }
    },

    async seedSingleShotExpenses(expenses) {
      for (const e of expenses) {
        await executeSQL(
          `INSERT INTO public.expenses (group_id, name, amount, type, date, is_active)
           VALUES ($1, $2, $3, 'single_shot', $4, true)`,
          [groupId, e.name, e.amount, e.date]
        );
      }
    },

    async seedSingleShotIncome(income) {
      for (const i of income) {
        await executeSQL(
          `INSERT INTO public.projects (group_id, name, amount, certainty, type, date)
           VALUES ($1, $2, $3, $4, 'single_shot', $5)`,
          [groupId, i.name, i.amount, i.certainty || 'guaranteed', i.date]
        );
      }
    },

    async seedCreditCards(cards) {
      for (const c of cards) {
        const dueDay = c.due_day || 15;
        const closingDay = ((dueDay - 7 + 30) % 30) || 8;
        await executeSQL(
          `INSERT INTO public.credit_cards (group_id, name, statement_balance, due_day, closing_day)
           VALUES ($1, $2, $3, $4, $5)`,
          [groupId, c.name, c.statement_balance, dueDay, closingDay]
        );
      }
    },

    async setCheckingAccountsBalanceUpdatedAt(timestamp: string) {
      await executeSQL(
        `UPDATE public.accounts SET balance_updated_at = $1 WHERE group_id = $2 AND type = 'checking'`,
        [timestamp, groupId]
      );
    },

    async setAccountsBalanceUpdatedAt(timestamp: string) {
      await executeSQL(
        `UPDATE public.accounts SET balance_updated_at = $1 WHERE group_id = $2`,
        [timestamp, groupId]
      );
    },

    async setCreditCardsBalanceUpdatedAt(timestamp: string) {
      await executeSQL(
        `UPDATE public.credit_cards SET balance_updated_at = $1 WHERE group_id = $2`,
        [timestamp, groupId]
      );
    },
  };
}

/**
 * Custom test fixtures type
 */
type SmokeTestFixtures = {
  /** Database fixture for seeding/clearing data */
  db: SmokeDbFixture;
  /** Login page object */
  loginPage: LoginPage;
  /** Dashboard page object */
  dashboardPage: DashboardPage;
  /** Manage page object */
  managePage: ManagePage;
  /** Quick update page object */
  quickUpdatePage: QuickUpdatePage;
  /** History page object */
  historyPage: HistoryPage;
  /** Snapshot detail page object */
  snapshotDetailPage: SnapshotDetailPage;
};

type SmokeWorkerFixtures = {
  /** Group ID for test data */
  groupId: string;
};

/**
 * Extended test with smoke test fixtures.
 * Uses dev-auth-bypass for fast authentication.
 */
export const test = base.extend<SmokeTestFixtures, SmokeWorkerFixtures>({
  // Worker-scoped group ID (gets the dev user's group)
  groupId: [
    async ({}, use) => {
      // Get the dev user's group from the profile using direct SQL
      const rows = await executeSQLWithResult<{ group_id: string }>(
        `SELECT group_id FROM public.profiles WHERE email = $1`,
        ['dev@local']
      );
      
      if (rows.length === 0 || !rows[0].group_id) {
        throw new Error(
          `Failed to get dev user group. Run 'pnpm run gen:token' first.`
        );
      }
      await use(rows[0].group_id);
    },
    { scope: 'worker' },
  ],

  // Page fixture - no pre-navigation needed
  // The dev-auth-bypass tokens are injected when the app loads at any route
  // via main.tsx's bootstrap function

  // Database fixture
  db: async ({ groupId }, use) => {
    const dbFixture = createSmokeDbFixture(groupId);
    // Clear data before each test
    await dbFixture.clear();
    await dbFixture.seedBillingSubscription();
    await use(dbFixture);
  },

  // Page Objects
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  managePage: async ({ page }, use) => {
    await use(new ManagePage(page));
  },

  quickUpdatePage: async ({ page }, use) => {
    await use(new QuickUpdatePage(page));
  },

  historyPage: async ({ page }, use) => {
    await use(new HistoryPage(page));
  },

  snapshotDetailPage: async ({ page }, use) => {
    await use(new SnapshotDetailPage(page));
  },
});

export { expect };
