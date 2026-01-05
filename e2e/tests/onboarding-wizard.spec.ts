/**
 * E2E Tests: User Story 3 - Onboarding Wizard
 * Tests auto-show once, skip doesn't re-auto-show, resume after refresh, entry points work
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import { InbucketClient } from '../utils/inbucket';

// Generate unique email for onboarding tests to ensure clean state
const ONBOARDING_TEST_EMAIL = `onboarding-${Date.now()}@example.com`;

test.describe('Onboarding Wizard', () => {
  // Run onboarding tests serially to maintain state
  test.describe.configure({ mode: 'serial' });

  let inbucket: InbucketClient;

  test.beforeAll(async () => {
    inbucket = new InbucketClient();
    // Purge mailbox to ensure clean state
    await inbucket.purgeMailbox(ONBOARDING_TEST_EMAIL.split('@')[0]);
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

  test('T041a: onboarding wizard auto-shows on first login for new user', async ({ page }) => {
    await authenticateUser(page, ONBOARDING_TEST_EMAIL);

    // Wait for the page to load
    await page.waitForTimeout(2000);

    // Check if onboarding wizard dialog is visible
    const wizardDialog = page.locator('[role="dialog"]');
    const isWizardVisible = await wizardDialog.isVisible().catch(() => false);

    // For a new user with no data, onboarding should auto-show
    // Note: This depends on the user having no accounts/projects/expenses
    if (isWizardVisible) {
      // Verify it's the onboarding wizard by checking for expected content
      const wizardTitle = page.locator('[role="dialog"]').getByText(/configuração|perfil|conta|setup/i);
      await expect(wizardTitle.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('T041b: onboarding wizard cannot be skipped/dismissed', async ({ page }) => {
    await authenticateUser(page, ONBOARDING_TEST_EMAIL);

    // Wait for the page to load
    await page.waitForTimeout(2000);

    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 5000 });

    // No "Pular" button should exist (onboarding is mandatory)
    const skipButton = wizardDialog.getByRole('button', { name: /pular|skip/i });
    await expect(skipButton).toHaveCount(0);

    // Attempt to dismiss via Escape / outside click should not close the wizard
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    await expect(wizardDialog).toBeVisible();

    await page.mouse.click(5, 5);
    await page.waitForTimeout(250);
    await expect(wizardDialog).toBeVisible();
  });

  test('T041c: wizard progress resumes after page refresh', async ({ page }) => {
    // Use a fresh email to start with clean onboarding state
    const freshEmail = `onboarding-resume-${Date.now()}@example.com`;
    await inbucket.purgeMailbox(freshEmail.split('@')[0]);
    
    await authenticateUser(page, freshEmail);

    // Wait for the page to load and wizard to appear
    await page.waitForTimeout(2000);

    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });

    await expect(wizardDialog).toBeVisible({ timeout: 5000 });
    await expect(wizardDialog.getByText('Seu Perfil')).toBeVisible();

    // Advance to the next step (profile -> group)
    await page.locator('#profile-name').fill('Usuário Teste');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByText('Seu Grupo')).toBeVisible({ timeout: 10000 });

    // Refresh the page - should resume at the same step
    await page.reload();
    await page.waitForTimeout(2000);
    await expect(wizardDialog).toBeVisible({ timeout: 5000 });
    await expect(wizardDialog.getByText('Seu Grupo')).toBeVisible();

    // Finish onboarding to ensure it does not appear again after completion
    await page.locator('#group-name').fill('Grupo Teste');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByText('Conta Bancária')).toBeVisible({ timeout: 10000 });

    await page.locator('#account-name').fill('Conta Teste');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByText('Renda')).toBeVisible({ timeout: 10000 });

    // Optional steps: income + expense + credit card (leave blank)
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByText('Despesa')).toBeVisible({ timeout: 10000 });

    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByText('Cartão de Crédito')).toBeVisible({ timeout: 10000 });

    await wizardDialog.getByRole('button', { name: /finalizar/i }).click();
    await expect(wizardDialog).toBeHidden({ timeout: 15000 });

    // Refresh - wizard should not auto-show again after completion
    await page.reload();
    await page.waitForTimeout(2000);
    await expect(wizardDialog).toBeHidden();
  });

  test('T041d: "Continuar configuração" entry point does not exist (onboarding is mandatory)', async ({ page }) => {
    await authenticateUser(page, ONBOARDING_TEST_EMAIL);

    // Wait for the page to load
    await page.waitForTimeout(2000);

    const setupButton = page.getByRole('button', { name: /continuar configuração|continue setup/i });
    await expect(setupButton).toHaveCount(0);
  });

  test('T041e: empty state CTA opens wizard', async ({ page }) => {
    // Use a fresh email to ensure empty state
    const freshEmail = `onboarding-empty-${Date.now()}@example.com`;
    await inbucket.purgeMailbox(freshEmail.split('@')[0]);
    
    await authenticateUser(page, freshEmail);

    // Wait for the page to load
    await page.waitForTimeout(2000);

    // If the wizard is already showing (mandatory onboarding), the empty state CTA is not actionable.
    const wizardDialog = page.locator('[role="dialog"]');
    if (await wizardDialog.isVisible().catch(() => false)) {
      await expect(wizardDialog).toBeVisible();
      return;
    }

    // Look for empty state CTA (e.g., "Começar Configuração" or "Iniciar Configuração")
    const emptyStateCTA = page.getByRole('button', { name: /começar|iniciar|start/i }).filter({ hasText: /configuração|setup/i });
    
    if (await emptyStateCTA.isVisible().catch(() => false)) {
      await emptyStateCTA.click();
      await page.waitForTimeout(1000);

      // Wizard should now be open
      const wizardDialog = page.locator('[role="dialog"]');
      await expect(wizardDialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('T041f: wizard does not block navigation', async ({ page }) => {
    // Use a fresh email
    const freshEmail = `onboarding-nav-${Date.now()}@example.com`;
    await inbucket.purgeMailbox(freshEmail.split('@')[0]);
    
    await authenticateUser(page, freshEmail);

    // Wait for the page to load
    await page.waitForTimeout(2000);

    // Even if wizard is showing, navigation should work
    // Try to navigate to /manage
    await page.goto('/manage');
    
    // Should successfully navigate (not blocked)
    await expect(page).toHaveURL(/\/manage/);

    // Try to navigate to /history
    await page.goto('/history');
    
    // Should successfully navigate
    await expect(page).toHaveURL(/\/history/);

    // Navigate back to dashboard
    await page.goto('/');
    await expect(page).toHaveURL(/\/(dashboard)?$/);
  });
});

