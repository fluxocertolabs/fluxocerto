/**
 * Authentication setup project
 * Runs once before all tests to authenticate and save session state
 * Updated for per-worker isolation using group-based data separation
 */

import { test as setup } from '@playwright/test';
import { AuthFixture } from './auth';
import {
  ensureTestUser,
  resetDatabase,
  getOrCreateWorkerGroup,
  resetGroupData,
  clearGroupCache,
} from './db';
import { getWorkerContext } from './worker-context';
import { getWorkerCount } from './worker-count';
import { executeSQL, getUserIdFromEmail } from '../utils/supabase-admin';
import { existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ALL_PROJECTS_TO_SETUP = ['chromium', 'chromium-mobile', 'visual', 'visual-mobile'] as const;
type ProjectToSetup = (typeof ALL_PROJECTS_TO_SETUP)[number];

function getProjectsToSetup(): readonly ProjectToSetup[] {
  const raw = process.env.PW_SETUP_PROJECTS;
  if (!raw) return ALL_PROJECTS_TO_SETUP;

  const requested = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const valid = requested.filter((p): p is ProjectToSetup =>
    (ALL_PROJECTS_TO_SETUP as readonly string[]).includes(p)
  );

  if (valid.length === 0) {
    throw new Error(
      `PW_SETUP_PROJECTS must include at least one of: ${ALL_PROJECTS_TO_SETUP.join(', ')}`
    );
  }

  return valid;
}

/**
 * Global setup: Create worker groups, clean up old test data, and authenticate all workers.
 * This runs once before any tests start.
 *
 * Each worker gets its own group for complete data isolation via RLS.
 * This eliminates race conditions and data conflicts between parallel workers.
 */
setup('setup-parallel-workers', async ({ page: _page, browser }) => {
  const workerCount = getWorkerCount();
  console.log(`Setting up ${workerCount} parallel workers with group isolation...`);

  // This setup test does O(workerCount) real work (group provisioning + full auth flow per worker),
  // so its runtime scales with the number of workers.
  // Keep the default 45s for small worker counts, but allow more time for high-core dev machines.
  const projectsToSetup = getProjectsToSetup();
  const perWorkerPerProjectMs = 25000;
  setup.setTimeout(Math.max(45000, workerCount * projectsToSetup.length * perWorkerPerProjectMs));

  // Clear any cached group IDs from previous runs
  clearGroupCache();

  // Ensure .auth directory exists
  const authDir = resolve(__dirname, '../.auth');
  if (!existsSync(authDir)) {
    mkdirSync(authDir, { recursive: true });
  }

  // Phase 1: Create groups and clean up data for each worker
  console.log('Phase 1: Creating worker groups and cleaning up data...');
  const groupIdsByProject = new Map<string, string[]>();

  for (const projectName of projectsToSetup) {
    const groupIds: string[] = [];
    groupIdsByProject.set(projectName, groupIds);

    for (let i = 0; i < workerCount; i++) {
      const workerContext = getWorkerContext(i, projectName);
      console.log(`  Creating group for ${projectName} worker ${i}: "${workerContext.groupName}"`);

      // Create or get the worker's group
      const groupId = await getOrCreateWorkerGroup(i, workerContext.groupName);
      groupIds.push(groupId);

      // Clean up any existing data in this group
      await resetGroupData(groupId);
      console.log(`  ✓ ${projectName} worker ${i} group ready: ${groupId}`);
    }
  }

  // Also clean up legacy prefixed data from previous test implementations
  console.log('  Cleaning up legacy prefixed data...');
  await resetDatabase();

  // Phase 2: Create test users and authenticate
  console.log('Phase 2: Creating test users and authenticating...');

  for (const projectName of projectsToSetup) {
    const groupIds = groupIdsByProject.get(projectName);
    if (!groupIds || groupIds.length !== workerCount) {
      throw new Error(`Missing group IDs for project ${projectName}`);
    }

    for (let i = 0; i < workerCount; i++) {
      const workerContext = getWorkerContext(i, projectName);
      const groupId = groupIds[i];
      console.log(`  Setting up ${projectName} worker ${i}: ${workerContext.email}`);

      // Ensure test user exists in profiles table with worker's group
      await ensureTestUser(workerContext.email, i, groupId);

      // Create auth fixture for this worker
      const auth = new AuthFixture({
        testEmail: workerContext.email,
        storageStatePath: workerContext.authStatePath,
        workerIndex: i,
      });

      // Create a new context for authentication (to avoid session conflicts)
      const context = await browser.newContext();
      const authPage = await context.newPage();

      let authenticated = false;
      try {
        // Perform authentication for this worker
        await auth.authenticate(authPage);
        authenticated = true;
        console.log(`  ✓ ${projectName} worker ${i} authenticated successfully`);
      } catch (error) {
        console.error(`  ✗ Failed to authenticate ${projectName} worker ${i}:`, error);
        throw error;
      } finally {
        await context.close();
      }

      if (!authenticated) {
        continue;
      }

      // IMPORTANT: Only mutate server-side onboarding/tour state AFTER closing the browser context.
      // This prevents the client (still booting post-login) from racing and overwriting these values.
      const userId = await getUserIdFromEmail(workerContext.email);

      // Mark onboarding as completed for the worker user so the wizard doesn't
      // aria-hide the app and block the rest of the E2E suite.
      //
      // We use direct SQL here (instead of PostgREST) to keep setup deterministic and
      // avoid any intermittent admin API issues under parallel load.
      await executeSQL(`
      INSERT INTO public.onboarding_states (user_id, group_id, status, current_step, auto_shown_at, completed_at)
      VALUES ('${userId}', '${groupId}', 'completed', 'done', now(), now())
      ON CONFLICT (user_id, group_id) DO UPDATE
      SET status = EXCLUDED.status,
          current_step = EXCLUDED.current_step,
          auto_shown_at = EXCLUDED.auto_shown_at,
          completed_at = EXCLUDED.completed_at
    `);

      // Dismiss page tours for the worker user so tour overlays don't block UI interactions.
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
    }
  }

  // Phase 3: Verify all auth state files were created
  console.log('Phase 3: Verifying auth state files...');
  for (const projectName of projectsToSetup) {
    for (let i = 0; i < workerCount; i++) {
      const workerContext = getWorkerContext(i, projectName);
      const authFilePath = workerContext.authStatePath;
      if (!existsSync(authFilePath)) {
        throw new Error(`Auth state file not found for ${projectName} worker ${i}: ${authFilePath}`);
      }
      console.log(`  ✓ ${projectName} worker ${i} auth state verified: ${authFilePath}`);
    }
  }

  console.log(`✓ All ${workerCount} workers setup complete with group isolation`);
});
