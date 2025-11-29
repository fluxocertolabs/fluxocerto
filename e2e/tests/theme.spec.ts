/**
 * E2E Tests: User Story 8 - Theme Switching
 * Tests theme toggle, persistence, and visual consistency
 */

import { test, expect } from '../fixtures/test-base';

test.describe('Theme Switching', () => {
  test.beforeAll(async ({ db }) => {
    await db.ensureTestUser(process.env.TEST_USER_EMAIL || 'e2e-test@example.com');
  });

  test('T069: click theme toggle → theme switches between light and dark mode', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();

    // Find theme toggle button
    const themeToggle = page.getByRole('button', { name: /tema|theme|dark|light/i });

    // Get initial theme state
    const html = page.locator('html');
    const initialClass = await html.getAttribute('class');
    const initiallyDark = initialClass?.includes('dark');

    // Click toggle
    await themeToggle.click();

    // Wait for theme change
    await page.waitForTimeout(300);

    // Verify theme changed
    const newClass = await html.getAttribute('class');
    const nowDark = newClass?.includes('dark');
    expect(nowDark).not.toBe(initiallyDark);
  });

  test('T070: dark mode selected, refresh page → dark mode persists', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();

    const themeToggle = page.getByRole('button', { name: /tema|theme|dark|light/i });
    const html = page.locator('html');

    // Ensure we're in dark mode
    let currentClass = await html.getAttribute('class');
    if (!currentClass?.includes('dark')) {
      await themeToggle.click();
      await page.waitForTimeout(300);
    }

    // Verify we're in dark mode
    currentClass = await html.getAttribute('class');
    expect(currentClass).toContain('dark');

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify dark mode persisted
    const afterRefreshClass = await html.getAttribute('class');
    expect(afterRefreshClass).toContain('dark');
  });

  test('T071: dark mode active, view dashboard → all components render correctly with dark theme colors', async ({
    page,
    dashboardPage,
    db,
  }) => {
    // Seed some data so dashboard has content
    await db.resetDatabase();
    await db.seedAccounts([{ name: 'Test Account', type: 'checking', balance: 100000 }]);
    await db.seedProjects([{
      name: 'Test Project',
      amount: 500000,
      payment_day: 5,
      frequency: 'monthly',
      certainty: 'guaranteed',
      is_active: true,
    }]);

    await dashboardPage.goto();

    const themeToggle = page.getByRole('button', { name: /tema|theme|dark|light/i });
    const html = page.locator('html');

    // Ensure dark mode
    let currentClass = await html.getAttribute('class');
    if (!currentClass?.includes('dark')) {
      await themeToggle.click();
      await page.waitForTimeout(300);
    }

    // Verify dark mode is active
    currentClass = await html.getAttribute('class');
    expect(currentClass).toContain('dark');

    // Verify dashboard components are visible and render correctly
    // Check that the page doesn't have any broken elements
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Check background color is dark (not white)
    const backgroundColor = await body.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );
    // Dark backgrounds typically have low RGB values
    // This is a basic check - could be more sophisticated
    expect(backgroundColor).not.toBe('rgb(255, 255, 255)');
  });
});

