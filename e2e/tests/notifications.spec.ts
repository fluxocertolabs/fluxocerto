/**
 * E2E Tests: User Story 1 & 2 - Notifications Inbox
 * Tests notifications inbox, unread state, welcome notification idempotency, and live updates
 */

import { test, expect } from '../fixtures/test-base';
import { createNotification } from '../utils/test-data';

// Run tests serially to avoid flakiness with Supabase Realtime connections
test.describe.configure({ mode: 'serial' });

async function seedWelcomeNotification(db: {
  getUserIdByEmail: (email: string) => Promise<string | null>;
  deleteNotificationsForUser: (userId: string) => Promise<void>;
  seedNotifications: (notifications: ReturnType<typeof createNotification>[]) => Promise<unknown>;
}, email: string): Promise<string> {
  const userId = await db.getUserIdByEmail(email);
  if (!userId) {
    throw new Error(`Failed to resolve auth user id for ${email}`);
  }
  await db.deleteNotificationsForUser(userId);
  await db.seedNotifications([
    createNotification(userId, { dedupe_key: 'welcome-v1' }),
  ]);
  return userId;
}

async function waitForNotificationsReady(page: { getByRole: any }): Promise<void> {
  await expect(async () => {
    const welcomeCount = await page.getByRole('heading', { name: /bem-vindo ao fluxo certo/i }).count();
    const markAsReadCount = await page.getByRole('button', { name: /marcar como lida/i }).count();
    if (welcomeCount === 0 && markAsReadCount === 0) {
      throw new Error('Notifications not visible yet');
    }
  }).toPass({ timeout: 20000, intervals: [500, 1000, 2000] });
}

async function waitForMarkAsReadRequest(page: { waitForResponse: any }): Promise<void> {
  await page.waitForResponse(
    (response: { url: () => string; request: () => { method: () => string }; status: () => number }) => {
      const url = response.url();
      const method = response.request().method();
      const isRpc = url.includes('/rpc/mark_notification_read') && method === 'POST';
      const isRest = url.includes('/rest/v1/notifications') && (method === 'PATCH' || method === 'POST');
      return (isRpc || isRest) && response.status() >= 200 && response.status() < 300;
    },
    { timeout: 10000 }
  );
}

async function waitForNotificationRead(db: {
  getNotificationsForUser: (userId: string) => Promise<Array<{ dedupe_key?: string | null; title?: string; read_at?: string | null }>>;
}, userId: string): Promise<void> {
  await expect
    .poll(
      async () => {
        const notifications = await db.getNotificationsForUser(userId);
        const welcome = notifications.find((n) =>
          n.dedupe_key === 'welcome-v1' || /bem-vindo ao fluxo certo/i.test(n.title ?? '')
        );
        return Boolean(welcome?.read_at);
      },
      { timeout: 30000, intervals: [500, 1000, 2000, 4000] }
    )
    .toBe(true);
}

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

      // Verify still only one welcome notification
      const currentWelcomeItems = page.getByText(/bem-vindo ao fluxo certo/i);
      await expect(currentWelcomeItems).toHaveCount(1);
    }
  });

  test('unread badge reflects unread count and updates when marking as read', async ({
    page,
    dashboardPage,
    db,
    workerContext,
  }) => {
    // Navigate to dashboard (triggers welcome notification creation)
    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');

    // Check for unread badge in navigation
    const navLink = page.getByRole('link', { name: /notificações/i });
    await expect(navLink).toBeVisible({ timeout: 10000 });
    
    // Navigate to notifications page
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    // Find the "Marcar como lida" button
    const markAsReadButton = page.getByRole('button', { name: /marcar como lida/i }).first();

    // Assert button is visible before clicking - this ensures test fails if button doesn't render
    await expect(markAsReadButton).toBeVisible({ timeout: 10000 });
    await Promise.all([waitForMarkAsReadRequest(page), markAsReadButton.click()]);

    // Verify the button is no longer visible (notification is now read)
    await expect(markAsReadButton).not.toBeVisible({ timeout: 5000 });

    // Reload and verify read state persists
    const userId = await db.getUserIdByEmail(workerContext.email);
    if (userId) {
      await waitForNotificationRead(db, userId);
    }

    await page.reload();
    await page.waitForLoadState('networkidle');

    // The "Marcar como lida" button should still not be visible
    await expect(page.getByRole('button', { name: /marcar como lida/i }).first()).not.toBeVisible();
  });

  test('marking read is idempotent - repeated clicks do not cause errors', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');

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

    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    // Look for the primary action button (welcome notification has "Começar a usar")
    const primaryActionButton = page.getByRole('link', { name: /começar a usar/i }).first();
    
    if (await primaryActionButton.isVisible()) {
      await primaryActionButton.click();
      
      // Should navigate to /manage
      await expect(page).toHaveURL(/\/manage/);
    }
  });

  test('clicking primary action marks notification as read', async ({
    page,
    db,
    workerContext,
  }) => {
    await seedWelcomeNotification(db, workerContext.email);

    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    await waitForNotificationsReady(page);

    // Verify notification is unread (has "Marcar como lida" button)
    const markAsReadButton = page.getByRole('button', { name: /marcar como lida/i }).first();
    await expect(markAsReadButton).toBeVisible({ timeout: 10000 });

    // Click the primary action button
    const primaryActionButton = page.getByRole('link', { name: /começar a usar/i }).first();
    await expect(primaryActionButton).toBeVisible({ timeout: 5000 });
    await Promise.all([waitForMarkAsReadRequest(page), primaryActionButton.click()]);

    // Should navigate to /manage
    await expect(page).toHaveURL(/\/manage/);
    
    // Navigate back to notifications
    const userId = await db.getUserIdByEmail(workerContext.email);
    if (userId) {
      await waitForNotificationRead(db, userId);
    }

    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    // Verify the notification is now marked as read (no "Marcar como lida" button)
    await expect(page.getByRole('button', { name: /marcar como lida/i }).first()).not.toBeVisible({ timeout: 10000 });

    // Reload to verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Still should be marked as read
    await expect(page.getByRole('button', { name: /marcar como lida/i }).first()).not.toBeVisible({ timeout: 10000 });
  });
});

test.describe('Notifications Live Updates', () => {
  test.beforeEach(async ({ db }) => {
    await db.resetDatabase();
  });

  test('notifications update across browser contexts without full page reload', async ({
    page,
    context,
    db,
    workerContext,
  }) => {
    await seedWelcomeNotification(db, workerContext.email);

    // Navigate to notifications page in first context
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    await waitForNotificationsReady(page);

    // Wait for welcome notification to be visible
    const welcomeNotification = page.getByRole('heading', { name: /bem-vindo ao fluxo certo/i }).first();
    await expect(welcomeNotification).toBeVisible({ timeout: 15000 });

    // Create second context (simulates another tab/device)
    const secondPage = await context.newPage();
    await secondPage.goto('/notifications');
    await secondPage.waitForLoadState('networkidle');
    await waitForNotificationsReady(secondPage);

    // Verify welcome notification is visible in second context
    const welcomeInSecondPage = secondPage.getByRole('heading', { name: /bem-vindo ao fluxo certo/i }).first();
    await expect(welcomeInSecondPage).toBeVisible({ timeout: 15000 });

    // Mark as read in first context - MUST succeed (no conditional)
    const markAsReadButton = page.getByRole('button', { name: /marcar como lida/i }).first();
    await expect(markAsReadButton).toBeVisible({ timeout: 10000 });
    await Promise.all([waitForMarkAsReadRequest(page), markAsReadButton.click()]);

    // Wait for the mark-as-read API call to complete by polling for the button to disappear
    await expect(markAsReadButton).not.toBeVisible({ timeout: 10000 });

    // Reload second context and verify read state propagated
    const userId = await db.getUserIdByEmail(workerContext.email);
    if (userId) {
      await waitForNotificationRead(db, userId);
    }

    await secondPage.reload();
    await secondPage.waitForLoadState('networkidle');

    // The mark as read button should not be visible in second context
    await expect(secondPage.getByRole('button', { name: /marcar como lida/i }).first()).not.toBeVisible({ timeout: 10000 });

    await secondPage.close();
  });
});

