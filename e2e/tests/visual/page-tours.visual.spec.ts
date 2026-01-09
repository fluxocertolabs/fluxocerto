/**
 * Visual Regression Tests: Page Tours
 * Tests visual appearance of tour overlays and step highlights
 *
 * Uses the standard visual test fixtures with pre-authenticated users.
 * Tours are triggered via the floating help button (the real UX entry point).
 *
 * @visual
 */

import { visualTest, expect } from '../../fixtures/visual-test-base';
import {
  createAccount,
  createProject,
  createExpense,
} from '../../utils/test-data';

/**
 * Helper to start a tour via the floating help button.
 * Uses click (pinned mode) to reliably expand on both desktop and mobile.
 * Includes retry logic to handle timing issues in CI environments.
 */
async function startTourViaFloatingHelp(page: import('@playwright/test').Page) {
  const helpButton = page.locator('[data-testid="floating-help-button"]');
  
  // Wait for floating help button with retry logic
  await expect(async () => {
    await expect(helpButton).toBeVisible();
  }).toPass({ timeout: 15000, intervals: [500, 1000, 2000] });

  // Click the FAB to expand (pinned mode) with retry logic
  const fabButton = helpButton.getByRole('button', { name: /abrir ajuda/i });
  await expect(async () => {
    await expect(fabButton).toBeVisible();
    await fabButton.click({ force: true });
  }).toPass({ timeout: 15000, intervals: [500, 1000, 2000] });

  // Wait for menu to fully expand before looking for tour option
  await page.waitForTimeout(500);

  // Wait for menu to expand and click the tour option
  // Use longer timeout as menu expansion can be slow in CI
  const tourOption = page.getByRole('button', { name: /iniciar tour guiado/i });
  await expect(async () => {
    await expect(tourOption).toBeVisible();
    await tourOption.click({ force: true });
  }).toPass({ timeout: 20000, intervals: [500, 1000, 2000, 3000] });

  // Assert tour started
  const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
  await expect(closeTourButton).toBeVisible({ timeout: 15000 });
}

visualTest.describe('Page Tours Visual Regression @visual', () => {
  visualTest.describe('Dashboard Tour', () => {
    visualTest('dashboard tour - step 1 (projection selector) - light', async ({
      page,
      dashboardPage,
      db,
      visual,
    }) => {
      // Seed minimal data for dashboard to show content
      await db.clear();
      await db.seedAccounts([createAccount({ name: 'Nubank', balance: 500000 })]);
      await db.seedProjects([createProject({ name: 'Salário', amount: 800000 })]);
      await db.seedExpenses([createExpense({ name: 'Aluguel', amount: 200000 })]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Start tour via floating help button (MUST work - no conditional)
      await startTourViaFloatingHelp(page);

      // Take screenshot of tour step 1
      await visual.takeScreenshot(page, 'dashboard-tour-step1-light.png');
    });

    visualTest('dashboard tour - step 1 (projection selector) - dark', async ({
      page,
      dashboardPage,
      db,
      visual,
    }) => {
      await db.clear();
      await db.seedAccounts([createAccount({ name: 'Nubank', balance: 500000 })]);
      await db.seedProjects([createProject({ name: 'Salário', amount: 800000 })]);
      await db.seedExpenses([createExpense({ name: 'Aluguel', amount: 200000 })]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await startTourViaFloatingHelp(page);
      await visual.takeScreenshot(page, 'dashboard-tour-step1-dark.png');
    });

    visualTest('dashboard tour - step 2 (cashflow chart) - light', async ({
      page,
      dashboardPage,
      db,
      visual,
    }) => {
      await db.clear();
      await db.seedAccounts([createAccount({ name: 'Nubank', balance: 500000 })]);
      await db.seedProjects([createProject({ name: 'Salário', amount: 800000 })]);
      await db.seedExpenses([createExpense({ name: 'Aluguel', amount: 200000 })]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await startTourViaFloatingHelp(page);

      // Advance to step 2
      const nextButton = page.getByRole('button', { name: /próximo/i });
      await expect(nextButton).toBeVisible();
      await nextButton.click();
      await page.waitForTimeout(300);

      await visual.takeScreenshot(page, 'dashboard-tour-step2-light.png');
    });

    visualTest('dashboard tour - step 2 (cashflow chart) - dark', async ({
      page,
      dashboardPage,
      db,
      visual,
    }) => {
      await db.clear();
      await db.seedAccounts([createAccount({ name: 'Nubank', balance: 500000 })]);
      await db.seedProjects([createProject({ name: 'Salário', amount: 800000 })]);
      await db.seedExpenses([createExpense({ name: 'Aluguel', amount: 200000 })]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await startTourViaFloatingHelp(page);

      const nextButton = page.getByRole('button', { name: /próximo/i });
      await expect(nextButton).toBeVisible();
      await nextButton.click();
      await page.waitForTimeout(300);

      await visual.takeScreenshot(page, 'dashboard-tour-step2-dark.png');
    });
  });

  visualTest.describe('Manage Tour', () => {
    visualTest('manage tour - step 1 (tabs) - light', async ({
      page,
      managePage,
      db,
      visual,
    }) => {
      await db.clear();
      await db.seedAccounts([createAccount({ name: 'Nubank', balance: 500000 })]);

      await managePage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await startTourViaFloatingHelp(page);
      await visual.takeScreenshot(page, 'manage-tour-step1-light.png');
    });

    visualTest('manage tour - step 1 (tabs) - dark', async ({
      page,
      managePage,
      db,
      visual,
    }) => {
      await db.clear();
      await db.seedAccounts([createAccount({ name: 'Nubank', balance: 500000 })]);

      await managePage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await startTourViaFloatingHelp(page);
      await visual.takeScreenshot(page, 'manage-tour-step1-dark.png');
    });
  });

  visualTest.describe('History Tour', () => {
    visualTest('history tour - step 1 (snapshot list) - light', async ({
      page,
      historyPage,
      db,
      visual,
    }) => {
      await db.clear();

      await historyPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await startTourViaFloatingHelp(page);
      await visual.takeScreenshot(page, 'history-tour-step1-light.png');
    });

    visualTest('history tour - step 1 (snapshot list) - dark', async ({
      page,
      historyPage,
      db,
      visual,
    }) => {
      await db.clear();

      await historyPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await startTourViaFloatingHelp(page);
      await visual.takeScreenshot(page, 'history-tour-step1-dark.png');
    });
  });
});
