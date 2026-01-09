/**
 * Visual Regression Tests: Onboarding Wizard
 * Tests visual appearance of all onboarding wizard steps in light and dark themes
 *
 * NOTE: These tests use fresh user authentication to ensure the onboarding wizard
 * auto-shows. Each test creates a new user via magic link to get a clean onboarding state.
 *
 * Includes both desktop and mobile viewport tests.
 *
 * @visual
 */

import { test as base, expect, type Page, devices } from '@playwright/test';
import { LoginPage } from '../../pages/login-page';
import { InbucketClient } from '../../utils/inbucket';

// Extend base test with visual helpers
const visualTest = base.extend<{
  visual: {
    setTheme: (page: Page, theme: 'light' | 'dark') => Promise<void>;
    waitForStableUI: (page: Page) => Promise<void>;
    disableAnimations: (page: Page) => Promise<void>;
  };
}>({
  visual: async ({}, use) => {
    await use({
      setTheme: async (page: Page, theme: 'light' | 'dark') => {
        await page.evaluate(
          ({ theme }) => {
            window.localStorage.setItem(
              'fluxo-certo-theme',
              JSON.stringify({
                state: { theme, resolvedTheme: theme, isLoaded: true },
                version: 0,
              })
            );
            const root = document.documentElement;
            root.classList.remove('light', 'dark');
            root.classList.add(theme);
          },
          { theme }
        );
        await page.waitForTimeout(100);
      },
      waitForStableUI: async (page: Page) => {
        await Promise.race([
          page.waitForLoadState('networkidle'),
          page.waitForTimeout(5000),
        ]);
        await page.waitForTimeout(500);
        await page.evaluate(() => document.fonts.ready);
      },
      disableAnimations: async (page: Page) => {
        await page.addStyleTag({
          content: `
            *, *::before, *::after {
              animation-duration: 0s !important;
              animation-delay: 0s !important;
              transition-duration: 0s !important;
              transition-delay: 0s !important;
            }
          `,
        });
      },
    });
  },
});

// Run onboarding visual tests serially to avoid email conflicts
visualTest.describe.configure({ mode: 'serial' });

visualTest.describe('Onboarding Wizard Visual Regression @visual', () => {
  let inbucket: InbucketClient;

  visualTest.beforeAll(async () => {
    inbucket = new InbucketClient();
  });

  /**
   * Helper to authenticate a fresh user and get to onboarding wizard
   */
  async function authenticateNewUser(page: Page, email: string): Promise<void> {
    const loginPage = new LoginPage(page);
    const mailbox = email.split('@')[0];

    await inbucket.purgeMailbox(mailbox);
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
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 15000 });
  }

  visualTest('onboarding wizard - profile step - light', async ({ page, visual }) => {
    const email = `onboarding-visual-profile-light-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    // Set theme and stabilize
    await visual.setTheme(page, 'light');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    // Verify we're on profile step
    await expect(wizardDialog.getByRole('heading', { name: /seu perfil/i })).toBeVisible();

    // Take screenshot
    await expect(page).toHaveScreenshot('onboarding-profile-step-light.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  visualTest('onboarding wizard - profile step - dark', async ({ page, visual }) => {
    const email = `onboarding-visual-profile-dark-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    await visual.setTheme(page, 'dark');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    await expect(wizardDialog.getByRole('heading', { name: /seu perfil/i })).toBeVisible();

    await expect(page).toHaveScreenshot('onboarding-profile-step-dark.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  visualTest('onboarding wizard - group step - light', async ({ page, visual }) => {
    const email = `onboarding-visual-group-light-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    // Fill profile and advance to group step
    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 15000 });

    await visual.setTheme(page, 'light');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-group-step-light.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  visualTest('onboarding wizard - group step - dark', async ({ page, visual }) => {
    const email = `onboarding-visual-group-dark-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear with retry logic for CI stability
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(async () => {
      await expect(wizardDialog).toBeVisible();
    }).toPass({ timeout: 25000, intervals: [500, 1000, 2000] });

    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    
    // Wait for step transition with retry logic
    await expect(async () => {
      await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible();
    }).toPass({ timeout: 15000, intervals: [500, 1000, 2000] });

    await visual.setTheme(page, 'dark');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-group-step-dark.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  visualTest('onboarding wizard - bank account step - light', async ({ page, visual }) => {
    const email = `onboarding-visual-bank-light-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    // Navigate to bank account step
    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#group-name').fill('Grupo Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 15000 });

    await visual.setTheme(page, 'light');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-bank-account-step-light.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  visualTest('onboarding wizard - bank account step - dark', async ({ page, visual }) => {
    const email = `onboarding-visual-bank-dark-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#group-name').fill('Grupo Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 15000 });

    await visual.setTheme(page, 'dark');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-bank-account-step-dark.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  visualTest('onboarding wizard - income step - light', async ({ page, visual }) => {
    const email = `onboarding-visual-income-light-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    // Navigate to income step
    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#group-name').fill('Grupo Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#account-name').fill('Conta Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 15000 });

    await visual.setTheme(page, 'light');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-income-step-light.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  visualTest('onboarding wizard - income step - dark', async ({ page, visual }) => {
    const email = `onboarding-visual-income-dark-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#group-name').fill('Grupo Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#account-name').fill('Conta Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 15000 });

    await visual.setTheme(page, 'dark');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-income-step-dark.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  visualTest('onboarding wizard - expense step - light', async ({ page, visual }) => {
    const email = `onboarding-visual-expense-light-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    // Navigate to expense step
    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#group-name').fill('Grupo Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#account-name').fill('Conta Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 15000 });

    // Skip income (optional)
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^despesa$/i })).toBeVisible({ timeout: 15000 });

    await visual.setTheme(page, 'light');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-expense-step-light.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  visualTest('onboarding wizard - expense step - dark', async ({ page, visual }) => {
    const email = `onboarding-visual-expense-dark-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#group-name').fill('Grupo Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#account-name').fill('Conta Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 15000 });

    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^despesa$/i })).toBeVisible({ timeout: 15000 });

    await visual.setTheme(page, 'dark');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-expense-step-dark.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  visualTest('onboarding wizard - credit card step - light', async ({ page, visual }) => {
    const email = `onboarding-visual-card-light-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    // Navigate to credit card step
    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#group-name').fill('Grupo Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#account-name').fill('Conta Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 15000 });

    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^despesa$/i })).toBeVisible({ timeout: 15000 });

    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /cartão de crédito/i })).toBeVisible({ timeout: 15000 });

    await visual.setTheme(page, 'light');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-credit-card-step-light.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  visualTest('onboarding wizard - credit card step - dark', async ({ page, visual }) => {
    const email = `onboarding-visual-card-dark-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#group-name').fill('Grupo Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#account-name').fill('Conta Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 15000 });

    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^despesa$/i })).toBeVisible({ timeout: 15000 });

    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /cartão de crédito/i })).toBeVisible({ timeout: 15000 });

    await visual.setTheme(page, 'dark');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-credit-card-step-dark.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });
});

/**
 * Mobile viewport tests for onboarding wizard.
 * Uses Pixel 5 device emulation for mobile-specific layouts.
 */
const mobileTest = base.extend<{
  visual: {
    setTheme: (page: Page, theme: 'light' | 'dark') => Promise<void>;
    waitForStableUI: (page: Page) => Promise<void>;
    disableAnimations: (page: Page) => Promise<void>;
  };
}>({
  visual: async ({}, use) => {
    await use({
      setTheme: async (page: Page, theme: 'light' | 'dark') => {
        await page.evaluate(
          ({ theme }) => {
            window.localStorage.setItem(
              'fluxo-certo-theme',
              JSON.stringify({
                state: { theme, resolvedTheme: theme, isLoaded: true },
                version: 0,
              })
            );
            const root = document.documentElement;
            root.classList.remove('light', 'dark');
            root.classList.add(theme);
          },
          { theme }
        );
        await page.waitForTimeout(100);
      },
      waitForStableUI: async (page: Page) => {
        await Promise.race([
          page.waitForLoadState('networkidle'),
          page.waitForTimeout(5000),
        ]);
        await page.waitForTimeout(500);
        await page.evaluate(() => document.fonts.ready);
      },
      disableAnimations: async (page: Page) => {
        await page.addStyleTag({
          content: `
            *, *::before, *::after {
              animation-duration: 0s !important;
              animation-delay: 0s !important;
              transition-duration: 0s !important;
              transition-delay: 0s !important;
            }
          `,
        });
      },
    });
  },
});

// Use Pixel 5 device for mobile viewport
mobileTest.use({ ...devices['Pixel 5'] });

mobileTest.describe('Onboarding Wizard Mobile Visual Regression @visual', () => {
  // Mobile tests run serially to avoid email conflicts
  mobileTest.describe.configure({ mode: 'serial' });

  let inbucket: InbucketClient;

  mobileTest.beforeAll(async () => {
    inbucket = new InbucketClient();
  });

  /**
   * Helper to authenticate a fresh user and get to onboarding wizard
   */
  async function authenticateNewUser(page: Page, email: string): Promise<void> {
    const loginPage = new LoginPage(page);
    const mailbox = email.split('@')[0];

    await inbucket.purgeMailbox(mailbox);
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
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 15000 });
  }

  mobileTest('onboarding wizard - profile step - mobile light', async ({ page, visual }) => {
    const email = `onboarding-mobile-profile-light-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    await visual.setTheme(page, 'light');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    await expect(wizardDialog.getByRole('heading', { name: /seu perfil/i })).toBeVisible();

    await expect(page).toHaveScreenshot('onboarding-profile-step-mobile-light.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  mobileTest('onboarding wizard - profile step - mobile dark', async ({ page, visual }) => {
    const email = `onboarding-mobile-profile-dark-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    await visual.setTheme(page, 'dark');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    await expect(wizardDialog.getByRole('heading', { name: /seu perfil/i })).toBeVisible();

    await expect(page).toHaveScreenshot('onboarding-profile-step-mobile-dark.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  mobileTest('onboarding wizard - bank account step - mobile light', async ({ page, visual }) => {
    const email = `onboarding-mobile-bank-light-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    // Navigate to bank account step
    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#group-name').fill('Grupo Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 15000 });

    await visual.setTheme(page, 'light');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-bank-account-step-mobile-light.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  mobileTest('onboarding wizard - bank account step - mobile dark', async ({ page, visual }) => {
    const email = `onboarding-mobile-bank-dark-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#group-name').fill('Grupo Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 15000 });

    await visual.setTheme(page, 'dark');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-bank-account-step-mobile-dark.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  // Additional mobile steps to ensure full coverage across all onboarding wizard steps

  mobileTest('onboarding wizard - group step - mobile light', async ({ page, visual }) => {
    const email = `onboarding-mobile-group-light-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    // Navigate to group step
    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 15000 });

    await visual.setTheme(page, 'light');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-group-step-mobile-light.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  mobileTest('onboarding wizard - group step - mobile dark', async ({ page, visual }) => {
    const email = `onboarding-mobile-group-dark-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 15000 });

    await visual.setTheme(page, 'dark');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-group-step-mobile-dark.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  mobileTest('onboarding wizard - income step - mobile light', async ({ page, visual }) => {
    const email = `onboarding-mobile-income-light-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    // Navigate to income step
    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#group-name').fill('Grupo Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#account-name').fill('Conta Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 15000 });

    await visual.setTheme(page, 'light');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-income-step-mobile-light.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  mobileTest('onboarding wizard - income step - mobile dark', async ({ page, visual }) => {
    const email = `onboarding-mobile-income-dark-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#group-name').fill('Grupo Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#account-name').fill('Conta Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 15000 });

    await visual.setTheme(page, 'dark');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-income-step-mobile-dark.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  mobileTest('onboarding wizard - expense step - mobile light', async ({ page, visual }) => {
    const email = `onboarding-mobile-expense-light-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    // Navigate to expense step
    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#group-name').fill('Grupo Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#account-name').fill('Conta Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 15000 });

    // Skip income (optional)
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^despesa$/i })).toBeVisible({ timeout: 15000 });

    await visual.setTheme(page, 'light');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-expense-step-mobile-light.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  mobileTest('onboarding wizard - expense step - mobile dark', async ({ page, visual }) => {
    const email = `onboarding-mobile-expense-dark-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#group-name').fill('Grupo Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#account-name').fill('Conta Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 15000 });

    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^despesa$/i })).toBeVisible({ timeout: 15000 });

    await visual.setTheme(page, 'dark');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-expense-step-mobile-dark.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  mobileTest('onboarding wizard - credit card step - mobile light', async ({ page, visual }) => {
    const email = `onboarding-mobile-card-light-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    // Navigate to credit card step
    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#group-name').fill('Grupo Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#account-name').fill('Conta Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 15000 });

    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^despesa$/i })).toBeVisible({ timeout: 15000 });

    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /cartão de crédito/i })).toBeVisible({ timeout: 15000 });

    await visual.setTheme(page, 'light');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-credit-card-step-mobile-light.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  mobileTest('onboarding wizard - credit card step - mobile dark', async ({ page, visual }) => {
    const email = `onboarding-mobile-card-dark-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#group-name').fill('Grupo Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#account-name').fill('Conta Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 15000 });

    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /^despesa$/i })).toBeVisible({ timeout: 15000 });

    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /cartão de crédito/i })).toBeVisible({ timeout: 15000 });

    await visual.setTheme(page, 'dark');
    await visual.disableAnimations(page);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-credit-card-step-mobile-dark.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });
});

/**
 * Validation error states for onboarding wizard.
 * Tests visual appearance of validation errors (aria-invalid styling).
 */
visualTest.describe('Onboarding Wizard Validation Error States @visual', () => {
  let inbucket: InbucketClient;

  visualTest.beforeAll(async () => {
    inbucket = new InbucketClient();
  });

  /**
   * Helper to authenticate a fresh user and get to onboarding wizard
   */
  async function authenticateNewUser(page: Page, email: string): Promise<void> {
    const loginPage = new LoginPage(page);
    const mailbox = email.split('@')[0];

    await inbucket.purgeMailbox(mailbox);
    await loginPage.goto();
    await loginPage.requestMagicLink(email);
    await loginPage.expectMagicLinkSent();

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
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 15000 });
  }

  visualTest('profile step - validation error - light', async ({ page, visual }) => {
    const email = `onboarding-val-profile-light-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    await visual.setTheme(page, 'light');
    await visual.disableAnimations(page);

    // Leave profile name empty and try to proceed
    await page.locator('#profile-name').clear();
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    // Wait for validation error to show
    await page.waitForTimeout(500);
    await visual.waitForStableUI(page);

    // The input should have aria-invalid or show error styling
    await expect(page).toHaveScreenshot('onboarding-profile-validation-error-light.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  visualTest('profile step - validation error - dark', async ({ page, visual }) => {
    const email = `onboarding-val-profile-dark-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    await visual.setTheme(page, 'dark');
    await visual.disableAnimations(page);

    // Leave profile name empty and try to proceed
    await page.locator('#profile-name').clear();
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    await page.waitForTimeout(500);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-profile-validation-error-dark.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  visualTest('group step - validation error - light', async ({ page, visual }) => {
    const email = `onboarding-val-group-light-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    // Fill profile and advance to group step
    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 15000 });

    await visual.setTheme(page, 'light');
    await visual.disableAnimations(page);

    // Leave group name empty and try to proceed
    await page.locator('#group-name').clear();
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    await page.waitForTimeout(500);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-group-validation-error-light.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  visualTest('group step - validation error - dark', async ({ page, visual }) => {
    const email = `onboarding-val-group-dark-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 15000 });

    await visual.setTheme(page, 'dark');
    await visual.disableAnimations(page);

    await page.locator('#group-name').clear();
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    await page.waitForTimeout(500);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-group-validation-error-dark.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  visualTest('bank account step - validation error - light', async ({ page, visual }) => {
    const email = `onboarding-val-bank-light-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    // Navigate to bank account step
    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#group-name').fill('Grupo Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 15000 });

    await visual.setTheme(page, 'light');
    await visual.disableAnimations(page);

    // Leave account name empty and try to proceed
    await page.locator('#account-name').clear();
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    await page.waitForTimeout(500);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-bank-validation-error-light.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });

  visualTest('bank account step - validation error - dark', async ({ page, visual }) => {
    const email = `onboarding-val-bank-dark-${Date.now()}@example.com`;
    await authenticateNewUser(page, email);

    // Wait for wizard dialog to appear (no hardcoded timeout - use proper wait)
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeVisible({ timeout: 20000 });

    await page.locator('#profile-name').fill('Usuário Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 15000 });

    await page.locator('#group-name').fill('Grupo Visual Test');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();
    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 15000 });

    await visual.setTheme(page, 'dark');
    await visual.disableAnimations(page);

    await page.locator('#account-name').clear();
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    await page.waitForTimeout(500);
    await visual.waitForStableUI(page);

    await expect(page).toHaveScreenshot('onboarding-bank-validation-error-dark.png', {
      mask: [page.locator('[data-testid="group-badge"]')],
    });
  });
});

