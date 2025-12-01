/**
 * Visual Regression Tests: Dashboard Page
 * Tests visual appearance of dashboard in various states and themes
 *
 * @visual
 */

import { visualTest, expect } from '../../fixtures/visual-test-base';
import { createFullSeedData } from '../../utils/test-data';

visualTest.describe('Dashboard Visual Regression @visual', () => {
  visualTest(
    'dashboard empty state - light theme',
    async ({ page, dashboardPage, visual }) => {
      // Set light theme
      await visual.setTheme(page, 'light');

      await dashboardPage.goto();
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-light-empty.png');
    }
  );

  visualTest(
    'dashboard empty state - dark theme',
    async ({ page, dashboardPage, visual }) => {
      // Set dark theme
      await visual.setTheme(page, 'dark');

      await dashboardPage.goto();
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-dark-empty.png');
    }
  );

  visualTest(
    'dashboard populated state - light theme',
    async ({ page, dashboardPage, db, visual }) => {
      // Seed data
      const seedData = createFullSeedData();
      await db.seedFullScenario(seedData);

      // Set light theme
      await visual.setTheme(page, 'light');

      await dashboardPage.goto();
      await visual.waitForStableUI(page);

      // Wait for chart to render
      await dashboardPage.expectChartRendered();

      await visual.takeScreenshot(page, 'dashboard-light-populated.png');
    }
  );

  visualTest(
    'dashboard populated state - dark theme',
    async ({ page, dashboardPage, db, visual }) => {
      // Seed data
      const seedData = createFullSeedData();
      await db.seedFullScenario(seedData);

      // Set dark theme
      await visual.setTheme(page, 'dark');

      await dashboardPage.goto();
      await visual.waitForStableUI(page);

      // Wait for chart to render
      await dashboardPage.expectChartRendered();

      await visual.takeScreenshot(page, 'dashboard-dark-populated.png');
    }
  );
});

