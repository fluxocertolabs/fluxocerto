/**
 * Mobile Functional E2E Tests
 *
 * Tests core user flows on mobile viewport (Pixel 5).
 * These are functional tests, not visual regression.
 *
 * Covers:
 * - Onboarding completes on mobile (tap through)
 * - Floating help opens via tap and starts tour
 * - Tour navigation works on mobile (Next/Close)
 */

import { test, expect, type Page } from '@playwright/test';
import { InbucketClient } from '../../utils/inbucket';
import { authenticateNewUser as sharedAuthenticateNewUser } from '../../utils/auth-helper';

// Mobile tests run serially to avoid email conflicts
test.describe.configure({ mode: 'serial' });

test.describe('Mobile Functional E2E Tests @mobile', () => {
  let inbucket: InbucketClient;

  test.beforeAll(async () => {
    inbucket = new InbucketClient();
  });

  /**
   * Helper to authenticate a fresh user via magic link (wraps shared helper)
   */
  async function authenticateNewUser(page: Page, email: string): Promise<void> {
    await sharedAuthenticateNewUser(page, email, inbucket);
  }

  /**
   * Helper to complete onboarding wizard on mobile
   * Uses proper Playwright auto-waiting between steps
   */
  async function completeOnboardingOnMobile(page: Page): Promise<void> {
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });

    // Wait for wizard to appear
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(wizardDialog).toBeVisible({ timeout: 30000 });

    // Step 1: Profile
    await expect(wizardDialog.getByRole('heading', { name: /seu perfil/i })).toBeVisible({ timeout: 20000 });
    await page.locator('#profile-name').fill('Mobile Test User');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    // Step 2: Group - wait for heading to confirm step transition
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 20000 });
    await page.locator('#group-name').fill('Mobile Test Group');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    // Step 3: Bank Account
    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 20000 });
    await page.locator('#account-name').fill('Mobile Test Account');
    await page.locator('#account-balance').fill('1000');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    // Step 4: Income (skip - optional)
    await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 20000 });
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    // Step 5: Expense (skip - optional)
    await expect(wizardDialog.getByRole('heading', { name: /^despesa$/i })).toBeVisible({ timeout: 20000 });
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    // Step 6: Credit Card (skip - optional)
    await expect(wizardDialog.getByRole('heading', { name: /cartão de crédito/i })).toBeVisible({ timeout: 20000 });
    await wizardDialog.getByRole('button', { name: /finalizar/i }).click();

    // Wizard should close
    await expect(wizardDialog).toBeHidden({ timeout: 20000 });
  }

  test.describe('Onboarding on Mobile', () => {
    test('onboarding wizard completes successfully on mobile', async ({ page }) => {
      const email = `mobile-onboarding-${Date.now()}@example.com`;
      await authenticateNewUser(page, email);

      await completeOnboardingOnMobile(page);

      // Verify we're on dashboard after onboarding
      await expect(page).toHaveURL(/\/(dashboard)?$/);

      // Verify dashboard elements are visible (mobile layout)
      await expect(page.getByRole('heading', { name: /painel|dashboard/i })).toBeVisible({ timeout: 10000 });
    });

    test('onboarding wizard step navigation works on mobile', async ({ page }) => {
      const email = `mobile-onboarding-nav-${Date.now()}@example.com`;
      await authenticateNewUser(page, email);

      const wizardDialog = page
        .locator('[role="dialog"]')
        .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
      await expect(wizardDialog).toBeVisible({ timeout: 15000 });

      // Fill profile and advance
      await page.locator('#profile-name').fill('Mobile Test User');
      await wizardDialog.getByRole('button', { name: /próximo/i }).click();

      // Should be on group step
      await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible();

      // Go back
      await wizardDialog.getByRole('button', { name: /voltar/i }).click();

      // Should be back on profile step
      await expect(wizardDialog.getByRole('heading', { name: /seu perfil/i })).toBeVisible();
    });
  });

  test.describe('Floating Help on Mobile', () => {
    test('floating help button opens via tap on mobile', async ({ page }) => {
      const email = `mobile-help-${Date.now()}@example.com`;
      await authenticateNewUser(page, email);

      // Complete onboarding first
      await completeOnboardingOnMobile(page);

      // Wait for dashboard to load
      await expect(page.getByRole('heading', { name: /painel|dashboard/i })).toBeVisible({ timeout: 10000 });

      // Dismiss any auto-shown tour that might be blocking the help button
      const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
      if (await closeTourButton.isVisible().catch(() => false)) {
        await closeTourButton.tap();
        await expect(closeTourButton).toBeHidden({ timeout: 5000 });
      }

      // Find and tap the floating help button
      const helpButton = page.getByTestId('floating-help-button');
      await expect(helpButton).toBeVisible({ timeout: 10000 });

      // Tap the FAB
      const fab = helpButton.getByRole('button', { name: /abrir ajuda/i });
      await fab.tap();

      // Menu should open
      await expect(page.getByRole('button', { name: /iniciar tour guiado/i })).toBeVisible({ timeout: 5000 });
    });

    test('tapping "Conhecer a página" starts tour on mobile', async ({ page }) => {
      const email = `mobile-tour-start-${Date.now()}@example.com`;
      await authenticateNewUser(page, email);

      await completeOnboardingOnMobile(page);

      // Wait for any auto-shown tour to finish or dismiss it
      const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
      if (await closeTourButton.isVisible().catch(() => false)) {
        await closeTourButton.tap();
        await expect(closeTourButton).toBeHidden({ timeout: 5000 });
      }

      // Open floating help
      const helpButton = page.getByTestId('floating-help-button');
      await expect(helpButton).toBeVisible({ timeout: 10000 });
      await helpButton.getByRole('button', { name: /abrir ajuda/i }).tap();

      // Tap tour button
      await page.getByRole('button', { name: /iniciar tour guiado/i }).tap();

      // Tour should start - close button should be visible
      await expect(page.getByRole('button', { name: /fechar tour/i })).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Tour Navigation on Mobile', () => {
    test('tour navigation works with tap on mobile', async ({ page }) => {
      const email = `mobile-tour-nav-${Date.now()}@example.com`;
      await authenticateNewUser(page, email);

      await completeOnboardingOnMobile(page);

      // Wait for any auto-shown tour to appear
      const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
      const nextButton = page.getByRole('button', { name: /próximo/i });

      // If tour auto-shows, use it; otherwise start it manually
      if (!(await closeTourButton.isVisible().catch(() => false))) {
        const helpButton = page.getByTestId('floating-help-button');
        await helpButton.getByRole('button', { name: /abrir ajuda/i }).tap();
        await page.getByRole('button', { name: /iniciar tour guiado/i }).tap();
      }

      await expect(closeTourButton).toBeVisible({ timeout: 10000 });

      // Verify step counter shows "1 de X"
      await expect(page.getByText(/1 de \d+/)).toBeVisible();

      // Tap Next
      await nextButton.tap();

      // Should advance to step 2
      await expect(page.getByText(/2 de \d+/)).toBeVisible({ timeout: 5000 });

      // Tap Back
      const backButton = page.getByRole('button', { name: /voltar/i });
      await backButton.tap();

      // Should be back on step 1
      await expect(page.getByText(/1 de \d+/)).toBeVisible({ timeout: 5000 });
    });

    test('tour can be dismissed via close button on mobile', async ({ page }) => {
      const email = `mobile-tour-dismiss-${Date.now()}@example.com`;
      await authenticateNewUser(page, email);

      await completeOnboardingOnMobile(page);

      // Wait for tour or start it
      const closeTourButton = page.getByRole('button', { name: /fechar tour/i });

      if (!(await closeTourButton.isVisible().catch(() => false))) {
        const helpButton = page.getByTestId('floating-help-button');
        await helpButton.getByRole('button', { name: /abrir ajuda/i }).tap();
        await page.getByRole('button', { name: /iniciar tour guiado/i }).tap();
      }

      await expect(closeTourButton).toBeVisible({ timeout: 10000 });

      // Tap close button
      await closeTourButton.tap();

      // Tour should close
      await expect(closeTourButton).toBeHidden({ timeout: 5000 });
    });

    test('tour can be completed by tapping through all steps on mobile', async ({ page }) => {
      const email = `mobile-tour-complete-${Date.now()}@example.com`;
      await authenticateNewUser(page, email);

      await completeOnboardingOnMobile(page);

      // Wait for tour or start it
      const closeTourButton = page.getByRole('button', { name: /fechar tour/i });

      if (!(await closeTourButton.isVisible().catch(() => false))) {
        const helpButton = page.getByTestId('floating-help-button');
        await helpButton.getByRole('button', { name: /abrir ajuda/i }).tap();
        await page.getByRole('button', { name: /iniciar tour guiado/i }).tap();
      }

      await expect(closeTourButton).toBeVisible({ timeout: 10000 });

      // Tap through all steps until we see "Concluir"
      const nextButton = page.getByRole('button', { name: /próximo/i });
      const completeButton = page.getByRole('button', { name: /concluir/i });

      // Navigate through steps
      let maxSteps = 10; // Safety limit
      while (maxSteps > 0 && !(await completeButton.isVisible().catch(() => false))) {
        if (await nextButton.isVisible().catch(() => false)) {
          await nextButton.tap();
          await expect(page.getByText(/\d+ de \d+/)).toBeVisible({ timeout: 5000 });
        } else {
          break;
        }
        maxSteps--;
      }

      // Should see complete button on last step
      await expect(completeButton).toBeVisible({ timeout: 5000 });

      // Tap complete
      await completeButton.tap();

      // Tour should close
      await expect(closeTourButton).toBeHidden({ timeout: 5000 });
    });
  });

  test.describe('Mobile Navigation', () => {
    test('mobile navigation menu works', async ({ page }) => {
      const email = `mobile-nav-${Date.now()}@example.com`;
      await authenticateNewUser(page, email);
      

      await completeOnboardingOnMobile(page);

      // Close any tour that might be showing
      const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
      if (await closeTourButton.isVisible().catch(() => false)) {
        await closeTourButton.tap();
        await expect(closeTourButton).toBeHidden({ timeout: 5000 });
      }

      // Look for mobile menu button (hamburger)
      const menuButton = page.getByRole('button', { name: /menu/i });

      if (await menuButton.isVisible().catch(() => false)) {
        // Mobile has hamburger menu
        await menuButton.tap();

        // Should show navigation options
        await expect(page.getByRole('link', { name: /gerenciar|manage/i })).toBeVisible({ timeout: 5000 });

        // Navigate to manage
        await page.getByRole('link', { name: /gerenciar|manage/i }).tap();
        await expect(page).toHaveURL(/\/manage/, { timeout: 10000 });
      } else {
        // Desktop-style navigation visible on this viewport
        const manageLink = page.getByRole('link', { name: /gerenciar|manage/i });
        if (await manageLink.isVisible().catch(() => false)) {
          await manageLink.tap();
          await expect(page).toHaveURL(/\/manage/, { timeout: 10000 });
        }
      }
    });
  });
});

