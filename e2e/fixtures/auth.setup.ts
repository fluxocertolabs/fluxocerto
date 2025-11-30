/**
 * Authentication setup project
 * Runs once before all tests to authenticate and save session state
 * Updated for per-worker isolation in parallel test execution using data prefixing
 */

import { test as setup } from '@playwright/test';
import { AuthFixture } from './auth';
import { ensureTestUser, resetDatabase } from './db';
import { getWorkerContext, MAX_WORKERS, ALL_WORKERS_PATTERN } from './worker-context';
import { existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Determine the number of workers to use
 * MUST match the logic in playwright.config.ts to ensure all workers are authenticated
 * In CI: Uses all available CPU cores (dedicated runner)
 * Locally: Uses half of available CPU cores (don't overwhelm dev machine)
 * Always capped at MAX_WORKERS
 */
function getWorkerCount(): number {
  const cpuCount = os.cpus().length;
  const isCI = !!process.env.CI;
  
  // In CI, use all cores since runner is dedicated to tests
  // Locally, use half to leave resources for other apps
  const workers = isCI ? cpuCount : Math.floor(cpuCount / 2);
  
  return Math.min(Math.max(1, workers), MAX_WORKERS);
}

/**
 * Global setup: Clean up old test data and authenticate all workers
 * This runs once before any tests start
 */
setup('setup-parallel-workers', async ({ page, browser }) => {
  const workerCount = getWorkerCount();
  console.log(`Setting up ${workerCount} parallel workers...`);

  // Ensure .auth directory exists
  const authDir = resolve(__dirname, '../.auth');
  if (!existsSync(authDir)) {
    mkdirSync(authDir, { recursive: true });
  }

  // Clean up ALL worker-prefixed data from previous test runs
  // This ensures a clean slate for all workers
  console.log('Cleaning up previous test data...');
  await resetDatabase(); // This cleans all [W*] prefixed data

  // Setup each worker
  for (let i = 0; i < workerCount; i++) {
    const workerContext = getWorkerContext(i);
    console.log(`Setting up worker ${i}: ${workerContext.email}`);

    // Ensure test user exists in profiles table
    await ensureTestUser(workerContext.email, i);

    // Create auth fixture for this worker
    const auth = new AuthFixture({
      testEmail: workerContext.email,
      storageStatePath: workerContext.authStatePath,
      workerIndex: i,
    });

    // Create a new context for authentication (to avoid session conflicts)
    const context = await browser.newContext();
    const authPage = await context.newPage();

    try {
      // Perform authentication for this worker
      await auth.authenticate(authPage);
      console.log(`Worker ${i} authenticated successfully`);
    } catch (error) {
      console.error(`Failed to authenticate worker ${i}:`, error);
      throw error;
    } finally {
      await context.close();
    }

    // Small delay between authentications to avoid rate limiting
    if (i < workerCount - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Verify all auth state files were created
  console.log('Verifying auth state files...');
  for (let i = 0; i < workerCount; i++) {
    const workerContext = getWorkerContext(i);
    const authFilePath = workerContext.authStatePath;
    if (!existsSync(authFilePath)) {
      throw new Error(`Auth state file not found for worker ${i}: ${authFilePath}`);
    }
    console.log(`✓ Worker ${i} auth state verified: ${authFilePath}`);
  }

  // Small delay to ensure all files are fully flushed to disk
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log('All workers setup complete');
});
