/**
 * Visual Regression Tests: Manage Page
 * Tests visual appearance of all manage page tabs in various states
 *
 * @visual
 */

import { visualTest } from '../../fixtures/visual-test-base';
import {
  createAccount,
  createExpense,
  createProject,
  createCreditCard,
  createSingleShotExpense,
  createSingleShotIncome,
} from '../../utils/test-data';

/**
 * Manage Page Visual Regression Tests
 * 
 * OPTIMIZATION: Tests use db.clear() which only resets if data was seeded.
 * The worker fixture already resets on setup, so consecutive "empty state" tests
 * skip the expensive reset operation. This dramatically reduces CI time.
 */
visualTest.describe('Manage Page Visual Regression @visual', () => {
  visualTest.describe('Accounts Tab', () => {
    visualTest('accounts - light empty', async ({ page, managePage, db, visual }) => {
      await db.clear(); // Smart clear - only resets if data was seeded
      await managePage.goto();
      await managePage.selectAccountsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-accounts-light-empty.png');
    });

    visualTest('accounts - dark empty', async ({ page, managePage, db, visual }) => {
      await db.clear(); // Smart clear - only resets if data was seeded
      await managePage.goto();
      await managePage.selectAccountsTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-accounts-dark-empty.png');
    });

    visualTest('accounts - light populated', async ({ page, managePage, db, visual }) => {
      await db.clear();
      await db.seedAccounts([
        createAccount({ name: 'Nubank', type: 'checking', balance: 500000 }),
        createAccount({ name: 'Itaú Poupança', type: 'savings', balance: 200000 }),
        createAccount({ name: 'XP Investimentos', type: 'investment', balance: 1000000 }),
      ]);

      await managePage.goto();
      await managePage.selectAccountsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      const accounts = managePage.accounts();
      await accounts.waitForLoad();

      await visual.takeScreenshot(page, 'manage-accounts-light-populated.png');
    });

    visualTest('accounts - dark populated', async ({ page, managePage, db, visual }) => {
      await db.clear();
      await db.seedAccounts([
        createAccount({ name: 'Nubank', type: 'checking', balance: 500000 }),
        createAccount({ name: 'Itaú Poupança', type: 'savings', balance: 200000 }),
        createAccount({ name: 'XP Investimentos', type: 'investment', balance: 1000000 }),
      ]);

      await managePage.goto();
      await managePage.selectAccountsTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      const accounts = managePage.accounts();
      await accounts.waitForLoad();

      await visual.takeScreenshot(page, 'manage-accounts-dark-populated.png');
    });
  });

  visualTest.describe('Credit Cards Tab', () => {
    visualTest('credit cards - light empty', async ({ page, managePage, db, visual }) => {
      await db.clear(); // Smart clear - only resets if data was seeded
      await managePage.goto();
      await managePage.selectCreditCardsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-credit-cards-light-empty.png');
    });

    visualTest('credit cards - dark empty', async ({ page, managePage, db, visual }) => {
      await db.clear(); // Smart clear - only resets if data was seeded
      await managePage.goto();
      await managePage.selectCreditCardsTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-credit-cards-dark-empty.png');
    });

    visualTest('credit cards - light populated', async ({ page, managePage, db, visual }) => {
      await db.clear();
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

      await visual.takeScreenshot(page, 'manage-credit-cards-light-populated.png');
    });

    visualTest('credit cards - dark populated', async ({ page, managePage, db, visual }) => {
      await db.clear();
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

      await visual.takeScreenshot(page, 'manage-credit-cards-dark-populated.png');
    });
  });

  visualTest.describe('Expenses Tab', () => {
    visualTest('expenses - light empty', async ({ page, managePage, db, visual }) => {
      await db.clear(); // Smart clear - only resets if data was seeded
      await managePage.goto();
      await managePage.selectExpensesTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-expenses-light-empty.png');
    });

    visualTest('expenses - dark empty', async ({ page, managePage, db, visual }) => {
      await db.clear(); // Smart clear - only resets if data was seeded
      await managePage.goto();
      await managePage.selectExpensesTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-expenses-dark-empty.png');
    });

    visualTest('expenses - light populated', async ({ page, managePage, db, visual }) => {
      await db.clear();
      await db.seedExpenses([
        createExpense({ name: 'Aluguel', amount: 200000, due_day: 10 }),
        createExpense({ name: 'Internet', amount: 15000, due_day: 15 }),
        createExpense({ name: 'Energia', amount: 25000, due_day: 20 }),
      ]);

      await db.seedSingleShotExpenses([
        createSingleShotExpense({ name: 'Compra de Móveis', amount: 500000, date: '2025-12-15' }),
      ]);

      await managePage.goto();
      await managePage.selectExpensesTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-expenses-light-populated.png');
    });

    visualTest('expenses - dark populated', async ({ page, managePage, db, visual }) => {
      await db.clear();
      await db.seedExpenses([
        createExpense({ name: 'Aluguel', amount: 200000, due_day: 10 }),
        createExpense({ name: 'Internet', amount: 15000, due_day: 15 }),
        createExpense({ name: 'Energia', amount: 25000, due_day: 20 }),
      ]);

      await db.seedSingleShotExpenses([
        createSingleShotExpense({ name: 'Compra de Móveis', amount: 500000, date: '2025-12-15' }),
      ]);

      await managePage.goto();
      await managePage.selectExpensesTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-expenses-dark-populated.png');
    });
  });

  visualTest.describe('Projects Tab', () => {
    visualTest('projects - light empty', async ({ page, managePage, db, visual }) => {
      await db.clear(); // Smart clear - only resets if data was seeded
      await managePage.goto();
      await managePage.selectProjectsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-projects-light-empty.png');
    });

    visualTest('projects - dark empty', async ({ page, managePage, db, visual }) => {
      await db.clear(); // Smart clear - only resets if data was seeded
      await managePage.goto();
      await managePage.selectProjectsTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-projects-dark-empty.png');
    });

    visualTest('projects - light populated', async ({ page, managePage, db, visual }) => {
      await db.clear();
      await db.seedProjects([
        createProject({ name: 'Salário', amount: 800000, certainty: 'guaranteed' }),
        createProject({
          name: 'Freelance',
          amount: 200000,
          frequency: 'monthly',
          certainty: 'probable',
        }),
      ]);

      await db.seedSingleShotIncome([
        createSingleShotIncome({
          name: 'Bônus Anual',
          amount: 1000000,
          date: '2025-12-20',
          certainty: 'guaranteed',
        }),
      ]);

      await managePage.goto();
      await managePage.selectProjectsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-projects-light-populated.png');
    });

    visualTest('projects - dark populated', async ({ page, managePage, db, visual }) => {
      await db.clear();
      await db.seedProjects([
        createProject({ name: 'Salário', amount: 800000, certainty: 'guaranteed' }),
        createProject({
          name: 'Freelance',
          amount: 200000,
          frequency: 'monthly',
          certainty: 'probable',
        }),
      ]);

      await db.seedSingleShotIncome([
        createSingleShotIncome({
          name: 'Bônus Anual',
          amount: 1000000,
          date: '2025-12-20',
          certainty: 'guaranteed',
        }),
      ]);

      await managePage.goto();
      await managePage.selectProjectsTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-projects-dark-populated.png');
    });
  });
});

