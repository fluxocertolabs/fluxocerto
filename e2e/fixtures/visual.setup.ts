/**
 * Visual test setup project
 * Simplified setup that only authenticates a single worker for visual regression tests
 * This is faster than the full setup which authenticates all workers
 */

import { test as setup } from '@playwright/test';
import { AuthFixture } from './auth';
import { ensureTestUser, resetDatabase } from './db';
import { getWorkerContext } from './worker-context';
import { existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Visual test setup: Clean up test data and authenticate a single worker
 * This runs once before visual tests start
 */
setup('setup-visual-worker', async ({ browser }) => {
  console.log('Setting up visual test worker...');

  // Ensure .auth directory exists
  const authDir = resolve(__dirname, '../.auth');
  if (!existsSync(authDir)) {
    mkdirSync(authDir, { recursive: true });
  }

  // Clean up worker 0 prefixed data from previous test runs
  console.log('Cleaning up previous test data for visual tests...');
  await resetDatabase(0); // Clean only worker 0 data

  // Setup worker 0 only (visual tests use single worker)
  const workerIndex = 0;
  const workerContext = getWorkerContext(workerIndex);
  console.log(`Setting up visual worker: ${workerContext.email}`);

  // Ensure test user exists in profiles table
  await ensureTestUser(workerContext.email, workerIndex);

  // Create auth fixture for this worker
  const auth = new AuthFixture({
    testEmail: workerContext.email,
    storageStatePath: workerContext.authStatePath,
    workerIndex,
  });

  // Create a new context for authentication
  const context = await browser.newContext();
  const authPage = await context.newPage();

  try {
    // Perform authentication for this worker
    await auth.authenticate(authPage);
    console.log('Visual worker authenticated successfully');
  } catch (error) {
    console.error('Failed to authenticate visual worker:', error);
    throw error;
  } finally {
    await context.close();
  }

  // Verify auth state file was created
  const authFilePath = workerContext.authStatePath;
  if (!existsSync(authFilePath)) {
    throw new Error(`Auth state file not found: ${authFilePath}`);
  }
  console.log(`✓ Visual worker auth state verified: ${authFilePath}`);

  console.log('Visual test setup complete');
});

