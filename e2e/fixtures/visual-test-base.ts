/**
 * Visual Test Base Fixture
 * Extended Playwright test with helpers for visual regression testing
 * Based on test-base.ts but adds visual testing utilities
 *
 * Uses a fixed date (2025-01-15) for deterministic screenshots.
 * All test data and chart projections will be consistent across runs.
 *
 * ISOLATION STRATEGY:
 * - Each worker has its own household for complete data isolation via RLS
 * - Worker-specific elements (like household name in header) are masked in screenshots
 * - This allows parallel execution while maintaining deterministic visual comparisons
 */

import { test as base, expect, type Page, type BrowserContext, type Locator } from '@playwright/test';
import { waitForNetworkSettled } from '../utils/wait-helpers';
import { createWorkerDbFixture, type WorkerDatabaseFixture } from './db';
import { AuthFixture, createWorkerAuthFixture } from './auth';
import { getWorkerContext, type IWorkerContext } from './worker-context';
import { LoginPage } from '../pages/login-page';
import { DashboardPage } from '../pages/dashboard-page';
import { ManagePage } from '../pages/manage-page';
import { QuickUpdatePage } from '../pages/quick-update-page';
import { HistoryPage } from '../pages/history-page';
import { SnapshotDetailPage } from '../pages/snapshot-detail-page';
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
   * Take a screenshot with worker-specific elements masked for consistency.
   * Masks: household badge in header, worker-prefixed data names
   */
  takeScreenshot(page: Page, name: string, options?: { fullPage?: boolean; mask?: Locator[] }): Promise<void>;

  /**
   * Get locators for elements that should be masked in screenshots.
   * These are worker-specific elements that would differ between parallel workers.
   */
  getWorkerSpecificMasks(page: Page): Locator[];
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
  historyPage: HistoryPage;
  snapshotDetailPage: SnapshotDetailPage;
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
export async function disableAnimations(page: Page): Promise<void> {
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
 * Uses multiple stability checks to ensure consistent screenshots in parallel execution
 */
export async function waitForStableUI(page: Page): Promise<void> {
  // Wait for network to settle (with timeout since Supabase realtime keeps connections open)
  await Promise.race([
    page.waitForLoadState('networkidle'),
    page.waitForTimeout(5000), // Max 5 seconds
  ]);
  
  // Disable all CSS animations and transitions
  await disableAnimations(page);
  
  // Wait for initial render to complete
  await page.waitForTimeout(500);
  
  // Wait for web fonts to load (prevents font-swap flicker)
  await page.evaluate(() => document.fonts.ready);
  
  // Wait for any pending React state updates to flush
  await page.waitForTimeout(500);
  
  // Final stability check - wait for no DOM mutations
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      let timeout: ReturnType<typeof setTimeout>;
      const observer = new MutationObserver(() => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          observer.disconnect();
          resolve();
        }, 200);
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
      });
      // If no mutations occur within 300ms, consider stable
      timeout = setTimeout(() => {
        observer.disconnect();
        resolve();
      }, 300);
    });
  });
}

/**
 * Set the theme mode (call AFTER navigation)
 * 
 * This function directly manipulates localStorage and the DOM to set the theme.
 * It does NOT reload the page to avoid disrupting the current page state.
 */
export async function setTheme(page: Page, theme: ThemeMode): Promise<void> {
  const resolvedTheme = theme === 'system' ? 'light' : theme;

  // Set localStorage and apply theme class directly to DOM
  await page.evaluate(
    ({ theme, resolvedTheme }) => {
      // Update localStorage for Zustand persistence
      window.localStorage.setItem(
        'fluxo-certo-theme',
        JSON.stringify({
          state: { theme, resolvedTheme, isLoaded: true },
          version: 0,
        })
      );
      
      // Directly apply the theme class to the DOM
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(resolvedTheme);
    },
    { theme, resolvedTheme }
  );

  // Wait for the theme class to be applied
  await page
    .waitForFunction(
      (expected) => {
        const html = document.documentElement;
        return html.classList.contains(expected);
      },
      resolvedTheme,
      { timeout: 5000 }
    )
    .catch(async () => {
      // If theme not applied, try applying directly again
      await page.evaluate((themeClass) => {
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(themeClass);
      }, resolvedTheme);
    });

  // Small wait for any CSS transitions
  await page.waitForTimeout(100);
}

/**
 * Get locators for elements that should be masked in screenshots.
 * These are worker-specific elements that would differ between parallel workers:
 * - Household badge in header (shows "Test Worker N")
 */
function getWorkerSpecificMasks(page: Page): Locator[] {
  return [
    // Household badge in header - contains worker-specific household name
    page.locator('[data-testid="household-badge"]'),
  ];
}

/**
 * Take a screenshot with worker-specific elements automatically masked.
 * This ensures screenshots are consistent across parallel workers.
 */
async function takeScreenshot(
  page: Page,
  name: string,
  options?: { fullPage?: boolean; mask?: Locator[] }
): Promise<void> {
  // Combine default worker-specific masks with any additional masks provided
  const defaultMasks = getWorkerSpecificMasks(page);
  const allMasks = [...defaultMasks, ...(options?.mask ?? [])];

  await expect(page).toHaveScreenshot(name, {
    fullPage: options?.fullPage ?? false,
    mask: allMasks,
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
  // Note: Clock mock is installed AFTER page creation to avoid conflicts with mobile emulation
  page: async ({ context }, use) => {
    const page = await context.newPage();

    // Install clock mock with fixed date for deterministic visual tests
    // Use pauseAt instead of install to avoid interfering with page load timers
    await page.clock.setFixedTime(VISUAL_TEST_FIXED_DATE);

    await use(page);
    await page.close();
  },

  // Test-scoped worker context
  workerContext: async ({ workerCtx }, use) => {
    await use(workerCtx);
  },

  // Database fixture scoped to worker - resets once per worker, not per test
  // Tests that need a fresh DB can call db.resetDatabase() explicitly
  db: [
    async ({ workerCtx }, use) => {
      const dbFixture = createWorkerDbFixture(workerCtx);
      console.log(`[Fixture] Setting up DB for visual worker ${workerCtx.workerIndex}...`);
      await dbFixture.resetDatabase();
      await dbFixture.ensureTestUser();
      console.log(`[Fixture] DB setup complete for visual worker ${workerCtx.workerIndex}`);
      await use(dbFixture);
    },
    { scope: 'worker' },
  ],

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

  historyPage: async ({ page }, use) => {
    await use(new HistoryPage(page));
  },

  snapshotDetailPage: async ({ page }, use) => {
    await use(new SnapshotDetailPage(page));
  },

  // Visual test helpers
  visual: async ({}, use) => {
    await use({
      waitForStableUI,
      setTheme,
      takeScreenshot,
      getWorkerSpecificMasks,
    });
  },
});

export { expect };
