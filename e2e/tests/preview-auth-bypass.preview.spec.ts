import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const PREVIEW_EMAIL = 'preview-auth-bypass@example.test'
const PREVIEW_PASSWORD = 'preview-bypass-test-password-12345'
const PREVIEW_GROUP_NAME = process.env.PREVIEW_AUTH_BYPASS_GROUP_NAME ?? 'Fonseca Floriano'

type AdminListedUser = { id: string; email?: string | null }

async function findUserByEmail(
  admin: ReturnType<typeof createClient>,
  email: string
): Promise<AdminListedUser | null> {
  const perPage = 500
  const maxPages = 50

  for (let page = 1; page <= maxPages; page++) {
    const { data: listData, error: listError } = await admin.auth.admin.listUsers({ page, perPage })
    if (listError) throw new Error(`Failed to list users: ${listError.message}`)

    const existing = listData.users.find((u) => u.email === email)
    if (existing) return existing

    if (listData.users.length < perPage) return null
  }

  throw new Error(`Failed to find user by email after ${maxPages} pages (perPage=${perPage})`)
}

async function ensurePreviewUserAndGetTokens(): Promise<{ accessToken: string; refreshToken: string }> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for preview bypass tests')
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const existing = await findUserByEmail(admin, PREVIEW_EMAIL)
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: PREVIEW_PASSWORD,
    })
    if (error) throw new Error(`Failed to update preview user password: ${error.message}`)
  } else {
    const { error } = await admin.auth.admin.createUser({
      email: PREVIEW_EMAIL,
      password: PREVIEW_PASSWORD,
      email_confirm: true,
    })
    if (error) throw new Error(`Failed to create preview user: ${error.message}`)
  }

  // Ensure a profile exists so the app can resolve group-based data later.
  // We attach it to the default group if present.
  const { data: group, error: groupError } = await admin
    .from('groups')
    .select('id')
    .eq('name', PREVIEW_GROUP_NAME)
    .maybeSingle()

  if (groupError) throw new Error(`Failed to query groups: ${groupError.message}`)

  if (group?.id) {
    const { error: profileError } = await admin.from('profiles').upsert(
      {
        email: PREVIEW_EMAIL,
        name: 'Delucca Fonseca',
        group_id: group.id,
      },
      { onConflict: 'email' }
    )
    if (profileError) throw new Error(`Failed to upsert profile: ${profileError.message}`)
  }

  const { data: authData, error: authError } = await admin.auth.signInWithPassword({
    email: PREVIEW_EMAIL,
    password: PREVIEW_PASSWORD,
  })

  if (authError) throw new Error(`Failed to sign in preview user: ${authError.message}`)
  if (!authData.session) throw new Error('Sign in succeeded but no session returned')

  return {
    accessToken: authData.session.access_token,
    refreshToken: authData.session.refresh_token,
  }
}

test.describe('Preview Auth Bypass (production build)', () => {
  let tokens: { accessToken: string; refreshToken: string }
  const isConfigured = Boolean(process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  test.skip(!isConfigured, 'Supabase is not configured/running for preview bypass tests')

  test.beforeAll(async () => {
    tokens = await ensurePreviewUserAndGetTokens()
  })

  test('T0P1: loads dashboard without login when preview bypass endpoint returns tokens', async ({ page }) => {
    await page.route('**/api/preview-auth-bypass', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...tokens, email: PREVIEW_EMAIL }),
      })
    })

    await page.goto('/')

    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator(`text=${PREVIEW_EMAIL}`)).toBeVisible({ timeout: 10000 })
  })

  test('T0P2: falls back to login and shows toast when endpoint returns non-OK', async ({ page }) => {
    await page.route('**/api/preview-auth-bypass', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not found' }),
      })
    })

    await page.goto('/')

    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('text=Preview Auth Bypass Failed')).toBeVisible({ timeout: 3000 })
  })
})



