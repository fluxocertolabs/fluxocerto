import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { getWorkerCount } from './fixtures/worker-count';

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
  retries: process.env.CI ? 2 : 0, // 2 retries in CI for flakiness, none locally for fast feedback
  workers: workerCount, // Auto-detect based on CPU cores
  reporter: process.env.CI 
    ? [['github', { title: process.env.PLAYWRIGHT_TITLE || '🎭 Playwright Run Summary' }]]
    : 'list',
  // Timeout for test execution - 45s gives buffer for parallel execution resource contention
  timeout: 45000, // 45s per test
  expect: {
    timeout: 10000, // 10s for assertions
    toHaveScreenshot: {
      threshold: 0.3, // 0.3% pixel tolerance for anti-aliasing differences
      maxDiffPixelRatio: 0.05, // Max 5% of pixels can differ (accounts for font rendering and worker names)
      animations: 'disabled', // Freeze CSS animations for consistent screenshots
      caret: 'hide', // Hide text cursor to avoid flakiness
    },
  },

  use: {
    baseURL: process.env.BASE_URL,
    headless: true, // Always run headless (no visible browser)
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Additional browser args for Docker stability
    launchOptions: {
      args: [
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--no-zygote', // Disable zygote process to avoid crashes in Docker
        '--disable-dev-shm-usage', // Use /tmp instead of /dev/shm for shared memory
        '--disable-features=AudioServiceOutOfProcess', // Prevent D-Bus audio service access
      ],
    },
  },

  projects: [
    // Setup project - runs first, creates schemas and authenticates all workers
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
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
      testIgnore: [/auth\.spec\.ts/, /visual\//, /\.preview\.spec\.ts/], // Skip auth, visual, and preview-only tests
      use: {
        ...devices['Desktop Chrome'],
        // Note: Storage state is NOT set here because it needs to be per-worker
        // The test-base.ts fixture handles loading the correct auth state per worker
        // by using workerContext.authStatePath
      },
      dependencies: ['setup'],
    },
    // Visual regression tests - run in parallel with group-based isolation
    // Each worker has its own group, ensuring complete data isolation via RLS
    // Screenshots mask worker-specific elements (like group name) for consistency
    {
      name: 'visual',
      testMatch: /visual\/.*\.spec\.ts/,
      testIgnore: /visual\/mobile\.visual\.spec\.ts/, // Mobile tests run in separate project
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }, // Fixed viewport for consistent screenshots
      },
      dependencies: ['setup'], // Use main setup which authenticates all workers
      fullyParallel: true, // Run visual tests in parallel - group isolation handles data separation
    },
    // Mobile visual regression tests - captures mobile-specific layouts
    {
      name: 'visual-mobile',
      testMatch: /visual\/mobile\.visual\.spec\.ts/,
      use: {
        ...devices['Pixel 5'],
      },
      dependencies: ['setup'],
      fullyParallel: true,
    },
  ],

  // Web server configuration - starts the app before tests
  // - In CI: Always start fresh server (no existing server to reuse)
  // - Locally: Reuse existing server if running (for faster iteration)
  //
  // IMPORTANT: We unset VITE_DEV_ACCESS_TOKEN and VITE_DEV_REFRESH_TOKEN to disable
  // the dev auth bypass during E2E tests. This ensures tests use the proper
  // magic link authentication flow instead of auto-login.
  webServer: {
    command: `VITE_DEV_ACCESS_TOKEN= VITE_DEV_REFRESH_TOKEN= pnpm dev:app --port ${port}`,
    url: process.env.BASE_URL,
    reuseExistingServer: !process.env.CI, // In CI: start fresh; locally: reuse if available
    timeout: 120000, // 2 minutes to start
    cwd: resolve(__dirname, '..'),
  },
});
