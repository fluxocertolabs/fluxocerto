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
import { createAccount, createFullSeedData } from '../../utils/test-data';

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
      const seedData = createFullSeedData();
      await db.seedFullScenario(seedData);

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
      const seedData = createFullSeedData();
      await db.seedFullScenario(seedData);

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
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 100_00 }),
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
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 100_00 }),
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
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 100_00 }),
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
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 100_00 }),
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
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 100_00 }),
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
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 100_00 }),
      ]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-dark-no-base.png');
    }
  );
});

