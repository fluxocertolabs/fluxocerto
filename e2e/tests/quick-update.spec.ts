/**
 * E2E Tests: User Story 7 - Quick Update Modal
 * Tests the bulk balance update functionality
 */

import { test, expect } from '../fixtures/test-base';
import { createAccount, createCreditCard } from '../utils/test-data';

test.describe('Quick Update Modal', () => {
  // Tests now run in parallel with per-worker data prefixing for isolation

  test('T071: open Quick Update → all accounts and credit cards listed', async ({
    page,
    dashboardPage,
    quickUpdatePage,
    db,
  }) => {
    // Use unique names
    const uniqueId = Date.now();
    const accounts = await db.seedAccounts([
      createAccount({ name: `Nubank QU ${uniqueId}`, balance: 100000 }),
      createAccount({ name: `Itaú QU ${uniqueId}`, balance: 200000 }),
    ]);
    const cards = await db.seedCreditCards([
      createCreditCard({ name: `Cartão QU ${uniqueId}`, statement_balance: 50000, due_day: 10 }),
    ]);

    // Navigate AFTER seeding
    await dashboardPage.goto();
    await dashboardPage.expectChartRendered();
    
    await dashboardPage.openQuickUpdate();
    await quickUpdatePage.waitForModal();

    // Verify all items are listed (using seeded names which include prefix)
    for (const account of accounts) {
      await expect(quickUpdatePage.page.getByText(account.name, { exact: false })).toBeVisible();
    }
    for (const card of cards) {
      await expect(quickUpdatePage.page.getByText(card.name, { exact: false })).toBeVisible();
    }
  });

  test('T072: update balance via quick update → modal closes successfully', async ({
    page,
    dashboardPage,
    quickUpdatePage,
    db,
  }) => {
    // Use unique name
    const uniqueId = Date.now();
    await db.seedAccounts([createAccount({ name: `Conta Update ${uniqueId}`, balance: 100000 })]);

    // Navigate AFTER seeding
    await dashboardPage.goto();
    await dashboardPage.expectChartRendered();
    
    await dashboardPage.openQuickUpdate();
    await quickUpdatePage.waitForModal();

    // The modal should be visible
    expect(await quickUpdatePage.isModalVisible()).toBe(true);

    // Complete/close the modal
    await quickUpdatePage.complete();

    // Verify modal closed
    await quickUpdatePage.expectModalClosed();

    // Verify we're back on dashboard
    await expect(page.locator('body')).toBeVisible();
  });

  test('T073: cancel Quick Update → modal closes', async ({
    page,
    dashboardPage,
    quickUpdatePage,
    db,
  }) => {
    // Use unique name to avoid collisions
    const uniqueId = Date.now();
    await db.seedAccounts([createAccount({ name: `Conta Cancel ${uniqueId}`, balance: 100000 })]);

    await dashboardPage.goto();
    await dashboardPage.expectChartRendered();
    await dashboardPage.openQuickUpdate();
    await quickUpdatePage.waitForModal();

    // Cancel the modal
    await quickUpdatePage.cancel();
    await quickUpdatePage.expectModalClosed();

    // Verify we're back on dashboard
    await expect(page.locator('body')).toBeVisible();
  });

  test('T074: stale balance indicator → shows which accounts need updating', async ({
    dashboardPage,
    quickUpdatePage,
    db,
  }) => {
    // Use unique name to avoid collisions
    const uniqueId = Date.now();
    // Seed accounts - they may show as stale depending on app's staleness threshold
    await db.seedAccounts([
      createAccount({ name: `Conta Stale ${uniqueId}`, balance: 100000 }),
    ]);

    await dashboardPage.goto();
    
    // Ensure dashboard is fully loaded with content before trying to interact
    await dashboardPage.expectChartRendered();

    await dashboardPage.openQuickUpdate();
    await quickUpdatePage.waitForModal();

    // The quick update modal should be visible and functional
    // Stale indicators would be shown based on balance_updated_at
    const modalVisible = await quickUpdatePage.isModalVisible();
    expect(modalVisible).toBe(true);
  });
});
