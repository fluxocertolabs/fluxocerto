/**
 * E2E Tests: User Story 8 - Theme Switching
 * Tests theme toggle, persistence, and visual consistency
 */

import { test, expect, Page } from '../fixtures/test-base';
import { createAccount, createProject } from '../utils/test-data';

/**
 * Helper to click theme toggle until we reach dark mode.
 * The cycle is: light → dark → system → light
 * Clicks up to 3 times to avoid infinite loops.
 */
async function clickUntilDarkMode(page: Page): Promise<void> {
  const html = page.locator('html');
  
  for (let i = 0; i < 3; i++) {
    // Check if already in dark mode
    const classList = await html.getAttribute('class');
    if (classList?.includes('dark')) {
      return; // Already dark
    }
    
    // Find and click the theme toggle
    const themeToggle = page.getByRole('button', { name: /tema atual/i });
    await expect(themeToggle).toBeVisible({ timeout: 10000 });
    await themeToggle.click();
    
    // Wait for theme to apply
    await page.waitForTimeout(500);
  }
}

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

  test('T070: dark mode selected, refresh page → dark mode persists', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Wait for page to be fully interactive
    await page.waitForTimeout(1000);

    // Click until we reach dark mode
    await clickUntilDarkMode(page);

    // Verify we're in dark mode (check HTML class)
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/, { timeout: 5000 });

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Wait for theme to be applied after reload
    await page.waitForTimeout(500);

    // Verify dark mode persisted after refresh
    await expect(html).toHaveClass(/dark/, { timeout: 5000 });
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
    
    // Wait for page to be fully interactive
    await page.waitForTimeout(1000);

    // Click until we reach dark mode
    await clickUntilDarkMode(page);

    // Verify dark mode is active
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/, { timeout: 5000 });

    // Verify dashboard components are visible
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Check background color is dark (not white)
    const backgroundColor = await body.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );
    expect(backgroundColor).not.toBe('rgb(255, 255, 255)');
  });
});

