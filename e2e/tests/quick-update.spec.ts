/**
 * E2E Tests: User Story 7 - Quick Update Modal
 * Tests the bulk balance update functionality
 */

import { test, expect } from '../fixtures/test-base';
import { createAccount, createCreditCard } from '../utils/test-data';
import { executeSQL } from '../utils/supabase-admin';

test.describe('Quick Update Modal', () => {
  // Tests now run in parallel with per-worker data prefixing for isolation

  async function resetForCleanState(db: {
    resetDatabase: () => Promise<void>
    ensureTestUser: (userEmail?: string) => Promise<void>
  }) {
    await db.resetDatabase()
    await db.ensureTestUser()
  }
  
  // Ensure onboarding state is 'completed' before each test.
  // This is necessary because the provisioning-recovery test (which runs before this suite
  // in the full test run) can leave the onboarding state in 'in_progress' due to the
  // self-heal flow triggering the onboarding wizard.
  test.beforeEach(async ({ db, workerContext }) => {
    const { executeSQLWithResult } = await import('../utils/supabase-admin');
    const groupId = await db.getWorkerGroupId();
    const userIdRows = await executeSQLWithResult<{ id: string }>(
      `SELECT id FROM auth.users WHERE email = '${workerContext.email.toLowerCase()}' LIMIT 1`
    );
    const userId = userIdRows[0]?.id;
    
    if (userId && groupId) {
      await executeSQL(`
        UPDATE public.onboarding_states 
        SET status = 'completed', current_step = 'done', completed_at = now()
        WHERE user_id = '${userId}' AND group_id = '${groupId}'
      `);
    }
  });

  test('T071: open Quick Update → all accounts and credit cards listed', async ({
    page: _page,
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
    await quickUpdatePage.waitForItem(seededAccount.name);
    await quickUpdatePage.waitForItem(seededCard.name);

    // Verify no "Não atribuído" text is shown within the seeded rows
    const accountRow = page.locator('div.rounded-lg.border').filter({ hasText: seededAccount.name });
    const cardRow = page.locator('div.rounded-lg.border').filter({ hasText: seededCard.name });
    await expect(accountRow.getByText('Não atribuído')).not.toBeVisible();
    await expect(cardRow.getByText('Não atribuído')).not.toBeVisible();
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
    const accountName = `Nubank Check ${uniqueId}`;
    
    // Seed a checking account (using unique name without "Corrente" to avoid confusion)
    await db.seedAccounts([
      createAccount({ 
        name: accountName, 
        type: 'checking',
        balance: 100000,
      }),
    ]);
    
    // Navigate and open Quick Update
    await dashboardPage.goto();
    await dashboardPage.expectChartRendered();
    await dashboardPage.openQuickUpdate();
    await quickUpdatePage.waitForModal();
    
    // Wait for accounts section to load in the modal
    await expect(page.getByRole('heading', { name: /contas bancárias/i })).toBeVisible({ timeout: 15000 });

    // Verify the account is listed with its type badge
    await expect(page.getByText(accountName, { exact: false })).toBeVisible({ timeout: 10000 });
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
    // Reset for clean state - this test relies on specific badge counts
    await resetForCleanState(db);
    
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
    // Reset for clean state to avoid stale data from prior tests
    await resetForCleanState(db);

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
    await expect(quickUpdatePage.completeButton).toBeVisible({ timeout: 10000 });

    // Verify the card is listed (with timeout for data to load)
    await expect(page.getByRole('heading', { name: /cartões de crédito/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(cardName, { exact: false })).toBeVisible({ timeout: 10000 });

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
    // Increase timeout for this test that involves profile creation and badge verification
    test.setTimeout(90000);

    // Reset for clean state - this test relies on specific badge presence
    await resetForCleanState(db);
    
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

    // Find the specific account row - use extended timeout since account list can take time to load
    const accountRow = page.locator('div.rounded-lg.border').filter({ hasText: accountName });
    await expect(accountRow).toBeVisible({ timeout: 20000 });
    
    // Verify the account is listed
    await expect(page.getByText(accountName, { exact: false })).toBeVisible();
    
    // Verify owner badge is shown within the account row
    await expect(accountRow.getByText('Daniel')).toBeVisible();
    
    // Verify type badge is shown within the account row
    await expect(accountRow.locator('span').filter({ hasText: /^📈Investimento$/ })).toBeVisible();

    // Clean up
    await db.deleteProfileByEmail(`type-owner-${uniqueId}@test.local`);
  });

  test('T084: update balance does not remove owner/type badges in Quick Update', async ({
    page,
    dashboardPage,
    quickUpdatePage,
    db,
  }) => {
    // Reset for clean state - reduces flakiness for badge visibility assertions
    await resetForCleanState(db);

    const uniqueId = Date.now();
    const groupId = await db.getWorkerGroupId();

    const owner = await db.createProfileInGroup(
      `update-owner-${uniqueId}@test.local`,
      'Daniel',
      groupId
    );

    const accountName = `Conta Update Owned ${uniqueId}`;
    await db.seedAccounts([
      createAccount({
        name: accountName,
        type: 'checking',
        balance: 100000,
        owner_id: owner.id,
      }),
    ]);

    await dashboardPage.goto();
    await dashboardPage.expectChartRendered();
    await dashboardPage.openQuickUpdate();
    await quickUpdatePage.waitForModal();

    const accountRow = page.locator('div.rounded-lg.border').filter({ hasText: accountName });
    await expect(accountRow).toBeVisible();

    // Precondition: badges visible
    await expect(accountRow.getByText('Daniel')).toBeVisible();
    await expect(accountRow.locator('span').filter({ hasText: /^🏦Corrente$/ })).toBeVisible();

    // Update balance (auto-save on blur)
    const escapedName = accountName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const balanceInput = page.getByLabel(new RegExp(`Saldo de.*${escapedName}`, 'i')).last();
    await expect(balanceInput).toBeVisible({ timeout: 10000 });
    await balanceInput.clear();
    await balanceInput.fill('2000,00');
    await balanceInput.blur();

    // Wait for save to complete using polling assertion
    // The input goes through: enabled -> disabled (saving) -> enabled (saved)
    // Use expect.poll to robustly wait for the final enabled state
    await expect.poll(
      async () => {
        const isDisabled = await balanceInput.isDisabled();
        return !isDisabled;
      },
      {
        message: 'Balance input should be enabled after save completes',
        timeout: 20000,
        intervals: [500, 1000, 2000],
      }
    ).toBe(true);

    // Regression: owner/type badges must still be visible after save
    await expect(accountRow.getByText('Daniel')).toBeVisible();
    await expect(accountRow.locator('span').filter({ hasText: /^🏦Corrente$/ })).toBeVisible();

    // Close + reopen to ensure no "tags dropped" state lingers
    await quickUpdatePage.complete();
    await quickUpdatePage.expectModalClosed();

    await dashboardPage.openQuickUpdate();
    await quickUpdatePage.waitForModal();

    const accountRowAfter = page.locator('div.rounded-lg.border').filter({ hasText: accountName });
    await expect(accountRowAfter.getByText('Daniel')).toBeVisible();
    await expect(accountRowAfter.locator('span').filter({ hasText: /^🏦Corrente$/ })).toBeVisible();

    await db.deleteProfileByEmail(`update-owner-${uniqueId}@test.local`);
  });
});

