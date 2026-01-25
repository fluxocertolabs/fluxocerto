/// <reference types="node" />
import { createClient } from '@supabase/supabase-js'
import {
  captureApiException,
  initSentry,
  setApiTag,
  setRequestContext,
  startApiSpan,
} from './_shared/sentry'

initSentry()

type PreviewAuthBypassResponse =
  | { accessToken: string; refreshToken: string; email: string }
  | { error: string }

type PreviewAuthBypassRequest = {
  method?: string
}

type PreviewAuthBypassResponseWriter = {
  statusCode: number
  setHeader: (key: string, value: string) => void
  end: (chunk: string) => void
}

type GenerateLinkData = {
  properties?: { action_link?: string; actionLink?: string }
  action_link?: string
}

type GenerateLinkResult = {
  data: unknown
  error: { message: string } | null
}

type AuthWithAdmin = {
  admin: {
    generateLink: (params: { type: 'magiclink'; email: string }) => Promise<GenerateLinkResult>
  }
}

function sendJson(res: PreviewAuthBypassResponseWriter, status: number, body: PreviewAuthBypassResponse): void {
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
export default async function handler(req: PreviewAuthBypassRequest, res: PreviewAuthBypassResponseWriter): Promise<void> {
  setRequestContext(req)
  setApiTag('route', 'preview-auth-bypass')
  setApiTag('vercel_env', process.env.VERCEL_ENV ?? 'unknown')

  return startApiSpan({ op: 'http.server', name: `${req.method ?? 'GET'} /api/preview-auth-bypass` }, async () => {
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

      // Vercel's TS builder can resolve Supabase auth types differently depending on runtime conditions.
      // Avoid relying on `SupabaseAuthClient.admin` being present in the type surface by using a narrow cast.
      const authAdmin = adminClient.auth as unknown as AuthWithAdmin

      const { data, error } = await authAdmin.admin.generateLink({
        type: 'magiclink',
        email,
      })

      if (error) {
        return sendJson(res, 500, { error: `generateLink failed: ${error.message}` })
      }

      const typedData = data as GenerateLinkData | null
      const actionLink: string | undefined =
        typedData?.properties?.action_link ??
        // Defensive fallback for potential API shape changes
        typedData?.action_link ??
        typedData?.properties?.actionLink

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
      captureApiException(err, { tags: { scope: 'preview-auth-bypass' } })
      const message = err instanceof Error ? err.message : 'Unknown error'
      return sendJson(res, 500, { error: `Preview auth bypass failed: ${message}` })
    }
  })
}


