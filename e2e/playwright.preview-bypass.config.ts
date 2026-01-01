import { defineConfig, devices } from '@playwright/test'
import { execSync } from 'child_process'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Minimal Playwright config to exercise production-build behavior.
 *
 * The main e2e config runs against Vite dev server (import.meta.env.DEV=true),
 * which cannot execute the PR preview auth bypass code path.
 *
 * This config builds the app with VITE_PREVIEW_AUTH_BYPASS=true and serves it via
 * `vite preview`, then runs a small set of preview-bypass tests.
 */

function getLocalSupabaseConfig(): { url: string; anonKey: string; serviceRoleKey: string } | null {
  try {
    const output = execSync('npx supabase status -o json', {
      cwd: resolve(__dirname, '..'),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    // `supabase status -o json` can sometimes print non-JSON lines (e.g. warnings)
    // before the JSON payload. Extract the JSON object defensively.
    const start = output.indexOf('{')
    const end = output.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) {
      throw new Error(`Unexpected supabase status output (no JSON object found):\n${output}`)
    }
    const jsonText = output.slice(start, end + 1)
    const status = JSON.parse(jsonText)
    return {
      url: status.API_URL || 'http://localhost:54321',
      anonKey: status.ANON_KEY,
      serviceRoleKey: status.SERVICE_ROLE_KEY,
    }
  } catch {
    return null
  }
}

const localSupabase = getLocalSupabaseConfig()

// Build-time env vars for the production bundle
const supabaseUrl = process.env.VITE_SUPABASE_URL || localSupabase?.url
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || localSupabase?.anonKey
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || localSupabase?.serviceRoleKey

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error(
    [
      'Supabase credentials are missing for preview bypass E2E tests.',
      '- Start local Supabase with `pnpm db:start` (or run `pnpm db:ensure`).',
      '- Or set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in the environment.',
    ].join('\n')
  )
}

process.env.VITE_SUPABASE_URL = supabaseUrl
process.env.VITE_SUPABASE_ANON_KEY = anonKey
process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey
process.env.VITE_PREVIEW_AUTH_BYPASS = 'true'

// Runtime base URL for the preview server
process.env.BASE_URL = process.env.BASE_URL || 'http://localhost:4173'

const baseUrl = new URL(process.env.BASE_URL)
const port = baseUrl.port || '4173'

export default defineConfig({
  testDir: './tests',
  testMatch: /preview-auth-bypass\.preview\.spec\.ts/,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.BASE_URL,
    headless: true,
    ...devices['Desktop Chrome'],
  },
  webServer: {
    // Build with VITE_PREVIEW_AUTH_BYPASS=true embedded, then serve dist
    command: `pnpm build && pnpm preview --port ${port} --strictPort`,
    url: process.env.BASE_URL,
    reuseExistingServer: false,
    timeout: 180000,
    cwd: resolve(__dirname, '..'),
  },
})



