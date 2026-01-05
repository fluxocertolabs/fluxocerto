/**
 * E2E Tests: User Story 4 - Page Tours (Coachmarks)
 * Tests auto-show once per page per version, replay, defer while onboarding active, missing targets
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import { InbucketClient } from '../utils/inbucket';

test.describe('Page Tours', () => {
  // Run tour tests serially to avoid state conflicts
  test.describe.configure({ mode: 'serial' });

  let inbucket: InbucketClient;

  test.beforeAll(async () => {
    inbucket = new InbucketClient();
  });

  test.beforeEach(async () => {
    // Small delay between tests to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  });

  /**
   * Helper to authenticate a user via magic link
   */
  async function authenticateUser(page: import('@playwright/test').Page, email: string) {
    const loginPage = new LoginPage(page);
    const mailbox = email.split('@')[0];

    await loginPage.goto();
    await loginPage.requestMagicLink(email);
    await loginPage.expectMagicLinkSent();

    // Get magic link from Inbucket
    let magicLink: string | null = null;
    for (let i = 0; i < 15; i++) {
      const message = await inbucket.getLatestMessage(mailbox);
      if (message) {
        magicLink = inbucket.extractMagicLink(message);
        if (magicLink) break;
      }
      await page.waitForTimeout(500);
    }

    expect(magicLink).not.toBeNull();
    await page.goto(magicLink!);
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 15000 });
  }

  async function completeOnboardingIfPresent(page: import('@playwright/test').Page) {
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });

    if (!(await wizardDialog.isVisible().catch(() => false))) return;

    // Fill required fields when present, then advance until completion.
    if (await page.locator('#profile-name').isVisible().catch(() => false)) {
      await page.locator('#profile-name').fill('Usuário Teste');
    }
    if (await page.locator('#group-name').isVisible().catch(() => false)) {
      await page.locator('#group-name').fill('Grupo Teste');
    }
    if (await page.locator('#account-name').isVisible().catch(() => false)) {
      await page.locator('#account-name').fill('Conta Teste');
    }

    for (let i = 0; i < 10; i++) {
      if (!(await wizardDialog.isVisible().catch(() => false))) break;

      // Re-fill required inputs if the step changed.
      if (await page.locator('#profile-name').isVisible().catch(() => false)) {
        await page.locator('#profile-name').fill('Usuário Teste');
      }
      if (await page.locator('#group-name').isVisible().catch(() => false)) {
        await page.locator('#group-name').fill('Grupo Teste');
      }
      if (await page.locator('#account-name').isVisible().catch(() => false)) {
        await page.locator('#account-name').fill('Conta Teste');
      }

      const finalize = wizardDialog.getByRole('button', { name: /finalizar/i });
      if (await finalize.isVisible().catch(() => false)) {
        await finalize.click();
        break;
      }

      const next = wizardDialog.getByRole('button', { name: /próximo/i });
      await next.click();
      await page.waitForTimeout(250);
    }

    await expect(wizardDialog).toBeHidden({ timeout: 20000 });
  }

  async function dismissTourIfPresent(page: import('@playwright/test').Page) {
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    if (await closeTourButton.isVisible().catch(() => false)) {
      await closeTourButton.click();
      await expect(closeTourButton).toBeHidden({ timeout: 10000 });
    }
  }

  test('tour auto-shows on first visit to dashboard (after onboarding)', async ({ page }) => {
    const email = `tour-auto-${Date.now()}@example.com`;
    await inbucket.purgeMailbox(email.split('@')[0]);
    await authenticateUser(page, email);

    // Wait for the page to load and potential tour to appear
    await page.waitForTimeout(2000);

    // Tour auto-show is deferred while onboarding wizard is active.
    await completeOnboardingIfPresent(page);

    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    await expect(closeTourButton).toBeVisible({ timeout: 20000 });
  });

  test('tour does not auto-show on refresh after dismissal', async ({ page }) => {
    const email = `tour-dismiss-${Date.now()}@example.com`;
    await inbucket.purgeMailbox(email.split('@')[0]);
    await authenticateUser(page, email);

    // Wait for page to load
    await page.waitForTimeout(2000);

    await completeOnboardingIfPresent(page);

    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    await expect(closeTourButton).toBeVisible({ timeout: 20000 });

    await closeTourButton.click();
    await expect(closeTourButton).toBeHidden({ timeout: 10000 });

    // Refresh
    await page.reload();
    await page.waitForTimeout(2000);

    // Tour should not auto-show again
    const isTourAutoShowing = await closeTourButton.isVisible().catch(() => false);
    expect(isTourAutoShowing).toBe(false);
  });

  test('tour can be replayed via header "Mostrar tour" button', async ({ page }) => {
    const email = `tour-replay-${Date.now()}@example.com`;
    await inbucket.purgeMailbox(email.split('@')[0]);
    await authenticateUser(page, email);

    // Wait for page to load
    await page.waitForTimeout(2000);

    await completeOnboardingIfPresent(page);
    await dismissTourIfPresent(page);

    // Find and click the "Mostrar tour" / "Tour" button in header
    const tourButton = page.getByRole('button', { name: /mostrar tour da página/i });
    
    if (await tourButton.isVisible().catch(() => false)) {
      await tourButton.click();
      await page.waitForTimeout(1000);

      // Tour should now be active
      const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
      await expect(closeTourButton).toBeVisible({ timeout: 10000 });
    }
  });

  test('tour is deferred while onboarding wizard is active', async ({ page }) => {
    // Use a fresh email to ensure onboarding wizard shows
    const freshEmail = `tour-defer-${Date.now()}@example.com`;
    await inbucket.purgeMailbox(freshEmail.split('@')[0]);
    
    await authenticateUser(page, freshEmail);

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check if onboarding wizard is visible
    const wizardDialog = page.locator('[role="dialog"]');
    const isWizardVisible = await wizardDialog.isVisible().catch(() => false);

    if (isWizardVisible) {
      // While wizard is active, tour should NOT be showing
      const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
      const isTourActive = await closeTourButton.isVisible().catch(() => false);
      
      // Tour should be deferred while onboarding is active
      expect(isTourActive).toBe(false);
    }
  });

  test('tour gracefully handles missing target elements', async ({ page }) => {
    const email = `tour-missing-${Date.now()}@example.com`;
    await inbucket.purgeMailbox(email.split('@')[0]);
    await authenticateUser(page, email);

    // Navigate to history page which might have fewer elements
    await page.goto('/history');
    await page.waitForTimeout(2000);

    // If tour shows, it should not crash even if some targets are missing
    // The tour should skip missing targets per FR-018
    
    // Try to trigger the tour manually
    await completeOnboardingIfPresent(page);
    await dismissTourIfPresent(page);

    const tourButton = page.getByRole('button', { name: /mostrar tour da página/i });
    if (await tourButton.isVisible().catch(() => false)) {
      await tourButton.click();
      await page.waitForTimeout(1000);
      
      // Page should not show any errors
      const errorText = page.getByText(/error|erro|falha/i);
      const hasVisibleError = await errorText.isVisible().catch(() => false);
      
      // No crash or error should occur
      expect(hasVisibleError).toBe(false);
    }
  });
});

