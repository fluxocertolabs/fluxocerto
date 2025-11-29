/**
 * Authentication setup project
 * Runs once before all tests to authenticate and save session state
 */

import { test as setup } from '@playwright/test';
import { AuthFixture } from './auth';
import { ensureTestUser, resetDatabase } from './db';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'e2e-test@example.com';

setup('authenticate', async ({ page }) => {
  const auth = new AuthFixture({ testEmail: TEST_EMAIL });

  // Ensure .auth directory exists
  const authDir = dirname(auth.storageStatePath);
  if (!existsSync(authDir)) {
    mkdirSync(authDir, { recursive: true });
  }

  // Reset database and ensure test user exists
  await resetDatabase();
  await ensureTestUser(TEST_EMAIL);

  // Perform authentication
  await auth.authenticate(page);
});

