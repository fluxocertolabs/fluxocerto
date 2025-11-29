import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

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

const supabase = getSupabaseConfig();

// Set environment variables for test files
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || supabase.url;
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || supabase.anonKey;
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || supabase.serviceRoleKey;
process.env.INBUCKET_URL = process.env.INBUCKET_URL || supabase.inbucketUrl;
process.env.BASE_URL = process.env.BASE_URL || 'http://localhost:5174';
process.env.TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'e2e-test@example.com';

/**
 * Playwright configuration for E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Disable parallel execution to avoid database race conditions
  forbidOnly: !!process.env.CI,
  retries: 2, // FR-016: 2 automatic retries per test
  workers: 1, // Run tests sequentially to avoid database conflicts
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 30000, // 30s per test
  expect: {
    timeout: 5000, // 5s for assertions
  },

  use: {
    baseURL: process.env.BASE_URL,
    headless: true, // Always run headless (no visible browser)
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Setup project - runs first, authenticates and saves state
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      testDir: resolve(__dirname, 'fixtures'),
    },
    // Auth tests - run WITHOUT storage state (unauthenticated)
    {
      name: 'auth-tests',
      testMatch: /auth\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // No storageState - start unauthenticated
      },
      dependencies: ['setup'], // Still depend on setup for database seeding
    },
    // Main tests - depend on setup, use authenticated storage state
    {
      name: 'chromium',
      testIgnore: /auth\.spec\.ts/, // Skip auth tests in this project
      use: {
        ...devices['Desktop Chrome'],
        storageState: resolve(__dirname, '.auth/user.json'),
      },
      dependencies: ['setup'],
    },
  ],

  // Web server configuration - starts the app before tests
  webServer: {
    command: 'pnpm dev:app --port 5174',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes to start
    cwd: resolve(__dirname, '..'),
  },
});

