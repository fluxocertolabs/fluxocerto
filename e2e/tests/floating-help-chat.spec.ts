/**
 * E2E Tests: Floating Help Button - Chat Option
 *
 * Tests the chat option in the floating help button.
 * Note: Actual Tawk.to chat functionality requires real credentials,
 * so these tests focus on:
 * - Chat option visibility based on environment configuration
 * - Button behavior on pages without tours (when chat is available)
 */

import { test, expect } from '../fixtures/test-base';
import {
  getFloatingHelpContainer,
  getFloatingHelpFAB,
  getTourOptionButton,
  getChatOptionButton,
  getFeedbackOptionButton,
  openFloatingHelpMenu,
  dismissTourIfPresent,
} from '../utils/floating-help';
import { createAccount } from '../utils/test-data';

test.describe('Floating Help Button - Chat Option', () => {
  // Run tests serially to avoid parallel flakiness
  test.describe.configure({ mode: 'serial' });

  test.describe('Tawk.to chat option', () => {
    test('chat option is visible when configured', async ({
      page,
      dashboardPage,
      db,
    }) => {
      await db.seedAccounts([createAccount({ name: 'Nubank', balance: 500000 })]);
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();

      await dismissTourIfPresent(page);

      // Use shared helper for better device coverage (handles hover vs tap)
      await openFloatingHelpMenu(page);

      // Tour option should be visible (dashboard has a tour)
      const tourOption = getTourOptionButton(page);
      await expect(tourOption).toBeVisible({ timeout: 5000 });

      const chatOption = getChatOptionButton(page);
      await expect(chatOption).toBeVisible();
    });

    test('floating help button shows feedback on profile page (no tour)', async ({
      page,
    }) => {
      // Navigate to profile page (no tour defined, no Tawk configured)
      await page.goto('/profile');
      await expect(page).toHaveURL(/\/profile/);

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      const helpButton = getFloatingHelpContainer(page);
      await expect(helpButton).toBeVisible();

      await openFloatingHelpMenu(page);
      await expect(getFeedbackOptionButton(page)).toBeVisible();
      await expect(getChatOptionButton(page)).toBeVisible();
      await expect(getTourOptionButton(page)).toBeHidden();
    });

    test('floating help button shows feedback on notifications page (no tour)', async ({
      page,
    }) => {
      // Navigate to notifications page (no tour defined, no Tawk configured)
      await page.goto('/notifications');
      await expect(page).toHaveURL(/\/notifications/);

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      const helpButton = getFloatingHelpContainer(page);
      await expect(helpButton).toBeVisible();

      await openFloatingHelpMenu(page);
      await expect(getFeedbackOptionButton(page)).toBeVisible();
      await expect(getChatOptionButton(page)).toBeVisible();
      await expect(getTourOptionButton(page)).toBeHidden();
    });
  });

  test.describe('Menu shows only available options', () => {
    test('expanded menu on tour page shows available options', async ({
      page,
      managePage,
    }) => {
      await managePage.goto();
      await managePage.waitForReady();

      await dismissTourIfPresent(page);

      // Use shared helper for better device coverage (handles hover vs tap)
      await openFloatingHelpMenu(page);

      // Tour option should be visible
      const tourOption = getTourOptionButton(page);
      await expect(tourOption).toBeVisible({ timeout: 5000 });

      // Feedback option should be visible
      const feedbackOption = getFeedbackOptionButton(page);
      await expect(feedbackOption).toBeVisible({ timeout: 5000 });

      const chatOption = getChatOptionButton(page);
      await expect(chatOption).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('floating help button has correct aria attributes', async ({
      page,
      dashboardPage,
      db,
    }) => {
      await db.seedAccounts([createAccount({ name: 'Nubank', balance: 500000 })]);
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();

      await dismissTourIfPresent(page);

      const helpButton = getFloatingHelpContainer(page);
      await expect(helpButton).toBeVisible({ timeout: 10000 });

      const fab = getFloatingHelpFAB(page);

      // FAB should have aria-expanded="false" initially
      await expect(fab).toHaveAttribute('aria-expanded', 'false');

      // Use shared helper for better device coverage (handles hover vs tap)
      await openFloatingHelpMenu(page);

      // FAB should have aria-expanded="true" when expanded
      await expect(fab).toHaveAttribute('aria-expanded', 'true', { timeout: 5000 });
    });

    test('tour option button has accessible name', async ({
      page,
      dashboardPage,
      db,
    }) => {
      await db.seedAccounts([createAccount({ name: 'Nubank', balance: 500000 })]);
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();

      await dismissTourIfPresent(page);

      // Use shared helper for better device coverage (handles hover vs tap)
      await openFloatingHelpMenu(page);

      const tourOption = getTourOptionButton(page);
      await expect(tourOption).toBeVisible({ timeout: 5000 });

      // Should have accessible name
      await expect(tourOption).toHaveAccessibleName(/iniciar tour guiado/i);
    });
  });
});

