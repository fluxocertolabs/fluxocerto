/**
 * Visual Regression Tests: Manage Page
 * Tests visual appearance of manage page tabs (light theme only, populated states)
 *
 * OPTIMIZATION: 
 * - Dark theme tests removed - theme system verified by dashboard
 * - Empty state tests removed - low visual regression risk
 * - One test per tab type is sufficient
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

visualTest.describe('Manage Page Visual Regression @visual', () => {
  visualTest('accounts tab - populated', async ({ page, managePage, db, visual }) => {
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

    await visual.takeScreenshot(page, 'manage-accounts-populated.png');
  });

  visualTest('credit cards tab - populated', async ({ page, managePage, db, visual }) => {
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

    await visual.takeScreenshot(page, 'manage-credit-cards-populated.png');
  });

  visualTest('expenses tab - populated', async ({ page, managePage, db, visual }) => {
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

    await visual.takeScreenshot(page, 'manage-expenses-populated.png');
  });

  visualTest('projects tab - populated', async ({ page, managePage, db, visual }) => {
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

    await visual.takeScreenshot(page, 'manage-projects-populated.png');
  });
});
