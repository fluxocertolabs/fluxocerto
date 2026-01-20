/**
 * Simplified Visual Test Base Fixture
 * 
 * Provides helpers for visual regression testing with:
 * - Fixed date for deterministic screenshots
 * - Theme switching
 * - Animation disabling
 * - Stable UI waiting
 */

import { test as base, expect, type Page, type Locator } from '@playwright/test';
import { Client as PgClient } from 'pg';
import { DashboardPage } from '../pages/dashboard-page';
import { ManagePage } from '../pages/manage-page';
import { QuickUpdatePage } from '../pages/quick-update-page';
import { HistoryPage } from '../pages/history-page';

/**
 * Fixed date for visual tests - ensures deterministic screenshots
 */
export const VISUAL_TEST_FIXED_DATE = new Date('2025-01-15T12:00:00.000Z');

/**
 * Theme modes supported by the app
 */
type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Disable all CSS animations for stable screenshots
 */
export async function disableAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
}

/**
 * Wait for the UI to stabilize
 */
export async function waitForStableUI(page: Page): Promise<void> {
  // Ensure the document is loaded. Visual tests run the full app (realtime, support chat, etc.)
  // so `networkidle` is often unreachable; keep any "idle" wait short and best-effort.
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {});

  // Give React a couple frames to commit layout after any async data resolves.
  // (More stable than an arbitrary long timeout, and cheap.)
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const raf =
        typeof requestAnimationFrame === 'function'
          ? requestAnimationFrame
          : (cb: FrameRequestCallback) => window.setTimeout(() => cb(performance.now()), 0);
      raf(() => raf(() => resolve()));
    });
  });

  // Give chart libraries a moment to paint after layout without using fixed sleeps.
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const raf =
        typeof requestAnimationFrame === 'function'
          ? requestAnimationFrame
          : (cb: FrameRequestCallback) => window.setTimeout(() => cb(performance.now()), 0);
      raf(() => raf(() => raf(() => resolve())));
    });
  });
}

/**
 * Set the theme mode
 */
export async function setTheme(page: Page, theme: ThemeMode): Promise<void> {
  await page.evaluate((t) => {
    localStorage.setItem('theme', t);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(t === 'system' ? 'light' : t);
  }, theme);

  // Wait for the class to be applied (no fixed sleeps).
  const expected = theme === 'system' ? 'light' : theme;
  await expect.poll(
    () => page.evaluate((cls) => document.documentElement.classList.contains(cls), expected),
    { timeout: 2000 }
  ).toBe(true);
}

/**
 * Visual test helper utilities
 */
export interface VisualTestHelpers {
  waitForStableUI(page: Page): Promise<void>;
  setTheme(page: Page, theme: ThemeMode): Promise<void>;
  takeScreenshot(page: Page, name: string, options?: { fullPage?: boolean; mask?: Locator[] }): Promise<void>;
}

/**
 * Database fixture for visual tests
 */
export interface VisualDbFixture {
  clear(): Promise<void>;
  seedAccounts(accounts: Array<{
    name: string;
    type?: 'checking' | 'savings' | 'investment';
    balance: number;
  }>): Promise<void>;
  seedProjects(projects: Array<{
    name: string;
    amount: number;
    certainty?: 'guaranteed' | 'probable' | 'uncertain';
    frequency?: 'weekly' | 'biweekly' | 'monthly';
    payment_schedule?: { type: string; dayOfMonth?: number };
  }>): Promise<void>;
  seedExpenses(expenses: Array<{
    name: string;
    amount: number;
    due_day?: number;
  }>): Promise<void>;
  seedCreditCards(cards: Array<{
    name: string;
    statement_balance: number;
    due_day?: number;
  }>): Promise<void>;
  seedSingleShotExpenses(expenses: Array<{
    name: string;
    amount: number;
    date: string;
  }>): Promise<void>;
  setCheckingAccountsBalanceUpdatedAt(timestamp: string): Promise<void>;
  setAccountsBalanceUpdatedAt(timestamp: string): Promise<void>;
  setCreditCardsBalanceUpdatedAt(timestamp: string): Promise<void>;
}

/** PostgreSQL connection config for local Supabase */
const PG_CONFIG = {
  host: 'localhost',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
};

async function executeSQL(sql: string, params?: unknown[]): Promise<void> {
  const client = new PgClient(PG_CONFIG);
  try {
    await client.connect();
    await client.query(sql, params);
  } finally {
    await client.end();
  }
}

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

function createVisualDbFixture(groupId: string): VisualDbFixture {
  return {
    async clear() {
      await executeSQL(`DELETE FROM public.future_statements WHERE group_id = $1`, [groupId]);
      await executeSQL(`DELETE FROM public.expenses WHERE group_id = $1`, [groupId]);
      await executeSQL(`DELETE FROM public.credit_cards WHERE group_id = $1`, [groupId]);
      await executeSQL(`DELETE FROM public.projects WHERE group_id = $1`, [groupId]);
      await executeSQL(`DELETE FROM public.accounts WHERE group_id = $1`, [groupId]);
    },

    async seedAccounts(accounts) {
      for (const a of accounts) {
        await executeSQL(
          `INSERT INTO public.accounts (group_id, name, type, balance, balance_updated_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [groupId, a.name, a.type || 'checking', a.balance, VISUAL_TEST_FIXED_DATE.toISOString()]
        );
      }
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

    async seedCreditCards(cards) {
      for (const c of cards) {
        const dueDay = c.due_day || 15;
        const closingDay = ((dueDay - 7 + 30) % 30) || 8;
        await executeSQL(
          `INSERT INTO public.credit_cards (group_id, name, statement_balance, due_day, closing_day, balance_updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [groupId, c.name, c.statement_balance, dueDay, closingDay, VISUAL_TEST_FIXED_DATE.toISOString()]
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
 * Test fixtures type
 */
type VisualTestFixtures = {
  db: VisualDbFixture;
  visual: VisualTestHelpers;
  dashboardPage: DashboardPage;
  managePage: ManagePage;
  quickUpdatePage: QuickUpdatePage;
  historyPage: HistoryPage;
};

type VisualWorkerFixtures = {
  groupId: string;
};

/**
 * Extended test for visual regression testing
 */
export const visualTest = base.extend<VisualTestFixtures, VisualWorkerFixtures>({
  // Worker-scoped group ID
  groupId: [
    async ({}, use) => {
      const rows = await executeSQLWithResult<{ group_id: string }>(
        `SELECT group_id FROM public.profiles WHERE email = $1 LIMIT 1`,
        ['dev@local']
      );
      if (rows.length === 0 || !rows[0].group_id) {
        throw new Error(`Failed to get dev user group. Run 'pnpm run gen:token' first.`);
      }
      await use(rows[0].group_id);
    },
    { scope: 'worker' },
  ],

  // Database fixture
  db: async ({ groupId }, use) => {
    const dbFixture = createVisualDbFixture(groupId);
    await use(dbFixture);
  },

  // Visual helpers
  visual: async ({}, use) => {
    const helpers: VisualTestHelpers = {
      async waitForStableUI(page: Page) {
        await disableAnimations(page);
        await waitForStableUI(page);
      },
      async setTheme(page: Page, theme: ThemeMode) {
        await setTheme(page, theme);
      },
      async takeScreenshot(page: Page, name: string, options?: { fullPage?: boolean; mask?: Locator[] }) {
        await expect(page).toHaveScreenshot(name, {
          fullPage: options?.fullPage ?? false,
          mask: options?.mask ?? [],
          animations: 'disabled',
        });
      },
    };
    await use(helpers);
  },

  // Page fixtures with fixed date
  dashboardPage: async ({ page }, use) => {
    await page.clock.setFixedTime(VISUAL_TEST_FIXED_DATE);
    await use(new DashboardPage(page));
  },

  managePage: async ({ page }, use) => {
    await page.clock.setFixedTime(VISUAL_TEST_FIXED_DATE);
    await use(new ManagePage(page));
  },

  quickUpdatePage: async ({ page }, use) => {
    await page.clock.setFixedTime(VISUAL_TEST_FIXED_DATE);
    await use(new QuickUpdatePage(page));
  },

  historyPage: async ({ page }, use) => {
    await page.clock.setFixedTime(VISUAL_TEST_FIXED_DATE);
    await use(new HistoryPage(page));
  },
});

export { expect };
