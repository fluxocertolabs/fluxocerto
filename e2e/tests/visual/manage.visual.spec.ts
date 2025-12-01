/**
 * Visual Regression Tests: Manage Page
 * Tests visual appearance of all manage page tabs in various states
 *
 * @visual
 */

import { visualTest, expect } from '../../fixtures/visual-test-base';
import {
  createAccount,
  createExpense,
  createProject,
  createCreditCard,
  createSingleShotExpense,
  createSingleShotIncome,
} from '../../utils/test-data';

visualTest.describe('Manage Page Visual Regression @visual', () => {
  visualTest.describe('Accounts Tab', () => {
    visualTest('accounts tab - empty state', async ({ page, managePage, visual }) => {
      await managePage.goto();
      await managePage.selectAccountsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-accounts-empty.png');
    });

    visualTest('accounts tab - populated state', async ({ page, managePage, db, visual }) => {
      // Seed accounts
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

      await visual.takeScreenshot(page, 'manage-accounts-populated.png');
    });
  });

  visualTest.describe('Credit Cards Tab', () => {
    visualTest('credit cards tab - empty state', async ({ page, managePage, visual }) => {
      await managePage.goto();
      await managePage.selectCreditCardsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-credit-cards-empty.png');
    });

    visualTest(
      'credit cards tab - populated state',
      async ({ page, managePage, db, visual }) => {
        // Seed credit cards
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

        await visual.takeScreenshot(page, 'manage-credit-cards-populated.png');
      }
    );
  });

  visualTest.describe('Expenses Tab', () => {
    visualTest('expenses tab - empty state', async ({ page, managePage, visual }) => {
      await managePage.goto();
      await managePage.selectExpensesTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-expenses-empty.png');
    });

    visualTest('expenses tab - populated state', async ({ page, managePage, db, visual }) => {
      // Seed fixed expenses
      await db.seedExpenses([
        createExpense({ name: 'Aluguel', amount: 200000, due_day: 10 }),
        createExpense({ name: 'Internet', amount: 15000, due_day: 15 }),
        createExpense({ name: 'Energia', amount: 25000, due_day: 20 }),
      ]);

      // Seed single-shot expenses
      await db.seedSingleShotExpenses([
        createSingleShotExpense({ name: 'Compra de Móveis', amount: 500000, date: '2025-12-15' }),
      ]);

      await managePage.goto();
      await managePage.selectExpensesTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-expenses-populated.png');
    });
  });

  visualTest.describe('Projects Tab', () => {
    visualTest('projects tab - empty state', async ({ page, managePage, visual }) => {
      await managePage.goto();
      await managePage.selectProjectsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-projects-empty.png');
    });

    visualTest('projects tab - populated state', async ({ page, managePage, db, visual }) => {
      // Seed projects
      await db.seedProjects([
        createProject({ name: 'Salário', amount: 800000, certainty: 'guaranteed' }),
        createProject({
          name: 'Freelance',
          amount: 200000,
          frequency: 'monthly',
          certainty: 'probable',
        }),
      ]);

      // Seed single-shot income
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

      await visual.takeScreenshot(page, 'manage-projects-populated.png');
    });
  });
});

