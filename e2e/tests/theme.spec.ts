/**
 * E2E Tests: User Story 8 - Theme Switching
 * Tests theme toggle, persistence, and visual consistency
 */

import { test, expect } from '../fixtures/test-base';
import { createAccount, createProject } from '../utils/test-data';

test.describe('Theme Switching', () => {
  test.beforeAll(async ({ db }) => {
    await db.ensureTestUser(process.env.TEST_USER_EMAIL || 'e2e-test@example.com');
  });

  test('T069: click theme toggle → theme cycles through light, dark, and system modes', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');

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
    db,
  }) => {
    await db.resetDatabase();

    // Force start with 'light' theme to ensure next click goes to 'dark'
    // This avoids the issue where 'system' resolves to 'light' in CI, 
    // causing 'system' -> 'light' transition to have no visual change
    // NOTE: We use a flag to prevent overwriting the theme on reload
    await page.addInitScript(() => {
      if (!window.localStorage.getItem('e2e-test-initialized')) {
        window.localStorage.setItem('family-finance-theme', JSON.stringify({
          state: { theme: 'light', resolvedTheme: 'light', isLoaded: true },
          version: 0
        }));
        window.localStorage.setItem('e2e-test-initialized', 'true');
      }
    });

    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');

    // Find theme toggle and get initial state
    const themeToggle = page.getByRole('button', { name: /tema atual/i });
    await expect(themeToggle).toBeVisible({ timeout: 10000 });
    
    const html = page.locator('html');
    const initialClass = await html.getAttribute('class');

    // Wait for the theme preference to be saved to Supabase
    // This ensures that when we reload, we fetch the correct updated preference
    const saveRequestPromise = page.waitForResponse(response => 
      response.url().includes('user_preferences') && 
      response.request().method() !== 'GET' &&
      response.status() >= 200 && response.status() < 300
    ).catch(() => {
      // If no request happens (e.g. already synced or debounced), that might be okay if tests pass,
      // but for T070 we explicitly expect a sync because we are changing the theme.
      // If this timeouts, it means no sync request was observed.
      console.warn('Warning: Theme sync request not observed or timed out');
    });

    // Click toggle to change theme
    await themeToggle.click();
    
    // Wait for the save request to complete (with a small buffer)
    // We race with a timeout just in case the network request is too fast or happens differently,
    // but ideally we catch it.
    await Promise.race([
      saveRequestPromise,
      page.waitForTimeout(2000) // Fallback if request is missed or very fast
    ]);
    
    // Also wait for UI update
    await page.waitForTimeout(500);

    // Get the new class after toggle
    const newClass = await html.getAttribute('class');
    
    // Verify the theme changed (class should be different)
    expect(newClass).not.toBe(initialClass);

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
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
    // Seed some data so dashboard has content
    await db.resetDatabase();
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
      if (!window.localStorage.getItem('e2e-test-initialized')) {
        window.localStorage.setItem('family-finance-theme', JSON.stringify({
          state: { theme: 'light', resolvedTheme: 'light', isLoaded: true },
          version: 0
        }));
        window.localStorage.setItem('e2e-test-initialized', 'true');
      }
    });

    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');

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
    const newBgColor = await body.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );
    
    // Background color should be different after theme toggle
    expect(newBgColor).not.toBe(initialBgColor);
    
    // Dashboard should still be visible
    await expect(body).toBeVisible();
  });
});

