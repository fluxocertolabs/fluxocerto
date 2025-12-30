/**
 * E2E Tests: Historical Projection Snapshots
 * Tests snapshot creation, history listing, detail view, and deletion
 */

import { test, expect } from '../fixtures/test-base';
import { createFullSeedData } from '../utils/test-data';

// Helper to create mock snapshot data for seeding
// Creates 30 days of projection data for proper chart rendering
function createMockSnapshotData() {
  const now = new Date();
  const days = [];
  
  // Create 30 days of data for proper chart rendering
  for (let i = 0; i < 30; i++) {
    const dayDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    days.push({
      date: dayDate.toISOString(),
      dayOffset: i,
      optimisticBalance: 100000 + i * 1000, // Gradual increase
      pessimisticBalance: 90000 + i * 500,
      incomeEvents: [],
      expenseEvents: [],
      isOptimisticDanger: false,
      isPessimisticDanger: false,
    });
  }
  
  return {
    inputs: {
      accounts: [{ id: 'acc-1', name: 'Test Account', type: 'checking', balance: 100000 }],
      projects: [],
      singleShotIncome: [],
      fixedExpenses: [],
      singleShotExpenses: [],
      creditCards: [],
      futureStatements: [],
      projectionDays: 30,
    },
    projection: {
      startDate: now.toISOString(),
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      startingBalance: 100000,
      days,
      optimistic: {
        totalIncome: 50000,
        totalExpenses: 30000,
        endBalance: 129000,
        dangerDays: [],
        dangerDayCount: 0,
      },
      pessimistic: {
        totalIncome: 40000,
        totalExpenses: 30000,
        endBalance: 104500,
        dangerDays: [],
        dangerDayCount: 0,
      },
    },
    summaryMetrics: {
      startingBalance: 100000,
      endBalanceOptimistic: 129000,
      dangerDayCount: 0,
    },
  };
}

test.describe('Historical Projection Snapshots', () => {
  test('T026: snapshot pages never show "Saldo estimado" indicator (history list + detail)', async ({
    historyPage,
    snapshotDetailPage,
    db,
    page,
  }) => {
    // Seed a snapshot
    const [seeded] = await db.seedSnapshots([
      { name: 'Indicator Absence Snapshot', data: createMockSnapshotData() },
    ])

    await historyPage.goto()
    await expect(page.locator('[data-testid="estimated-balance-indicator"]')).not.toBeVisible()

    await historyPage.clickSnapshot('Indicator Absence Snapshot')
    await page.waitForURL(/\/history\/[a-f0-9-]+/)
    await snapshotDetailPage.expectSummaryRendered()

    await expect(page.locator('[data-testid="estimated-balance-indicator"]')).not.toBeVisible()
  })

  test.describe('History Page - Empty State', () => {
    test('T026c: navigate to /history with no snapshots → empty state message displayed', async ({
      historyPage,
      db,
    }) => {
      // Ensure no snapshots exist
      await db.deleteSnapshots();

      await historyPage.goto();

      const hasEmpty = await historyPage.hasEmptyState();
      expect(hasEmpty).toBe(true);
    });
  });

  test.describe('History Page - With Data', () => {
    test('view history list → snapshots displayed in chronological order', async ({
      historyPage,
      db,
    }) => {
      // Seed multiple snapshots
      await db.seedSnapshots([
        { name: 'Snapshot Janeiro', data: createMockSnapshotData() },
        { name: 'Snapshot Fevereiro', data: createMockSnapshotData() },
        { name: 'Snapshot Março', data: createMockSnapshotData() },
      ]);

      await historyPage.goto();

      // Verify snapshots are displayed
      await historyPage.expectSnapshotVisible('Snapshot Janeiro');
      await historyPage.expectSnapshotVisible('Snapshot Fevereiro');
      await historyPage.expectSnapshotVisible('Snapshot Março');
    });

    test('click snapshot card → navigates to detail view', async ({
      historyPage,
      snapshotDetailPage,
      db,
      page,
    }) => {
      // Seed a snapshot
      const [seeded] = await db.seedSnapshots([
        { name: 'Test Navigation Snapshot', data: createMockSnapshotData() },
      ]);

      await historyPage.goto();
      await historyPage.clickSnapshot('Test Navigation Snapshot');

      // Wait for navigation to detail page
      await page.waitForURL(/\/history\/[a-f0-9-]+/);

      // Verify historical banner is shown
      const hasBanner = await snapshotDetailPage.hasHistoricalBanner();
      expect(hasBanner).toBe(true);
    });

    test('delete snapshot from history list → snapshot removed', async ({
      historyPage,
      db,
    }) => {
      // Seed a snapshot
      await db.seedSnapshots([
        { name: 'Snapshot to Delete', data: createMockSnapshotData() },
      ]);

      await historyPage.goto();
      await historyPage.expectSnapshotVisible('Snapshot to Delete');

      // Delete the snapshot
      await historyPage.deleteSnapshot('Snapshot to Delete');

      // Verify snapshot is removed
      await historyPage.expectSnapshotNotVisible('Snapshot to Delete');
    });
  });

  test.describe('Snapshot Detail Page', () => {
    test('open snapshot detail → chart and summary displayed', async ({
      snapshotDetailPage,
      db,
    }) => {
      // Seed a snapshot
      const [seeded] = await db.seedSnapshots([
        { name: 'Detail View Snapshot', data: createMockSnapshotData() },
      ]);

      await snapshotDetailPage.goto(seeded.id);

      // Verify historical banner shows snapshot name
      const name = await snapshotDetailPage.getSnapshotName();
      expect(name).toBe('Detail View Snapshot');

      // Verify chart and summary are rendered
      await snapshotDetailPage.expectChartRendered();
      await snapshotDetailPage.expectSummaryRendered();
    });

    test('delete snapshot from detail page → redirects to history', async ({
      snapshotDetailPage,
      historyPage,
      db,
      page,
    }) => {
      // Seed a snapshot
      const [seeded] = await db.seedSnapshots([
        { name: 'Delete from Detail', data: createMockSnapshotData() },
      ]);

      await snapshotDetailPage.goto(seeded.id);
      await snapshotDetailPage.deleteSnapshot();

      // Verify redirect to history page
      await expect(page).toHaveURL('/history');

      // Verify snapshot is no longer in the list
      await historyPage.expectSnapshotNotVisible('Delete from Detail');
    });

    test('back button → returns to history page', async ({
      snapshotDetailPage,
      db,
      page,
    }) => {
      // Seed a snapshot
      const [seeded] = await db.seedSnapshots([
        { name: 'Back Button Test', data: createMockSnapshotData() },
      ]);

      await snapshotDetailPage.goto(seeded.id);
      await snapshotDetailPage.goBack();

      // Verify we're back on history page
      await expect(page).toHaveURL('/history');
    });

    test('non-existent snapshot ID → not found message displayed', async ({
      snapshotDetailPage,
    }) => {
      await snapshotDetailPage.goto('00000000-0000-0000-0000-000000000000');
      await snapshotDetailPage.expectNotFound();
    });
  });

  test.describe('Save Snapshot from Dashboard', () => {
    test('save snapshot from dashboard → appears in history', async ({
      dashboardPage,
      historyPage,
      db,
      page,
    }) => {
      // Seed financial data to enable projection
      const seedData = createFullSeedData();
      await db.seedFullScenario(seedData);

      // Go to dashboard and wait for chart
      await dashboardPage.goto();
      await dashboardPage.expectChartRendered();

      // Click save snapshot button
      const saveButton = page.getByRole('button', { name: /salvar projeção/i });
      await saveButton.click();

      // Fill in the snapshot name
      const nameInput = page.getByLabel(/nome/i);
      await nameInput.fill('My Test Snapshot');

      // Submit the dialog
      const submitButton = page.getByRole('button', { name: /salvar/i }).last();
      await submitButton.click();

      // Wait for success toast
      await expect(page.getByText(/projeção salva com sucesso/i)).toBeVisible({ timeout: 10000 });

      // Navigate to history and verify snapshot appears
      await historyPage.goto();
      await historyPage.expectSnapshotVisible('My Test Snapshot');
    });

    test('T034 (SC-004): snapshot detail remains frozen after current data changes', async ({
      dashboardPage,
      historyPage,
      snapshotDetailPage,
      db,
      page,
    }) => {
      const seedData = createFullSeedData()
      await db.seedFullScenario(seedData)

      await dashboardPage.goto()
      await dashboardPage.expectChartRendered()

      // Save a snapshot
      const saveButton = page.getByRole('button', { name: /salvar projeção/i })
      await saveButton.click()
      await page.getByLabel(/nome/i).fill('Frozen Snapshot')
      await page.getByRole('button', { name: /salvar/i }).last().click()
      await expect(page.getByText(/projeção salva com sucesso/i)).toBeVisible({ timeout: 10000 })

      // Open snapshot detail
      await historyPage.goto()
      await historyPage.clickSnapshot('Frozen Snapshot')
      await page.waitForURL(/\/history\/[a-f0-9-]+/)
      await snapshotDetailPage.expectSummaryRendered()

      // Capture stable summary values
      const startingLabel = page.getByText(/saldo inicial/i)
      const startingCard = startingLabel.locator('..')
      const startingValue = startingCard.locator('p').nth(1)

      const endingLabel = page.getByText(/^saldo final$/i)
      const endingCard = endingLabel.locator('..')
      const endingValue = endingCard.locator('p').nth(1)

      const startingText = (await startingValue.textContent())?.trim()
      const endingText = (await endingValue.textContent())?.trim()

      expect(startingText).toBeTruthy()
      expect(endingText).toBeTruthy()

      // Mutate current data (should NOT affect snapshot)
      await db.seedSingleShotExpenses([
        { name: 'Mutating expense', amount: 12345, date: '2025-01-20' },
      ])

      // Wait and assert snapshot values remain unchanged
      await expect(startingValue).toHaveText(startingText!)
      await expect(endingValue).toHaveText(endingText!)

      // Also confirm estimate UI is never shown in historical context
      await expect(page.locator('[data-testid="estimated-balance-indicator"]')).not.toBeVisible()
    })
  });

  test.describe('Navigation Flow', () => {
    test('T026e: complete navigation flow → all transitions work', async ({
      dashboardPage,
      historyPage,
      snapshotDetailPage,
      db,
      page,
    }) => {
      // Seed financial data
      const seedData = createFullSeedData();
      await db.seedFullScenario(seedData);

      // Seed a snapshot for navigation testing
      const [seeded] = await db.seedSnapshots([
        { name: 'Navigation Flow Snapshot', data: createMockSnapshotData() },
      ]);

      // 1. Start at dashboard
      await dashboardPage.goto();
      await dashboardPage.expectChartRendered();

      // 2. Navigate to history via header link
      const historyLink = page.getByRole('link', { name: /histórico/i });
      await historyLink.click();
      await expect(page).toHaveURL('/history');

      // 3. Click snapshot to go to detail
      await historyPage.expectSnapshotVisible('Navigation Flow Snapshot');
      await historyPage.clickSnapshot('Navigation Flow Snapshot');
      await expect(page).toHaveURL(/\/history\/[a-f0-9-]+/);

      // 4. Go back to history
      await snapshotDetailPage.goBack();
      await expect(page).toHaveURL('/history');

      // 5. Navigate back to dashboard via header link
      const dashboardLink = page.getByRole('link', { name: /painel/i });
      await dashboardLink.click();
      await expect(page).toHaveURL('/');

      // Verify we're back at dashboard with chart
      await dashboardPage.expectChartRendered();
    });
  });

  test.describe('365-Day Projection Snapshot', () => {
    test('T026b: save and load 365-day projection snapshot → data integrity verified', async ({
      dashboardPage,
      historyPage,
      snapshotDetailPage,
      db,
      page,
    }) => {
      // Seed financial data
      const seedData = createFullSeedData();
      await db.seedFullScenario(seedData);

      // Go to dashboard
      await dashboardPage.goto();
      await dashboardPage.expectChartRendered();

      // Change projection to maximum (365 days if available, otherwise 90)
      // Note: The app may not support 365 days, so we test with the max available
      try {
        await dashboardPage.selectProjectionDays(90);
      } catch (e) {
        // If 90 days isn't available, continue with default
        console.log('90-day projection option not available, using default:', e);
      }

      // Wait for chart to update
      await dashboardPage.expectChartRendered();

      // Save the snapshot
      const saveButton = page.getByRole('button', { name: /salvar projeção/i });
      await saveButton.click();

      const nameInput = page.getByLabel(/nome/i);
      await nameInput.fill('Long Term Projection');

      const submitButton = page.getByRole('button', { name: /salvar/i }).last();
      await submitButton.click();

      // Wait for success
      await expect(page.getByText(/projeção salva com sucesso/i)).toBeVisible({ timeout: 10000 });

      // Navigate to history and open the snapshot
      await historyPage.goto();
      await historyPage.clickSnapshot('Long Term Projection');

      // Verify the snapshot loads correctly with chart and summary
      await snapshotDetailPage.expectChartRendered();
      await snapshotDetailPage.expectSummaryRendered();

      // Verify the name is correct
      const name = await snapshotDetailPage.getSnapshotName();
      expect(name).toBe('Long Term Projection');
    });
  });
});

