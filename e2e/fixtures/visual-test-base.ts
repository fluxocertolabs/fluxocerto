/**
 * Visual Test Base Fixture
 * Extended Playwright test with helpers for visual regression testing
 * Based on test-base.ts but adds visual testing utilities
 *
 * Uses a fixed date (2025-01-15) for deterministic screenshots.
 * All test data and chart projections will be consistent across runs.
 */

import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';
import { createWorkerDbFixture, type WorkerDatabaseFixture } from './db';
import { AuthFixture, createWorkerAuthFixture } from './auth';
import { getWorkerContext, type IWorkerContext } from './worker-context';
import { LoginPage } from '../pages/login-page';
import { DashboardPage } from '../pages/dashboard-page';
import { ManagePage } from '../pages/manage-page';
import { QuickUpdatePage } from '../pages/quick-update-page';
import { existsSync } from 'fs';

/**
 * Fixed date for visual tests - ensures deterministic screenshots
 * Using January 15, 2025 at noon to avoid timezone edge cases
 */
export const VISUAL_TEST_FIXED_DATE = new Date('2025-01-15T12:00:00');

/**
 * Theme modes supported by the app
 */
type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Visual test helper utilities
 */
export interface VisualTestHelpers {
  /**
   * Wait for the UI to stabilize (animations complete, data loaded)
   */
  waitForStableUI(page: Page): Promise<void>;

  /**
   * Set the theme mode (call AFTER navigation)
   */
  setTheme(page: Page, theme: ThemeMode): Promise<void>;

  /**
   * Take a screenshot (no masking - all data is deterministic)
   */
  takeScreenshot(page: Page, name: string, options?: { fullPage?: boolean }): Promise<void>;
}

/**
 * Custom test fixtures type for visual tests
 */
type VisualTestFixtures = {
  workerContext: IWorkerContext;
  db: WorkerDatabaseFixture;
  auth: AuthFixture;
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  managePage: ManagePage;
  quickUpdatePage: QuickUpdatePage;
  visual: VisualTestHelpers;
};

/**
 * Worker-scoped fixtures
 */
type WorkerFixtures = {
  workerCtx: IWorkerContext;
  workerBrowserContext: BrowserContext;
};

/**
 * Disable all CSS animations for stable screenshots
 */
async function disableAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
      .animate-pulse {
        animation: none !important;
      }
    `,
  });
}

/**
 * Wait for UI to stabilize before taking screenshots
 */
export async function waitForStableUI(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await disableAnimations(page);
  await page.waitForTimeout(500);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}

/**
 * Set the theme mode (call AFTER navigation)
 */
export async function setTheme(page: Page, theme: ThemeMode): Promise<void> {
  const resolvedTheme = theme === 'system' ? 'light' : theme;

  await page.evaluate(
    ({ theme, resolvedTheme }) => {
      window.localStorage.setItem(
        'family-finance-theme',
        JSON.stringify({
          state: { theme, resolvedTheme, isLoaded: true },
          version: 0,
        })
      );
      window.dispatchEvent(new StorageEvent('storage', { key: 'family-finance-theme' }));
    },
    { theme, resolvedTheme }
  );

  // Wait for theme class to be applied
  const expectedClass = resolvedTheme === 'dark' ? 'dark' : '';
  await page
    .waitForFunction(
      (expected) => {
        const html = document.documentElement;
        return expected === 'dark' ? html.classList.contains('dark') : !html.classList.contains('dark');
      },
      expectedClass,
      { timeout: 5000 }
    )
    .catch(() => {
      // Theme might already be set correctly, continue
    });

  await page.waitForTimeout(100);
}

/**
 * Take a screenshot without masking (all data is deterministic with fixed date)
 */
async function takeScreenshot(
  page: Page,
  name: string,
  options?: { fullPage?: boolean }
): Promise<void> {
  await expect(page).toHaveScreenshot(name, {
    fullPage: options?.fullPage ?? false,
  });
}

/**
 * Extended test with visual testing fixtures
 * Uses the same auth pattern as test-base.ts
 * Freezes time to VISUAL_TEST_FIXED_DATE for deterministic screenshots
 */
export const visualTest = base.extend<VisualTestFixtures, WorkerFixtures>({
  // Worker-scoped context - same as test-base.ts
  workerCtx: [
    async ({}, use, workerInfo) => {
      const context = getWorkerContext(workerInfo.workerIndex);
      await use(context);
    },
    { scope: 'worker' },
  ],

  // Worker-scoped browser context with auth state - same as test-base.ts
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

      console.log(
        `✓ Worker ${workerCtx.workerIndex} auth state validated: ${authState.origins[0].localStorage.length} localStorage items`
      );

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

  // Override page to install clock mock before any navigation
  page: async ({ context }, use) => {
    const page = await context.newPage();

    // Install clock mock with fixed date for deterministic visual tests
    await page.clock.install({ time: VISUAL_TEST_FIXED_DATE });

    await use(page);
    await page.close();
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
      waitForStableUI,
      setTheme,
      takeScreenshot,
    });
  },
});

export { expect };
