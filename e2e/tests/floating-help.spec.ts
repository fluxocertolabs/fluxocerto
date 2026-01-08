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

      // Hover over the help button
      await helpButton.hover();
      await page.waitForTimeout(500);

      // The "Conhecer a página" text should be visible when expanded
      const tourLabel = page.getByText(/conhecer a página/i);
      await expect(tourLabel).toBeVisible({ timeout: 5000 });
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

      // Click the FAB button to expand (pinned mode) - use force to bypass any overlays
      // The FAB button has aria-label "Abrir ajuda" when closed
      const fabButton = helpButton.getByRole('button', { name: /abrir ajuda/i });
      await fabButton.click({ force: true });
      await page.waitForTimeout(800);

      // Click the tour option - it has text "Conhecer a página" and aria-label "Iniciar tour guiado da página"
      const tourOption = page.getByRole('button', { name: /conhecer a página|iniciar tour guiado/i });
      await expect(tourOption).toBeVisible({ timeout: 5000 });
      await tourOption.click({ force: true });
      await page.waitForTimeout(500);

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

      // Click to expand (pinned mode) - use force to bypass any overlays
      // The FAB button has aria-label "Abrir ajuda" when closed
      const fabButton = helpButton.getByRole('button', { name: /abrir ajuda/i });
      await fabButton.click({ force: true });
      await page.waitForTimeout(800);

      // Verify it's expanded - look for the tour option button (aria-label is "Iniciar tour guiado da página")
      const tourOption = page.getByRole('button', { name: /iniciar tour guiado/i });
      await expect(tourOption).toBeVisible({ timeout: 5000 });

      // Click outside - click on the page body area
      await page.click('body', { position: { x: 50, y: 50 }, force: true });
      await page.waitForTimeout(1000);

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


      // Click the FAB button to expand - use force to bypass any overlays
      // The FAB button has aria-label "Abrir ajuda" when closed
      const fabButton = helpButton.getByRole('button', { name: /abrir ajuda/i });
      await fabButton.click({ force: true });
      await page.waitForTimeout(800);


      // Click the tour option - it has text "Conhecer a página" and aria-label "Iniciar tour guiado da página"
      const tourOption = page.getByRole('button', { name: /conhecer a página|iniciar tour guiado/i });
      await expect(tourOption).toBeVisible({ timeout: 5000 });
      await tourOption.click({ force: true });
      await page.waitForTimeout(500);

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

      // Click the FAB button to expand (pinned mode) - use force to bypass any overlays
      // The FAB button has aria-label "Abrir ajuda" when closed
      const fabButton = helpButton.getByRole('button', { name: /abrir ajuda/i });
      await fabButton.click({ force: true });
      await page.waitForTimeout(800);

      // Click the tour option - it has text "Conhecer a página" and aria-label "Iniciar tour guiado da página"
      const tourOption = page.getByRole('button', { name: /conhecer a página|iniciar tour guiado/i });
      await expect(tourOption).toBeVisible({ timeout: 5000 });
      await tourOption.click({ force: true });
      await page.waitForTimeout(500);

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

