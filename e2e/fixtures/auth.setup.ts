/**
 * Authentication setup project
 * Runs once before all tests to authenticate and save session state
 * Updated for per-worker isolation using household-based data separation
 */

import { test as setup } from '@playwright/test';
import { AuthFixture } from './auth';
import {
  ensureTestUser,
  resetDatabase,
  getOrCreateWorkerHousehold,
  resetHouseholdData,
  clearHouseholdCache,
} from './db';
import { getWorkerContext } from './worker-context';
import { getWorkerCount } from './worker-count';
import { existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Global setup: Create worker households, clean up old test data, and authenticate all workers.
 * This runs once before any tests start.
 *
 * Each worker gets its own household for complete data isolation via RLS.
 * This eliminates race conditions and data conflicts between parallel workers.
 */
setup('setup-parallel-workers', async ({ page, browser }) => {
  const workerCount = getWorkerCount();
  console.log(`Setting up ${workerCount} parallel workers with household isolation...`);

  // Clear any cached household IDs from previous runs
  clearHouseholdCache();

  // Ensure .auth directory exists
  const authDir = resolve(__dirname, '../.auth');
  if (!existsSync(authDir)) {
    mkdirSync(authDir, { recursive: true });
  }

  // Phase 1: Create households and clean up data for each worker
  console.log('Phase 1: Creating worker households and cleaning up data...');
  const householdIds: string[] = [];

  for (let i = 0; i < workerCount; i++) {
    const workerContext = getWorkerContext(i);
    console.log(`  Creating household for worker ${i}: "${workerContext.householdName}"`);

    // Create or get the worker's household
    const householdId = await getOrCreateWorkerHousehold(i, workerContext.householdName);
    householdIds.push(householdId);

    // Clean up any existing data in this household
    await resetHouseholdData(householdId);
    console.log(`  ✓ Worker ${i} household ready: ${householdId}`);
  }

  // Also clean up legacy prefixed data from previous test implementations
  console.log('  Cleaning up legacy prefixed data...');
  await resetDatabase();

  // Phase 2: Create test users and authenticate
  console.log('Phase 2: Creating test users and authenticating...');

  for (let i = 0; i < workerCount; i++) {
    const workerContext = getWorkerContext(i);
    const householdId = householdIds[i];
    console.log(`  Setting up worker ${i}: ${workerContext.email}`);

    // Ensure test user exists in profiles table with worker's household
    await ensureTestUser(workerContext.email, i, householdId);

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
      console.log(`  ✓ Worker ${i} authenticated successfully`);
    } catch (error) {
      console.error(`  ✗ Failed to authenticate worker ${i}:`, error);
      throw error;
    } finally {
      await context.close();
    }

    // Small delay between authentications to avoid rate limiting
    if (i < workerCount - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Phase 3: Verify all auth state files were created
  console.log('Phase 3: Verifying auth state files...');
  for (let i = 0; i < workerCount; i++) {
    const workerContext = getWorkerContext(i);
    const authFilePath = workerContext.authStatePath;
    if (!existsSync(authFilePath)) {
      throw new Error(`Auth state file not found for worker ${i}: ${authFilePath}`);
    }
    console.log(`  ✓ Worker ${i} auth state verified: ${authFilePath}`);
  }

  // Small delay to ensure all files are fully flushed to disk
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log(`✓ All ${workerCount} workers setup complete with household isolation`);
});
