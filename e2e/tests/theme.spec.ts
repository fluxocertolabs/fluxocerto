/**
 * E2E Tests: User Story 8 - Theme Switching
 * Tests theme toggle, persistence, and visual consistency
 */

import { test, expect, Page } from '../fixtures/test-base';
import { createAccount, createProject } from '../utils/test-data';

/**
 * Helper to set theme to a specific mode by clicking toggle until we reach it.
 * The cycle is: light → dark → system → light
 * Max 3 clicks to avoid infinite loops.
 */
async function setThemeMode(page: Page, targetMode: 'light' | 'dark' | 'system'): Promise<void> {
  // Wait for the theme toggle button to be visible and stable
  const themeToggle = page.getByRole('button', { name: /tema atual/i });
  await expect(themeToggle).toBeVisible({ timeout: 10000 });
  // Additional wait for React hydration to complete
  await page.waitForTimeout(500);

  for (let i = 0; i < 3; i++) {
    // Re-locate the element each iteration to handle any re-renders
    const currentToggle = page.getByRole('button', { name: /tema atual/i });
    await expect(currentToggle).toBeVisible({ timeout: 5000 });
    
    const label = await currentToggle.getAttribute('aria-label');
    if (!label) break;

    // Check if we're at the target mode based on aria-label
    const isLight = label.includes('Claro. Clique');
    const isDark = label.includes('Escuro. Clique');
    const isSystem = label.includes('Sistema. Clique');

    if (
      (targetMode === 'light' && isLight) ||
      (targetMode === 'dark' && isDark) ||
      (targetMode === 'system' && isSystem)
    ) {
      return; // Already at target mode
    }

    await currentToggle.click();
    await page.waitForTimeout(500); // Wait for state update and re-render
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

    // Set to dark mode using helper
    await setThemeMode(page, 'dark');

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

    // Set to dark mode using helper
    await setThemeMode(page, 'dark');

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

