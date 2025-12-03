/**
 * Visual Regression Tests: Snapshot Pages
 * Tests visual appearance of history page and snapshot detail in various states and themes
 *
 * @visual
 */

import { visualTest } from '../../fixtures/visual-test-base';
import { createFullSeedData } from '../../utils/test-data';

// Helper to create mock snapshot data for seeding
function createMockSnapshotData() {
  // Use fixed date for deterministic screenshots
  const fixedDate = new Date('2025-01-15T12:00:00');
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
      startDate: fixedDate.toISOString(),
      endDate: new Date(fixedDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      startingBalance: 100000,
      days: [
        {
          date: fixedDate.toISOString(),
          dayOffset: 0,
          optimisticBalance: 100000,
          pessimisticBalance: 90000,
          incomeEvents: [],
          expenseEvents: [],
          isOptimisticDanger: false,
          isPessimisticDanger: false,
        },
        {
          date: new Date(fixedDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          dayOffset: 1,
          optimisticBalance: 95000,
          pessimisticBalance: 85000,
          incomeEvents: [],
          expenseEvents: [],
          isOptimisticDanger: false,
          isPessimisticDanger: false,
        },
      ],
      optimistic: {
        totalIncome: 50000,
        totalExpenses: 30000,
        endBalance: 120000,
        dangerDays: [],
        dangerDayCount: 0,
      },
      pessimistic: {
        totalIncome: 40000,
        totalExpenses: 30000,
        endBalance: 110000,
        dangerDays: [],
        dangerDayCount: 0,
      },
    },
    summaryMetrics: {
      startingBalance: 100000,
      endBalanceOptimistic: 120000,
      dangerDayCount: 0,
    },
  };
}

/**
 * Helper to wait for chart rendering in visual tests.
 */
async function waitForChartToStabilize(page: import('@playwright/test').Page): Promise<void> {
  const chartContainer = page.locator('[data-testid="cashflow-chart"], .recharts-wrapper').first();
  await chartContainer.waitFor({ state: 'attached', timeout: 10000 }).catch(() => {
    // Chart may not be present if no data
  });
  await page.waitForTimeout(1000);
}

visualTest.describe('History Page Visual Regression @visual', () => {
  visualTest(
    'history - light empty',
    async ({ page, db, visual }) => {
      await db.resetDatabase();
      await db.deleteSnapshots();

      await page.goto('/history');
      await page.waitForSelector('text=/histórico de projeções/i', { timeout: 10000 });
      
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'history-light-empty.png');
    }
  );

  visualTest(
    'history - dark empty',
    async ({ page, db, visual }) => {
      await db.resetDatabase();
      await db.deleteSnapshots();

      await page.goto('/history');
      await page.waitForSelector('text=/histórico de projeções/i', { timeout: 10000 });
      
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'history-dark-empty.png');
    }
  );

  visualTest(
    'history - light with snapshots',
    async ({ page, db, visual }) => {
      // Seed multiple snapshots
      await db.seedSnapshots([
        { name: 'Snapshot Janeiro 2025', data: createMockSnapshotData() },
        { name: 'Snapshot Fevereiro 2025', data: createMockSnapshotData() },
        { name: 'Snapshot Março 2025', data: createMockSnapshotData() },
      ]);

      await page.goto('/history');
      await page.waitForSelector('text=/histórico de projeções/i', { timeout: 10000 });
      
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'history-light-with-snapshots.png');
    }
  );

  visualTest(
    'history - dark with snapshots',
    async ({ page, db, visual }) => {
      // Seed multiple snapshots
      await db.seedSnapshots([
        { name: 'Snapshot Janeiro 2025', data: createMockSnapshotData() },
        { name: 'Snapshot Fevereiro 2025', data: createMockSnapshotData() },
        { name: 'Snapshot Março 2025', data: createMockSnapshotData() },
      ]);

      await page.goto('/history');
      await page.waitForSelector('text=/histórico de projeções/i', { timeout: 10000 });
      
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'history-dark-with-snapshots.png');
    }
  );
});

visualTest.describe('Snapshot Detail Page Visual Regression @visual', () => {
  visualTest(
    'snapshot-detail - light',
    async ({ page, db, visual }) => {
      // Seed a snapshot
      const [seeded] = await db.seedSnapshots([
        { name: 'Visual Test Snapshot', data: createMockSnapshotData() },
      ]);

      await page.goto(`/history/${seeded.id}`);
      await page.waitForSelector('text=/snapshot histórico/i', { timeout: 10000 });
      
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);
      await waitForChartToStabilize(page);

      await visual.takeScreenshot(page, 'snapshot-detail-light.png');
    }
  );

  visualTest(
    'snapshot-detail - dark',
    async ({ page, db, visual }) => {
      // Seed a snapshot
      const [seeded] = await db.seedSnapshots([
        { name: 'Visual Test Snapshot', data: createMockSnapshotData() },
      ]);

      await page.goto(`/history/${seeded.id}`);
      await page.waitForSelector('text=/snapshot histórico/i', { timeout: 10000 });
      
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);
      await waitForChartToStabilize(page);

      await visual.takeScreenshot(page, 'snapshot-detail-dark.png');
    }
  );

  visualTest(
    'snapshot-detail - not found light',
    async ({ page, db, visual }) => {
      await page.goto('/history/00000000-0000-0000-0000-000000000000');
      await page.waitForSelector('text=/snapshot não encontrado/i', { timeout: 10000 });
      
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'snapshot-detail-not-found-light.png');
    }
  );

  visualTest(
    'snapshot-detail - not found dark',
    async ({ page, db, visual }) => {
      await page.goto('/history/00000000-0000-0000-0000-000000000000');
      await page.waitForSelector('text=/snapshot não encontrado/i', { timeout: 10000 });
      
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'snapshot-detail-not-found-dark.png');
    }
  );
});

visualTest.describe('Save Snapshot Dialog Visual Regression @visual', () => {
  visualTest(
    'save-snapshot-dialog - light',
    async ({ page, dashboardPage, db, visual }) => {
      const seedData = createFullSeedData();
      await db.seedFullScenario(seedData);

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Open the save snapshot dialog
      const saveButton = page.getByRole('button', { name: /salvar snapshot/i });
      await saveButton.click();

      // Wait for dialog to appear
      await page.waitForSelector('text=/salvar snapshot/i', { timeout: 5000 });
      await page.waitForTimeout(500); // Wait for dialog animation

      await visual.takeScreenshot(page, 'save-snapshot-dialog-light.png');
    }
  );

  visualTest(
    'save-snapshot-dialog - dark',
    async ({ page, dashboardPage, db, visual }) => {
      const seedData = createFullSeedData();
      await db.seedFullScenario(seedData);

      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      // Open the save snapshot dialog
      const saveButton = page.getByRole('button', { name: /salvar snapshot/i });
      await saveButton.click();

      // Wait for dialog to appear
      await page.waitForSelector('text=/salvar snapshot/i', { timeout: 5000 });
      await page.waitForTimeout(500); // Wait for dialog animation

      await visual.takeScreenshot(page, 'save-snapshot-dialog-dark.png');
    }
  );
});

