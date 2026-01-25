import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
import {
  addEdgeBreadcrumb,
  captureEdgeException,
  initSentry,
  setEdgeTag,
  setRequestContext,
  startEdgeSpan,
} from '../_shared/sentry.ts'

interface PortalSessionResponse {
  ok: boolean
  url?: string
  error?: string
}

function getAllowedOrigins(): string[] {
  const raw = Deno.env.get('APP_ALLOWED_ORIGINS') || ''
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function matchesHostPattern(host: string, pattern: string): boolean {
  const regex = new RegExp(`^${escapeRegex(pattern).replace(/\\\*/g, '.*')}$`, 'i')
  return regex.test(host)
}

function isOriginAllowed(origin: string, allowedPatterns: string[]): boolean {
  let originUrl: URL
  try {
    originUrl = new URL(origin)
  } catch {
    return false
  }

  const originHost = originUrl.host // includes port if present
  const originScheme = originUrl.protocol // includes trailing ':'

  for (const pattern of allowedPatterns) {
    if (!pattern) continue

    // Exact origin match.
    if (!pattern.includes('*') && pattern === origin) {
      return true
    }

    // Pattern includes scheme (e.g. https://*.vercel.app)
    if (pattern.includes('://')) {
      const [scheme, rest] = pattern.split('://', 2)
      if (!scheme) continue
      const normalizedScheme = `${scheme.toLowerCase()}:`
      if (normalizedScheme !== originScheme.toLowerCase()) continue
      if (matchesHostPattern(originHost, rest)) return true
      continue
    }

    // Host-only patterns (e.g. *.vercel.app)
    if (matchesHostPattern(originHost, pattern)) return true
  }

  return false
}

function normalizeOrigin(value: string): string {
  try {
    return new URL(value).origin
  } catch {
    return value
  }
}

function getAllowedPatterns(baseUrl: string): string[] {
  const baseOrigin = normalizeOrigin(baseUrl)
  const derivedOrigins: string[] = []
  try {
    const url = new URL(baseOrigin)
    const host = url.hostname
    // Auto-allow both apex and www variants for convenience/safety in production.
    if (host.startsWith('www.')) {
      const apexHost = host.slice(4)
      derivedOrigins.push(`${url.protocol}//${apexHost}`)
    } else {
      derivedOrigins.push(`${url.protocol}//www.${host}`)
    }
  } catch {
    // ignore
  }

  return [
    ...getAllowedOrigins(),
    // Treat APP_BASE_URL as implicitly allowed (helps local dev if APP_ALLOWED_ORIGINS isn't set).
    baseOrigin,
    ...derivedOrigins,
  ]
}

function getCorsHeaders(req: Request): Record<string, string> {
  const headerOrigin = req.headers.get('origin')
  const baseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173'
  const baseOrigin = normalizeOrigin(baseUrl)
  const allowedPatterns = getAllowedPatterns(baseUrl)

  // Only reflect the origin if it's validated.
  // If there's no Origin header (server-to-server), use the base URL as a safe default.
  const allowOrigin = headerOrigin ? headerOrigin : baseOrigin

  return {
    ...(headerOrigin && isOriginAllowed(headerOrigin, allowedPatterns)
      ? { 'Access-Control-Allow-Origin': allowOrigin }
      : {}),
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function getBearerToken(authHeader: string): string | null {
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? null
}

function getBaseUrl(req: Request): string {
  const headerOrigin = req.headers.get('origin')
  const baseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173'
  const baseOrigin = normalizeOrigin(baseUrl)

  const allowedPatterns = getAllowedPatterns(baseUrl)

  if (headerOrigin && isOriginAllowed(headerOrigin, allowedPatterns)) {
    // Prefer the full APP_BASE_URL (which may include a path like /app) when the request origin
    // matches it exactly. Otherwise fall back to the request origin (useful for previews).
    return headerOrigin === baseOrigin ? baseUrl : headerOrigin
  }

  return baseUrl
}

function createTimeoutSignal(ms: number): { signal: AbortSignal; cleanup: () => void } {
  const maybeTimeout = (AbortSignal as unknown as { timeout?: (ms: number) => AbortSignal }).timeout
  if (typeof maybeTimeout === 'function') {
    return { signal: maybeTimeout(ms), cleanup: () => {} }
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, cleanup: () => clearTimeout(timeout) }
}

async function createPortalSession(options: {
  stripeSecretKey: string
  customerId: string
  returnUrl: string
  configurationId?: string | null
}): Promise<{ url: string }> {
  const { stripeSecretKey, customerId, returnUrl, configurationId } = options

  return startEdgeSpan({ op: 'http.client', name: 'stripe.portal.create_session' }, async () => {
    const body = new URLSearchParams()
    body.append('customer', customerId)
    body.append('return_url', returnUrl)
    if (configurationId) {
      body.append('configuration', configurationId)
    }

    const { signal, cleanup } = createTimeoutSignal(15_000)
    let response: Response
    try {
      response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        signal,
      })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Stripe request timed out')
      }
      throw err
    } finally {
      cleanup()
    }

    const data = await response.json()
    if (!response.ok) {
      const message = typeof data?.error?.message === 'string' ? data.error.message : 'Stripe error'
      throw new Error(message)
    }

    const url = data?.url
    if (typeof url !== 'string') {
      throw new Error('Stripe portal URL missing')
    }
    return { url }
  })
}

initSentry()

Deno.serve(async (req) => {
  setRequestContext(req)
  setEdgeTag('function', 'create-stripe-customer-portal-session')
  return startEdgeSpan({ op: 'http.server', name: `${req.method} /create-stripe-customer-portal-session` }, async () => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' } satisfies PortalSessionResponse), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const bearerToken = getBearerToken(authHeader)
  if (!bearerToken) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
  const portalConfigId = Deno.env.get('STRIPE_PORTAL_CONFIGURATION_ID')

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey || !stripeSecretKey) {
    return new Response(JSON.stringify({ ok: false, error: 'server_configuration_error' } satisfies PortalSessionResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const baseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173'
  const allowedPatterns = getAllowedPatterns(baseUrl)
  const origin = req.headers.get('origin')
  if (origin && !isOriginAllowed(origin, allowedPatterns)) {
    return new Response(JSON.stringify({ ok: false, error: 'origin_not_allowed' } satisfies PortalSessionResponse), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    },
  })
  const adminClient = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { data: { user }, error: userError } = await userClient.auth.getUser(bearerToken)
    if (userError || !user) {
      return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const email = user.email ?? null

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('group_id')
      .eq('email', (email ?? '').toLowerCase())
      .maybeSingle()

    if (profileError || !profile?.group_id) {
      return new Response(JSON.stringify({ ok: false, error: 'group_not_found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const groupId = profile.group_id as string

    const { data: existingBilling, error: existingBillingError } = await adminClient
      .from('billing_subscriptions')
      .select('stripe_customer_id')
      .eq('group_id', groupId)
      .maybeSingle()

    if (existingBillingError) {
      console.error('Failed to read billing subscription', {
        groupId,
        error: existingBillingError,
      })
      throw new Error('Failed to read billing record')
    }

    const stripeCustomerId = existingBilling?.stripe_customer_id ?? null
    if (!stripeCustomerId) {
      return new Response(JSON.stringify({ ok: false, error: 'billing_customer_not_found' } satisfies PortalSessionResponse), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const returnBaseUrl = getBaseUrl(req)
    const portalSession = await createPortalSession({
      stripeSecretKey,
      customerId: stripeCustomerId,
      returnUrl: `${returnBaseUrl}/manage`,
      configurationId: portalConfigId,
    })

    return new Response(JSON.stringify({ ok: true, url: portalSession.url } satisfies PortalSessionResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    addEdgeBreadcrumb({
      category: 'create-stripe-customer-portal-session',
      level: 'error',
      message: 'Customer portal session failed',
    })
    captureEdgeException(err, { tags: { scope: 'create-stripe-customer-portal-session' } })
    const message = err instanceof Error ? err.message : 'internal_error'
    return new Response(JSON.stringify({ ok: false, error: message } satisfies PortalSessionResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
  })
})
