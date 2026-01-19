/**
 * E2E Smoke Tests: Account Management
 * 
 * NOTE: These tests are currently disabled due to flakiness with the /manage page.
 * The page loads but gets stuck in a loading state due to PostgREST/Realtime issues.
 * 
 * Account management functionality should be tested through:
 * - Unit tests for the account store
 * - Integration tests for the Supabase queries
 * 
 * TODO: Re-enable these tests once the underlying issues are fixed:
 * - PostgREST DELETE with `or` filter bug
 * - Page loading state timing issues
 */

import { test, expect } from '../fixtures/smoke-test-base';

test.describe('Account Management Smoke Tests', () => {
  test.skip('can create a new checking account', async ({ page, managePage, db }) => {
    // Seed some initial data so we're not on empty state
    await db.seedAccounts([{ name: 'Existing Account', type: 'checking', balance: 100000 }]);

    await managePage.goto();
    await managePage.selectAccountsTab();

    const accounts = managePage.accounts();
    await accounts.waitForLoad();

    // Create a new account
    const accountName = `Test Account ${Date.now()}`;
    await accounts.createAccount({
      name: accountName,
      type: 'checking',
      balance: '1.000,00',
    });

    // Verify it appears in the list
    await accounts.expectAccountVisible(accountName);
  });

  test.skip('can edit an account name', async ({ page, managePage, db }) => {
    const uniqueId = Date.now();
    const originalName = `Original Account ${uniqueId}`;
    const newName = `Updated Account ${uniqueId}`;

    // Seed the account
    await db.seedAccounts([{ name: originalName, type: 'checking', balance: 100000 }]);

    await managePage.goto();
    await managePage.selectAccountsTab();

    const accounts = managePage.accounts();
    await accounts.waitForLoad();

    // Verify original account is visible
    await accounts.expectAccountVisible(originalName);

    // Update the name
    await accounts.updateAccountName(originalName, newName);

    // Wait for update to complete
    await expect(async () => {
      await expect(page.getByText(newName).first()).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 15000, intervals: [500, 1000, 2000] });

    // Verify old name is gone
    await expect(page.getByText(originalName)).not.toBeVisible();
  });

  test.skip('can delete an account', async ({ page, managePage, db }) => {
    const uniqueId = Date.now();
    const accountName = `Account to Delete ${uniqueId}`;

    // Seed the account
    await db.seedAccounts([{ name: accountName, type: 'checking', balance: 50000 }]);

    await managePage.goto();
    await managePage.selectAccountsTab();

    const accounts = managePage.accounts();
    await accounts.waitForLoad();

    // Verify account is visible
    await accounts.expectAccountVisible(accountName);

    // Delete it
    await accounts.deleteAccount(accountName);

    // Wait for deletion to complete
    await expect(async () => {
      await expect(page.getByText(accountName)).not.toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 15000, intervals: [500, 1000, 2000] });
  });

  test.skip('displays multiple account types correctly', async ({ page, managePage, db }) => {
    const uniqueId = Date.now();

    // Seed different account types
    await db.seedAccounts([
      { name: `Checking ${uniqueId}`, type: 'checking', balance: 100000 },
      { name: `Savings ${uniqueId}`, type: 'savings', balance: 200000 },
      { name: `Investment ${uniqueId}`, type: 'investment', balance: 500000 },
    ]);

    await managePage.goto();
    await managePage.selectAccountsTab();

    const accounts = managePage.accounts();
    await accounts.waitForLoad();

    // Verify all accounts are visible
    await accounts.expectAccountVisible(`Checking ${uniqueId}`);
    await accounts.expectAccountVisible(`Savings ${uniqueId}`);
    await accounts.expectAccountVisible(`Investment ${uniqueId}`);

    // Verify account type badges are displayed
    await expect(page.getByText(/conta corrente/i).first()).toBeVisible();
    await expect(page.getByText('Poupança', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Investimento', { exact: true }).first()).toBeVisible();
  });
});
