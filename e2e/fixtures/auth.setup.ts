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
import { existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Global setup: Create worker groups, clean up old test data, and authenticate all workers.
 * This runs once before any tests start.
 *
 * Each worker gets its own group for complete data isolation via RLS.
 * This eliminates race conditions and data conflicts between parallel workers.
 */
setup('setup-parallel-workers', async ({ page, browser }) => {
  const workerCount = getWorkerCount();
  console.log(`Setting up ${workerCount} parallel workers with group isolation...`);

  // Clear any cached group IDs from previous runs
  clearGroupCache();

  // Ensure .auth directory exists
  const authDir = resolve(__dirname, '../.auth');
  if (!existsSync(authDir)) {
    mkdirSync(authDir, { recursive: true });
  }

  // Phase 1: Create groups and clean up data for each worker
  console.log('Phase 1: Creating worker groups and cleaning up data...');
  const groupIds: string[] = [];

  for (let i = 0; i < workerCount; i++) {
    const workerContext = getWorkerContext(i);
    console.log(`  Creating group for worker ${i}: "${workerContext.groupName}"`);

    // Create or get the worker's group
    const groupId = await getOrCreateWorkerGroup(i, workerContext.groupName);
    groupIds.push(groupId);

    // Clean up any existing data in this group
    await resetGroupData(groupId);
    console.log(`  ✓ Worker ${i} group ready: ${groupId}`);
  }

  // Also clean up legacy prefixed data from previous test implementations
  console.log('  Cleaning up legacy prefixed data...');
  await resetDatabase();

  // Phase 2: Create test users and authenticate
  console.log('Phase 2: Creating test users and authenticating...');

  for (let i = 0; i < workerCount; i++) {
    const workerContext = getWorkerContext(i);
    const groupId = groupIds[i];
    console.log(`  Setting up worker ${i}: ${workerContext.email}`);

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

  console.log(`✓ All ${workerCount} workers setup complete with group isolation`);
});
