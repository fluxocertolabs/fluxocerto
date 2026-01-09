/**
 * E2E Tests: Floating Help Button
 * Tests the floating help button interactions and tour triggering
 */

import { test, expect } from '../fixtures/test-base';
import {
  createAccount,
  createProject,
  createExpense,
} from '../utils/test-data';

async function dismissTourIfVisible(page: import('@playwright/test').Page): Promise<void> {
  const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
  if (await closeTourButton.isVisible().catch(() => false)) {
    await closeTourButton.click({ timeout: 5000 }).catch(() => {});
    await expect(closeTourButton).toBeHidden({ timeout: 10000 }).catch(() => {});
  }
}

async function openFloatingHelpMenu(page: import('@playwright/test').Page) {
  // If a tour is already open (auto-show / leakage), it sits above the FAB (higher z-index) and
  // prevents real clicks from reaching the help button. Close it first to keep behavior deterministic.
  await dismissTourIfVisible(page);

  const helpButton = page.locator('[data-testid="floating-help-button"]');
  await expect(helpButton).toBeVisible({ timeout: 15000 });

  const tourOption = helpButton.getByRole('button', { name: /iniciar tour guiado da página/i });

  // Desktop behavior: the menu opens on hover and the FAB becomes `pointer-events: none`.
  // Playwright's `click()` moves the mouse first, which triggers hover-open and can cause
  // the menu pill to intercept the click (flake). Use hover + state assertion instead.
  if (!(await tourOption.isVisible().catch(() => false))) {
    await helpButton.hover();
    await expect(tourOption).toBeVisible({ timeout: 15000 });
  }

  return { helpButton, tourOption };
}

test.describe('Floating Help Button', () => {
  // Run tests serially to avoid parallel flakiness with realtime connections
  test.describe.configure({ mode: 'serial' });

  test.describe('Dashboard Page', () => {
    test('floating help button is visible on dashboard', async ({
      page,
      dashboardPage,
      db,
    }) => {
      await db.seedAccounts([createAccount({ name: 'Nubank', balance: 500000 })]);
      await dashboardPage.goto();

      const helpButton = page.locator('[data-testid="floating-help-button"]');
      await expect(helpButton).toBeVisible({ timeout: 10000 });
    });

    test('floating help button expands on hover (desktop)', async ({
      page,
      dashboardPage,
      db,
    }) => {
      await db.seedAccounts([createAccount({ name: 'Nubank', balance: 500000 })]);
      await dashboardPage.goto();

      const helpButton = page.locator('[data-testid="floating-help-button"]');
      await expect(helpButton).toBeVisible({ timeout: 10000 });

      await dismissTourIfVisible(page);

      // Hover over the help button
      await helpButton.hover();

      // The menu option should be visible when expanded
      const tourOption = helpButton.getByRole('button', { name: /iniciar tour guiado da página/i });
      await expect(tourOption).toBeVisible({ timeout: 15000 });
    });

    test('clicking tour option starts the dashboard tour', async ({
      page,
      dashboardPage,
      db,
    }) => {
      await db.seedAccounts([createAccount({ name: 'Nubank', balance: 500000 })]);
      await db.seedProjects([createProject({ name: 'Salário', amount: 800000 })]);
      await db.seedExpenses([createExpense({ name: 'Aluguel', amount: 200000 })]);
      await dashboardPage.goto();
      
      // Wait for dashboard to finish loading
      await dashboardPage.waitForDashboardLoad();

      const helpButton = page.locator('[data-testid="floating-help-button"]');
      await expect(helpButton).toBeVisible({ timeout: 10000 });

      const { tourOption } = await openFloatingHelpMenu(page);
      await tourOption.click();

      // Tour should be active
      const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
      await expect(closeTourButton).toBeVisible({ timeout: 10000 });
    });

    test('floating help button closes when clicking outside', async ({
      page,
      dashboardPage,
      db,
    }) => {
      await db.seedAccounts([createAccount({ name: 'Nubank', balance: 500000 })]);
      await dashboardPage.goto();
      
      // Wait for dashboard to finish loading
      await dashboardPage.waitForDashboardLoad();

      const helpButton = page.locator('[data-testid="floating-help-button"]');
      await expect(helpButton).toBeVisible({ timeout: 10000 });

      const { tourOption } = await openFloatingHelpMenu(page);

      // Click outside - click on the page body area
      await page.click('body', { position: { x: 50, y: 50 }, force: true });

      // Should be collapsed (tour option hidden)
      await expect(tourOption).toBeHidden({ timeout: 10000 });
    });
  });

  test.describe('Manage Page', () => {
    test('floating help button is visible on manage page', async ({
      page,
    }) => {
      // This test only validates the global FloatingHelpButton (layout-level),
      // so we deliberately avoid waiting for Manage page data to load (tabs, lists),
      // which can be slow/flaky under heavy parallel load.
      await page.goto('/manage', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/manage/);

      const helpButton = page.locator('[data-testid="floating-help-button"]');
      await expect(helpButton).toBeVisible({ timeout: 10000 });
    });

    test('clicking tour option starts the manage tour', async ({
      page,
      managePage,
    }) => {
      // Navigate to manage page (no seeding needed for this test)
      await managePage.goto();
      await managePage.waitForReady();
      

      const helpButton = page.locator('[data-testid="floating-help-button"]');
      await expect(helpButton).toBeVisible({ timeout: 10000 });

      const { tourOption } = await openFloatingHelpMenu(page);
      await tourOption.click();

      // Tour should be active
      const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
      await expect(closeTourButton).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('History Page', () => {
    test('floating help button is visible on history page', async ({
      page,
      historyPage,
      db,
    }) => {
      await db.clear();
      await historyPage.goto();

      const helpButton = page.locator('[data-testid="floating-help-button"]');
      await expect(helpButton).toBeVisible({ timeout: 10000 });
    });

    test('clicking tour option starts the history tour', async ({
      page,
      historyPage,
      db,
    }) => {
      await db.clear();
      await historyPage.goto();
      
      // Wait for history page to load - check for heading
      await expect(page.getByRole('heading', { name: /histórico de projeções/i })).toBeVisible({ timeout: 10000 });

      const helpButton = page.locator('[data-testid="floating-help-button"]');
      await expect(helpButton).toBeVisible({ timeout: 10000 });

      const { tourOption } = await openFloatingHelpMenu(page);
      await tourOption.click();

      // Tour should be active
      const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
      await expect(closeTourButton).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Pages without tours', () => {
    test('floating help button is not visible on login page', async ({ browser, baseURL }) => {
      // Create a fresh context without any auth state to access login page
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const page = await context.newPage();
      
      // Navigate directly to login page without auth
      await page.goto(`${baseURL}/login`);
      
      // Wait for login page to load - check for the login form title text
      await expect(page.getByText('Entrar', { exact: true })).toBeVisible({ timeout: 10000 });

      const helpButton = page.locator('[data-testid="floating-help-button"]');
      await expect(helpButton).toBeHidden();

      await context.close();
    });
  });
});

