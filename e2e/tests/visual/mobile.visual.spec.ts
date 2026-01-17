/**
 * Mobile Visual Regression Tests
 * Tests responsive layout on mobile viewport (light theme only)
 *
 * OPTIMIZATION:
 * - Dark theme tests removed - theme system verified by dashboard
 * - Only key responsive-critical pages tested (dashboard, manage)
 * - Functional flows tested elsewhere
 *
 * @visual
 */

import { visualTest } from '../../fixtures/visual-test-base';
import { test as unauthTest, expect as unauthExpect } from '@playwright/test';
import { disableAnimations, setTheme, waitForStableUI } from '../../fixtures/visual-test-base';
import {
  createAccount,
  createExpense,
  createProject,
  createCreditCard,
} from '../../utils/test-data';

visualTest.describe('Mobile Visual Regression @visual', () => {
  visualTest.describe('Dashboard Mobile', () => {
    visualTest('dashboard - mobile empty', async ({ page, dashboardPage, db, visual }) => {
      await db.clear();
      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-mobile-empty.png');
    });

    visualTest('dashboard - mobile populated', async ({ page, dashboardPage, db, visual }) => {
      await db.clear();
      await db.seedAccounts([
        createAccount({ name: 'Nubank', type: 'checking', balance: 500000 }),
        createAccount({ name: 'Itaú', type: 'savings', balance: 200000 }),
      ]);
      await db.setAccountsBalanceUpdatedAt('2025-01-15T12:00:00Z');

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
      await db.setCreditCardsBalanceUpdatedAt('2025-01-15T12:00:00Z');

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-mobile-populated.png');
    });
  });

  visualTest.describe('Manage Lists Mobile', () => {
    visualTest('accounts list - mobile', async ({ page, managePage, db, visual }) => {
      await db.clear();
      await db.seedAccounts([
        createAccount({ name: 'Nubank', type: 'checking', balance: 500000 }),
        createAccount({ name: 'Itaú Poupança', type: 'savings', balance: 200000 }),
        createAccount({ name: 'XP', type: 'investment', balance: 1000000 }),
      ]);

      await managePage.goto();
      await managePage.selectAccountsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-accounts-mobile.png');
    });
  });

  visualTest.describe('Mobile Navigation', () => {
    visualTest('mobile menu - open', async ({ page, dashboardPage, db, visual }) => {
      await db.clear();

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await page.getByRole('button', { name: /abrir menu/i }).click();
      await page.getByRole('dialog', { name: 'Menu' }).waitFor({ state: 'visible', timeout: 5000 });

      await visual.takeScreenshot(page, 'mobile-menu-open.png');
    });
  });
});

unauthTest.describe('Mobile Visual Regression (Public Routes) @visual', () => {
  unauthTest.use({ storageState: { cookies: [], origins: [] } });

  unauthTest('login - mobile', async ({ page }) => {
    await page.goto('/login');
    await disableAnimations(page);
    await setTheme(page, 'light');
    await waitForStableUI(page);

    await unauthExpect(page.locator('#email')).toBeVisible();
    await unauthExpect(page).toHaveScreenshot('login-mobile.png');
  });
});
