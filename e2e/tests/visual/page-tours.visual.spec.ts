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
import {
  startTourViaFloatingHelp,
  advanceTourStep,
  getCloseTourButton,
} from '../../utils/floating-help';

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

      // Start tour via floating help button using the stable helper
      await startTourViaFloatingHelp(page);

      // Verify tour is active before screenshot
      await expect(getCloseTourButton(page)).toBeVisible();

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
      await expect(getCloseTourButton(page)).toBeVisible();
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

      // Advance to step 2 using the helper (waits for next button to be visible)
      await advanceTourStep(page);

      // Verify we're still in tour mode
      await expect(getCloseTourButton(page)).toBeVisible();

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

      // Advance to step 2 using the helper
      await advanceTourStep(page);

      await expect(getCloseTourButton(page)).toBeVisible();
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
      await expect(getCloseTourButton(page)).toBeVisible();
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
      await expect(getCloseTourButton(page)).toBeVisible();
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
      await expect(getCloseTourButton(page)).toBeVisible();
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
      await expect(getCloseTourButton(page)).toBeVisible();
      await visual.takeScreenshot(page, 'history-tour-step1-dark.png');
    });
  });
});
