/**
 * Mobile Visual Regression Tests
 * Tests visual appearance on mobile viewport sizes
 *
 * @visual
 */

import { visualTest, expect } from '../../fixtures/visual-test-base';
import {
  createAccount,
  createExpense,
  createProject,
  createCreditCard,
} from '../../utils/test-data';

/**
 * Mobile Visual Regression Tests
 *
 * Uses Pixel 5 viewport (393x851) for mobile testing.
 * Tests key pages in both empty and populated states.
 */
visualTest.describe('Mobile Visual Regression @visual', () => {
  visualTest.describe('Dashboard Mobile', () => {
    visualTest('dashboard - mobile light empty', async ({ page, dashboardPage, db, visual }) => {
      await db.resetDatabase();
      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-mobile-light-empty.png');
    });

    visualTest('dashboard - mobile dark empty', async ({ page, dashboardPage, db, visual }) => {
      await db.resetDatabase();
      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-mobile-dark-empty.png');
    });

    visualTest('dashboard - mobile light populated', async ({ page, dashboardPage, db, visual }) => {
      // Seed data for a realistic dashboard view
      await db.seedAccounts([
        createAccount({ name: 'Nubank', type: 'checking', balance: 500000 }),
        createAccount({ name: 'Itaú', type: 'savings', balance: 200000 }),
      ]);

      await db.seedProjects([
        createProject({ name: 'Salário', amount: 800000, certainty: 'guaranteed' }),
      ]);

      await db.seedExpenses([
        createExpense({ name: 'Aluguel', amount: 200000, due_day: 10 }),
        createExpense({ name: 'Internet', amount: 15000, due_day: 15 }),
      ]);

      await db.seedCreditCards([
        createCreditCard({ name: 'Nubank', statement_balance: 150000, due_day: 15 }),
      ]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-mobile-light-populated.png');
    });

    visualTest('dashboard - mobile dark populated', async ({ page, dashboardPage, db, visual }) => {
      await db.seedAccounts([
        createAccount({ name: 'Nubank', type: 'checking', balance: 500000 }),
        createAccount({ name: 'Itaú', type: 'savings', balance: 200000 }),
      ]);

      await db.seedProjects([
        createProject({ name: 'Salário', amount: 800000, certainty: 'guaranteed' }),
      ]);

      await db.seedExpenses([
        createExpense({ name: 'Aluguel', amount: 200000, due_day: 10 }),
        createExpense({ name: 'Internet', amount: 15000, due_day: 15 }),
      ]);

      await db.seedCreditCards([
        createCreditCard({ name: 'Nubank', statement_balance: 150000, due_day: 15 }),
      ]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-mobile-dark-populated.png');
    });
  });

  visualTest.describe('Manage Lists Mobile', () => {
    // Even though accounts is the default tab, explicitly selecting it ensures
    // the tab content is fully loaded before taking screenshots
    visualTest('accounts list - mobile light', async ({ page, managePage, db, visual }) => {
      await db.seedAccounts([
        createAccount({ name: 'Nubank', type: 'checking', balance: 500000 }),
        createAccount({ name: 'Itaú Poupança', type: 'savings', balance: 200000 }),
        createAccount({ name: 'XP', type: 'investment', balance: 1000000 }),
      ]);

      await managePage.goto();
      await managePage.selectAccountsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-accounts-mobile-light.png');
    });

    visualTest('accounts list - mobile dark', async ({ page, managePage, db, visual }) => {
      await db.seedAccounts([
        createAccount({ name: 'Nubank', type: 'checking', balance: 500000 }),
        createAccount({ name: 'Itaú Poupança', type: 'savings', balance: 200000 }),
        createAccount({ name: 'XP', type: 'investment', balance: 1000000 }),
      ]);

      await managePage.goto();
      await managePage.selectAccountsTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-accounts-mobile-dark.png');
    });

    visualTest('expenses list - mobile light', async ({ page, managePage, db, visual }) => {
      await db.seedExpenses([
        createExpense({ name: 'Aluguel', amount: 200000, due_day: 10 }),
        createExpense({ name: 'Internet', amount: 15000, due_day: 15 }),
        createExpense({ name: 'Energia', amount: 25000, due_day: 20 }),
      ]);

      await managePage.goto();
      await managePage.selectExpensesTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-expenses-mobile-light.png');
    });

    visualTest('expenses list - mobile dark', async ({ page, managePage, db, visual }) => {
      await db.seedExpenses([
        createExpense({ name: 'Aluguel', amount: 200000, due_day: 10 }),
        createExpense({ name: 'Internet', amount: 15000, due_day: 15 }),
        createExpense({ name: 'Energia', amount: 25000, due_day: 20 }),
      ]);

      await managePage.goto();
      await managePage.selectExpensesTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-expenses-mobile-dark.png');
    });

    visualTest('projects list - mobile light', async ({ page, managePage, db, visual }) => {
      await db.seedProjects([
        createProject({ name: 'Salário', amount: 800000, certainty: 'guaranteed' }),
        createProject({ name: 'Freelance', amount: 200000, certainty: 'probable' }),
      ]);

      await managePage.goto();
      await managePage.selectProjectsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-projects-mobile-light.png');
    });

    visualTest('projects list - mobile dark', async ({ page, managePage, db, visual }) => {
      await db.seedProjects([
        createProject({ name: 'Salário', amount: 800000, certainty: 'guaranteed' }),
        createProject({ name: 'Freelance', amount: 200000, certainty: 'probable' }),
      ]);

      await managePage.goto();
      await managePage.selectProjectsTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-projects-mobile-dark.png');
    });

    visualTest('credit cards list - mobile light', async ({ page, managePage, db, visual }) => {
      await db.seedCreditCards([
        createCreditCard({ name: 'Nubank Platinum', statement_balance: 300000, due_day: 15 }),
        createCreditCard({ name: 'Itaú Visa', statement_balance: 150000, due_day: 10 }),
      ]);

      await managePage.goto();
      await managePage.selectCreditCardsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      const creditCards = managePage.creditCards();
      await creditCards.waitForLoad();

      await visual.takeScreenshot(page, 'manage-credit-cards-mobile-light.png');
    });

    visualTest('credit cards list - mobile dark', async ({ page, managePage, db, visual }) => {
      await db.seedCreditCards([
        createCreditCard({ name: 'Nubank Platinum', statement_balance: 300000, due_day: 15 }),
        createCreditCard({ name: 'Itaú Visa', statement_balance: 150000, due_day: 10 }),
      ]);

      await managePage.goto();
      await managePage.selectCreditCardsTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      const creditCards = managePage.creditCards();
      await creditCards.waitForLoad();

      await visual.takeScreenshot(page, 'manage-credit-cards-mobile-dark.png');
    });
  });

  visualTest.describe('Quick Update Mobile', () => {
    visualTest('quick update - mobile light', async ({ page, dashboardPage, quickUpdatePage, db, visual }) => {
      await db.seedAccounts([
        createAccount({ name: 'Nubank', type: 'checking', balance: 500000 }),
        createAccount({ name: 'Itaú', type: 'savings', balance: 200000 }),
      ]);

      await db.seedCreditCards([
        createCreditCard({ name: 'Nubank', statement_balance: 150000, due_day: 15 }),
      ]);

      // Quick Update is opened from Dashboard
      await dashboardPage.goto();
      await dashboardPage.openQuickUpdate();
      await quickUpdatePage.waitForModal();

      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'quick-update-mobile-light.png');
    });

    visualTest('quick update - mobile dark', async ({ page, dashboardPage, quickUpdatePage, db, visual }) => {
      await db.seedAccounts([
        createAccount({ name: 'Nubank', type: 'checking', balance: 500000 }),
        createAccount({ name: 'Itaú', type: 'savings', balance: 200000 }),
      ]);

      await db.seedCreditCards([
        createCreditCard({ name: 'Nubank', statement_balance: 150000, due_day: 15 }),
      ]);

      // Quick Update is opened from Dashboard
      await dashboardPage.goto();
      await dashboardPage.openQuickUpdate();
      await quickUpdatePage.waitForModal();

      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'quick-update-mobile-dark.png');
    });
  });
});

