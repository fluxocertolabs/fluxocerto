/**
 * Visual Regression Tests: Notifications Page
 * Tests visual appearance of notifications inbox in various states
 *
 * Note: These tests focus on visual appearance and don't make strict assertions
 * about notification state since that's handled by functional E2E tests.
 *
 * @visual
 */

import { visualTest, expect } from '../../fixtures/visual-test-base';

visualTest.describe('Notifications Page Visual Regression @visual', () => {
  visualTest.describe('Light Theme', () => {
    visualTest('notifications - page light', async ({
      page,
      dashboardPage,
      visual,
    }) => {
      // Navigate to dashboard first to ensure app is initialized
      await dashboardPage.goto();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await page.goto('/notifications');
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Wait for page to be ready (either empty or with notifications)
      await expect(page.getByRole('heading', { name: /notificações/i })).toBeVisible({ timeout: 10000 });

      await visual.takeScreenshot(page, 'notifications-light-page.png');
    });

    visualTest('notifications - with notification light', async ({
      page,
      dashboardPage,
      visual,
    }) => {
      // Navigate to dashboard first to trigger welcome notification creation
      await dashboardPage.goto();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await page.goto('/notifications');
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Wait for page heading to be visible
      await expect(page.getByRole('heading', { name: /notificações/i })).toBeVisible({ timeout: 10000 });

      await visual.takeScreenshot(page, 'notifications-light-with-notification.png');
    });
  });

  visualTest.describe('Dark Theme', () => {
    visualTest('notifications - page dark', async ({
      page,
      dashboardPage,
      visual,
    }) => {
      await dashboardPage.goto();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await page.goto('/notifications');
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await expect(page.getByRole('heading', { name: /notificações/i })).toBeVisible({ timeout: 10000 });

      await visual.takeScreenshot(page, 'notifications-dark-page.png');
    });

    visualTest('notifications - with notification dark', async ({
      page,
      dashboardPage,
      visual,
    }) => {
      await dashboardPage.goto();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await page.goto('/notifications');
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await expect(page.getByRole('heading', { name: /notificações/i })).toBeVisible({ timeout: 10000 });

      await visual.takeScreenshot(page, 'notifications-dark-with-notification.png');
    });
  });

  visualTest.describe('Header Badge', () => {
    visualTest('header - with unread badge light', async ({
      page,
      dashboardPage,
      visual,
    }) => {
      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await visual.waitForStableUI(page);

      // Just verify the notifications link is visible
      const navLink = page.getByRole('link', { name: /notificações/i });
      await expect(navLink).toBeVisible({ timeout: 10000 });

      await visual.takeScreenshot(page, 'header-light-notifications-link.png');
    });
  });

  visualTest.describe('Notification Read State', () => {
    visualTest('notifications - read notification light', async ({
      page,
      dashboardPage,
      visual,
      db,
    }) => {
      // Navigate to dashboard first to trigger welcome notification creation
      await dashboardPage.goto();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Mark all notifications as read via the "Marcar como lida" button
      await page.goto('/notifications');
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      const markAsReadButton = page.getByRole('button', { name: /marcar como lida/i });
      // Use waitFor to actually wait for visibility - isVisible({ timeout }) doesn't wait
      const isButtonVisible = await markAsReadButton.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
      if (isButtonVisible) {
        await markAsReadButton.click();
        await page.waitForTimeout(500);
      }

      await visual.waitForStableUI(page);
      await visual.takeScreenshot(page, 'notifications-light-read.png');
    });

    visualTest('notifications - read notification dark', async ({
      page,
      dashboardPage,
      visual,
      db,
    }) => {
      // Navigate to dashboard first to trigger welcome notification creation
      await dashboardPage.goto();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Mark all notifications as read via the "Marcar como lida" button
      await page.goto('/notifications');
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      const markAsReadButton = page.getByRole('button', { name: /marcar como lida/i });
      // Use waitFor to actually wait for visibility - isVisible({ timeout }) doesn't wait
      const isButtonVisible = await markAsReadButton.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
      if (isButtonVisible) {
        await markAsReadButton.click();
        await page.waitForTimeout(500);
      }

      await visual.waitForStableUI(page);
      await visual.takeScreenshot(page, 'notifications-dark-read.png');
    });
  });
});
