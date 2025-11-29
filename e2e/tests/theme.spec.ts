/**
 * E2E Tests: User Story 8 - Theme Switching
 * Tests theme toggle, persistence, and visual consistency
 */

import { test, expect } from '../fixtures/test-base';
import { createAccount, createProject } from '../utils/test-data';

test.describe('Theme Switching', () => {
  // Run tests serially to avoid theme state conflicts
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ db }) => {
    await db.ensureTestUser(process.env.TEST_USER_EMAIL || 'e2e-test@example.com');
  });

  test('T069: click theme toggle → theme switches between light and dark mode', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');

    // Find theme toggle button - matches aria-label patterns like "Tema atual: Claro. Clique para mudar para Escuro"
    const themeToggle = page.getByRole('button', { name: /tema atual/i });

    // Get initial theme state
    const html = page.locator('html');
    const initialClass = await html.getAttribute('class');
    const initiallyDark = initialClass?.includes('dark');

    // Click toggle
    await themeToggle.click();

    // Wait for theme change - need to wait for the DOM class to update
    await page.waitForFunction(
      (wasDark) => {
        const currentClass = document.documentElement.className;
        const isDark = currentClass.includes('dark');
        return isDark !== wasDark;
      },
      initiallyDark,
      { timeout: 5000 }
    );

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
    await page.waitForLoadState('networkidle');

    const themeToggle = page.getByRole('button', { name: /tema atual/i });
    const html = page.locator('html');

    // Ensure we're in dark mode - may need to click once or twice depending on current state
    let currentClass = await html.getAttribute('class');
    while (!currentClass?.includes('dark')) {
      await themeToggle.click();
      await page.waitForTimeout(500);
      currentClass = await html.getAttribute('class');
      // Safety check - if we've cycled back to light, break to avoid infinite loop
      if (currentClass?.includes('light') && !currentClass?.includes('dark')) {
        await themeToggle.click();
        await page.waitForTimeout(500);
        currentClass = await html.getAttribute('class');
        break;
      }
    }

    // Verify we're in dark mode
    currentClass = await html.getAttribute('class');
    expect(currentClass).toContain('dark');

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for theme to be applied after reload
    await page.waitForTimeout(500);

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

    const themeToggle = page.getByRole('button', { name: /tema atual/i });
    const html = page.locator('html');

    // Ensure dark mode - may need to click once or twice depending on current state
    let currentClass = await html.getAttribute('class');
    while (!currentClass?.includes('dark')) {
      await themeToggle.click();
      await page.waitForTimeout(500);
      currentClass = await html.getAttribute('class');
      // Safety check - if we've cycled back to light, break to avoid infinite loop
      if (currentClass?.includes('light') && !currentClass?.includes('dark')) {
        await themeToggle.click();
        await page.waitForTimeout(500);
        currentClass = await html.getAttribute('class');
        break;
      }
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

