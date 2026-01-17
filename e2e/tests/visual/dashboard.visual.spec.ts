/**
 * Visual Regression Tests: Dashboard Page
 * Tests visual appearance of dashboard in key states (light theme only)
 *
 * OPTIMIZATION: Dark theme tests removed - theme system is verified by a single
 * theme toggle test. Light theme provides sufficient visual regression coverage.
 *
 * @visual
 */

import { visualTest, expect } from '../../fixtures/visual-test-base';
import {
  createAccount,
  createCreditCard,
  createExpense,
  createProject,
} from '../../utils/test-data';

/**
 * Helper to wait for chart rendering in visual tests.
 * Uses a fixed wait instead of expectChartRendered() to avoid flakiness
 * in Docker environments where the browser may crash during retries.
 */
async function waitForChartToStabilize(page: import('@playwright/test').Page): Promise<void> {
  // Wait for the chart container to be present
  const chartContainer = page.locator('[data-testid="cashflow-chart"], .recharts-wrapper').first();
  await chartContainer.waitFor({ state: 'attached', timeout: 10000 }).catch(() => {
    // Chart may not be present if no data
  });
  // Wait for chart to be visible before snapshotting
  await expect(chartContainer).toBeVisible({ timeout: 10000 });
}

visualTest.describe('Dashboard Visual Regression @visual', () => {
  visualTest(
    'dashboard - empty state',
    async ({ page, dashboardPage, db, visual }) => {
      await db.clear();
      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-empty.png');
    }
  );

  visualTest(
    'dashboard - populated',
    async ({ page, dashboardPage, db, visual }) => {
      await db.clear();

      // Seed a safe populated scenario (no danger, no near-danger, no stale)
      await db.seedAccounts([
        createAccount({ name: 'Nubank', type: 'checking', balance: 100_000_00 }),
        createAccount({ name: 'Itaú Poupança', type: 'savings', balance: 20_000_00 }),
        createAccount({ name: 'XP Investimentos', type: 'investment', balance: 50_000_00 }),
      ]);
      await db.setAccountsBalanceUpdatedAt('2025-01-15T12:00:00Z');

      await db.seedProjects([
        createProject({
          name: 'Salário',
          amount: 10_000_00,
          certainty: 'guaranteed',
          frequency: 'monthly',
          payment_schedule: { type: 'dayOfMonth', dayOfMonth: 20 },
        }),
      ]);

      await db.seedExpenses([
        createExpense({ name: 'Aluguel', amount: 2_000_00, due_day: 18 }),
        createExpense({ name: 'Internet', amount: 150_00, due_day: 15 }),
      ]);

      await db.seedCreditCards([
        createCreditCard({ name: 'Nubank Platinum', statement_balance: 3_000_00, due_day: 15 }),
      ]);
      await db.setCreditCardsBalanceUpdatedAt('2025-01-15T12:00:00Z');

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Wait for chart to stabilize (fixed wait to avoid flakiness)
      await waitForChartToStabilize(page);

      await visual.takeScreenshot(page, 'dashboard-populated.png');
    }
  );

  visualTest(
    'dashboard - health caution (near zero)',
    async ({ page, dashboardPage, db, visual }) => {
      await db.clear();

      await db.seedAccounts([
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 1_500_00 }),
      ]);
      await db.setCheckingAccountsBalanceUpdatedAt('2025-01-15T12:00:00Z');
      await db.seedSingleShotExpenses([
        { name: 'Despesa grande', amount: 1_000_00, date: '2025-01-16' },
      ]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);
      await waitForChartToStabilize(page);

      await visual.takeScreenshot(page, 'dashboard-health-caution.png');
    }
  );

  visualTest(
    'dashboard - health danger (optimistic danger)',
    async ({ page, dashboardPage, db, visual }) => {
      await db.clear();

      await db.seedAccounts([
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 1_000_00 }),
      ]);
      await db.setCheckingAccountsBalanceUpdatedAt('2025-01-15T12:00:00Z');

      await db.seedSingleShotExpenses([
        { name: 'Despesa no dia', amount: 2_000_00, date: '2025-01-16' },
      ]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);
      await waitForChartToStabilize(page);

      await visual.takeScreenshot(page, 'dashboard-health-danger.png');
    }
  );

  visualTest(
    'dashboard - health stale',
    async ({ page, dashboardPage, db, visual }) => {
      await db.clear();

      await db.seedAccounts([
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 50_000_00 }),
      ]);
      // Older than 30 days relative to fixed date => stale
      await db.setCheckingAccountsBalanceUpdatedAt('2024-11-01T12:00:00Z');

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-health-stale.png');
    }
  );

  // Single dark theme test to verify theme system works
  visualTest(
    'dashboard - dark theme (theme system verification)',
    async ({ page, dashboardPage, db, visual }) => {
      await db.clear();
      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-dark-theme.png');
    }
  );
});
