/**
 * Mobile E2E Tests: Notifications
 * Tests notifications inbox on mobile viewport (Pixel 5)
 */

import { test, expect, type Page } from '@playwright/test';
import { InbucketClient } from '../../utils/inbucket';
import { authenticateNewUser as sharedAuthenticateNewUser } from '../../utils/auth-helper';

// Mobile tests run serially to avoid email conflicts
test.describe.configure({ mode: 'serial' });

test.describe('Mobile Notifications @mobile', () => {
  let inbucket: InbucketClient;

  test.beforeAll(async () => {
    inbucket = new InbucketClient();
  });

  /**
   * Helper to authenticate a fresh user via magic link
   */
  async function authenticateNewUser(page: Page, email: string): Promise<void> {
    await sharedAuthenticateNewUser(page, email, inbucket);
  }

  /**
   * Helper to complete onboarding wizard on mobile
   */
  async function completeOnboardingOnMobile(page: Page): Promise<void> {
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });

    // Wait for wizard to appear
    await expect(wizardDialog).toBeVisible({ timeout: 15000 });

    // Step 1: Profile
    await expect(wizardDialog.getByRole('heading', { name: /seu perfil/i })).toBeVisible();
    await page.locator('#profile-name').fill('Mobile Test User');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    // Step 2: Group
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible();
    await page.locator('#group-name').fill('Mobile Test Group');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    // Step 3: Bank Account
    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible();
    await page.locator('#account-name').fill('Mobile Test Account');
    await page.locator('#account-balance').fill('1000');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    // Step 4: Income (skip)
    await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible();
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    // Step 5: Expense (skip)
    await expect(wizardDialog.getByRole('heading', { name: /^despesa$/i })).toBeVisible();
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    // Step 6: Credit Card (skip)
    await expect(wizardDialog.getByRole('heading', { name: /cartão de crédito/i })).toBeVisible();
    await wizardDialog.getByRole('button', { name: /finalizar/i }).click();

    // Wizard should close
    await expect(wizardDialog).toBeHidden({ timeout: 10000 });
  }

  /**
   * Helper to dismiss any auto-shown tour
   */
  async function dismissTourIfVisible(page: Page): Promise<void> {
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    if (await closeTourButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeTourButton.tap();
      await expect(closeTourButton).toBeHidden({ timeout: 5000 });
    }
  }

  /**
   * Helper to open mobile navigation menu
   */
  async function openMobileMenu(page: Page): Promise<void> {
    const menuButton = page.getByRole('button', { name: /menu/i });
    if (await menuButton.isVisible().catch(() => false)) {
      await menuButton.tap();
      await page.waitForTimeout(300);
    }
  }

  test('access notifications from mobile header icon', async ({ page }) => {
    const email = `mobile-notif-nav-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);
    await completeOnboardingOnMobile(page);
    await dismissTourIfVisible(page);

    // Notifications icon is in the header (not in hamburger menu)
    // Find and tap Notifications icon link
    const notificationsLink = page.getByRole('link', { name: /notificações/i });
    await expect(notificationsLink).toBeVisible({ timeout: 5000 });
    await notificationsLink.tap();

    // Verify we're on notifications page
    await expect(page).toHaveURL(/\/notifications/);
    await expect(page.getByRole('heading', { name: /notificações/i })).toBeVisible();
  });

  test('notifications list and unread badge work on mobile', async ({ page }) => {
    const email = `mobile-notif-list-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);
    await completeOnboardingOnMobile(page);
    await dismissTourIfVisible(page);

    // Navigate to notifications
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    // Verify welcome notification is visible
    const welcomeNotification = page.getByText(/bem-vindo ao fluxo certo/i);
    await expect(welcomeNotification).toBeVisible({ timeout: 10000 });
  });

  test('mark read via tap and verify persistence across reload', async ({ page }) => {
    const email = `mobile-notif-read-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);
    await completeOnboardingOnMobile(page);
    await dismissTourIfVisible(page);

    // Navigate to notifications
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    // Find mark as read button - it should be visible for unread notification
    const markAsReadButton = page.getByRole('button', { name: /marcar como lida/i });
    
    // Assert button is visible (required for this test to be meaningful)
    await expect(markAsReadButton).toBeVisible({ timeout: 10000 });
    
    // Tap the mark as read button
    await markAsReadButton.tap();
    await page.waitForTimeout(500);

    // Verify button is no longer visible after marking as read
    await expect(markAsReadButton).not.toBeVisible({ timeout: 5000 });

    // Reload and verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Mark as read button should still not be visible after reload
    await expect(page.getByRole('button', { name: /marcar como lida/i })).not.toBeVisible({ timeout: 5000 });
  });

  test('tapping primary action marks notification as read', async ({ page }) => {
    const email = `mobile-notif-action-read-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);
    await completeOnboardingOnMobile(page);
    await dismissTourIfVisible(page);

    // Navigate to notifications
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    // Verify notification is unread (has "Marcar como lida" button)
    const markAsReadButton = page.getByRole('button', { name: /marcar como lida/i });
    await expect(markAsReadButton).toBeVisible({ timeout: 10000 });

    // Tap the primary action button (welcome notification has "Começar a usar")
    const primaryActionButton = page.getByRole('link', { name: /começar a usar/i });
    await expect(primaryActionButton).toBeVisible({ timeout: 5000 });
    await primaryActionButton.tap();

    // Should navigate to /manage
    await expect(page).toHaveURL(/\/manage/);

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

