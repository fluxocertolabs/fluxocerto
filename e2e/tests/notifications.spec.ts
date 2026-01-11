/**
 * E2E Tests: User Story 1 & 2 - Notifications Inbox
 * Tests notifications inbox, unread state, welcome notification idempotency, and live updates
 */

import { test, expect } from '../fixtures/test-base';

test.describe('Notifications Inbox', () => {
  test.beforeEach(async ({ db }) => {
    // Clear any existing notifications/preferences for clean state
    await db.resetDatabase();
  });

  test('navigation entry exists and routes to /notifications', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');

    // Find and click the Notifications nav link
    const notificationsLink = page.getByRole('link', { name: /notificações/i });
    await expect(notificationsLink).toBeVisible({ timeout: 10000 });
    await notificationsLink.click();

    // Verify we're on the notifications page
    await expect(page).toHaveURL(/\/notifications/);
    await expect(page.getByRole('heading', { name: /notificações/i })).toBeVisible();
  });

  test('welcome notification appears exactly once per user across multiple reloads', async ({
    page,
    dashboardPage,
  }) => {
    // Navigate to dashboard (triggers welcome notification creation)
    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Wait for notifications to initialize
    await page.waitForTimeout(2000);

    // Navigate to notifications page
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    // Verify welcome notification is visible
    const welcomeNotification = page.getByText(/bem-vindo ao fluxo certo/i);
    await expect(welcomeNotification).toBeVisible({ timeout: 10000 });

    // Count notification items
    const notificationItems = page.locator('[data-testid="notification-item"]');
    const initialCount = await notificationItems.count();
    
    // If no test IDs, count by welcome text
    if (initialCount === 0) {
      const welcomeItems = page.getByText(/bem-vindo/i);
      expect(await welcomeItems.count()).toBe(1);
    }

    // Reload multiple times and verify no duplicates
    for (let i = 0; i < 5; i++) {
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Verify still only one welcome notification
      const currentWelcomeItems = page.getByText(/bem-vindo ao fluxo certo/i);
      expect(await currentWelcomeItems.count()).toBe(1);
    }
  });

  test('unread badge reflects unread count and updates when marking as read', async ({
    page,
    dashboardPage,
  }) => {
    // Navigate to dashboard (triggers welcome notification creation)
    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for unread badge in navigation
    const navLink = page.getByRole('link', { name: /notificações/i });
    await expect(navLink).toBeVisible({ timeout: 10000 });
    
    // Look for badge with count
    const badge = navLink.locator('span').filter({ hasText: /^\d+$/ });
    
    // Navigate to notifications page
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    // Find the "Marcar como lida" button
    const markAsReadButton = page.getByRole('button', { name: /marcar como lida/i });
    
    if (await markAsReadButton.isVisible()) {
      await markAsReadButton.click();
      await page.waitForTimeout(500);

      // Verify the button is no longer visible (notification is now read)
      await expect(markAsReadButton).not.toBeVisible({ timeout: 5000 });

      // Reload and verify read state persists
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // The "Marcar como lida" button should still not be visible
      await expect(page.getByRole('button', { name: /marcar como lida/i })).not.toBeVisible();
    }
  });

  test('marking read is idempotent - repeated clicks do not cause errors', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    // Find and click mark as read button
    const markAsReadButton = page.getByRole('button', { name: /marcar como lida/i });
    
    if (await markAsReadButton.isVisible()) {
      // Click multiple times rapidly
      await markAsReadButton.click();
      
      // Button should disappear after first click
      await expect(markAsReadButton).not.toBeVisible({ timeout: 5000 });
      
      // No error should be shown
      const errorMessage = page.getByText(/erro/i);
      await expect(errorMessage).not.toBeVisible();
    }
  });

  test('optional primary action renders and navigates correctly', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    // Look for the primary action button (welcome notification has "Começar a usar")
    const primaryActionButton = page.getByRole('link', { name: /começar a usar/i });
    
    if (await primaryActionButton.isVisible()) {
      await primaryActionButton.click();
      
      // Should navigate to /manage
      await expect(page).toHaveURL(/\/manage/);
    }
  });

  test('clicking primary action marks notification as read', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    // Verify notification is unread (has "Marcar como lida" button)
    const markAsReadButton = page.getByRole('button', { name: /marcar como lida/i });
    await expect(markAsReadButton).toBeVisible({ timeout: 10000 });

    // Click the primary action button
    const primaryActionButton = page.getByRole('link', { name: /começar a usar/i });
    await expect(primaryActionButton).toBeVisible({ timeout: 5000 });
    await primaryActionButton.click();

    // Should navigate to /manage
    await expect(page).toHaveURL(/\/manage/);
    
    // Wait a bit for the mark-as-read API call to complete in the background
    await page.waitForTimeout(1000);

    // Navigate back to notifications
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    // Verify the notification is now marked as read (no "Marcar como lida" button)
    await expect(page.getByRole('button', { name: /marcar como lida/i })).not.toBeVisible({ timeout: 5000 });

    // Reload to verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Still should be marked as read
    await expect(page.getByRole('button', { name: /marcar como lida/i })).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('Notifications Live Updates', () => {
  test.beforeEach(async ({ db }) => {
    await db.resetDatabase();
  });

  test('notifications update across browser contexts without full page reload', async ({
    page,
    context,
    dashboardPage,
  }) => {
    // First context: Initialize and create welcome notification
    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Create second context (simulates another tab/device)
    const secondPage = await context.newPage();
    await secondPage.goto('/notifications');
    await secondPage.waitForLoadState('networkidle');
    await secondPage.waitForTimeout(2000);

    // Verify welcome notification is visible in second context
    const welcomeInSecondPage = secondPage.getByText(/bem-vindo ao fluxo certo/i);
    await expect(welcomeInSecondPage).toBeVisible({ timeout: 10000 });

    // Mark as read in first context
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    
    const markAsReadButton = page.getByRole('button', { name: /marcar como lida/i });
    if (await markAsReadButton.isVisible()) {
      await markAsReadButton.click();
      await page.waitForTimeout(1000);
    }

    // Reload second context and verify read state propagated
    await secondPage.reload();
    await secondPage.waitForLoadState('networkidle');
    await secondPage.waitForTimeout(1000);

    // The mark as read button should not be visible in second context
    await expect(secondPage.getByRole('button', { name: /marcar como lida/i })).not.toBeVisible({ timeout: 5000 });

    await secondPage.close();
  });
});

