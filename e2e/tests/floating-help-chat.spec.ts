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
  openFloatingHelpMenu,
} from '../utils/floating-help';
import { createAccount } from '../utils/test-data';

async function dismissTourIfVisible(page: import('@playwright/test').Page): Promise<void> {
  const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
  if (await closeTourButton.isVisible().catch(() => false)) {
    await closeTourButton.click({ timeout: 5000 }).catch(() => {});
    await expect(closeTourButton).toBeHidden({ timeout: 10000 }).catch(() => {});
  }
}

test.describe('Floating Help Button - Chat Option', () => {
  // Run tests serially to avoid parallel flakiness
  test.describe.configure({ mode: 'serial' });

  test.describe('Without Tawk.to configured (default test environment)', () => {
    test('chat option is NOT visible when Tawk is not configured', async ({
      page,
      dashboardPage,
      db,
    }) => {
      await db.seedAccounts([createAccount({ name: 'Nubank', balance: 500000 })]);
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();

      await dismissTourIfVisible(page);

      // Use shared helper for better device coverage (handles hover vs tap)
      await openFloatingHelpMenu(page);

      // Tour option should be visible (dashboard has a tour)
      const tourOption = getTourOptionButton(page);
      await expect(tourOption).toBeVisible({ timeout: 5000 });

      // Chat option should NOT be visible (Tawk not configured)
      const chatOption = getChatOptionButton(page);
      await expect(chatOption).toBeHidden();
    });

    test('floating help button is hidden on profile page (no tour, no chat)', async ({
      page,
    }) => {
      // Navigate to profile page (no tour defined, no Tawk configured)
      await page.goto('/profile');
      await expect(page).toHaveURL(/\/profile/);

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Floating help button should NOT be visible (no options to show)
      const helpButton = getFloatingHelpContainer(page);
      await expect(helpButton).toBeHidden();
    });

    test('floating help button is hidden on notifications page (no tour, no chat)', async ({
      page,
    }) => {
      // Navigate to notifications page (no tour defined, no Tawk configured)
      await page.goto('/notifications');
      await expect(page).toHaveURL(/\/notifications/);

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Floating help button should NOT be visible (no options to show)
      const helpButton = getFloatingHelpContainer(page);
      await expect(helpButton).toBeHidden();
    });
  });

  test.describe('Menu shows only available options', () => {
    test('expanded menu on tour page shows tour option but not chat (when Tawk not configured)', async ({
      page,
      managePage,
    }) => {
      await managePage.goto();
      await managePage.waitForReady();

      await dismissTourIfVisible(page);

      // Use shared helper for better device coverage (handles hover vs tap)
      await openFloatingHelpMenu(page);

      // Tour option should be visible
      const tourOption = getTourOptionButton(page);
      await expect(tourOption).toBeVisible({ timeout: 5000 });

      // Chat option should NOT be visible
      const chatOption = getChatOptionButton(page);
      await expect(chatOption).toBeHidden();
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

      await dismissTourIfVisible(page);

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

      await dismissTourIfVisible(page);

      // Use shared helper for better device coverage (handles hover vs tap)
      await openFloatingHelpMenu(page);

      const tourOption = getTourOptionButton(page);
      await expect(tourOption).toBeVisible({ timeout: 5000 });

      // Should have accessible name
      await expect(tourOption).toHaveAccessibleName(/iniciar tour guiado/i);
    });
  });
});

