/**
 * Mobile E2E Tests: Profile Settings
 * Tests profile settings on mobile viewport (Pixel 5)
 */

import { test, expect, type Page } from '@playwright/test';
import { InbucketClient } from '../../utils/inbucket';
import { authenticateNewUser as sharedAuthenticateNewUser } from '../../utils/auth-helper';

// Mobile tests run serially to avoid email conflicts
test.describe.configure({ mode: 'serial' });

test.describe('Mobile Profile Settings @mobile', () => {
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
   * Consider extracting duplicated helper functions to shared utility (e.g., e2e/utils/mobile-helpers.ts)
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
   * Consider extracting duplicated helper functions to shared utility (e.g., e2e/utils/mobile-helpers.ts)
   */
  async function dismissTourIfVisible(page: Page): Promise<void> {
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    try {
      await expect(closeTourButton).toBeVisible({ timeout: 3000 });
      await closeTourButton.tap();
      await expect(closeTourButton).toBeHidden({ timeout: 5000 });
    } catch {
      // Tour not visible; continue
    }
  }

  /**
   * Helper to open mobile navigation menu
   * Consider extracting duplicated helper functions to shared utility (e.g., e2e/utils/mobile-helpers.ts)
   */
  async function openMobileMenu(page: Page): Promise<void> {
    const menuButton = page.getByRole('button', { name: /menu/i });
    if (await menuButton.isVisible().catch(() => false)) {
      await menuButton.tap();
      // Wait for menu dialog to appear
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    }
  }

  test('access profile from mobile navigation', async ({ page }) => {
    const email = `mobile-profile-nav-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);
    await completeOnboardingOnMobile(page);
    await dismissTourIfVisible(page);

    // Open mobile menu
    await openMobileMenu(page);

    // Find and tap Profile link
    const profileLink = page.getByRole('link', { name: /perfil/i });
    await expect(profileLink).toBeVisible({ timeout: 5000 });
    await profileLink.tap();

    // Verify we're on profile page
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByRole('heading', { name: /perfil/i })).toBeVisible();
  });

  test('email is disabled with hint on mobile', async ({ page }) => {
    const email = `mobile-profile-email-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);
    await completeOnboardingOnMobile(page);
    await dismissTourIfVisible(page);

    // Navigate to profile
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Find email input (use exact match to avoid matching email notifications toggle)
    const emailInput = page.getByRole('textbox', { name: /^email$/i });
    await expect(emailInput).toBeVisible({ timeout: 10000 });

    // Verify it's disabled
    await expect(emailInput).toBeDisabled();

    // Verify hint text (use specific selector to avoid multiple matches)
    const hint = page.locator('#email-hint');
    await expect(hint).toBeVisible();
  });

  test('toggle email notifications and update display name on mobile', async ({ page }) => {
    const email = `mobile-profile-toggle-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);
    await completeOnboardingOnMobile(page);
    await dismissTourIfVisible(page);

    // Navigate to profile
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Test email notifications toggle
    const toggle = page.getByRole('switch', { name: /ativar notificações por email/i });
    await expect(toggle).toBeVisible({ timeout: 10000 });

    // Get initial state
    const initialState = await toggle.getAttribute('aria-checked');

    // Toggle it
    await toggle.tap();
    // Wait for the toggle state to change (optimistic update)
    await expect(toggle).not.toHaveAttribute('aria-checked', initialState!, { timeout: 5000 });

    // Verify state changed
    const newState = await toggle.getAttribute('aria-checked');
    expect(newState).not.toBeNull();
    expect(newState).not.toBe(initialState);

    // Test display name update
    const nameInput = page.getByLabel(/nome/i);
    await expect(nameInput).toBeVisible();

    const newName = 'Mobile Updated Name ' + Date.now();
    await nameInput.clear();
    await nameInput.fill(newName);

    // Tap save button
    const saveButton = page.getByRole('button', { name: /salvar nome/i });
    await saveButton.tap();

    // Wait for save confirmation
    const savedIndicator = page.getByText(/salvo/i);
    await expect(savedIndicator).toBeVisible({ timeout: 5000 });

    // Reload and verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify name persisted
    const nameInputAfterReload = page.getByLabel(/nome/i);
    await expect(nameInputAfterReload).toHaveValue(newName);

    // Verify toggle state persisted
    const toggleAfterReload = page.getByRole('switch', { name: /ativar notificações por email/i });
    // newState was already asserted to be non-null above
    await expect(toggleAfterReload).toHaveAttribute('aria-checked', newState as string);
  });
});

