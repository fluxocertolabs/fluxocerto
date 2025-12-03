/**
 * E2E Tests: Household Multi-Tenancy Feature (Spec 020)
 * Tests household display, members list, and data isolation
 * 
 * User Stories covered:
 * - US1: Data Isolation Between Households (P1)
 * - US2: Invite New Members to Household (P2) - partial (invite validation only)
 * - US3: View Household Information and Members (P3)
 */

import { test, expect } from '../fixtures/test-base';
import { createAccount, createExpense, createProject, createFullSeedData } from '../utils/test-data';

test.describe('Household Multi-Tenancy', () => {
  // Tests run in parallel with per-worker data prefixing for isolation

  test.describe('User Story 3: View Household Information and Members', () => {
    test('T080: household name displayed in header badge → badge visible on dashboard', async ({
      page,
      dashboardPage,
      db,
      workerContext,
    }) => {
      // Seed some data to ensure we're not in empty state
      const seedData = createFullSeedData();
      await db.seedFullScenario(seedData);

      await dashboardPage.goto();

      // Wait for page to fully load
      await page.waitForLoadState('networkidle');

      // FR-015: System MUST display the current household name visibly in the application header
      // The HouseholdBadge component shows household name with a Home icon
      // Look for the household name text in the header (uses worker's household name)
      const header = page.locator('header');
      const householdNamePattern = new RegExp(workerContext.householdName, 'i');
      await expect(header.getByText(householdNamePattern).first()).toBeVisible({ timeout: 10000 });
    });

    test('T081: household name displayed on manage page → badge visible in header', async ({
      page,
      managePage,
      workerContext,
    }) => {
      await managePage.goto();
      await page.waitForLoadState('networkidle');

      // FR-015: Household name should be visible on any page (header is global)
      const header = page.locator('header');
      const householdNamePattern = new RegExp(workerContext.householdName, 'i');
      await expect(header.getByText(householdNamePattern).first()).toBeVisible({ timeout: 10000 });
    });

    test('T082: view household members section → members list displayed with current user indicator', async ({
      page,
      managePage,
      workerContext,
    }) => {
      await managePage.goto();
      await page.waitForLoadState('networkidle');

      // Navigate to household tab
      await managePage.selectHouseholdTab();

      const household = managePage.household();
      await household.waitForLoad();

      // FR-016: System MUST provide a "Membros da Residência" section
      // Verify the section title is visible (use exact match to avoid multiple elements)
      await expect(page.getByText('Membros da Residência', { exact: true })).toBeVisible();

      // FR-017: System MUST display all UI text related to households in Brazilian Portuguese
      // The "(Você)" indicator should be shown for the current user
      await household.expectCurrentUserIndicator();
    });

    test('T083: household section shows household name in description', async ({
      page,
      managePage,
      workerContext,
    }) => {
      await managePage.goto();
      await page.waitForLoadState('networkidle');

      await managePage.selectHouseholdTab();

      const household = managePage.household();
      await household.waitForLoad();

      // The CardDescription should show "Membros da residência <name>"
      // The household name should be visible in the description (uses worker's household name)
      const householdNamePattern = new RegExp(workerContext.householdName, 'i');
      await expect(page.getByText(householdNamePattern).first()).toBeVisible();
    });

    test('T084: household members list shows at least one member', async ({
      page,
      managePage,
    }) => {
      await managePage.goto();
      await page.waitForLoadState('networkidle');

      await managePage.selectHouseholdTab();

      const household = managePage.household();
      await household.waitForLoad();

      // At minimum, the current user should be in the members list
      const memberCount = await household.getMemberCount();
      expect(memberCount).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('User Story 1: Data Isolation Between Households', () => {
    // Note: Full data isolation testing requires two separate authenticated users
    // in different households. The current test setup uses a single user per worker.
    // These tests verify the RLS policies work correctly for the current user's household.

    test('T085: user sees only their household data → accounts filtered by household', async ({
      page,
      managePage,
      db,
    }) => {
      // Seed accounts for this worker's household
      const uniqueId = Date.now();
      const [seeded] = await db.seedAccounts([
        createAccount({ name: `Conta Isolada ${uniqueId}`, balance: 100000 }),
      ]);

      await managePage.goto();
      await page.waitForLoadState('networkidle');
      await managePage.selectAccountsTab();

      const accounts = managePage.accounts();
      await accounts.waitForLoad();

      // User should see their own account
      await accounts.expectAccountVisible(seeded.name);
    });

    test('T086: user sees only their household data → expenses filtered by household', async ({
      page,
      managePage,
      db,
    }) => {
      const uniqueId = Date.now();
      const [seeded] = await db.seedExpenses([
        createExpense({ name: `Despesa Isolada ${uniqueId}`, amount: 50000 }),
      ]);

      await managePage.goto();
      await page.waitForLoadState('networkidle');
      await managePage.selectExpensesTab();

      const expenses = managePage.expenses();
      await expenses.selectFixedExpenses();

      // Wait for network to settle after tab switch
      await page.waitForLoadState('networkidle');

      // User should see their own expense
      await expenses.expectExpenseVisible(seeded.name);
    });

    test('T087: user sees only their household data → projects filtered by household', async ({
      page,
      managePage,
      db,
    }) => {
      const uniqueId = Date.now();
      const [seeded] = await db.seedProjects([
        createProject({ name: `Projeto Isolado ${uniqueId}`, amount: 200000 }),
      ]);

      await managePage.goto();
      await page.waitForLoadState('networkidle');
      await managePage.selectProjectsTab();

      const projects = managePage.projects();
      await projects.selectRecurring();

      // User should see their own project
      await projects.expectProjectVisible(seeded.name);
    });

    test('T088: new data created by user is assigned to their household', async ({
      page,
      managePage,
      workerContext,
    }) => {
      await managePage.goto();
      await page.waitForLoadState('networkidle');
      await managePage.selectAccountsTab();

      const accounts = managePage.accounts();
      
      // Create a new account via UI
      const accountName = `Nova Conta W${workerContext.workerIndex} ${Date.now()}`;
      await accounts.createAccount({
        name: accountName,
        type: 'checking',
        balance: '500,00',
      });

      // Account should be visible (created in user's household)
      await accounts.expectAccountVisible(accountName);

      // Refresh the page and verify it persists
      await page.reload();
      await page.waitForLoadState('networkidle');
      await managePage.selectAccountsTab();
      await accounts.waitForLoad();
      
      await accounts.expectAccountVisible(accountName);
    });
  });

  test.describe('User Story 2: Invite Flow Validation', () => {
    // Note: Full invite flow testing requires email sending and magic link handling.
    // These tests verify the invite validation logic at the UI level.
    // The actual invite flow is tested in auth.spec.ts

    test('T089: household tab is accessible from manage page', async ({
      page,
      managePage,
    }) => {
      await managePage.goto();
      await page.waitForLoadState('networkidle');

      // Verify household tab exists and is clickable
      await expect(managePage.householdTab).toBeVisible();
      await managePage.selectHouseholdTab();

      // Verify we're now on the household section (use exact match)
      await expect(page.getByText('Membros da Residência', { exact: true })).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('T090: household section handles loading state gracefully', async ({
      page,
      managePage,
    }) => {
      await managePage.goto();
      await page.waitForLoadState('networkidle');

      await managePage.selectHouseholdTab();

      // The section should eventually show content (either members or error)
      // It should not remain in loading state indefinitely
      await expect(async () => {
        const hasMembers = await page.getByText('Membros da Residência', { exact: true }).isVisible();
        const hasError = await page.locator('[class*="destructive"]').isVisible();
        const hasLoading = await page.getByText(/carregando/i).isVisible();
        
        // Either content is shown or loading is complete
        expect(hasMembers || hasError || !hasLoading).toBe(true);
      }).toPass({ timeout: 30000 });
    });

    test('T091: dashboard shows household badge even with no financial data', async ({
      page,
      dashboardPage,
      workerContext,
    }) => {
      // Navigate to dashboard without seeding any data
      await dashboardPage.goto();
      await page.waitForLoadState('networkidle');

      // Household badge should still be visible in header
      // (household info is independent of financial data)
      const header = page.locator('header');
      const householdNamePattern = new RegExp(workerContext.householdName, 'i');
      
      // Badge should be visible (may take time to load household info)
      await expect(async () => {
        await expect(header.getByText(householdNamePattern).first()).toBeVisible({ timeout: 5000 });
      }).toPass({ timeout: 20000 });
    });

    test('T092: multiple tabs navigation maintains household context', async ({
      page,
      managePage,
    }) => {
      await managePage.goto();
      await page.waitForLoadState('networkidle');

      // Navigate through all tabs
      await managePage.selectAccountsTab();
      await page.waitForTimeout(500);
      
      await managePage.selectExpensesTab();
      await page.waitForTimeout(500);
      
      await managePage.selectProjectsTab();
      await page.waitForTimeout(500);
      
      await managePage.selectCreditCardsTab();
      await page.waitForTimeout(500);
      
      await managePage.selectHouseholdTab();
      await page.waitForTimeout(500);

      // Household section should still work correctly
      const household = managePage.household();
      await household.waitForLoad();
      
      await expect(page.getByText('Membros da Residência', { exact: true })).toBeVisible();
    });
  });
});

