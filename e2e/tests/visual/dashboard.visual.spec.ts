/**
 * Visual Regression Tests: Dashboard Page
 * Tests visual appearance of dashboard in various states and themes
 *
 * IMPORTANT: Each test explicitly resets the database to ensure isolation.
 * This is necessary because tests run in parallel and the page reload
 * in setTheme() could show stale data from previous tests.
 *
 * @visual
 */

import { visualTest } from '../../fixtures/visual-test-base';
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
  // Additional wait for chart animations to complete
  await page.waitForTimeout(1000);
}

visualTest.describe('Dashboard Visual Regression @visual', () => {
  visualTest(
    'dashboard - light empty',
    async ({ page, dashboardPage, db, visual }) => {
      await db.clear(); // Smart clear - only resets if data was seeded
      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-light-empty.png');
    }
  );

  visualTest(
    'dashboard - dark empty',
    async ({ page, dashboardPage, db, visual }) => {
      await db.clear(); // Smart clear - only resets if data was seeded
      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-dark-empty.png');
    }
  );

  visualTest(
    'dashboard - light populated',
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

      await visual.takeScreenshot(page, 'dashboard-light-populated.png');
    }
  );

  visualTest(
    'dashboard - dark populated',
    async ({ page, dashboardPage, db, visual }) => {
      await db.clear();

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
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      // Wait for chart to stabilize (fixed wait to avoid flakiness)
      await waitForChartToStabilize(page);

      await visual.takeScreenshot(page, 'dashboard-dark-populated.png');
    }
  );

  visualTest(
    'dashboard - light estimated',
    async ({ page, dashboardPage, db, visual }) => {
      await db.clear();

      await db.seedAccounts([
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 50_000_00 }),
      ]);
      await db.setCheckingAccountsBalanceUpdatedAt('2025-01-05T12:00:00Z');
      await db.seedSingleShotExpenses([
        { name: 'Despesa no intervalo', amount: 25_00, date: '2025-01-10' },
      ]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);
      await waitForChartToStabilize(page);

      await visual.takeScreenshot(page, 'dashboard-light-estimated.png');
    }
  );

  visualTest(
    'dashboard - dark estimated',
    async ({ page, dashboardPage, db, visual }) => {
      await db.clear();

      await db.seedAccounts([
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 50_000_00 }),
      ]);
      await db.setCheckingAccountsBalanceUpdatedAt('2025-01-05T12:00:00Z');
      await db.seedSingleShotExpenses([
        { name: 'Despesa no intervalo', amount: 25_00, date: '2025-01-10' },
      ]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);
      await waitForChartToStabilize(page);

      await visual.takeScreenshot(page, 'dashboard-dark-estimated.png');
    }
  );

  visualTest(
    'dashboard - light no-estimate',
    async ({ page, dashboardPage, db, visual }) => {
      await db.clear();

      await db.seedAccounts([
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 50_000_00 }),
      ]);
      // Base is today => empty interval (base, today] => no estimate marker
      await db.setCheckingAccountsBalanceUpdatedAt('2025-01-15T12:00:00Z');

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);
      await waitForChartToStabilize(page);

      await visual.takeScreenshot(page, 'dashboard-light-no-estimate.png');
    }
  );

  visualTest(
    'dashboard - dark no-estimate',
    async ({ page, dashboardPage, db, visual }) => {
      await db.clear();

      await db.seedAccounts([
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 50_000_00 }),
      ]);
      await db.setCheckingAccountsBalanceUpdatedAt('2025-01-15T12:00:00Z');

      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);
      await waitForChartToStabilize(page);

      await visual.takeScreenshot(page, 'dashboard-dark-no-estimate.png');
    }
  );

  visualTest(
    'dashboard - light no-base',
    async ({ page, dashboardPage, db, visual }) => {
      await db.clear();

      // No balance_updated_at => "no reliable base" state
      await db.seedAccounts([
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 50_000_00 }),
      ]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-light-no-base.png');
    }
  );

  visualTest(
    'dashboard - dark no-base',
    async ({ page, dashboardPage, db, visual }) => {
      await db.clear();

      await db.seedAccounts([
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 50_000_00 }),
      ]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-dark-no-base.png');
    }
  );
  visualTest(
    'dashboard - light health caution (near zero)',
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

      await visual.takeScreenshot(page, 'dashboard-light-health-caution.png');
    }
  );

  visualTest(
    'dashboard - dark health caution (near zero)',
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
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);
      await waitForChartToStabilize(page);

      await visual.takeScreenshot(page, 'dashboard-dark-health-caution.png');
    }
  );

  visualTest(
    'dashboard - light health warning (pessimistic danger only)',
    async ({ page, dashboardPage, db, visual }) => {
      await db.clear();

      await db.seedAccounts([
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 1_000_00 }),
      ]);
      await db.setCheckingAccountsBalanceUpdatedAt('2025-01-15T12:00:00Z');

      await db.seedSingleShotExpenses([
        { name: 'Despesa no dia', amount: 2_000_00, date: '2025-01-16' },
      ]);
      await db.seedSingleShotIncome([
        {
          name: 'Receita provável no dia',
          amount: 2_000_00,
          date: '2025-01-16',
          certainty: 'probable',
        },
      ]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);
      await waitForChartToStabilize(page);

      await visual.takeScreenshot(page, 'dashboard-light-health-warning.png');
    }
  );

  visualTest(
    'dashboard - dark health warning (pessimistic danger only)',
    async ({ page, dashboardPage, db, visual }) => {
      await db.clear();

      await db.seedAccounts([
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 1_000_00 }),
      ]);
      await db.setCheckingAccountsBalanceUpdatedAt('2025-01-15T12:00:00Z');

      await db.seedSingleShotExpenses([
        { name: 'Despesa no dia', amount: 2_000_00, date: '2025-01-16' },
      ]);
      await db.seedSingleShotIncome([
        {
          name: 'Receita provável no dia',
          amount: 2_000_00,
          date: '2025-01-16',
          certainty: 'probable',
        },
      ]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);
      await waitForChartToStabilize(page);

      await visual.takeScreenshot(page, 'dashboard-dark-health-warning.png');
    }
  );

  visualTest(
    'dashboard - light health danger (optimistic danger)',
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

      await visual.takeScreenshot(page, 'dashboard-light-health-danger.png');
    }
  );

  visualTest(
    'dashboard - dark health danger (optimistic danger)',
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
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);
      await waitForChartToStabilize(page);

      await visual.takeScreenshot(page, 'dashboard-dark-health-danger.png');
    }
  );

  visualTest(
    'dashboard - light health stale',
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

      await visual.takeScreenshot(page, 'dashboard-light-health-stale.png');
    }
  );

  visualTest(
    'dashboard - dark health stale',
    async ({ page, dashboardPage, db, visual }) => {
      await db.clear();

      await db.seedAccounts([
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 50_000_00 }),
      ]);
      await db.setCheckingAccountsBalanceUpdatedAt('2024-11-01T12:00:00Z');

      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-dark-health-stale.png');
    }
  );
});

