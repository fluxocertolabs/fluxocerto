/**
 * Visual Regression Tests: Login Page
 * 
 * Minimal visual regression coverage:
 * - One screenshot of login page (light theme)
 * 
 * @visual
 */

import { test, expect } from '@playwright/test';
import { waitForStableUI, setTheme, disableAnimations } from '../../fixtures/visual-test-base';

test.describe('Login Page Visual Regression @visual', () => {
  // Login tests run unauthenticated
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login page - initial state', async ({ page }) => {
    await page.goto('/login?disableDevAuth=1');
    await disableAnimations(page);
    await setTheme(page, 'light');
    await waitForStableUI(page);

    // Verify the login form is visible
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.getByRole('button', { name: /enviar link|entrar|sign in/i })).toBeVisible();

    await expect(page).toHaveScreenshot('login-light-initial.png');
  });
});
