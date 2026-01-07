/**
 * Visual Regression Tests: Auth Callback Error States
 * Tests visual appearance of auth-callback page error UIs
 *
 * @visual
 */

import { test, expect } from '@playwright/test';
import { visualTest, waitForStableUI, setTheme, disableAnimations } from '../../fixtures/visual-test-base';

test.describe('Auth Callback Error States Visual Regression @visual', () => {
  // Auth callback tests run unauthenticated to show error states
  test.use({ storageState: { cookies: [], origins: [] } });

  test.describe('Light Theme', () => {
    test('auth error - expired link', async ({ page }) => {
      // Navigate with error params simulating expired link
      await page.goto('/auth/confirm?error=access_denied&error_description=Email%20link%20is%20invalid%20or%20has%20expired');
      await disableAnimations(page);
      await setTheme(page, 'light');
      await waitForStableUI(page);

      // Verify error UI is visible
      await expect(page.getByText(/link inválido ou expirado/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /solicitar novo link/i })).toBeVisible();

      await expect(page).toHaveScreenshot('auth-callback-light-expired-link.png');
    });

    test('auth error - generic error', async ({ page }) => {
      // Navigate with generic error
      await page.goto('/auth/confirm?error=server_error&error_description=An%20unexpected%20error%20occurred');
      await disableAnimations(page);
      await setTheme(page, 'light');
      await waitForStableUI(page);

      // Verify error UI is visible
      await expect(page.getByText(/erro ao entrar/i)).toBeVisible();

      await expect(page).toHaveScreenshot('auth-callback-light-generic-error.png');
    });
  });

  test.describe('Dark Theme', () => {
    test('auth error - expired link (dark)', async ({ page }) => {
      await page.goto('/auth/confirm?error=access_denied&error_description=Email%20link%20is%20invalid%20or%20has%20expired');
      await disableAnimations(page);
      await setTheme(page, 'dark');
      await waitForStableUI(page);

      await expect(page.getByText(/link inválido ou expirado/i)).toBeVisible();

      await expect(page).toHaveScreenshot('auth-callback-dark-expired-link.png');
    });

    test('auth error - generic error (dark)', async ({ page }) => {
      await page.goto('/auth/confirm?error=server_error&error_description=An%20unexpected%20error%20occurred');
      await disableAnimations(page);
      await setTheme(page, 'dark');
      await waitForStableUI(page);

      await expect(page.getByText(/erro ao entrar/i)).toBeVisible();

      await expect(page).toHaveScreenshot('auth-callback-dark-generic-error.png');
    });
  });
});

visualTest.describe('Auth Callback Provisioning Error Visual Regression @visual', () => {
  // These tests use authenticated workers and route interception to force provisioning failure

  visualTest.describe('Light Theme', () => {
    visualTest('provisioning error with retry UI', async ({ page, visual }) => {
      // Intercept the provisioning RPC to force failure
      await page.route('**/rest/v1/rpc/ensure_current_user_group*', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'PGRST301',
            message: 'Provisioning failed',
            details: 'Test error for visual regression',
          }),
        });
      });

      await page.goto('/auth/confirm');
      await disableAnimations(page);
      await visual.setTheme(page, 'light');

      // Wait for provisioning error to show
      await expect(page.getByText(/erro ao configurar conta/i)).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole('button', { name: /tentar novamente/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /ajuda/i })).toBeVisible();

      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'auth-callback-light-provisioning-error.png');
    });

    visualTest('provisioning error - help dialog open', async ({ page, visual }) => {
      await page.route('**/rest/v1/rpc/ensure_current_user_group*', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'PGRST301',
            message: 'Provisioning failed',
          }),
        });
      });

      await page.goto('/auth/confirm');
      await disableAnimations(page);
      await visual.setTheme(page, 'light');

      // Wait for error UI
      await expect(page.getByRole('button', { name: /ajuda/i })).toBeVisible({ timeout: 15000 });

      // Open help dialog
      await page.getByRole('button', { name: /ajuda/i }).click();

      // Wait for dialog to open
      await expect(page.getByText(/precisa de ajuda/i)).toBeVisible();
      await expect(page.getByText(/verifique sua conexão/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /copiar detalhes/i })).toBeVisible();

      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'auth-callback-light-help-dialog.png');
    });
  });

  visualTest.describe('Dark Theme', () => {
    visualTest('provisioning error with retry UI (dark)', async ({ page, visual }) => {
      await page.route('**/rest/v1/rpc/ensure_current_user_group*', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'PGRST301',
            message: 'Provisioning failed',
          }),
        });
      });

      await page.goto('/auth/confirm');
      await disableAnimations(page);
      await visual.setTheme(page, 'dark');

      await expect(page.getByText(/erro ao configurar conta/i)).toBeVisible({ timeout: 15000 });

      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'auth-callback-dark-provisioning-error.png');
    });

    visualTest('provisioning error - help dialog open (dark)', async ({ page, visual }) => {
      await page.route('**/rest/v1/rpc/ensure_current_user_group*', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'PGRST301',
            message: 'Provisioning failed',
          }),
        });
      });

      await page.goto('/auth/confirm');
      await disableAnimations(page);
      await visual.setTheme(page, 'dark');

      await expect(page.getByRole('button', { name: /ajuda/i })).toBeVisible({ timeout: 15000 });
      await page.getByRole('button', { name: /ajuda/i }).click();

      await expect(page.getByText(/precisa de ajuda/i)).toBeVisible();

      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'auth-callback-dark-help-dialog.png');
    });
  });
});
