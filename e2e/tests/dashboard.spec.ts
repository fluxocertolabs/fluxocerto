/**
 * E2E Smoke Tests: Dashboard
 * 
 * Tests basic dashboard functionality:
 * - Empty state display
 * - Populated state with chart
 * - Quick update modal
 * 
 * Uses dev-auth-bypass for fast, reliable authentication.
 */

import { test, expect } from '../fixtures/smoke-test-base';

test.describe('Dashboard Smoke Tests', () => {
  test('shows empty state when no data exists', async ({ page, dashboardPage, db }) => {
    // Ensure clean state
    await db.clear();

    await dashboardPage.goto();

    // Should show empty state OR quick update button (depends on loading)
    await expect(async () => {
      const emptyState = page.getByRole('heading', { name: /nenhum dado financeiro/i });
      const quickUpdateButton = page.getByRole('button', { name: /atualizar saldos/i }).first();

      const checks = await Promise.all([
        emptyState.isVisible().catch(() => false),
        quickUpdateButton.isVisible().catch(() => false),
      ]);

      expect(checks.some((c) => c === true)).toBe(true);
    }).toPass({ timeout: 15000, intervals: [1000, 2000, 5000] });
  });

  test('shows chart when data exists', async ({ dashboardPage, db }) => {
    // Seed minimal data
    await db.seedAccounts([
      { name: 'Test Account', type: 'checking', balance: 100000 },
    ]);
    await db.setAccountsBalanceUpdatedAt(new Date().toISOString());

    await dashboardPage.goto();

    // Chart should render
    await dashboardPage.expectChartRendered();
  });

  test('can open quick update modal', async ({ dashboardPage, quickUpdatePage, db }) => {
    // Seed minimal data
    await db.seedAccounts([
      { name: 'Test Account', type: 'checking', balance: 100000 },
    ]);
    await db.setAccountsBalanceUpdatedAt(new Date().toISOString());

    await dashboardPage.goto();
    await dashboardPage.expectChartRendered();

    // Open quick update
    await dashboardPage.openQuickUpdate();
    await quickUpdatePage.waitForModal();

    // Clean up: close the dialog so it can't interfere with subsequent interactions
    // (particularly important in CI where contexts may be reused/slow to tear down).
    await quickUpdatePage.cancel();
    await quickUpdatePage.expectModalClosed();
  });

  test('can change projection period', async ({ page, dashboardPage, db }) => {
    // Seed minimal data
    await db.seedAccounts([
      { name: 'Test Account', type: 'checking', balance: 100000 },
    ]);
    await db.setAccountsBalanceUpdatedAt(new Date().toISOString());

    await dashboardPage.goto();
    await dashboardPage.expectChartRendered();

    // Change projection to 90 days
    await dashboardPage.selectProjectionDays(90);

    // Verify selector shows 90 days
    await expect(page.locator('#projection-selector')).toContainText(/90/);

    // Chart should still be rendered
    await dashboardPage.expectChartRendered();
  });

  test('shows summary panel with totals', async ({ dashboardPage, db }) => {
    // Seed data with income and expenses
    await db.seedAccounts([
      { name: 'Test Account', type: 'checking', balance: 100000 },
    ]);
    await db.setAccountsBalanceUpdatedAt(new Date().toISOString());

    await db.seedProjects([
      { name: 'Salary', amount: 500000, certainty: 'guaranteed', frequency: 'monthly' },
    ]);

    await db.seedExpenses([
      { name: 'Rent', amount: 200000, due_day: 15 },
    ]);

    await dashboardPage.goto();
    await dashboardPage.expectChartRendered();

    // Verify summary panel shows totals
    const incomeTotal = await dashboardPage.getIncomeTotal();
    const expenseTotal = await dashboardPage.getExpenseTotal();

    expect(incomeTotal).toMatch(/R\$/);
    expect(expenseTotal).toMatch(/R\$/);
  });
});
