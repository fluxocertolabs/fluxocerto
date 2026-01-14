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
import {
  getFloatingHelpContainer,
  getFloatingHelpFAB,
  getTourOptionButton,
  openFloatingHelpMenu,
  waitForFloatingHelp,
} from '../../utils/floating-help';

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

      // Wait for the floating help button to be visible
      await waitForFloatingHelp(page);
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

      await waitForFloatingHelp(page);
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

      // Open the menu using the stable helper (handles desktop hover vs mobile click)
      await openFloatingHelpMenu(page);

      // Verify menu is expanded via aria-expanded before screenshot
      const fab = getFloatingHelpFAB(page);
      await expect(fab).toHaveAttribute('aria-expanded', 'true');
      await expect(getTourOptionButton(page)).toBeVisible();

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

      // Open the menu using the stable helper
      await openFloatingHelpMenu(page);

      // Verify menu is expanded via aria-expanded before screenshot
      const fab = getFloatingHelpFAB(page);
      await expect(fab).toHaveAttribute('aria-expanded', 'true');
      await expect(getTourOptionButton(page)).toBeVisible();

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

      await waitForFloatingHelp(page);
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

      await waitForFloatingHelp(page);
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

      // Open the menu using the stable helper
      await openFloatingHelpMenu(page);

      // Verify menu is expanded via aria-expanded before screenshot
      const fab = getFloatingHelpFAB(page);
      await expect(fab).toHaveAttribute('aria-expanded', 'true');
      await expect(getTourOptionButton(page)).toBeVisible();

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

      // Open the menu using the stable helper
      await openFloatingHelpMenu(page);

      // Verify menu is expanded via aria-expanded before screenshot
      const fab = getFloatingHelpFAB(page);
      await expect(fab).toHaveAttribute('aria-expanded', 'true');
      await expect(getTourOptionButton(page)).toBeVisible();

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

      await waitForFloatingHelp(page);
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

      await waitForFloatingHelp(page);
      await visual.takeScreenshot(page, 'floating-help-collapsed-history-dark.png');
    });
  });
});
