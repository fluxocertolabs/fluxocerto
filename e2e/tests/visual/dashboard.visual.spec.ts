/**
 * Visual Regression Tests: Dashboard Page
 * Tests visual appearance of dashboard in various states and themes
 *
 * IMPORTANT: Each test explicitly resets the database to ensure isolation.
 * This is necessary because tests run in parallel and the page reload
 * in setTheme() could show stale data from previous tests.
 *
 * @visual
 */

import { visualTest, expect } from '../../fixtures/visual-test-base';
import { createFullSeedData } from '../../utils/test-data';

visualTest.describe('Dashboard Visual Regression @visual', () => {
  visualTest(
    'dashboard - light empty',
    async ({ page, dashboardPage, db, visual }) => {
      await db.resetDatabase(); // Explicit reset for empty state
      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-light-empty.png');
    }
  );

  visualTest(
    'dashboard - dark empty',
    async ({ page, dashboardPage, db, visual }) => {
      await db.resetDatabase(); // Explicit reset for empty state
      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-dark-empty.png');
    }
  );

  visualTest(
    'dashboard - light populated',
    async ({ page, dashboardPage, db, visual }) => {
      const seedData = createFullSeedData();
      await db.seedFullScenario(seedData);

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Wait for chart to render
      await dashboardPage.expectChartRendered();

      await visual.takeScreenshot(page, 'dashboard-light-populated.png');
    }
  );

  visualTest(
    'dashboard - dark populated',
    async ({ page, dashboardPage, db, visual }) => {
      const seedData = createFullSeedData();
      await db.seedFullScenario(seedData);

      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      // Wait for chart to render
      await dashboardPage.expectChartRendered();

      await visual.takeScreenshot(page, 'dashboard-dark-populated.png');
    }
  );
});

