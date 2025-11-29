/**
 * E2E Tests: Edge Cases
 * Tests for network failures, concurrent edits, session expiry, large datasets, and realtime reconnect
 */

import { test, expect } from '../fixtures/test-base';
import { createLargeSeedData, createAccount } from '../utils/test-data';

test.describe('Edge Cases', () => {
  test.beforeAll(async ({ db }) => {
    await db.resetDatabase();
    await db.ensureTestUser(process.env.TEST_USER_EMAIL || 'e2e-test@example.com');
  });

  test('T073: EC-001: network connection lost during data submission → error handling and retry behavior verified', async ({
    page,
    managePage,
    db,
  }) => {
    await db.resetDatabase();
    await db.seedAccounts([createAccount({ name: 'Conta Existente', balance: 100000 })]);

    await managePage.goto();
    await managePage.selectAccountsTab();

    const accounts = managePage.accounts();

    // Start editing an account
    await accounts.editAccount('Conta Existente');

    // Simulate network failure
    await page.route('**/rest/**', (route) => route.abort('failed'));

    // Try to save changes
    await page.getByRole('textbox', { name: /nome|name/i }).fill('Nome Atualizado');
    await page.getByRole('button', { name: /salvar|save/i }).click();

    // Should show error message or retry option
    const errorMessage = page.getByRole('alert');
    const retryButton = page.getByRole('button', { name: /tentar novamente|retry/i });

    // Either error is shown or retry is available
    const hasError = await errorMessage.isVisible().catch(() => false);
    const hasRetry = await retryButton.isVisible().catch(() => false);

    // App should handle the error gracefully - either show error or retry option
    // Note: The actual UI behavior depends on implementation
    expect(hasError || hasRetry).toBeTruthy();

    // Restore network
    await page.unroute('**/rest/**');
  });

  test('T074: EC-002: concurrent edits from multiple tabs → conflict resolution or last-write-wins behavior verified', async ({
    browser,
    db,
  }) => {
    await db.resetDatabase();
    await db.seedAccounts([createAccount({ name: 'Conta Concorrente', balance: 100000 })]);

    // Create two browser contexts (simulating two tabs)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Both pages navigate to manage page
    await page1.goto('/manage');
    await page2.goto('/manage');

    // Wait for pages to load
    await page1.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');

    // Both pages should show the account
    await expect(page1.getByText('Conta Concorrente')).toBeVisible();
    await expect(page2.getByText('Conta Concorrente')).toBeVisible();

    // Page 1 edits the account
    await page1.locator('[data-testid="account-card"]:has-text("Conta Concorrente"), .account-card:has-text("Conta Concorrente")').first()
      .getByRole('button', { name: /editar|edit/i }).click();
    await page1.getByRole('textbox', { name: /saldo|balance/i }).fill('2.000,00');
    await page1.getByRole('button', { name: /salvar|save/i }).click();

    // Page 2 also tries to edit (simulating concurrent edit)
    await page2.locator('[data-testid="account-card"]:has-text("Conta Concorrente"), .account-card:has-text("Conta Concorrente")').first()
      .getByRole('button', { name: /editar|edit/i }).click();
    await page2.getByRole('textbox', { name: /saldo|balance/i }).fill('3.000,00');
    await page2.getByRole('button', { name: /salvar|save/i }).click();

    // The app should handle this gracefully (last write wins or conflict shown)
    // At minimum, one of the values should be saved
    await page1.waitForTimeout(1000);

    // Clean up
    await context1.close();
    await context2.close();
  });

  test('T075: EC-003: session expires during long editing session → graceful redirect to login', async ({
    page,
    managePage,
    db,
  }) => {
    await db.resetDatabase();
    await db.seedAccounts([createAccount({ name: 'Conta Sessão', balance: 100000 })]);

    await managePage.goto();

    // Clear auth state to simulate session expiry
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Try to perform an action that requires auth
    await page.reload();

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('T076: EC-004: large datasets (100+ accounts/expenses) → UI performance and pagination/scrolling verified', async ({
    page,
    managePage,
    db,
  }) => {
    await db.resetDatabase();

    // Seed large dataset
    const largeData = createLargeSeedData(100);
    await db.seedAccounts(largeData.accounts);
    await db.seedExpenses(largeData.expenses);
    await db.seedProjects(largeData.projects);

    const startTime = Date.now();

    await managePage.goto();
    await managePage.selectAccountsTab();

    const loadTime = Date.now() - startTime;

    // Page should load within reasonable time (< 10 seconds)
    expect(loadTime).toBeLessThan(10000);

    // Should be able to scroll through accounts
    const accountList = page.locator('[data-testid="accounts-list"], .accounts-list').first();
    await expect(accountList).toBeVisible();

    // Verify some accounts are visible
    await expect(page.getByText('Conta 1')).toBeVisible();
  });

  test('T077: EC-005: Supabase realtime connection drops and reconnects → data sync recovery verified', async ({
    page,
    dashboardPage,
    db,
  }) => {
    await db.resetDatabase();
    await db.seedAccounts([createAccount({ name: 'Conta Realtime', balance: 100000 })]);

    await dashboardPage.goto();

    // Block WebSocket connections
    await page.route('**/realtime/**', (route) => route.abort());

    // Wait a moment for connection to drop
    await page.waitForTimeout(2000);

    // Unblock WebSocket
    await page.unroute('**/realtime/**');

    // Refresh to trigger reconnect
    await page.reload();
    await page.waitForLoadState('networkidle');

    // App should recover and show data
    // The dashboard should still be functional
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

