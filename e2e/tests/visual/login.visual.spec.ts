/**
 * Visual Regression Tests: Login Page
 * Tests visual appearance of login page in various states
 *
 * Note: Login page tests use a separate unauthenticated fixture
 * since they need to show the login form
 *
 * @visual
 */

import { test, expect } from '@playwright/test';
import { waitForStableUI, setTheme, disableAnimations } from '../../fixtures/visual-test-base';

test.describe('Login Page Visual Regression @visual', () => {
  // Login tests run unauthenticated
  test.use({ storageState: { cookies: [], origins: [] } });

  test.describe('Light Theme', () => {
    test('login page - initial state', async ({ page }) => {
      await page.goto('/login');
      await disableAnimations(page);
      await setTheme(page, 'light');
      await waitForStableUI(page);

      // Verify the login form is visible
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.getByRole('button', { name: /enviar link|entrar|sign in/i })).toBeVisible();

      await expect(page).toHaveScreenshot('login-light-initial.png');
    });

    test('login page - after magic link requested', async ({ page }) => {
      await page.goto('/login');
      await disableAnimations(page);
      await setTheme(page, 'light');
      await waitForStableUI(page);

      // Fill in email and submit
      const emailInput = page.locator('#email');
      await emailInput.fill('test-visual@example.com');
      await page.getByRole('button', { name: /enviar link|entrar|sign in/i }).click();

      // Wait for success message
      await expect(page.getByRole('heading', { name: /verifique seu e-?mail/i })).toBeVisible({
        timeout: 10000,
      });
      await waitForStableUI(page);

      await expect(page).toHaveScreenshot('login-light-success.png');
    });
  });

  test.describe('Dark Theme', () => {
    test('login page - initial state (dark)', async ({ page }) => {
      await page.goto('/login');
      await disableAnimations(page);
      await setTheme(page, 'dark');
      await waitForStableUI(page);

      // Verify the login form is visible
      await expect(page.locator('#email')).toBeVisible();

      await expect(page).toHaveScreenshot('login-dark-initial.png');
    });

    test('login page - after magic link requested (dark)', async ({ page }) => {
      await page.goto('/login');
      await disableAnimations(page);
      await setTheme(page, 'dark');
      await waitForStableUI(page);

      // Fill in email and submit
      const emailInput = page.locator('#email');
      await emailInput.fill('test-visual-dark@example.com');
      await page.getByRole('button', { name: /enviar link|entrar|sign in/i }).click();

      // Wait for success message
      await expect(page.getByRole('heading', { name: /verifique seu e-?mail/i })).toBeVisible({
        timeout: 10000,
      });
      await waitForStableUI(page);

      await expect(page).toHaveScreenshot('login-dark-success.png');
    });
  });
});
