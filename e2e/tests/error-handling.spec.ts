/**
 * E2E Tests: Error Handling
 * Tests that the UI correctly handles server failures and reverts optimistic updates
 */

import { test, expect } from '../fixtures/test-base';
import { createAccount, createCreditCard } from '../utils/test-data';

test.describe('Error Handling', () => {
  test.describe('Optimistic UI Reversion', () => {
    test('T100: account balance update failure reverts to original value', async ({
      page,
      managePage,
      db,
    }) => {
      // Seed an account with known balance
      const originalBalance = 100000; // R$ 1.000,00
      const [seeded] = await db.seedAccounts([
        createAccount({ name: 'Test Account', type: 'checking', balance: originalBalance }),
      ]);

      await managePage.goto();
      await managePage.selectAccountsTab();

      const accounts = managePage.accounts();
      await accounts.waitForLoad();
      await accounts.expectAccountVisible(seeded.name);

      // Intercept the PATCH request to accounts and make it fail
      await page.route('**/rest/v1/accounts**', async (route) => {
        const method = route.request().method();
        if (method === 'PATCH') {
          // Simulate server error
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal Server Error' }),
          });
        } else {
          // Let other requests through
          await route.continue();
        }
      });

      // Try to update the balance via the edit dialog
      await accounts.editAccount(seeded.name);

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      const balanceInput = dialog.getByLabel(/saldo/i);
      await balanceInput.clear();
      await balanceInput.fill('2.000,00'); // Try to change to R$ 2.000,00

      // Submit the form
      const failedUpdate = page.waitForResponse(
        (response) =>
          response.url().includes('/rest/v1/accounts') &&
          response.request().method() === 'PATCH' &&
          response.status() === 500
      );
      await dialog.getByRole('button', { name: /salvar|save|atualizar/i }).click();
      await failedUpdate;

      // Close dialog if still open
      if (await dialog.isVisible()) {
        await page.keyboard.press('Escape');
      }

      // Verify the original balance is still shown
      // The UI should have reverted to the original value
      await expect(async () => {
        // Look for the original balance display
        const balanceText = page.getByText(/1\.000,00/).first();
        await expect(balanceText).toBeVisible({ timeout: 5000 });
      }).toPass({ timeout: 15000, intervals: [500, 1000, 2000] });
    });

    test('T101: credit card balance update failure reverts to original value', async ({
      page,
      managePage,
      db,
    }) => {
      // Seed a credit card with known balance
      const originalBalance = 150000; // R$ 1.500,00
      const [seeded] = await db.seedCreditCards([
        createCreditCard({ name: 'Test Card', statement_balance: originalBalance, due_day: 15 }),
      ]);

      await managePage.goto();
      await managePage.selectCreditCardsTab();

      const creditCards = managePage.creditCards();
      await creditCards.waitForLoad();
      await creditCards.expectCardVisible(seeded.name);

      // Intercept the PATCH request to credit_cards and make it fail
      await page.route('**/rest/v1/credit_cards**', async (route) => {
        const method = route.request().method();
        if (method === 'PATCH') {
          // Simulate server error
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal Server Error' }),
          });
        } else {
          await route.continue();
        }
      });

      // Try to update the balance via the edit dialog
      // Open edit dialog by finding and clicking on the card
      const cardElement = page.locator('div.group.relative').filter({
        has: page.getByRole('heading', { name: seeded.name, level: 3 }),
      }).first();
      await cardElement.hover();
      const moreOptionsButton = cardElement.getByRole('button', { name: /mais opções|more/i });
      await expect(moreOptionsButton).toBeVisible();
      await moreOptionsButton.click();
      await page.getByRole('button', { name: /editar/i }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      const balanceInput = dialog.getByLabel(/fatura|saldo|balance/i);
      await balanceInput.clear();
      await balanceInput.fill('3.000,00'); // Try to change to R$ 3.000,00

      // Submit the form
      const failedUpdate = page.waitForResponse(
        (response) =>
          response.url().includes('/rest/v1/credit_cards') &&
          response.request().method() === 'PATCH' &&
          response.status() === 500
      );
      await dialog.getByRole('button', { name: /salvar|save|atualizar/i }).click();
      await failedUpdate;

      // Close dialog if still open
      if (await dialog.isVisible()) {
        await page.keyboard.press('Escape');
      }

      // Verify the original balance is still shown
      await expect(async () => {
        const balanceText = page.getByText(/1\.500,00/).first();
        await expect(balanceText).toBeVisible({ timeout: 5000 });
      }).toPass({ timeout: 15000, intervals: [500, 1000, 2000] });
    });

    test('T102: account creation failure does not add to list', async ({
      page,
      managePage,
      db,
    }) => {
      await db.resetDatabase();
      await managePage.goto();
      await managePage.selectAccountsTab();

      const accounts = managePage.accounts();

      // Get initial count
      const initialCount = await accounts.getAccountCount();

      // Intercept POST requests to accounts and make them fail
      await page.route('**/rest/v1/accounts**', async (route) => {
        const method = route.request().method();
        if (method === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal Server Error' }),
          });
        } else {
          await route.continue();
        }
      });

      // Try to create an account
      await accounts.clickAdd();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Fill form
      await dialog.getByLabel(/nome/i).fill('New Account');
      await dialog.getByRole('combobox').first().click();
      await page.getByRole('option', { name: /corrente|checking/i }).click();
      await dialog.getByLabel(/saldo/i).fill('500,00');

      // Submit
      const failedCreate = page.waitForResponse(
        (response) =>
          response.url().includes('/rest/v1/accounts') &&
          response.request().method() === 'POST' &&
          response.status() === 500
      );
      await dialog.getByRole('button', { name: /salvar|save|adicionar|criar|create/i }).click();
      await failedCreate;

      // Close dialog if still open (might show error state)
      if (await dialog.isVisible()) {
        await page.keyboard.press('Escape');
      }

      // Verify the account was NOT added
      // Count should remain the same
      await expect(async () => {
        const currentCount = await accounts.getAccountCount();
        expect(currentCount).toBe(initialCount);
      }).toPass({ timeout: 10000, intervals: [500, 1000, 2000] });
    });

    test('T103: account deletion failure keeps item in list', async ({
      page,
      managePage,
      db,
    }) => {
      // Seed an account
      const [seeded] = await db.seedAccounts([
        createAccount({ name: 'Account to Delete', type: 'checking', balance: 50000 }),
      ]);

      await managePage.goto();
      await managePage.selectAccountsTab();

      const accounts = managePage.accounts();
      await accounts.waitForLoad();
      await accounts.expectAccountVisible(seeded.name);

      // Intercept DELETE requests and make them fail
      await page.route('**/rest/v1/accounts**', async (route) => {
        const method = route.request().method();
        if (method === 'DELETE') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal Server Error' }),
          });
        } else {
          await route.continue();
        }
      });

      // Try to delete the account
      const accountCard = page.locator('div.group.relative').filter({
        has: page.getByRole('heading', { name: seeded.name, level: 3, exact: true }),
      }).first();

      await accountCard.hover();
      const moreOptionsButton = accountCard.getByRole('button', { name: /mais opções|more/i });
      await expect(moreOptionsButton).toBeVisible();
      await moreOptionsButton.click();
      await page.getByRole('button', { name: /excluir/i }).click();

      // Confirm deletion
      const confirmDialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
      await expect(confirmDialog).toBeVisible();
      const failedDelete = page.waitForResponse(
        (response) =>
          response.url().includes('/rest/v1/accounts') &&
          response.request().method() === 'DELETE' &&
          response.status() === 500
      );
      await confirmDialog.getByRole('button', { name: /confirmar|confirm|sim|yes|excluir/i }).click();
      await failedDelete;

      // Verify the account is STILL in the list (deletion failed)
      await expect(async () => {
        await accounts.expectAccountVisible(seeded.name);
      }).toPass({ timeout: 10000, intervals: [500, 1000, 2000] });
    });
  });

  test.describe('Network Error Handling', () => {
    test('T104: handles network timeout gracefully', async ({
      page,
      managePage,
      db,
    }) => {
      const [seeded] = await db.seedAccounts([
        createAccount({ name: 'Timeout Test', type: 'checking', balance: 100000 }),
      ]);

      await managePage.goto();
      await managePage.selectAccountsTab();

      const accounts = managePage.accounts();
      await accounts.waitForLoad();

      // Intercept requests and simulate timeout
      await page.route('**/rest/v1/accounts**', async (route) => {
        const method = route.request().method();
        if (method === 'PATCH') {
          // Delay response significantly to simulate timeout
          await new Promise((resolve) => setTimeout(resolve, 30000));
          await route.abort('timedout');
        } else {
          await route.continue();
        }
      });

      // Try to update
      await accounts.editAccount(seeded.name);

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      const balanceInput = dialog.getByLabel(/saldo/i);
      await balanceInput.clear();
      await balanceInput.fill('5.000,00');

      // Submit - this will timeout
      const requestFailed = page.waitForEvent(
        'requestfailed',
        (request) =>
          request.url().includes('/rest/v1/accounts') &&
          request.method() === 'PATCH'
      );
      await dialog.getByRole('button', { name: /salvar|save|atualizar/i }).click();
      await requestFailed;

      // Close dialog
      await page.keyboard.press('Escape');

      // Page should still be functional
      await expect(page.getByRole('tab', { name: /contas/i })).toBeVisible();
    });
  });
});

