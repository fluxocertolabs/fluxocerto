/**
 * Visual Regression Tests: Onboarding Wizard
 * Tests visual appearance of all onboarding wizard steps in light and dark themes
 *
 * NOTE: These tests use the existing authenticated worker user and open the onboarding
 * wizard by clearing the onboarding state in the database. This is much faster and more
 * reliable than creating new users via magic link for each test.
 *
 * Includes both desktop and mobile viewport tests.
 *
 * @visual
 */

import { devices } from '@playwright/test';
import { visualTest, expect, type VisualTestHelpers } from '../../fixtures/visual-test-base';
import type { Page } from '@playwright/test';
import type { WorkerDatabaseFixture } from '../../fixtures/db';

/**
 * Helper to open the onboarding wizard by clearing onboarding state.
 * This triggers the wizard to auto-show on page load.
 *
 * NOTE: The beforeEach hook calls db.clear() which creates a fresh empty group.
 * This means the wizard should auto-show because:
 * - No onboarding state exists (status: null, autoShownAt: null)
 * - No finance data exists (isMinimumSetupComplete: false)
 *
 * IMPORTANT: Visual tests share a worker-scoped browser context, so React state
 * (including Zustand stores and component state like `hasAutoShown`) persists
 * between tests. We must force a hard page reload to clear all React state.
 */
async function openOnboardingWizard(
  page: Page,
  db: WorkerDatabaseFixture,
  visual: VisualTestHelpers
): Promise<void> {
  // Clear onboarding state for the current group (should be no-op for fresh group)
  await db.clearOnboardingState();

  // CRITICAL: Force a hard page reload to clear all React state.
  // SPA navigations within the same browser context preserve React state,
  // which causes `hasAutoShown` to remain true from previous tests.
  // Using page.goto with a fresh URL forces a full page reload.
  const timestamp = Date.now();

  // First navigate away to ensure we're not on the dashboard
  // (goto to the same URL might not trigger a full reload)
  await page.goto('about:blank');

  // Now navigate to dashboard - this is a fresh page load
  await page.goto(`/?_t=${timestamp}`);

  // Wait for the profile name input to be ready - this is the most reliable
  // indicator that the wizard has fully loaded and rendered its content.
  // The input only exists when the wizard is open AND on the profile step.
  const profileNameInput = page.locator('#profile-name');

  // Wait for page to fully load and React to hydrate
  await page.waitForLoadState('networkidle');

  // Retry up to 3 times with page reload if wizard doesn't appear
  for (let attempt = 0; attempt < 3; attempt++) {
    // Wait for React to settle
    await page.waitForTimeout(500);

    const inputVisible = await profileNameInput.isVisible().catch(() => false);
    if (inputVisible) break;

    if (attempt < 2) {
      // Hard reload to pick up the cleared onboarding state
      await page.goto('about:blank');
      await page.goto(`/?_t=${Date.now()}`);
      await page.waitForLoadState('networkidle');
    }
  }

  // Wait for the profile name input with extended timeout
  await expect(profileNameInput).toBeVisible({ timeout: 20000 });

  // Stabilize UI before taking screenshots
  await visual.waitForStableUI(page);
}

/**
 * Helper to navigate to a specific onboarding step.
 * Fills required fields and advances through steps.
 */
async function navigateToStep(
  page: Page,
  targetStep: 'profile' | 'group' | 'bank-account' | 'income' | 'expense' | 'credit-card'
): Promise<void> {
  const wizardDialog = page
    .locator('[role="dialog"]')
    .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });

  const steps = ['profile', 'group', 'bank-account', 'income', 'expense', 'credit-card'];
  const targetIndex = steps.indexOf(targetStep);

  if (targetIndex === 0) return; // Already on profile step

  // Navigate through steps
  if (targetIndex >= 1) {
    // Fill profile and advance
    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 10000 });
  }

  if (targetIndex >= 2) {
    // Fill group and advance
    await page.locator('#group-name').fill('Grupo Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 10000 });
  }

  if (targetIndex >= 3) {
    // Fill bank account and advance
    await page.locator('#account-name').fill('Conta Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 10000 });
  }

  if (targetIndex >= 4) {
    // Skip income (optional) and advance
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^despesa$/i })).toBeVisible({ timeout: 10000 });
  }

  if (targetIndex >= 5) {
    // Skip expense (optional) and advance
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /cartão de crédito/i })).toBeVisible({ timeout: 10000 });
  }
}

// ============================================================================
// DESKTOP VISUAL TESTS
// ============================================================================

visualTest.describe('Onboarding Wizard Visual Regression @visual', () => {
  visualTest.beforeEach(async ({ db }) => {
    // Reset database for each test to ensure clean state
    await db.clear();
  });

  // Profile step tests
  visualTest('onboarding wizard - profile step - light', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await visual.setTheme(page, 'light');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-profile-step-light.png');
  });

  visualTest('onboarding wizard - profile step - dark', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await visual.setTheme(page, 'dark');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-profile-step-dark.png');
  });

  // Group step tests
  visualTest('onboarding wizard - group step - light', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'group');
    await visual.setTheme(page, 'light');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-group-step-light.png');
  });

  visualTest('onboarding wizard - group step - dark', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'group');
    await visual.setTheme(page, 'dark');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-group-step-dark.png');
  });

  // Bank account step tests
  visualTest('onboarding wizard - bank account step - light', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'bank-account');
    await visual.setTheme(page, 'light');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-bank-account-step-light.png');
  });

  visualTest('onboarding wizard - bank account step - dark', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'bank-account');
    await visual.setTheme(page, 'dark');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-bank-account-step-dark.png');
  });

  // Income step tests
  visualTest('onboarding wizard - income step - light', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'income');
    await visual.setTheme(page, 'light');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-income-step-light.png');
  });

  visualTest('onboarding wizard - income step - dark', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'income');
    await visual.setTheme(page, 'dark');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-income-step-dark.png');
  });

  // Expense step tests
  visualTest('onboarding wizard - expense step - light', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'expense');
    await visual.setTheme(page, 'light');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-expense-step-light.png');
  });

  visualTest('onboarding wizard - expense step - dark', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'expense');
    await visual.setTheme(page, 'dark');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-expense-step-dark.png');
  });

  // Credit card step tests
  visualTest('onboarding wizard - credit card step - light', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'credit-card');
    await visual.setTheme(page, 'light');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-credit-card-step-light.png');
  });

  visualTest('onboarding wizard - credit card step - dark', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'credit-card');
    await visual.setTheme(page, 'dark');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-credit-card-step-dark.png');
  });
});

// ============================================================================
// MOBILE VISUAL TESTS
// ============================================================================

// Mobile viewport tests use Pixel 5 device emulation
const mobileVisualTest = visualTest.extend({});
mobileVisualTest.use({ ...devices['Pixel 5'] });

mobileVisualTest.describe('Onboarding Wizard Mobile Visual Regression @visual', () => {
  mobileVisualTest.beforeEach(async ({ db }) => {
    await db.clear();
  });

  // Profile step - mobile
  mobileVisualTest('onboarding wizard - profile step - mobile light', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await visual.setTheme(page, 'light');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-profile-step-mobile-light.png');
  });

  mobileVisualTest('onboarding wizard - profile step - mobile dark', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await visual.setTheme(page, 'dark');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-profile-step-mobile-dark.png');
  });

  // Bank account step - mobile
  mobileVisualTest('onboarding wizard - bank account step - mobile light', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'bank-account');
    await visual.setTheme(page, 'light');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-bank-account-step-mobile-light.png');
  });

  mobileVisualTest('onboarding wizard - bank account step - mobile dark', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'bank-account');
    await visual.setTheme(page, 'dark');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-bank-account-step-mobile-dark.png');
  });

  // Group step - mobile
  mobileVisualTest('onboarding wizard - group step - mobile light', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'group');
    await visual.setTheme(page, 'light');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-group-step-mobile-light.png');
  });

  mobileVisualTest('onboarding wizard - group step - mobile dark', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'group');
    await visual.setTheme(page, 'dark');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-group-step-mobile-dark.png');
  });

  // Income step - mobile
  mobileVisualTest('onboarding wizard - income step - mobile light', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'income');
    await visual.setTheme(page, 'light');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-income-step-mobile-light.png');
  });

  mobileVisualTest('onboarding wizard - income step - mobile dark', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'income');
    await visual.setTheme(page, 'dark');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-income-step-mobile-dark.png');
  });

  // Expense step - mobile
  mobileVisualTest('onboarding wizard - expense step - mobile light', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'expense');
    await visual.setTheme(page, 'light');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-expense-step-mobile-light.png');
  });

  mobileVisualTest('onboarding wizard - expense step - mobile dark', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'expense');
    await visual.setTheme(page, 'dark');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-expense-step-mobile-dark.png');
  });

  // Credit card step - mobile
  mobileVisualTest('onboarding wizard - credit card step - mobile light', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'credit-card');
    await visual.setTheme(page, 'light');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-credit-card-step-mobile-light.png');
  });

  mobileVisualTest('onboarding wizard - credit card step - mobile dark', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'credit-card');
    await visual.setTheme(page, 'dark');
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-credit-card-step-mobile-dark.png');
  });
});

// ============================================================================
// VALIDATION ERROR STATE TESTS
// ============================================================================

visualTest.describe('Onboarding Wizard Validation Error States @visual', () => {
  visualTest.beforeEach(async ({ db }) => {
    await db.clear();
  });

  visualTest('profile step - validation error - light', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await visual.setTheme(page, 'light');

    const wizardDialog = page.locator('[role="dialog"]').filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    const profileNameInput = page.locator('#profile-name');

    // Wait for the input to be visible and interactable
    await expect(profileNameInput).toBeVisible({ timeout: 10000 });

    // Leave profile name empty and try to proceed
    await profileNameInput.clear();
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    // Wait for validation error to show
    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-profile-validation-error-light.png');
  });

  visualTest('profile step - validation error - dark', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await visual.setTheme(page, 'dark');

    const wizardDialog = page.locator('[role="dialog"]').filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    const profileNameInput = page.locator('#profile-name');

    // Wait for the input to be visible and interactable
    await expect(profileNameInput).toBeVisible({ timeout: 10000 });

    await profileNameInput.clear();
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-profile-validation-error-dark.png');
  });

  visualTest('group step - validation error - light', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'group');
    await visual.setTheme(page, 'light');

    const wizardDialog = page.locator('[role="dialog"]').filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });

    // Leave group name empty and try to proceed
    await page.locator('#group-name').clear();
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-group-validation-error-light.png');
  });

  visualTest('group step - validation error - dark', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'group');
    await visual.setTheme(page, 'dark');

    const wizardDialog = page.locator('[role="dialog"]').filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });

    await page.locator('#group-name').clear();
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-group-validation-error-dark.png');
  });

  visualTest('bank account step - validation error - light', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'bank-account');
    await visual.setTheme(page, 'light');

    const wizardDialog = page.locator('[role="dialog"]').filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });

    // Leave account name empty and try to proceed
    await page.locator('#account-name').clear();
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-bank-validation-error-light.png');
  });

  visualTest('bank account step - validation error - dark', async ({ page, db, visual }) => {
    await openOnboardingWizard(page, db, visual);
    await navigateToStep(page, 'bank-account');
    await visual.setTheme(page, 'dark');

    const wizardDialog = page.locator('[role="dialog"]').filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });

    await page.locator('#account-name').clear();
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    await visual.waitForStableUI(page);

    await visual.takeScreenshot(page, 'onboarding-bank-validation-error-dark.png');
  });
});
