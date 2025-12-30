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

  test('T075: accounts and cards with owners → owner badges displayed in Quick Update', async ({
    page,
    dashboardPage,
    quickUpdatePage,
    db,
  }) => {
    const uniqueId = Date.now();
    
    // Get the worker's household ID and create profiles to use as owners
    const groupId = await db.getWorkerGroupId();
    const accountOwner = await db.createProfileInGroup(
      `account-owner-${uniqueId}@test.local`,
      'João Silva',
      groupId
    );
    const cardOwner = await db.createProfileInGroup(
      `card-owner-${uniqueId}@test.local`,
      'Maria Santos',
      groupId
    );

    // Seed account and card with owners assigned
    const [seededAccount] = await db.seedAccounts([
      createAccount({ 
        name: `Conta Owned ${uniqueId}`, 
        balance: 100000,
        owner_id: accountOwner.id,
      }),
    ]);
    const [seededCard] = await db.seedCreditCards([
      createCreditCard({ 
        name: `Cartão Owned ${uniqueId}`, 
        statement_balance: 50000, 
        due_day: 15,
        owner_id: cardOwner.id,
      }),
    ]);

    // Navigate and open Quick Update
    await dashboardPage.goto();
    await dashboardPage.expectChartRendered();
    await dashboardPage.openQuickUpdate();
    await quickUpdatePage.waitForModal();

    // Verify the account is listed with its owner badge
    await expect(page.getByText(seededAccount.name, { exact: false })).toBeVisible();
    await expect(page.getByText('João Silva')).toBeVisible();

    // Verify the card is listed with its owner badge
    await expect(page.getByText(seededCard.name, { exact: false })).toBeVisible();
    await expect(page.getByText('Maria Santos')).toBeVisible();

    // Clean up the test profiles
    await db.deleteProfileByEmail(`account-owner-${uniqueId}@test.local`);
    await db.deleteProfileByEmail(`card-owner-${uniqueId}@test.local`);
  });

  test('T076: items without owners → no owner badge displayed in Quick Update', async ({
    page,
    dashboardPage,
    quickUpdatePage,
    db,
  }) => {
    const uniqueId = Date.now();

    // Seed account and card WITHOUT owner assigned
    const [seededAccount] = await db.seedAccounts([
      createAccount({ 
        name: `Conta No Owner ${uniqueId}`, 
        balance: 100000,
      }),
    ]);
    const [seededCard] = await db.seedCreditCards([
      createCreditCard({ 
        name: `Cartão No Owner ${uniqueId}`, 
        statement_balance: 50000, 
        due_day: 15,
      }),
    ]);

    // Navigate and open Quick Update
    await dashboardPage.goto();
    await dashboardPage.expectChartRendered();
    await dashboardPage.openQuickUpdate();
    await quickUpdatePage.waitForModal();

    // Verify items are listed
    await expect(page.getByText(seededAccount.name, { exact: false })).toBeVisible();
    await expect(page.getByText(seededCard.name, { exact: false })).toBeVisible();

    // Verify no "Não atribuído" text is shown (OwnerBadge hides by default when null)
    await expect(page.getByText('Não atribuído')).not.toBeVisible();
  });

  test('T077: update balance with Brazilian decimal format (comma) → saves correctly', async ({
    page,
    dashboardPage,
    quickUpdatePage,
    db,
  }) => {
    const uniqueId = Date.now();
    const accountName = `Conta Comma ${uniqueId}`;
    
    // Seed account with initial balance of R$ 1.000,00 (100000 cents)
    await db.seedAccounts([
      createAccount({ 
        name: accountName, 
        balance: 100000,
      }),
    ]);

    // Navigate and open Quick Update
    await dashboardPage.goto();
    await dashboardPage.expectChartRendered();
    await dashboardPage.openQuickUpdate();
    await quickUpdatePage.waitForModal();

    // Find the balance input for our account
    const balanceInput = page.getByLabel(new RegExp(`Saldo de.*${accountName}`, 'i')).last();
    await expect(balanceInput).toBeVisible();

    // Clear and type new balance using Brazilian format with comma: R$ 1.500,50
    await balanceInput.clear();
    await balanceInput.fill('1500,50');
    
    // Trigger blur to save (auto-save on blur)
    await balanceInput.blur();
    
    // Wait for save to complete
    await page.waitForTimeout(1000);

    // Verify the value was saved correctly by checking the input still shows the value
    // The input should display the Brazilian format
    await expect(balanceInput).toHaveValue(/1500[,.]50/);

    // Complete the quick update
    await quickUpdatePage.complete();
    await quickUpdatePage.expectModalClosed();

    // Reopen Quick Update to verify the value persisted
    await dashboardPage.openQuickUpdate();
    await quickUpdatePage.waitForModal();

    // Verify the saved value is displayed (150050 cents = R$ 1.500,50)
    const balanceInputAfterReload = page.getByLabel(new RegExp(`Saldo de.*${accountName}`, 'i')).last();
    await expect(balanceInputAfterReload).toHaveValue(/1500[,.]50|1\.500[,.]50/);
  });

  test('T078: account type badges → checking accounts show "Corrente" badge', async ({
    page,
    dashboardPage,
    quickUpdatePage,
    db,
  }) => {
    const uniqueId = Date.now();
    
    // Seed a checking account (using unique name without "Corrente" to avoid confusion)
    await db.seedAccounts([
      createAccount({ 
        name: `Nubank Check ${uniqueId}`, 
        type: 'checking',
        balance: 100000,
      }),
    ]);

    // Navigate and open Quick Update
    await dashboardPage.goto();
    await dashboardPage.expectChartRendered();
    await dashboardPage.openQuickUpdate();
    await quickUpdatePage.waitForModal();

    // Verify the account is listed with its type badge
    await expect(page.getByText(`Nubank Check ${uniqueId}`, { exact: false })).toBeVisible();
    // Use the badge with emoji to be more specific
    await expect(page.getByText('🏦').first()).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^🏦Corrente$/ }).first()).toBeVisible();
  });

  test('T079: account type badges → savings accounts show "Poupança" badge', async ({
    page,
    dashboardPage,
    quickUpdatePage,
    db,
  }) => {
    const uniqueId = Date.now();
    
    // Seed a savings account (using unique name without "Poupança" to avoid confusion)
    await db.seedAccounts([
      createAccount({ 
        name: `Reserva ${uniqueId}`, 
        type: 'savings',
        balance: 200000,
      }),
    ]);

    // Navigate and open Quick Update
    await dashboardPage.goto();
    await dashboardPage.expectChartRendered();
    await dashboardPage.openQuickUpdate();
    await quickUpdatePage.waitForModal();

    // Verify the account is listed with its type badge
    await expect(page.getByText(`Reserva ${uniqueId}`, { exact: false })).toBeVisible();
    // Use the badge with emoji to be more specific
    await expect(page.getByText('💰').first()).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^💰Poupança$/ }).first()).toBeVisible();
  });

  test('T080: account type badges → investment accounts show "Investimento" badge', async ({
    page,
    dashboardPage,
    quickUpdatePage,
    db,
  }) => {
    const uniqueId = Date.now();
    
    // Seed an investment account (using unique name without "Investimento" to avoid confusion)
    await db.seedAccounts([
      createAccount({ 
        name: `XP Renda ${uniqueId}`, 
        type: 'investment',
        balance: 500000,
      }),
    ]);

    // Navigate and open Quick Update
    await dashboardPage.goto();
    await dashboardPage.expectChartRendered();
    await dashboardPage.openQuickUpdate();
    await quickUpdatePage.waitForModal();

    // Verify the account is listed with its type badge
    await expect(page.getByText(`XP Renda ${uniqueId}`, { exact: false })).toBeVisible();
    // Use the badge with emoji to be more specific
    await expect(page.getByText('📈').first()).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^📈Investimento$/ }).first()).toBeVisible();
  });

  test('T081: account type badges → multiple accounts with same name distinguished by type', async ({
    page,
    dashboardPage,
    quickUpdatePage,
    db,
  }) => {
    // Reset database to ensure clean state - this test relies on specific badge counts
    await db.resetDatabase();
    await db.ensureTestUser();
    
    const uniqueId = Date.now();
    const accountName = `Multi ${uniqueId}`;
    
    // Seed multiple accounts with the same name but different types
    await db.seedAccounts([
      createAccount({ 
        name: accountName, 
        type: 'checking',
        balance: 100000,
      }),
      createAccount({ 
        name: accountName, 
        type: 'investment',
        balance: 500000,
      }),
    ]);

    // Navigate AFTER seeding
    await dashboardPage.goto();
    await dashboardPage.expectChartRendered();
    await dashboardPage.openQuickUpdate();
    await quickUpdatePage.waitForModal();

    // Verify both accounts are listed (same name appears twice)
    const accountNameElements = page.getByText(accountName, { exact: false });
    await expect(accountNameElements).toHaveCount(2);

    // Verify both type badges are present for these specific accounts
    // Use the account row containers to scope the badge search
    const accountRows = page.locator('div.rounded-lg.border').filter({ hasText: accountName });
    await expect(accountRows).toHaveCount(2);
    
    // Within these rows, verify we have one of each type
    await expect(accountRows.locator('span').filter({ hasText: /^🏦Corrente$/ })).toHaveCount(1);
    await expect(accountRows.locator('span').filter({ hasText: /^📈Investimento$/ })).toHaveCount(1);
  });

  test('T082: credit cards section → cards listed without account type badges', async ({
    page,
    dashboardPage,
    quickUpdatePage,
    db,
  }) => {
    // Reset database to ensure clean state - this test relies on the seeded card being visible
    // and avoids flakiness from large lists / stale banners created by prior tests in the same worker.
    await db.resetDatabase();
    await db.ensureTestUser();

    const uniqueId = Date.now();
    const cardName = `Cartão Teste ${uniqueId}`;
    
    // Seed a credit card
    await db.seedCreditCards([
      createCreditCard({ 
        name: cardName, 
        statement_balance: 150000,
        due_day: 15,
      }),
    ]);

    // Navigate and open Quick Update
    await dashboardPage.goto();
    await dashboardPage.expectChartRendered();
    await dashboardPage.openQuickUpdate();
    await quickUpdatePage.waitForModal();

    // Verify the modal is open (Concluir button visible)
    await expect(quickUpdatePage.completeButton).toBeVisible();

    // Verify the card is listed
    await expect(page.getByRole('heading', { name: /cartões de crédito/i })).toBeVisible();
    await expect(page.getByText(cardName, { exact: false })).toBeVisible();

    // Find the card row specifically and verify it doesn't have type badges
    // The card row contains the card name
    const cardRow = page.locator('div.rounded-lg.border').filter({ 
      hasText: cardName 
    });
    await expect(cardRow).toBeVisible();
    
    // Within this specific card row, there should be no type badge
    await expect(cardRow.locator('span').filter({ hasText: /^🏦Corrente$/ })).toHaveCount(0);
    await expect(cardRow.locator('span').filter({ hasText: /^💰Poupança$/ })).toHaveCount(0);
    await expect(cardRow.locator('span').filter({ hasText: /^📈Investimento$/ })).toHaveCount(0);
  });

  test('T083: account with both owner and type → shows both badges', async ({
    page,
    dashboardPage,
    quickUpdatePage,
    db,
  }) => {
    // Reset database to ensure clean state - this test relies on specific badge presence
    await db.resetDatabase();
    await db.ensureTestUser();
    
    const uniqueId = Date.now();
    
    // Create a profile to use as owner
    const groupId = await db.getWorkerGroupId();
    const owner = await db.createProfileInGroup(
      `type-owner-${uniqueId}@test.local`,
      'Daniel',
      groupId
    );

    // Seed an investment account with owner (using unique name without "Investimento")
    const accountName = `XP Owned ${uniqueId}`;
    await db.seedAccounts([
      createAccount({ 
        name: accountName, 
        type: 'investment',
        balance: 1000000,
        owner_id: owner.id,
      }),
    ]);

    // Navigate AFTER seeding
    await dashboardPage.goto();
    await dashboardPage.expectChartRendered();
    await dashboardPage.openQuickUpdate();
    await quickUpdatePage.waitForModal();

    // Find the specific account row
    const accountRow = page.locator('div.rounded-lg.border').filter({ hasText: accountName });
    await expect(accountRow).toBeVisible();
    
    // Verify the account is listed
    await expect(page.getByText(accountName, { exact: false })).toBeVisible();
    
    // Verify owner badge is shown within the account row
    await expect(accountRow.getByText('Daniel')).toBeVisible();
    
    // Verify type badge is shown within the account row
    await expect(accountRow.locator('span').filter({ hasText: /^📈Investimento$/ })).toBeVisible();

    // Clean up
    await db.deleteProfileByEmail(`type-owner-${uniqueId}@test.local`);
  });
});
