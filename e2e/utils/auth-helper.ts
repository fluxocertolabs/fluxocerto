/**
 * Shared authentication helper for E2E tests
 * Uses proper Playwright waiting mechanisms instead of arbitrary timeouts
 */

import { Page, expect } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import { InbucketClient } from './inbucket';

/**
 * Authenticate a fresh user via magic link and wait for the app to be fully ready.
 * 
 * This helper uses proper Playwright waiting mechanisms:
 * 1. Waits for magic link email delivery (polling)
 * 2. Waits for URL redirect after auth
 * 3. Waits for network to settle (all initial API calls complete)
 * 4. Waits for React to hydrate by checking for a known UI element
 * 
 * @param page - Playwright page instance
 * @param email - Email address for the new user
 * @param inbucket - Inbucket client instance
 * @returns Promise that resolves when the app is fully ready
 */
export async function authenticateNewUser(
  page: Page,
  email: string,
  inbucket: InbucketClient
): Promise<void> {
  const loginPage = new LoginPage(page);
  const mailbox = email.split('@')[0];

  // Step 1: Purge mailbox to ensure we get a fresh magic link
  await inbucket.purgeMailbox(mailbox);

  // Step 2: Request magic link
  await loginPage.goto();
  await loginPage.requestMagicLink(email);
  await loginPage.expectMagicLinkSent();

  // Step 3: Wait for magic link email using expect.poll (more efficient than sleep loop)
  let magicLink: string | null = null;
  await expect.poll(
    async () => {
      const message = await inbucket.getLatestMessage(mailbox);
      if (message) {
        magicLink = inbucket.extractMagicLink(message);
      }
      return magicLink !== null;
    },
    {
      message: `Waiting for magic link email for ${email}`,
      timeout: 15000,
      intervals: [500, 500, 1000, 1000, 2000],
    }
  ).toBeTruthy();

  if (!magicLink) {
    throw new Error(`Magic link not received for ${email}`);
  }

  // Step 4: Navigate to magic link
  await page.goto(magicLink);

  // Step 5: Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 20000 });

  // Step 6: Wait for network to settle (all initial API calls complete)
  // Use domcontentloaded + short wait instead of networkidle which can hang
  await page.waitForLoadState('domcontentloaded');
  
  // Step 7: Wait for React to hydrate by checking for app shell
  // The app shell should have a header or main content area
  await expect(
    page.locator('header, main, [data-testid="app-shell"]').first()
  ).toBeVisible({ timeout: 10000 });
}

/**
 * Wait for the onboarding wizard to appear (for fresh users)
 * Uses proper Playwright auto-waiting
 */
export async function waitForOnboardingWizard(page: Page): Promise<void> {
  const wizardDialog = page
    .locator('[role="dialog"]')
    .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });

  await expect(wizardDialog).toBeVisible({ timeout: 15000 });
}

/**
 * Complete the onboarding wizard with minimal required data
 * Uses proper Playwright auto-waiting between steps
 */
export async function completeOnboardingWizard(page: Page): Promise<void> {
  const wizardDialog = page
    .locator('[role="dialog"]')
    .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });

  // Wait for wizard to be visible
  await expect(wizardDialog).toBeVisible({ timeout: 15000 });

  // Step 1: Profile
  await expect(wizardDialog.getByRole('heading', { name: /seu perfil/i })).toBeVisible();
  await page.locator('#profile-name').fill('Test User');
  await wizardDialog.getByRole('button', { name: /próximo/i }).click();

  // Step 2: Group - wait for heading to confirm step transition
  await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible();
  await page.locator('#group-name').fill('Test Group');
  await wizardDialog.getByRole('button', { name: /próximo/i }).click();

  // Step 3: Bank Account
  await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible();
  await page.locator('#account-name').fill('Test Account');
  await page.locator('#account-balance').fill('1000');
  await wizardDialog.getByRole('button', { name: /próximo/i }).click();

  // Step 4: Income (skip - optional)
  await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible();
  await wizardDialog.getByRole('button', { name: /próximo/i }).click();

  // Step 5: Expense (skip - optional)
  await expect(wizardDialog.getByRole('heading', { name: /^despesa$/i })).toBeVisible();
  await wizardDialog.getByRole('button', { name: /próximo/i }).click();

  // Step 6: Credit Card (skip - optional)
  await expect(wizardDialog.getByRole('heading', { name: /cartão de crédito/i })).toBeVisible();
  await wizardDialog.getByRole('button', { name: /finalizar/i }).click();

  // Wait for wizard to close
  await expect(wizardDialog).toBeHidden({ timeout: 10000 });
}

/**
 * Dismiss a tour if it's currently showing or about to show
 * Waits briefly for the tour to potentially appear before checking
 * Returns true if a tour was dismissed, false otherwise
 */
export async function dismissTourIfPresent(page: Page, waitForTour: boolean = true): Promise<boolean> {
  const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
  
  // For fresh users, the tour might auto-show after a short delay
  // Wait briefly to see if it appears
  if (waitForTour) {
    try {
      await expect(closeTourButton).toBeVisible({ timeout: 3000 });
      await closeTourButton.click();
      await expect(closeTourButton).toBeHidden({ timeout: 5000 });
      return true;
    } catch {
      // Tour didn't appear, that's fine
      return false;
    }
  }
  
  // Immediate check without waiting
  const isVisible = await closeTourButton.isVisible().catch(() => false);
  
  if (isVisible) {
    await closeTourButton.click();
    await expect(closeTourButton).toBeHidden({ timeout: 5000 });
    return true;
  }
  
  return false;
}

/**
 * Wait for the floating help button to be ready
 * This indicates the page is fully interactive
 */
export async function waitForFloatingHelp(page: Page): Promise<void> {
  const helpButton = page.getByTestId('floating-help-button');
  await expect(helpButton).toBeVisible({ timeout: 10000 });
}

