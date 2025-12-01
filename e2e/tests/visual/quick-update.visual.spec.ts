/**
 * Visual Regression Tests: Quick Update Modal
 * Tests visual appearance of quick update view in various states
 *
 * @visual
 */

import { visualTest, expect } from '../../fixtures/visual-test-base';
import { createAccount, createCreditCard } from '../../utils/test-data';

visualTest.describe('Quick Update Visual Regression @visual', () => {
  visualTest(
    'quick update - empty state (no accounts or cards)',
    async ({ page, dashboardPage, visual }) => {
      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Open quick update
      await dashboardPage.openQuickUpdate();

      // Wait for the view to load
      const completeButton = page.getByRole('button', { name: /concluir|complete/i });
      await expect(completeButton).toBeVisible({ timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await visual.takeScreenshot(page, 'quick-update-light-empty.png');
    }
  );

  visualTest(
    'quick update - populated with accounts and cards',
    async ({ page, dashboardPage, quickUpdatePage, db, visual }) => {
      // Seed accounts and credit cards
      await db.seedAccounts([
        createAccount({ name: 'Nubank', type: 'checking', balance: 500000 }),
        createAccount({ name: 'Itaú Poupança', type: 'savings', balance: 200000 }),
      ]);

      await db.seedCreditCards([
        createCreditCard({ name: 'Nubank Platinum', statement_balance: 300000, due_day: 15 }),
        createCreditCard({ name: 'Itaú Visa', statement_balance: 150000, due_day: 10 }),
      ]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Open quick update
      await dashboardPage.openQuickUpdate();
      await quickUpdatePage.waitForModal();

      await visual.takeScreenshot(page, 'quick-update-light-populated.png');
    }
  );
});

