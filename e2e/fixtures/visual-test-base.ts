/**
 * Visual Test Base Fixture
 * Extended Playwright test with helpers for visual regression testing
 * Based on test-base.ts but adds visual testing utilities
 */

import { test as base, expect, type Page, type Locator, type BrowserContext } from '@playwright/test';
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
   */
  getDynamicMasks(page: Page): Promise<Locator[]>;

  /**
   * Wait for the UI to stabilize (animations complete, data loaded)
   */
  waitForStableUI(page: Page): Promise<void>;

  /**
   * Set the theme mode (call AFTER navigation)
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
 * Get locators for elements that contain dynamic content
 */
async function getDynamicMasks(page: Page): Promise<Locator[]> {
  const masks: Locator[] = [];

  const addMaskIfExists = async (locator: Locator) => {
    const count = await locator.count().catch(() => 0);
    if (count > 0) {
      masks.push(locator);
    }
  };

  // Currency values
  await addMaskIfExists(page.locator('[data-testid*="balance"], [data-testid*="amount"]'));

  // Charts (data varies)
  await addMaskIfExists(page.locator('.recharts-wrapper'));

  // Worker-prefixed names [W{n}]
  await addMaskIfExists(page.locator('text=/\\[W\\d+\\]/'));

  // Timestamps and dates
  await addMaskIfExists(page.locator('[data-testid*="date"], [data-testid*="timestamp"]'));

  // Currency text R$ pattern
  await addMaskIfExists(page.locator('text=/R\\$\\s*[\\d.,]+/'));

  return masks;
}

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
 * Uses the same auth pattern as test-base.ts
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
