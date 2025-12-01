/**
 * Visual Test Base Fixture
 * Extended Playwright test with helpers for visual regression testing
 * Includes masking utilities for dynamic content and theme setup helpers
 */

import { test as base, expect, type Page, type Locator } from '@playwright/test';
import { createWorkerDbFixture, type WorkerDatabaseFixture } from './db';
import { AuthFixture, createWorkerAuthFixture } from './auth';
import { getWorkerContext, type IWorkerContext } from './worker-context';
import { LoginPage } from '../pages/login-page';
import { DashboardPage } from '../pages/dashboard-page';
import { ManagePage } from '../pages/manage-page';
import { QuickUpdatePage } from '../pages/quick-update-page';
import { existsSync } from 'fs';

/**
 * Theme modes supported by the app
 */
type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Visual test helper utilities
 */
export interface VisualTestHelpers {
  /**
   * Get locators for dynamic content that should be masked in screenshots
   * This includes currency values, dates, UUIDs, and worker-prefixed names
   */
  getDynamicMasks(page: Page): Promise<Locator[]>;

  /**
   * Wait for the UI to stabilize (animations complete, data loaded)
   */
  waitForStableUI(page: Page): Promise<void>;

  /**
   * Set the theme mode before taking screenshots
   */
  setTheme(page: Page, theme: ThemeMode): Promise<void>;

  /**
   * Take a screenshot with standard masking applied
   */
  takeScreenshot(
    page: Page,
    name: string,
    options?: { fullPage?: boolean; additionalMasks?: Locator[] }
  ): Promise<void>;
}

/**
 * Custom test fixtures type for visual tests
 */
type VisualTestFixtures = {
  /** Worker context with isolation information */
  workerContext: IWorkerContext;
  /** Database fixture scoped to worker (uses data prefixing) */
  db: WorkerDatabaseFixture;
  /** Auth fixture scoped to worker */
  auth: AuthFixture;
  /** Login page object */
  loginPage: LoginPage;
  /** Dashboard page object */
  dashboardPage: DashboardPage;
  /** Manage page object */
  managePage: ManagePage;
  /** Quick update page object */
  quickUpdatePage: QuickUpdatePage;
  /** Visual test helper utilities */
  visual: VisualTestHelpers;
};

/**
 * Worker-scoped fixtures (shared across all tests in a worker)
 */
type WorkerFixtures = {
  /** Worker context - created once per worker */
  workerCtx: IWorkerContext;
  /** Worker-scoped browser context with auth state loaded */
  workerBrowserContext: import('@playwright/test').BrowserContext;
};

/**
 * Get locators for elements that contain dynamic content
 */
async function getDynamicMasks(page: Page): Promise<Locator[]> {
  const masks: Locator[] = [];

  // Currency values (R$ format)
  const currencyElements = page.locator('[data-testid*="balance"], [data-testid*="amount"]');
  if ((await currencyElements.count()) > 0) {
    masks.push(currencyElements);
  }

  // Recharts chart elements (data varies based on seed data)
  const chartElements = page.locator('.recharts-wrapper');
  if ((await chartElements.count()) > 0) {
    masks.push(chartElements);
  }

  // Any element with worker prefix pattern [W{n}]
  const workerPrefixedElements = page.locator('text=/\\[W\\d+\\]/');
  if ((await workerPrefixedElements.count()) > 0) {
    masks.push(workerPrefixedElements);
  }

  // Timestamps and dates (common patterns)
  const datePatterns = page.locator('[data-testid*="date"], [data-testid*="timestamp"]');
  if ((await datePatterns.count()) > 0) {
    masks.push(datePatterns);
  }

  return masks;
}

/**
 * Wait for UI to stabilize before taking screenshots
 */
async function waitForStableUI(page: Page): Promise<void> {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle');

  // Fixed delay to allow any animations/transitions to complete
  // This is more reliable than trying to detect skeleton elements
  await page.waitForTimeout(1000);
}

/**
 * Set the theme mode
 */
async function setTheme(page: Page, theme: ThemeMode): Promise<void> {
  // Inject script to set theme in localStorage before page loads
  await page.addInitScript(
    (themeValue: ThemeMode) => {
      const resolvedTheme = themeValue === 'system' ? 'light' : themeValue;
      window.localStorage.setItem(
        'family-finance-theme',
        JSON.stringify({
          state: { theme: themeValue, resolvedTheme, isLoaded: true },
          version: 0,
        })
      );
    },
    theme
  );
}

/**
 * Take a screenshot with standard masking
 */
async function takeScreenshotWithMasks(
  page: Page,
  name: string,
  options?: { fullPage?: boolean; additionalMasks?: Locator[] }
): Promise<void> {
  const masks = await getDynamicMasks(page);
  const allMasks = options?.additionalMasks ? [...masks, ...options.additionalMasks] : masks;

  await expect(page).toHaveScreenshot(name, {
    fullPage: options?.fullPage ?? false,
    mask: allMasks,
  });
}

/**
 * Extended test with visual testing fixtures
 */
export const visualTest = base.extend<VisualTestFixtures, WorkerFixtures>({
  // Worker-scoped context - created once per worker, shared across tests
  workerCtx: [
    async ({}, use, workerInfo) => {
      const context = getWorkerContext(workerInfo.workerIndex);
      await use(context);
    },
    { scope: 'worker' },
  ],

  // Worker-scoped browser context with auth state pre-loaded
  workerBrowserContext: [
    async ({ browser, workerCtx }, use) => {
      const storageStatePath = workerCtx.authStatePath;
      const hasAuthState = existsSync(storageStatePath);

      if (!hasAuthState) {
        throw new Error(
          `❌ Auth state file not found for worker ${workerCtx.workerIndex}: ${storageStatePath}. Run setup first.`
        );
      }

      // Validate auth state
      const fs = await import('fs/promises');
      const authStateContent = await fs.readFile(storageStatePath, 'utf-8');
      const authState = JSON.parse(authStateContent);

      const hasCookies = authState.cookies && authState.cookies.length > 0;
      const hasOrigins = authState.origins && authState.origins.length > 0;

      if (!hasCookies && !hasOrigins) {
        throw new Error(
          `❌ Worker ${workerCtx.workerIndex}: Auth state file is empty! No cookies or origins found.`
        );
      }

      if (hasOrigins) {
        const origin = authState.origins[0];
        const hasLocalStorage = origin.localStorage && origin.localStorage.length > 0;

        if (!hasLocalStorage) {
          throw new Error(
            `❌ Worker ${workerCtx.workerIndex}: Auth state has origin but no localStorage data!`
          );
        }

        const hasAuthToken = origin.localStorage.some(
          (item: { name?: string }) =>
            item.name && item.name.includes('sb-') && item.name.includes('auth-token')
        );

        if (!hasAuthToken) {
          throw new Error(
            `❌ Worker ${workerCtx.workerIndex}: No Supabase auth token found in localStorage!`
          );
        }
      }

      const context = await browser.newContext({ storageState: storageStatePath });
      await use(context);
      await context.close();
    },
    { scope: 'worker' },
  ],

  // Override the default context to use our worker-scoped context with auth
  context: async ({ workerBrowserContext }, use) => {
    await use(workerBrowserContext);
  },

  // Test-scoped worker context
  workerContext: async ({ workerCtx }, use) => {
    await use(workerCtx);
  },

  // Database fixture scoped to worker
  db: async ({ workerCtx }, use) => {
    const dbFixture = createWorkerDbFixture(workerCtx);
    await dbFixture.resetDatabase();
    await dbFixture.ensureTestUser();
    await use(dbFixture);
  },

  // Auth fixture scoped to worker
  auth: async ({ workerCtx }, use) => {
    const authFixture = createWorkerAuthFixture(workerCtx);
    await use(authFixture);
  },

  // Page Objects
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  managePage: async ({ page }, use) => {
    await use(new ManagePage(page));
  },

  quickUpdatePage: async ({ page }, use) => {
    await use(new QuickUpdatePage(page));
  },

  // Visual test helpers
  visual: async ({}, use) => {
    await use({
      getDynamicMasks,
      waitForStableUI,
      setTheme,
      takeScreenshot: takeScreenshotWithMasks,
    });
  },
});

export { expect };

// Export standalone helper functions for use in tests that don't use visualTest fixture
export { waitForStableUI, setTheme };

