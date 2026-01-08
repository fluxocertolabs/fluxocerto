/**
 * Extended Playwright test with custom fixtures
 * Provides db, auth, and page object fixtures for all tests
 * Updated for per-worker isolation using group-based data separation
 *
 * Each worker gets its own group, ensuring complete data isolation via RLS.
 * This eliminates race conditions and data conflicts between parallel workers.
 */

import { test as base, expect, type BrowserContext } from '@playwright/test';
import { createWorkerDbFixture, type WorkerDatabaseFixture } from './db';
import { AuthFixture, createWorkerAuthFixture } from './auth';
import { getWorkerContext, type IWorkerContext } from './worker-context';
import { LoginPage } from '../pages/login-page';
import { DashboardPage } from '../pages/dashboard-page';
import { ManagePage } from '../pages/manage-page';
import { QuickUpdatePage } from '../pages/quick-update-page';
import { HistoryPage } from '../pages/history-page';
import { SnapshotDetailPage } from '../pages/snapshot-detail-page';
import { executeSQL, getUserIdFromEmail } from '../utils/supabase-admin';
import { existsSync } from 'fs';

/**
 * Custom test fixtures type
 */
type TestFixtures = {
  /** Worker context with isolation information */
  workerContext: IWorkerContext;
  /**
   * Internal auto fixture: keep worker-user UI unblocked across the suite.
   *
   * Some specs intentionally mutate onboarding/tour state (e.g. recovery/self-heal flows).
   * Because our DB/auth is worker-scoped, those mutations can leak into subsequent tests
   * executed by the same worker and cause overlays to block clicks.
   */
  _workerUiState: void;
  /** Database fixture scoped to worker (uses group-based isolation) */
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
  /** History page object */
  historyPage: HistoryPage;
  /** Snapshot detail page object */
  snapshotDetailPage: SnapshotDetailPage;
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
        throw new Error(`❌ Auth state file not found for worker ${workerCtx.workerIndex}: ${storageStatePath}. Run setup first.`);
      }

      // Read and validate the auth state file
      try {
        const fs = await import('fs/promises');
        const authStateContent = await fs.readFile(storageStatePath, 'utf-8');
        const authState = JSON.parse(authStateContent);
        
        const hasCookies = authState.cookies && authState.cookies.length > 0;
        const hasOrigins = authState.origins && authState.origins.length > 0;
        
        // Validate that we have SOME auth data
        if (!hasCookies && !hasOrigins) {
          throw new Error(`❌ Worker ${workerCtx.workerIndex}: Auth state file is empty! No cookies or origins found.`);
        }
        
        // For Supabase (localStorage-based auth), we need at least one origin with localStorage data
        if (hasOrigins) {
          const origin = authState.origins[0];
          const hasLocalStorage = origin.localStorage && origin.localStorage.length > 0;
          
          if (!hasLocalStorage) {
            throw new Error(`❌ Worker ${workerCtx.workerIndex}: Auth state has origin but no localStorage data!`);
          }
          
          // Check for Supabase auth token specifically
          const hasAuthToken = origin.localStorage.some((item: any) => 
            item.name && (item.name.includes('sb-') && item.name.includes('auth-token'))
          );
          
          if (!hasAuthToken) {
            throw new Error(`❌ Worker ${workerCtx.workerIndex}: No Supabase auth token found in localStorage!`);
          }
        }
        
        console.log(`✓ Worker ${workerCtx.workerIndex} auth state validated: ${authState.origins[0].localStorage.length} localStorage items`);
      } catch (error) {
        // If validation fails, throw to prevent tests from running with invalid auth
        if (error instanceof Error && error.message.includes('Worker')) {
          throw error; // Re-throw our custom errors
        }
        throw new Error(`❌ Worker ${workerCtx.workerIndex}: Failed to validate auth state: ${error}`);
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

  // Test-scoped worker context (just passes through the worker-scoped one)
  workerContext: async ({ workerCtx }, use) => {
    await use(workerCtx);
  },

  // Database fixture scoped to worker (uses group-based isolation)
  // Resets once per worker, not per test - tests can call db.resetDatabase() if they need a clean slate
  db: [
    async ({ workerCtx }, use) => {
      const dbFixture = createWorkerDbFixture(workerCtx);

      console.log(`[Fixture] Setting up DB for worker ${workerCtx.workerIndex}...`);
      // Reset database once per worker (clears only this worker's group data)
      // Tests that need a fresh DB can call db.resetDatabase() explicitly
      await dbFixture.resetDatabase();

      // Ensure test user exists in worker's group
      await dbFixture.ensureTestUser();

      // Ensure onboarding wizard and page tours don't block the UI for worker users.
      // Dedicated onboarding/tour specs use fresh emails and don't rely on this fixture.
      const userId = await getUserIdFromEmail(workerCtx.email);
      const groupId = await dbFixture.getWorkerGroupId();

      await executeSQL(`
        INSERT INTO public.onboarding_states (user_id, group_id, status, current_step, auto_shown_at, completed_at)
        VALUES ('${userId}', '${groupId}', 'completed', 'done', now(), now())
        ON CONFLICT (user_id, group_id) DO UPDATE
        SET status = EXCLUDED.status,
            current_step = EXCLUDED.current_step,
            auto_shown_at = EXCLUDED.auto_shown_at,
            completed_at = EXCLUDED.completed_at
      `);

      await executeSQL(`
        INSERT INTO public.tour_states (user_id, tour_key, status, version, dismissed_at, completed_at)
        VALUES
          ('${userId}', 'dashboard', 'dismissed', 1, now(), NULL),
          ('${userId}', 'manage', 'dismissed', 1, now(), NULL),
          ('${userId}', 'history', 'dismissed', 1, now(), NULL)
        ON CONFLICT (user_id, tour_key) DO UPDATE
        SET status = EXCLUDED.status,
            version = EXCLUDED.version,
            dismissed_at = EXCLUDED.dismissed_at,
            completed_at = NULL
      `);

      console.log(`[Fixture] DB setup complete for worker ${workerCtx.workerIndex}`);

      await use(dbFixture);
    },
    { scope: 'worker' },
  ],

  // Auto-run per test to ensure onboarding/tour overlays never block interactions
  _workerUiState: [
    async ({ workerCtx, db }, use) => {
      const userId = await getUserIdFromEmail(workerCtx.email);
      const groupId = await db.getWorkerGroupId();

      await executeSQL(`
        INSERT INTO public.onboarding_states (user_id, group_id, status, current_step, auto_shown_at, completed_at)
        VALUES ('${userId}', '${groupId}', 'completed', 'done', now(), now())
        ON CONFLICT (user_id, group_id) DO UPDATE
        SET status = EXCLUDED.status,
            current_step = EXCLUDED.current_step,
            auto_shown_at = EXCLUDED.auto_shown_at,
            completed_at = EXCLUDED.completed_at
      `);

      await executeSQL(`
        INSERT INTO public.tour_states (user_id, tour_key, status, version, dismissed_at, completed_at)
        VALUES
          ('${userId}', 'dashboard', 'dismissed', 1, now(), NULL),
          ('${userId}', 'manage', 'dismissed', 1, now(), NULL),
          ('${userId}', 'history', 'dismissed', 1, now(), NULL)
        ON CONFLICT (user_id, tour_key) DO UPDATE
        SET status = EXCLUDED.status,
            version = EXCLUDED.version,
            dismissed_at = EXCLUDED.dismissed_at,
            completed_at = NULL
      `);

      await use();
    },
    { auto: true },
  ],

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

  historyPage: async ({ page }, use) => {
    const historyPage = new HistoryPage(page);
    await use(historyPage);
  },

  snapshotDetailPage: async ({ page }, use) => {
    const snapshotDetailPage = new SnapshotDetailPage(page);
    await use(snapshotDetailPage);
  },
});

export { expect };
