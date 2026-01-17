/**
 * Shared helpers for mobile E2E tests.
 * Keeps onboarding, navigation, and tour handling consistent across suites.
 */

import { Page, expect } from '@playwright/test';
import { InbucketClient } from './inbucket';
import { authenticateNewUser as sharedAuthenticateNewUser } from './auth-helper';

type OnboardingOptions = {
  requireWizard?: boolean;
  waitForDashboard?: boolean;
};

export async function authenticateMobileUser(
  page: Page,
  email: string,
  inbucket: InbucketClient
): Promise<void> {
  await sharedAuthenticateNewUser(page, email, inbucket);
}

export async function completeOnboardingOnMobile(
  page: Page,
  options: OnboardingOptions = {}
): Promise<void> {
  const wizardDialog = page
    .locator('[role="dialog"]')
    .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });

  const requireWizard = options.requireWizard ?? true;
  if (!requireWizard) {
    // When not requiring the wizard, check if it appears within a short window
    try {
      await expect(wizardDialog).toBeVisible({ timeout: 10000 });
    } catch {
      // Wizard didn't appear, that's fine when not required
      return;
    }
  } else {
    // When requiring the wizard, wait for it with adequate timeout
    // The wizard only appears after auth + group association + finance data all load
    // Under parallel test load, this can take up to 20s
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });
  }

  // Step 1: Profile
  await expect(wizardDialog.getByRole('heading', { name: /seu perfil/i })).toBeVisible({
    timeout: 20000,
  });
  await page.locator('#profile-name').fill('Mobile Test User');
  await wizardDialog.getByRole('button', { name: /próximo/i }).click();

  // Step 2: Group
  await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({
    timeout: 20000,
  });
  await page.locator('#group-name').fill('Mobile Test Group');
  await wizardDialog.getByRole('button', { name: /próximo/i }).click();

  // Step 3: Bank Account
  await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({
    timeout: 20000,
  });
  await page.locator('#account-name').fill('Mobile Test Account');
  await page.locator('#account-balance').fill('1000');
  await wizardDialog.getByRole('button', { name: /próximo/i }).click();

  // Step 4: Income (skip)
  await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({
    timeout: 20000,
  });
  await wizardDialog.getByRole('button', { name: /próximo/i }).click();

  // Step 5: Expense (skip)
  await expect(wizardDialog.getByRole('heading', { name: /^despesa$/i })).toBeVisible({
    timeout: 20000,
  });
  await wizardDialog.getByRole('button', { name: /próximo/i }).click();

  // Step 6: Credit Card (skip)
  await expect(wizardDialog.getByRole('heading', { name: /cartão de crédito/i })).toBeVisible({
    timeout: 20000,
  });
  await wizardDialog.getByRole('button', { name: /finalizar/i }).click();

  await expect(wizardDialog).toBeHidden({ timeout: 20000 });

  const waitForDashboard = options.waitForDashboard ?? true;
  if (waitForDashboard) {
    await expect(page.getByRole('heading', { name: /painel|dashboard/i })).toBeVisible({
      timeout: 10000,
    });
  }
}

export async function dismissTourIfVisible(page: Page): Promise<void> {
  const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
  try {
    await expect(closeTourButton).toBeVisible({ timeout: 3000 });
    await closeTourButton.tap();
    await expect(closeTourButton).toBeHidden({ timeout: 5000 });
  } catch {
    // Tour not visible; continue
  }
}

export async function openMobileMenu(page: Page): Promise<void> {
  const menuButton = page.getByRole('button', { name: /menu/i });
  if (await menuButton.isVisible().catch(() => false)) {
    await menuButton.tap();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  }
}

export async function gotoNotifications(page: Page): Promise<void> {
  await page.goto('/notifications', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/notifications/);
  await expect(page.getByRole('heading', { name: /notificações/i })).toBeVisible({
    timeout: 10000,
  });
}

export async function gotoProfile(page: Page): Promise<void> {
  await page.goto('/profile', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/profile/);
  await expect(page.getByRole('heading', { name: /perfil/i })).toBeVisible({ timeout: 10000 });
}


