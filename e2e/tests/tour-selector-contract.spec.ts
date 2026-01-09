/**
 * Tour Selector Contract Tests
 *
 * Fast E2E tests that verify all TourDefinition.steps[].target selectors
 * actually exist on their relevant pages. This ensures tour definitions
 * stay in sync with the actual UI.
 *
 * This is a "contract test" - it validates the contract between tour
 * definitions and the DOM, catching breakages early when UI changes.
 */

import { test, expect } from '../fixtures/test-base';
import { TOURS, type TourDefinition, type TourStep } from '../../src/lib/tours/definitions';
import { ManagePage } from '../pages/manage-page';
import { createAccount, createExpense, createProject } from '../utils/test-data';

// Map tour keys to their page routes
const TOUR_ROUTES: Record<string, string> = {
  // The dashboard route is `/` (we keep `/dashboard` as an alias in the app by redirect).
  dashboard: '/',
  manage: '/manage',
  history: '/history',
};

test.describe('Tour Selector Contract Tests @contract', () => {
  // Run in parallel since each test is independent after setup
  test.describe.configure({ mode: 'parallel' });

  test('all dashboard tour selectors exist on /', async ({ page, db, dashboardPage }) => {
    const tour: TourDefinition = TOURS.dashboard;

    // Ensure dashboard is NOT in empty state. The dashboard tour targets elements that only
    // render when `hasData` is true (see `src/pages/dashboard.tsx`).
    await db.seedAccounts([createAccount({ name: 'Tour Contract - Account', balance: 100000 })]);
    await db.seedProjects([createProject({ name: 'Tour Contract - Income', amount: 800000 })]);
    await db.seedExpenses([createExpense({ name: 'Tour Contract - Expense', amount: 200000 })]);

    await dashboardPage.goto();

    // Wait for the first tour selector to render (means we're out of empty/skeleton states).
    await expect(page.locator(tour.steps[0].target)).toBeVisible({ timeout: 20000 });

    const missingSelectors: string[] = [];

    for (const step of tour.steps) {
      const locator = page.locator(step.target);
      const count = await locator.count();

      if (count === 0) {
        missingSelectors.push(`"${step.target}" (step: ${step.title})`);
      }
    }

    expect(missingSelectors, `Missing selectors on ${TOUR_ROUTES.dashboard}`).toEqual([]);
  });

  test('all manage tour selectors exist on /manage', async ({ page }) => {
    const tour: TourDefinition = TOURS.manage;

    // Reuse the same readiness logic as the rest of the suite to avoid flakes
    // under Option B (per-test contexts) + heavy parallel load.
    const managePage = new ManagePage(page)
    await managePage.goto()

    const missingSelectors: string[] = [];

    for (const step of tour.steps) {
      const locator = page.locator(step.target);
      const count = await locator.count();

      if (count === 0) {
        missingSelectors.push(`"${step.target}" (step: ${step.title})`);
      }
    }

    expect(missingSelectors, `Missing selectors on ${TOUR_ROUTES.manage}`).toEqual([]);
  });

  test('all history tour selectors exist on /history', async ({ page }) => {
    const tour: TourDefinition = TOURS.history;

    await page.goto('/history');
    await page.waitForLoadState('domcontentloaded');

    // Wait for history page content to load
    // The snapshot list might be empty but the container should exist
    await expect(page.locator('main, [data-tour]').first()).toBeVisible({ timeout: 10000 });

    const missingSelectors: string[] = [];

    for (const step of tour.steps) {
      const locator = page.locator(step.target);
      const count = await locator.count();

      if (count === 0) {
        missingSelectors.push(`"${step.target}" (step: ${step.title})`);
      }
    }

    expect(missingSelectors, `Missing selectors on ${TOUR_ROUTES.history}`).toEqual([]);
  });

  test('tour definitions have valid structure', async () => {
    // This is a fast unit-style test that doesn't need a browser
    // It validates the tour definitions themselves

    for (const [key, tour] of Object.entries(TOURS)) {
      // Validate tour has required fields
      expect(tour.key, `Tour ${key} should have a key`).toBe(key);
      expect(tour.version, `Tour ${key} should have a version >= 1`).toBeGreaterThanOrEqual(1);
      expect(tour.title, `Tour ${key} should have a title`).toBeTruthy();
      expect(tour.steps.length, `Tour ${key} should have at least one step`).toBeGreaterThanOrEqual(1);

      // Validate each step
      for (let i = 0; i < tour.steps.length; i++) {
        const step: TourStep = tour.steps[i];

        expect(step.target, `Tour ${key} step ${i} should have a target selector`).toBeTruthy();
        expect(step.title, `Tour ${key} step ${i} should have a title`).toBeTruthy();
        expect(step.content, `Tour ${key} step ${i} should have content`).toBeTruthy();

        // Validate target is a valid CSS selector format
        expect(
          step.target.startsWith('[') || step.target.startsWith('.') || step.target.startsWith('#'),
          `Tour ${key} step ${i} target "${step.target}" should be a valid selector`
        ).toBe(true);

        // Validate placement if specified
        if (step.placement) {
          expect(['top', 'right', 'bottom', 'left']).toContain(step.placement);
        }
      }
    }
  });

  test('all tour selectors use data-tour attributes (best practice)', async () => {
    // Validate that tour selectors use data-tour attributes
    // This is a best practice that makes selectors resilient to styling changes

    const nonDataTourSelectors: string[] = [];

    for (const [key, tour] of Object.entries(TOURS)) {
      for (const step of tour.steps) {
        if (!step.target.includes('data-tour')) {
          nonDataTourSelectors.push(`${key}: "${step.target}" (${step.title})`);
        }
      }
    }

    // All current selectors should use data-tour
    expect(
      nonDataTourSelectors,
      'All tour selectors should use data-tour attributes for stability'
    ).toEqual([]);
  });

  test('no duplicate selectors within a single tour', async () => {
    // Ensure no tour has duplicate selectors (which would cause confusion)

    for (const [key, tour] of Object.entries(TOURS)) {
      const selectors = tour.steps.map((s) => s.target);
      const uniqueSelectors = new Set(selectors);

      expect(
        selectors.length,
        `Tour ${key} should not have duplicate selectors`
      ).toBe(uniqueSelectors.size);
    }
  });

  test('tour routes are defined for all tour keys', async () => {
    // Ensure we have route mappings for all tours
    const tourKeys = Object.keys(TOURS);
    const routeKeys = Object.keys(TOUR_ROUTES);

    const missingRoutes = tourKeys.filter((key) => !routeKeys.includes(key));

    expect(
      missingRoutes,
      'All tour keys should have corresponding route definitions'
    ).toEqual([]);
  });
});

/**
 * Comprehensive selector presence test that runs against all tours
 * This is a single test that validates everything in one pass
 */
test.describe('Tour Selector Comprehensive Check @contract', () => {
  test('all tour selectors are present on their respective pages', async ({ page }) => {
    const results: { tour: string; page: string; missing: string[] }[] = [];

    for (const [tourKey, tour] of Object.entries(TOURS)) {
      const route = TOUR_ROUTES[tourKey];
      if (!route) continue;

      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');

      // Wait for page-specific content
      if (tourKey === 'dashboard') {
        // Dashboard can be in empty state or with data
        const projectionSelector = page.locator('[data-tour="projection-selector"]');
        const emptyState = page.locator('text=Nenhum Dado Financeiro Ainda');
        await expect(projectionSelector.or(emptyState)).toBeVisible({ timeout: 15000 });
        
        // Skip dashboard tour check if in empty state
        if (await emptyState.isVisible()) {
          continue;
        }
      } else if (tourKey === 'manage') {
        await expect(page.locator('[data-tour="manage-tabs"]')).toBeVisible({ timeout: 15000 });
      } else {
        await page.waitForTimeout(2000);
      }

      const missing: string[] = [];
      for (const step of tour.steps) {
        const count = await page.locator(step.target).count();
        if (count === 0) {
          missing.push(`${step.target} (${step.title})`);
        }
      }

      if (missing.length > 0) {
        results.push({ tour: tourKey, page: route, missing });
      }
    }

    // Generate a detailed error message
    if (results.length > 0) {
      const errorDetails = results
        .map((r) => `\n  Tour "${r.tour}" on ${r.page}:\n    - ${r.missing.join('\n    - ')}`)
        .join('');

      expect.fail(`Missing tour selectors:${errorDetails}`);
    }
  });
});

