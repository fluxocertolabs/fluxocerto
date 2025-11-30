/**
 * Extended Playwright test with custom fixtures
 * Provides db, auth, and page object fixtures for all tests
 * Updated for per-worker isolation using data prefixing in parallel test execution
 */

import { test as base, expect, type BrowserContext } from '@playwright/test';
import { createWorkerDbFixture, type WorkerDatabaseFixture } from './db';
import { AuthFixture, createWorkerAuthFixture } from './auth';
import { getWorkerContext, type IWorkerContext } from './worker-context';
import { LoginPage } from '../pages/login-page';
import { DashboardPage } from '../pages/dashboard-page';
import { ManagePage } from '../pages/manage-page';
import { QuickUpdatePage } from '../pages/quick-update-page';
import { existsSync } from 'fs';

/**
 * Custom test fixtures type
 */
type TestFixtures = {
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
};

/**
 * Worker-scoped fixtures (shared across all tests in a worker)
 */
type WorkerFixtures = {
  /** Worker context - created once per worker */
  workerCtx: IWorkerContext;
  /** Worker-scoped browser context with auth state loaded */
  workerBrowserContext: BrowserContext;
};

/**
 * Extended test with custom fixtures for parallel execution
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
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
      // Load auth state if it exists
      const storageStatePath = workerCtx.authStatePath;
      const hasAuthState = existsSync(storageStatePath);

      if (!hasAuthState) {
        console.error(`❌ Auth state file not found for worker ${workerCtx.workerIndex}: ${storageStatePath}`);
      } else {
        // Read and validate the auth state file
        try {
          const fs = await import('fs/promises');
          const authStateContent = await fs.readFile(storageStatePath, 'utf-8');
          const authState = JSON.parse(authStateContent);
          
          const hasCookies = authState.cookies && authState.cookies.length > 0;
          const hasOrigins = authState.origins && authState.origins.length > 0;
          
          console.log(`Worker ${workerCtx.workerIndex} auth state: ${hasCookies ? authState.cookies.length : 0} cookies, ${hasOrigins ? authState.origins.length : 0} origins`);
          
          if (!hasCookies && !hasOrigins) {
            console.error(`⚠️  Worker ${workerCtx.workerIndex}: Auth state file exists but appears empty!`);
          }
        } catch (error) {
          console.error(`⚠️  Worker ${workerCtx.workerIndex}: Failed to read auth state file:`, error);
        }
      }

      const context = await browser.newContext(
        hasAuthState ? { storageState: storageStatePath } : {}
      );

      await use(context);

      await context.close();
    },
    { scope: 'worker' },
  ],

  // Override the default context to use our worker-scoped context with auth
  context: async ({ workerBrowserContext }, use) => {
    await use(workerBrowserContext);
  },

  // Test-scoped worker context (just passes through the worker-scoped one)
  workerContext: async ({ workerCtx }, use) => {
    await use(workerCtx);
  },

  // Database fixture scoped to worker (uses data prefixing)
  db: async ({ workerCtx }, use) => {
    const dbFixture = createWorkerDbFixture(workerCtx);

    // Reset database (clears only this worker's prefixed data) before each test
    await dbFixture.resetDatabase();

    // Ensure test user exists
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
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  managePage: async ({ page }, use) => {
    const managePage = new ManagePage(page);
    await use(managePage);
  },

  quickUpdatePage: async ({ page }, use) => {
    const quickUpdatePage = new QuickUpdatePage(page);
    await use(quickUpdatePage);
  },
});

export { expect };
