import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get Supabase keys from running instance
 */
function getSupabaseConfig() {
  const envUrl = process.env.VITE_SUPABASE_URL;
  const envAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const envServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const envInbucketUrl = process.env.INBUCKET_URL;

  if (envUrl && envAnonKey && envServiceRoleKey) {
    return {
      url: envUrl,
      anonKey: envAnonKey,
      serviceRoleKey: envServiceRoleKey,
      inbucketUrl: envInbucketUrl || 'http://localhost:54324',
    };
  }

  try {
    const output = execSync('npx supabase status -o json', {
      cwd: resolve(__dirname, '..'),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const status = JSON.parse(output);
    const anonKey = status.ANON_KEY || status.PUBLISHABLE_KEY || '';
    const serviceRoleKey = status.SERVICE_ROLE_KEY || status.SECRET_KEY || '';
    return {
      url: status.API_URL || 'http://localhost:54321',
      anonKey,
      serviceRoleKey,
      inbucketUrl: status.INBUCKET_URL || 'http://localhost:54324',
    };
  } catch {
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

/**
 * Read .env values without pulling in dotenv.
 * Only used to pass dev-auth tokens into the Vite dev server.
 */
function readEnvFile(filePath: string): Record<string, string> {
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const entries: Record<string, string> = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const equalsIndex = trimmed.indexOf('=');
      if (equalsIndex === -1) continue;
      const key = trimmed.slice(0, equalsIndex).trim();
      let value = trimmed.slice(equalsIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      entries[key] = value;
    }
    return entries;
  } catch {
    return {};
  }
}

const envFromFile = readEnvFile(resolve(__dirname, '..', '.env'));
const devAccessToken = envFromFile.VITE_DEV_ACCESS_TOKEN || process.env.VITE_DEV_ACCESS_TOKEN || '';
const devRefreshToken = envFromFile.VITE_DEV_REFRESH_TOKEN || process.env.VITE_DEV_REFRESH_TOKEN || '';

// Set environment variables for test files
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || supabase.url;
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || supabase.anonKey;
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || supabase.serviceRoleKey;
process.env.INBUCKET_URL = process.env.INBUCKET_URL || supabase.inbucketUrl;
process.env.BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
process.env.VITE_DISABLE_THEME_SYNC = 'true';

const baseUrl = new URL(process.env.BASE_URL);
const port = baseUrl.port || '5173';

/**
 * Simplified Playwright configuration for E2E smoke tests.
 * 
 * This configuration is optimized for a small, focused test suite:
 * - Auth tests: Test the magic link flow (no auth bypass)
 * - Smoke tests: Use dev-auth-bypass for speed
 * - Visual tests: Minimal visual regression (1-2 screenshots per page)
 * 
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run tests serially for simplicity
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Single worker for simplicity
  reporter: process.env.CI 
    ? [['github', { title: '🎭 E2E Smoke Tests' }]]
    : 'list',
  timeout: 60000, // 60s per test
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      threshold: 0.3,
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
      caret: 'hide',
    },
  },

  use: {
    baseURL: process.env.BASE_URL,
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      args: [
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--no-zygote',
        '--disable-dev-shm-usage',
        '--disable-features=AudioServiceOutOfProcess',
      ],
    },
  },

  projects: [
    // Auth tests - run WITHOUT dev-auth-bypass (tests actual magic link flow)
    {
      name: 'auth-tests',
      testMatch: /auth\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    // Smoke tests - use dev-auth-bypass for speed
    {
      name: 'smoke',
      testMatch: /(?<!auth)\.(spec|smoke)\.ts$/,
      testIgnore: [/auth\.spec\.ts/, /visual\//],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    // Visual regression tests
    {
      name: 'visual',
      testMatch: /visual\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        reducedMotion: 'reduce',
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // Web server - uses dev-auth-bypass tokens for smoke tests
  webServer: {
    command: `pnpm dev:app --port ${port} --strictPort`,
    url: process.env.BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    cwd: resolve(__dirname, '..'),
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
      VITE_DEV_ACCESS_TOKEN: devAccessToken,
      VITE_DEV_REFRESH_TOKEN: devRefreshToken,
      VITE_DISABLE_THEME_SYNC: process.env.VITE_DISABLE_THEME_SYNC,
    },
  },
});
