/**
 * Visual Regression Tests: Floating Help Button
 * Tests visual appearance of the floating help button and its expanded state
 *
 * @visual
 */

import { visualTest, expect } from '../../fixtures/visual-test-base';
import {
  createAccount,
  createProject,
  createExpense,
} from '../../utils/test-data';

visualTest.describe('Floating Help Button Visual Regression @visual', () => {
  visualTest.describe('Dashboard Page', () => {
    visualTest('floating help button - collapsed - light', async ({
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

      // The floating help button MUST be visible on dashboard
      const helpButton = page.locator('[data-testid="floating-help-button"]');
      await expect(helpButton).toBeVisible({ timeout: 10000 });
      await visual.takeScreenshot(page, 'floating-help-collapsed-dashboard-light.png');
    });

    visualTest('floating help button - collapsed - dark', async ({
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

      const helpButton = page.locator('[data-testid="floating-help-button"]');
      await expect(helpButton).toBeVisible({ timeout: 10000 });
      await visual.takeScreenshot(page, 'floating-help-collapsed-dashboard-dark.png');
    });

    visualTest('floating help button - expanded - light', async ({
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

      // Click the floating help button to expand it
      const helpButton = page.locator('[data-testid="floating-help-button"]');
      await expect(helpButton).toBeVisible({ timeout: 10000 });
      await helpButton.click();
      await page.waitForTimeout(500);
      await visual.takeScreenshot(page, 'floating-help-expanded-dashboard-light.png');
    });

    visualTest('floating help button - expanded - dark', async ({
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

      const helpButton = page.locator('[data-testid="floating-help-button"]');
      await expect(helpButton).toBeVisible({ timeout: 10000 });
      await helpButton.click();
      await page.waitForTimeout(500);
      await visual.takeScreenshot(page, 'floating-help-expanded-dashboard-dark.png');
    });
  });

  visualTest.describe('Manage Page', () => {
    visualTest('floating help button - collapsed - light', async ({
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

      const helpButton = page.locator('[data-testid="floating-help-button"]');
      await expect(helpButton).toBeVisible({ timeout: 10000 });
      await visual.takeScreenshot(page, 'floating-help-collapsed-manage-light.png');
    });

    visualTest('floating help button - collapsed - dark', async ({
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

      const helpButton = page.locator('[data-testid="floating-help-button"]');
      await expect(helpButton).toBeVisible({ timeout: 10000 });
      await visual.takeScreenshot(page, 'floating-help-collapsed-manage-dark.png');
    });

    visualTest('floating help button - expanded - light', async ({
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

      const helpButton = page.locator('[data-testid="floating-help-button"]');
      await expect(helpButton).toBeVisible({ timeout: 10000 });
      await helpButton.click();
      await page.waitForTimeout(500);
      await visual.takeScreenshot(page, 'floating-help-expanded-manage-light.png');
    });

    visualTest('floating help button - expanded - dark', async ({
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

      const helpButton = page.locator('[data-testid="floating-help-button"]');
      await expect(helpButton).toBeVisible({ timeout: 10000 });
      await helpButton.click();
      await page.waitForTimeout(500);
      await visual.takeScreenshot(page, 'floating-help-expanded-manage-dark.png');
    });
  });

  visualTest.describe('History Page', () => {
    visualTest('floating help button - collapsed - light', async ({
      page,
      historyPage,
      db,
      visual,
    }) => {
      await db.clear();

      await historyPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      const helpButton = page.locator('[data-testid="floating-help-button"]');
      await expect(helpButton).toBeVisible({ timeout: 10000 });
      await visual.takeScreenshot(page, 'floating-help-collapsed-history-light.png');
    });

    visualTest('floating help button - collapsed - dark', async ({
      page,
      historyPage,
      db,
      visual,
    }) => {
      await db.clear();

      await historyPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      const helpButton = page.locator('[data-testid="floating-help-button"]');
      await expect(helpButton).toBeVisible({ timeout: 10000 });
      await visual.takeScreenshot(page, 'floating-help-collapsed-history-dark.png');
    });
  });
});
