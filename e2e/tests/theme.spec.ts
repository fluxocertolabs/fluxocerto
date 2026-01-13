/**
 * E2E Tests: User Story 8 - Theme Switching
 * Tests theme toggle, persistence, and visual consistency
 */

import { test, expect } from '../fixtures/test-base';
import { createAccount, createProject } from '../utils/test-data';
import type { Page } from '@playwright/test';

const SHOULD_EXPECT_THEME_SYNC = process.env.VITE_DISABLE_THEME_SYNC !== 'true';

function waitForThemeBootstrap(page: Page): Promise<void> {
  if (!SHOULD_EXPECT_THEME_SYNC) {
    return Promise.resolve();
  }

  return page
    .waitForResponse(
      (response) =>
        response.url().includes('group_preferences') && response.request().method() === 'GET',
      { timeout: 15000 }
    )
    .catch(() => undefined);
}

test.describe('Theme Switching', () => {
  // Tests now run in parallel with per-worker data prefixing for isolation

  test('T069: click theme toggle → theme cycles through light, dark, and system modes', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(5000)]);

    // Find theme toggle button
    const themeToggle = page.getByRole('button', { name: /tema atual/i });
    await expect(themeToggle).toBeVisible({ timeout: 10000 });

    // Get initial aria-label
    const initialLabel = await themeToggle.getAttribute('aria-label');
    expect(initialLabel).toBeTruthy();

    // Click toggle
    await themeToggle.click();

    // Wait for the button's aria-label to change
    await expect(themeToggle).not.toHaveAttribute('aria-label', initialLabel!, { timeout: 5000 });

    // Verify the aria-label actually changed
    const newLabel = await themeToggle.getAttribute('aria-label');
    expect(newLabel).not.toBe(initialLabel);
  });

  test('T070: theme preference persists after page refresh', async ({
    page,
    dashboardPage,
  }) => {
    const themeBootstrap = waitForThemeBootstrap(page);

    // Force start with 'light' theme to ensure next click goes to 'dark'
    // This avoids the issue where 'system' resolves to 'light' in CI, 
    // causing 'system' -> 'light' transition to have no visual change
    // NOTE: We use a flag to prevent overwriting the theme on reload
    await page.addInitScript(() => {
      const guardKey = 'e2e-theme-init-t070';
      if (!window.sessionStorage.getItem(guardKey)) {
        window.localStorage.setItem('fluxo-certo-theme', JSON.stringify({
          state: { theme: 'light', resolvedTheme: 'light', isLoaded: true },
          version: 0
        }));
        window.sessionStorage.setItem(guardKey, 'true');
      }
    });

    await dashboardPage.goto();
    await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(5000)]);
    await themeBootstrap;

    // Find theme toggle and get initial state
    const themeToggle = page.getByRole('button', { name: /tema atual/i });
    await expect(themeToggle).toBeVisible({ timeout: 10000 });
    
    const html = page.locator('html');
    const initialClass = await html.getAttribute('class');

    // Wait for the theme preference to be saved to Supabase when sync is enabled
    const saveRequestPromise = SHOULD_EXPECT_THEME_SYNC
      ? page
          .waitForResponse(
            (response) =>
              response.url().includes('group_preferences') &&
              response.request().method() !== 'GET' &&
              response.status() >= 200 &&
              response.status() < 300
          )
          .catch(() => undefined)
      : null;

    // Click toggle to change theme
    await themeToggle.click();
    
    // Wait for the save request to complete (with a small buffer)
    // We race with a timeout just in case the network request is too fast or happens differently,
    // but ideally we catch it.
    if (saveRequestPromise) {
      await Promise.race([saveRequestPromise, page.waitForTimeout(2000)]);
    } else {
      await page.waitForTimeout(200);
    }
    
    // Also wait for UI update
    await page.waitForTimeout(500);

    // Get the new class after toggle
    const newClass = await html.getAttribute('class');
    
    // Verify the theme changed (class should be different)
    // Use poll to wait for class update
    await expect.poll(async () => {
      return await html.getAttribute('class');
    }, { timeout: 10000 }).not.toBe(initialClass);

    // Refresh the page
    await page.reload();
    await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(5000)]);
    await page.waitForTimeout(1000); // Give time for useTheme hook to fetch and apply

    // Verify theme persisted (class should match post-toggle state, not initial)
    const classAfterRefresh = await html.getAttribute('class');
    
    // The persisted class should match the toggled state
    // (might be slightly different due to other classes, so check for dark specifically)
    const hadDarkBefore = newClass?.includes('dark');
    const hasDarkAfter = classAfterRefresh?.includes('dark');
    expect(hasDarkAfter).toBe(hadDarkBefore);
  });

  test('T071: dashboard renders correctly with different themes', async ({
    page,
    dashboardPage,
    db,
  }) => {
    const themeBootstrap = waitForThemeBootstrap(page);

    // Seed some data so dashboard has content
    await db.seedAccounts([createAccount({ name: 'Test Account', type: 'checking', balance: 100000 })]);
    await db.seedProjects([createProject({
      name: 'Test Project',
      amount: 500000,
      frequency: 'monthly',
      certainty: 'guaranteed',
      is_active: true,
    })]);

    // Force start with 'light' theme
    await page.addInitScript(() => {
      const guardKey = 'e2e-theme-init-t071';
      if (!window.sessionStorage.getItem(guardKey)) {
        window.localStorage.setItem('fluxo-certo-theme', JSON.stringify({
          state: { theme: 'light', resolvedTheme: 'light', isLoaded: true },
          version: 0
        }));
        window.sessionStorage.setItem(guardKey, 'true');
      }
    });

    await dashboardPage.goto();
    await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(5000)]);
    await themeBootstrap;

    // Find theme toggle
    const themeToggle = page.getByRole('button', { name: /tema atual/i });
    await expect(themeToggle).toBeVisible({ timeout: 10000 });
    
    // Verify dashboard components are visible in current theme
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Get initial background color
    const initialBgColor = await body.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // Toggle theme
    await themeToggle.click();
    await page.waitForTimeout(500);

    // Verify background color changed (theme actually applied)
    // Use poll to wait for color transition
    await expect.poll(async () => {
      return await body.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    }, { timeout: 10000 }).not.toBe(initialBgColor);
    
    // Dashboard should still be visible
    await expect(body).toBeVisible();
  });
});
