import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import os from 'os';
import { MAX_WORKERS } from './fixtures/worker-context';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get Supabase keys from running instance
 * This ensures tests always have the correct keys without manual env setup
 */
function getSupabaseConfig() {
  try {
    const output = execSync('npx supabase status -o json', {
      cwd: resolve(__dirname, '..'),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const status = JSON.parse(output);
    return {
      url: status.API_URL || 'http://localhost:54321',
      anonKey: status.ANON_KEY,
      serviceRoleKey: status.SERVICE_ROLE_KEY,
      inbucketUrl: status.INBUCKET_URL || 'http://localhost:54324',
    };
  } catch {
    // Supabase not running - return defaults, tests will fail with clear error
    console.warn('⚠️  Supabase is not running. Start it with: pnpm db:start');
    return {
      url: 'http://localhost:54321',
      anonKey: '',
      serviceRoleKey: '',
      inbucketUrl: 'http://localhost:54324',
    };
  }
}

/**
 * Determine the number of workers based on CPU cores
 * In CI: Uses all available CPU cores (dedicated runner)
 * Locally: Uses half of available CPU cores (don't overwhelm dev machine)
 * Always capped at MAX_WORKERS
 * 
 * Note: Reduced to max 4 workers to minimize realtime event contention between parallel tests
 */
function getWorkerCount(): number {
  const cpuCount = os.cpus().length;
  const isCI = !!process.env.CI;
  
  // In CI, use all cores since runner is dedicated to tests
  // Locally, use half to leave resources for other apps
  const workers = isCI ? cpuCount : Math.floor(cpuCount / 2);
  
  // Cap at 2 workers to reduce flakiness from realtime event interference
  // This significantly reduces contention while maintaining parallel execution
  return Math.min(Math.max(1, workers), 2);
}

const supabase = getSupabaseConfig();
const workerCount = getWorkerCount();

// Set environment variables for test files
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || supabase.url;
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || supabase.anonKey;
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || supabase.serviceRoleKey;
process.env.INBUCKET_URL = process.env.INBUCKET_URL || supabase.inbucketUrl;
process.env.BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
process.env.VITE_DISABLE_THEME_SYNC = 'true';
// Note: TEST_USER_EMAIL is now per-worker, set dynamically in fixtures

// Extract port from BASE_URL for webServer configuration
const baseUrl = new URL(process.env.BASE_URL);
const port = baseUrl.port || '5173';


/**
 * Playwright configuration for E2E tests
 * Configured for parallel execution with per-worker schema isolation
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true, // Enable parallel execution - each worker has isolated schema
  forbidOnly: !!process.env.CI,
  retries: 3, // 3 automatic retries per test for parallel execution stability
  workers: workerCount, // Auto-detect based on CPU cores
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 45000, // 45s per test to handle parallel execution timing
  expect: {
    timeout: 10000, // 10s for assertions to handle data loading delays
  },

  use: {
    baseURL: process.env.BASE_URL,
    headless: true, // Always run headless (no visible browser)
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Setup project - runs first, creates schemas and authenticates all workers
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      testDir: resolve(__dirname, 'fixtures'),
    },
    // Auth tests - run WITHOUT storage state (unauthenticated)
    // These tests remain serial due to email rate limiting
    {
      name: 'auth-tests',
      testMatch: /auth\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // No storageState - start unauthenticated
      },
      dependencies: ['setup'],
      // Auth tests run serially to avoid rate limiting
      fullyParallel: false,
    },
    // Main tests - depend on setup, use per-worker authenticated storage state
    // Storage state is loaded dynamically per worker via the test fixture
    {
      name: 'chromium',
      testIgnore: /auth\.spec\.ts/, // Skip auth tests in this project
      use: {
        ...devices['Desktop Chrome'],
        // Note: Storage state is NOT set here because it needs to be per-worker
        // The test-base.ts fixture handles loading the correct auth state per worker
        // by using workerContext.authStatePath
      },
      dependencies: ['setup'],
    },
  ],

  // Web server configuration - starts the app before tests
  webServer: {
    command: `pnpm dev:app --port ${port}`,
    url: process.env.BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes to start
    cwd: resolve(__dirname, '..'),
  },
});
