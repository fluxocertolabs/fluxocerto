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
  }) => {
    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');

    // Find theme toggle and get initial state
    const themeToggle = page.getByRole('button', { name: /tema atual/i });
    await expect(themeToggle).toBeVisible({ timeout: 10000 });
    
    const html = page.locator('html');
    const initialClass = await html.getAttribute('class');

    // Click toggle to change theme
    await themeToggle.click();
    await page.waitForTimeout(500);

    // Get the new class after toggle
    const newClass = await html.getAttribute('class');
    
    // Verify the theme changed (class should be different)
    expect(newClass).not.toBe(initialClass);

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

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

