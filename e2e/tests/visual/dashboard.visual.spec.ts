/**
 * Visual Regression Tests: Dashboard Page
 * 
 * Minimal visual regression coverage:
 * - One screenshot of populated dashboard (light theme)
 * 
 * @visual
 */

import { visualTest, expect } from '../../fixtures/visual-test-base';

visualTest.describe('Dashboard Visual Regression @visual', () => {
  visualTest('dashboard - populated state', async ({ page, dashboardPage, db, visual }) => {
    // Visual tests can be slower under load (cold cache + chart rendering + screenshot).
    // Keep assertions strict but give the test enough headroom to avoid flaky timeouts.
    visualTest.setTimeout(120000);

    await db.clear();
    // Visual baseline assumes subscription is active so the billing gate doesn't overlay the dashboard.
    await db.seedBillingSubscription();

    // Seed a typical populated scenario
    // Amounts are in cents (e.g. 100_000_00 === R$100,000.00)
    await db.seedAccounts([
      { name: 'Nubank', type: 'checking', balance: 100_000_00 },
      { name: 'Itaú Poupança', type: 'savings', balance: 20_000_00 },
    ]);

    await db.seedProjects([
      {
        name: 'Salário',
        amount: 10_000_00,
        certainty: 'guaranteed',
        frequency: 'monthly',
        payment_schedule: { type: 'dayOfMonth', dayOfMonth: 20 },
      },
    ]);

    await db.seedExpenses([
      { name: 'Aluguel', amount: 2_000_00, due_day: 18 },
      { name: 'Internet', amount: 150_00, due_day: 15 },
    ]);

    await dashboardPage.goto();
    await visual.setTheme(page, 'light');
    await visual.waitForStableUI(page);

    // Wait for chart to render
    const chartContainer = page.locator('[data-testid="cashflow-chart"], .recharts-wrapper').first();
    await expect(chartContainer).toBeVisible({ timeout: 10000 });

    await visual.takeScreenshot(page, 'dashboard-populated.png');
  });
});
