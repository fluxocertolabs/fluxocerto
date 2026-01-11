/**
 * Visual Regression Tests: Profile Settings Page
 * Tests visual appearance of profile settings in various states
 *
 * States tested:
 * - Default form state
 * - Validation error state
 * - Email disabled state (read-only with hint)
 * - Email notifications toggle states
 *
 * @visual
 */

import { visualTest, expect } from '../../fixtures/visual-test-base';

visualTest.describe('Profile Settings Visual Regression @visual', () => {
  visualTest.describe('Light Theme', () => {
    visualTest('profile - default form light', async ({
      page,
      db,
      visual,
    }) => {
      await db.clear();

      await page.goto('/profile');
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Verify form is visible
      await expect(page.getByLabel(/^nome$/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByLabel(/^email$/i)).toBeVisible({ timeout: 10000 });

      await visual.takeScreenshot(page, 'profile-light-default.png');
    });

    visualTest('profile - email disabled state light', async ({
      page,
      db,
      visual,
    }) => {
      await db.clear();

      await page.goto('/profile');
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Verify email field is disabled
      const emailInput = page.getByLabel(/^email$/i);
      await expect(emailInput).toBeDisabled();

      // Verify hint text is visible (use specific selector to avoid multiple matches)
      await expect(page.locator('#email-hint')).toBeVisible({ timeout: 10000 });

      await visual.takeScreenshot(page, 'profile-light-email-disabled.png');
    });

    visualTest('profile - validation error light', async ({
      page,
      db,
      visual,
    }) => {
      await db.clear();

      await page.goto('/profile');
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Clear the name field to trigger validation error
      const nameInput = page.getByLabel(/^nome$/i);
      await nameInput.clear();

      // Click save to trigger validation
      await page.getByRole('button', { name: /salvar/i }).click();

      // Wait for validation error to appear
      await expect(page.getByText(/nome.*obrigatório/i)).toBeVisible({ timeout: 10000 });

      await visual.takeScreenshot(page, 'profile-light-validation-error.png');
    });

    visualTest('profile - email notifications enabled light', async ({
      page,
      db,
      visual,
    }) => {
      await db.clear();

      await page.goto('/profile');
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Verify toggle is visible and in enabled state (default)
      const toggle = page.getByRole('switch');
      await expect(toggle).toBeVisible({ timeout: 10000 });

      await visual.takeScreenshot(page, 'profile-light-notifications-enabled.png');
    });

    visualTest('profile - email notifications disabled light', async ({
      page,
      db,
      visual,
    }) => {
      // Reset state to ensure toggle starts in a known state (enabled by default)
      await db.clear();

      await page.goto('/profile');
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Toggle the switch to disabled state (it starts enabled by default after db.clear())
      const toggle = page.getByRole('switch');
      await expect(toggle).toBeVisible({ timeout: 10000 });
      
      // If toggle is checked, click to uncheck
      const isChecked = await toggle.getAttribute('aria-checked');
      if (isChecked === 'true') {
        await toggle.click();
        await page.waitForTimeout(500);
      }

      await visual.takeScreenshot(page, 'profile-light-notifications-disabled.png');
    });
  });

  visualTest.describe('Dark Theme', () => {
    visualTest('profile - default form dark', async ({
      page,
      db,
      visual,
    }) => {
      await db.clear();

      await page.goto('/profile');
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await expect(page.getByLabel(/^nome$/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByLabel(/^email$/i)).toBeVisible({ timeout: 10000 });

      await visual.takeScreenshot(page, 'profile-dark-default.png');
    });

    visualTest('profile - email disabled state dark', async ({
      page,
      db,
      visual,
    }) => {
      await db.clear();

      await page.goto('/profile');
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      const emailInput = page.getByLabel(/^email$/i);
      await expect(emailInput).toBeDisabled();
      await expect(page.locator('#email-hint')).toBeVisible({ timeout: 10000 });

      await visual.takeScreenshot(page, 'profile-dark-email-disabled.png');
    });

    visualTest('profile - validation error dark', async ({
      page,
      db,
      visual,
    }) => {
      await db.clear();

      await page.goto('/profile');
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      const nameInput = page.getByLabel(/^nome$/i);
      await nameInput.clear();

      await page.getByRole('button', { name: /salvar/i }).click();

      await expect(page.getByText(/nome.*obrigatório/i)).toBeVisible({ timeout: 10000 });

      await visual.takeScreenshot(page, 'profile-dark-validation-error.png');
    });

    visualTest('profile - email notifications enabled dark', async ({
      page,
      db,
      visual,
    }) => {
      await db.clear();

      await page.goto('/profile');
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      const toggle = page.getByRole('switch');
      await expect(toggle).toBeVisible({ timeout: 10000 });

      await visual.takeScreenshot(page, 'profile-dark-notifications-enabled.png');
    });

    visualTest('profile - email notifications disabled dark', async ({
      page,
      db,
      visual,
    }) => {
      // Reset state to ensure toggle starts in a known state (enabled by default)
      await db.clear();

      await page.goto('/profile');
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      // Toggle the switch to disabled state (it starts enabled by default after db.clear())
      const toggle = page.getByRole('switch');
      await expect(toggle).toBeVisible({ timeout: 10000 });
      
      // If toggle is checked, click to uncheck
      const isChecked = await toggle.getAttribute('aria-checked');
      if (isChecked === 'true') {
        await toggle.click();
        await page.waitForTimeout(500);
      }

      await visual.takeScreenshot(page, 'profile-dark-notifications-disabled.png');
    });
  });
});

