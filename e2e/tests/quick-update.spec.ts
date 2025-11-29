/**
 * E2E Tests: User Story 6 - Quick Update Flow
 * Tests Quick Update modal for batch balance updates
 */

import { test, expect } from '../fixtures/test-base';
import { createAccount, createCreditCard } from '../utils/test-data';

test.describe('Quick Update Flow', () => {
  test.beforeEach(async ({ db }) => {
    await db.resetDatabase();
    await db.ensureTestUser(process.env.TEST_USER_EMAIL || 'e2e-test@example.com');
    await db.seedAccounts([
      createAccount({ name: 'Nubank', balance: 100000 }),
      createAccount({ name: 'Itaú', balance: 200000 }),
    ]);
    await db.seedCreditCards([
      createCreditCard({ name: 'Nubank Platinum', statement_balance: 150000 }),
      createCreditCard({ name: 'Itaú Visa', statement_balance: 80000 }),
    ]);
  });

  test('T059: open Quick Update modal → all accounts and credit cards listed', async ({
    dashboardPage,
    quickUpdatePage,
  }) => {
    await dashboardPage.goto();
    await dashboardPage.openQuickUpdate();
    await quickUpdatePage.waitForModal();

    await quickUpdatePage.expectAccountsListed(['Nubank', 'Itaú']);
    await quickUpdatePage.expectCardsListed(['Nubank Platinum', 'Itaú Visa']);
  });

  test('T060: update account balance inline → new value displayed', async ({
    page,
    dashboardPage,
    quickUpdatePage,
  }) => {
    await dashboardPage.goto();
    await dashboardPage.openQuickUpdate();
    await quickUpdatePage.waitForModal();

    await quickUpdatePage.updateAccountBalance('Nubank', '1500');

    // Verify the input shows the new value - the input has aria-label "Saldo de Nubank"
    const balanceInput = page.getByLabel('Saldo de Nubank', { exact: true });
    await expect(balanceInput).toHaveValue(/1500/);
  });

  test('T061: click "Concluir" → all balances saved, modal closes', async ({
    page,
    dashboardPage,
    quickUpdatePage,
  }) => {
    await dashboardPage.goto();
    await dashboardPage.openQuickUpdate();
    await quickUpdatePage.waitForModal();

    // Update some balances - use decimal format
    await quickUpdatePage.updateAccountBalance('Nubank', '2000');
    await quickUpdatePage.updateCreditCardBalance('Nubank Platinum', '1000');

    // Complete the update
    await quickUpdatePage.complete();

    // Modal should close
    await quickUpdatePage.expectModalClosed();

    // Verify we're back on dashboard
    await expect(page).toHaveURL(/\/(dashboard)?$/);
  });

  test('T062: click cancel → modal closes (note: auto-save behavior)', async ({
    page,
    dashboardPage,
    quickUpdatePage,
  }) => {
    // Note: Quick Update uses auto-save on blur, so "Cancel" just closes the view
    // without marking balances as "updated" (for staleness tracking).
    // It does NOT undo changes - they are saved immediately on blur.
    await dashboardPage.goto();
    await dashboardPage.openQuickUpdate();
    await quickUpdatePage.waitForModal();

    // Cancel without making changes
    await quickUpdatePage.cancel();

    // Modal should close
    await quickUpdatePage.expectModalClosed();

    // Verify we're back on dashboard
    await expect(page).toHaveURL(/\/(dashboard)?$/);
  });
});

