/// <reference types="node" />
import { createClient } from '@supabase/supabase-js'

type PreviewAuthBypassResponse =
  | { accessToken: string; refreshToken: string; email: string }
  | { error: string }

function sendJson(res: any, status: number, body: PreviewAuthBypassResponse): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

function parseTokensFromRedirectUrl(
  url: string
): { accessToken: string; refreshToken: string } | null {
  try {
    const parsed = new URL(url)
    const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    if (!accessToken || !refreshToken) return null
    return { accessToken, refreshToken }
  } catch {
    return null
  }
}

async function followRedirectsForSession(
  actionLink: string,
  maxRedirects: number = 5
): Promise<{ accessToken: string; refreshToken: string } | null> {
  let current = actionLink
  for (let i = 0; i < maxRedirects; i++) {
    const response = await fetch(current, { redirect: 'manual' })
    const location = response.headers.get('location')
    if (!location) return null
    const next = new URL(location, current).toString()

    const tokens = parseTokensFromRedirectUrl(next)
    if (tokens) return tokens

    current = next
  }

  return null
}

/**
 * Vercel Preview-only auth bypass endpoint.
 *
 * This is intentionally NOT available in production. It mints a Supabase session
 * for a configured email (defaults to `preview-auth-bypass@example.test`) by generating a
 * magiclink via the Supabase Admin API, then following the redirect to extract
 * access/refresh tokens.
 *
 * Required env vars (Preview environment only):
 * - SUPABASE_SERVICE_ROLE_KEY
 * - VITE_SUPABASE_URL
 *
 * Optional:
 * - PREVIEW_AUTH_BYPASS_ENABLED=true
 * - PREVIEW_AUTH_BYPASS_EMAIL=preview-auth-bypass@example.test
 */
export default async function handler(req: any, res: any): Promise<void> {
  try {
    // We hide this endpoint outside Preview deployments by returning 404.
    if (process.env.VERCEL_ENV !== 'preview') {
      return sendJson(res, 404, { error: 'Not found' })
    }

    if (process.env.PREVIEW_AUTH_BYPASS_ENABLED !== 'true') {
      return sendJson(res, 404, { error: 'Not found' })
    }

    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return sendJson(res, 405, { error: 'Method not allowed' })
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const email = process.env.PREVIEW_AUTH_BYPASS_EMAIL ?? 'preview-auth-bypass@example.test'

    if (!supabaseUrl) {
      return sendJson(res, 500, { error: 'Missing env var: VITE_SUPABASE_URL' })
    }
    if (!serviceRoleKey) {
      return sendJson(res, 500, { error: 'Missing env var: SUPABASE_SERVICE_ROLE_KEY' })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })

    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })

    if (error) {
      return sendJson(res, 500, { error: `generateLink failed: ${error.message}` })
    }

    const actionLink: string | undefined =
      // Supabase docs shape: data.properties.action_link
      (data as any)?.properties?.action_link ??
      // Defensive fallbacks for potential shape changes
      (data as any)?.action_link ??
      (data as any)?.properties?.actionLink

    if (!actionLink) {
      return sendJson(res, 500, { error: 'generateLink returned no action_link' })
    }

    const tokens = await followRedirectsForSession(actionLink)
    if (!tokens) {
      return sendJson(res, 500, {
        error:
          'Failed to resolve session tokens from magiclink redirect. Check Supabase Auth settings (Site URL / Redirect URLs) and ensure email auth is enabled.',
      })
    }

    return sendJson(res, 200, { ...tokens, email })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return sendJson(res, 500, { error: `Preview auth bypass failed: ${message}` })
  }
}


