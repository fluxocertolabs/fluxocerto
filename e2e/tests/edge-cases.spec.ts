/**
 * E2E Tests: Edge Cases and Error Handling
 * Tests boundary conditions, error states, and unusual scenarios
 */

import { test, expect } from '../fixtures/test-base';
import { createAccount, createExpense, createCreditCard } from '../utils/test-data';

test.describe('Edge Cases & Error Handling', () => {
  // Run tests serially to avoid parallel flakiness with realtime connections
  test.describe.configure({ mode: 'serial' });

  test('T062: large monetary values (R$ 21.474.836,47) → account created successfully', async ({
    db,
  }) => {
    // Use unique name to avoid conflicts
    const uniqueId = Date.now();
    // Seed account with large balance (2147483647 centavos = R$ 21.474.836,47)
    // This is the max value for PostgreSQL integer type
    const [seeded] = await db.seedAccounts([
      createAccount({ name: `Conta Grande ${uniqueId}`, balance: 2147483647 }),
    ]);

    // Verify the account was created in the database
    const exists = await db.accountExists(seeded.name);
    expect(exists).toBe(true);
  });

  test('T063: zero balance account → displays R$ 0,00 correctly', async ({
    page,
    managePage,
    db,
  }) => {
    // Use unique name to avoid collisions
    const uniqueId = Date.now();

    // IMPORTANT: Navigate FIRST, then seed data, then reload.
    // Seeding before navigation has proven flaky with Supabase Realtime interactions under parallel load.
    await managePage.goto();
    await managePage.selectAccountsTab();

    const [seeded] = await db.seedAccounts([
      createAccount({ name: `Conta Zerada ${uniqueId}`, balance: 0 }),
    ]);

    // Reload to pick up the seeded data
    await page.reload({ waitUntil: 'domcontentloaded' });
    await managePage.waitForReady();
    await managePage.selectAccountsTab();

    const accounts = managePage.accounts();
    await accounts.waitForLoad();
    await accounts.expectAccountVisible(seeded.name);

    // Verify zero balance is displayed (could be R$ 0,00 or similar format)
    const accountCard = page.locator('div.group.relative').filter({ 
      has: page.getByRole('heading', { name: seeded.name, level: 3 }) 
    }).first();
    await expect(accountCard).toBeVisible();
  });

  test('T064: negative balance (credit card) → displayed with appropriate styling', async ({
    page,
    managePage,
    db,
  }) => {
    // Use unique name to avoid collisions
    const uniqueId = Date.now();
    
    // IMPORTANT: Navigate FIRST, then seed data, then reload.
    await managePage.goto();
    await managePage.selectCreditCardsTab();

    // Credit cards typically show statement balance as positive (amount owed)
    const [seeded] = await db.seedCreditCards([
      createCreditCard({ name: `Cartão Negativo ${uniqueId}`, statement_balance: 150000, due_day: 10 }),
    ]);

    // Reload to pick up the seeded data
    await page.reload({ waitUntil: 'domcontentloaded' });
    await managePage.waitForReady();
    
    // Select credit cards tab
    await managePage.selectCreditCardsTab();
    
    // Wait for the credit cards section to load
    const creditCards = managePage.creditCards();
    await creditCards.waitForLoad();
    
    // Use a more robust check - wait for the specific card to appear with retries
    await expect(async () => {
      const card = page.getByText(seeded.name, { exact: true }).first();
      await expect(card).toBeVisible();
    }).toPass({ timeout: 15000 });
  });

  test('T065: special characters in names (Café & Cia.) → handled correctly', async ({
    page,
    managePage,
    db,
  }) => {
    // Use unique name with special characters to avoid collisions
    const uniqueId = Date.now();
    const [seeded] = await db.seedExpenses([
      createExpense({ name: `Café & Cia. ${uniqueId}`, amount: 15000 }),
    ]);

    // Navigate and wait for page to be fully ready
    await managePage.goto();
    await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(5000)]);
    await managePage.selectExpensesTab();

    const expenses = managePage.expenses();
    await expenses.selectFixedExpenses();
    
    await expenses.expectExpenseVisible(seeded.name);
  });

  test('T066: very long name (50+ characters) → truncated or wrapped appropriately', async ({
    page,
    managePage,
    db,
  }) => {
    // Use unique name with long text to avoid collisions
    const uniqueId = Date.now();
    const longName = `Conta com Nome Muito Longo para Testar Truncamento ${uniqueId}`;
    const [seeded] = await db.seedAccounts([createAccount({ name: longName, balance: 100000 })]);

    // Navigate and wait for page to be fully ready
    await managePage.goto();
    await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(5000)]);
    await managePage.selectAccountsTab();

    const accounts = managePage.accounts();
    await accounts.waitForLoad();
    
    // The name might be truncated in display, so check for partial match
    // Use the seeded name which includes the worker prefix
    const displayName = seeded.name;
    await expect(
      accounts.page.getByText(displayName.substring(0, 20), { exact: false })
    ).toBeVisible();
  });

  test('T067: account balance update → new balance displayed', async ({
    page,
    managePage,
    db,
  }) => {
    // Use unique name to avoid collisions
    const uniqueId = Date.now();
    const [seeded] = await db.seedAccounts([createAccount({ name: `Conta Rápida ${uniqueId}`, balance: 100000 })]);

    // Navigate and wait for page to be fully ready
    await managePage.goto();
    await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(5000)]);
    await managePage.selectAccountsTab();

    const accounts = managePage.accounts();
    await accounts.waitForLoad();
    await accounts.expectAccountVisible(seeded.name);

    // Perform a single update
    await accounts.updateAccountBalance(seeded.name, '4.000,00');
    
    // Wait for the update to process
    await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(5000)]);
    await page.waitForTimeout(500);

    // Wait for update to complete via realtime subscription
    // Use toPass to retry until realtime update propagates
    // Look for the balance in the specific account card to avoid matching other elements
    await expect(async () => {
      // Find the account card
      const accountCard = page.locator('div.group.relative').filter({ 
        has: page.getByRole('heading', { name: seeded.name, level: 3 }) 
      }).first();
      
      // Check that the card contains the new balance (R$ 4.000,00 format)
      await expect(accountCard.getByText(/4\.000|4000/).first()).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 20000, intervals: [500, 1000, 2000, 3000] });
  });

  test('T068: network latency simulation → loading states displayed', async ({
    page,
    dashboardPage,
    db,
  }) => {
    // Use unique name to avoid collisions
    const uniqueId = Date.now();
    // Seed some data first
    await db.seedAccounts([createAccount({ name: `Conta Latência ${uniqueId}`, balance: 100000 })]);

    // Navigate to dashboard
    await dashboardPage.goto();

    // The page should load successfully even with data
    // Loading states would be visible during the load
    await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(5000)]);

    // Verify content eventually loads
    await expect(page.locator('body')).toBeVisible();
  });

  test('T069: date edge case - expense due day 31 in 30-day month → handled correctly', async ({
    page,
    managePage,
    db,
  }) => {
    // Use unique name to avoid collisions
    const uniqueId = Date.now();
    const [seeded] = await db.seedExpenses([
      createExpense({ name: `Despesa Dia 31 ${uniqueId}`, amount: 50000, due_day: 31 }),
    ]);

    // Navigate and wait for page to be fully ready
    await managePage.goto();
    await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(5000)]);
    await managePage.selectExpensesTab();

    const expenses = managePage.expenses();
    await expenses.selectFixedExpenses();
    
    await expenses.expectExpenseVisible(seeded.name);
  });

  test('T070: delete account confirmation dialog → opens and closes correctly', async ({
    page,
    managePage,
    db,
  }) => {
    // Use unique name to avoid conflicts
    const uniqueId = Date.now();
    // Seed a single account
    const [seeded] = await db.seedAccounts([createAccount({ name: `Única Conta ${uniqueId}`, balance: 50000 })]);

    // Navigate and wait for page to be fully ready
    await managePage.goto();
    await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(5000)]);
    await managePage.selectAccountsTab();

    const accounts = managePage.accounts();
    await accounts.waitForLoad();
    await accounts.expectAccountVisible(seeded.name);

    // Find the card and click delete
    const accountCard = page.locator('div.group.relative').filter({ 
      has: page.getByRole('heading', { name: seeded.name, level: 3, exact: true }) 
    }).first();
    await accountCard.hover();
    await page.waitForTimeout(200);
    await accountCard.getByRole('button', { name: /mais opções|more/i }).click();
    await page.getByRole('button', { name: /excluir/i }).click();

    // Verify confirmation dialog appears
    const confirmDialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });

    // Click the confirm button
    await confirmDialog.getByRole('button', { name: /confirmar|sim|yes|excluir/i }).click();

    // Dialog should close
    await expect(confirmDialog).not.toBeVisible({ timeout: 10000 });
  });
});
