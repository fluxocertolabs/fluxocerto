import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

interface CheckoutSessionResponse {
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

function getCorsHeaders(req: Request): Record<string, string> {
  const headerOrigin = req.headers.get('origin')
  const baseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173'

  const allowedPatterns = [
    ...getAllowedOrigins(),
    // Treat APP_BASE_URL as implicitly allowed (helps local dev if APP_ALLOWED_ORIGINS isn't set).
    baseUrl,
  ]

  const allowOrigin =
    headerOrigin && isOriginAllowed(headerOrigin, allowedPatterns) ? headerOrigin : baseUrl

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function getBaseUrl(req: Request): string {
  const headerOrigin = req.headers.get('origin')
  const baseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173'

  const allowedPatterns = [
    ...getAllowedOrigins(),
    // Treat APP_BASE_URL as implicitly allowed (helps local dev if APP_ALLOWED_ORIGINS isn't set).
    baseUrl,
  ]

  if (headerOrigin && isOriginAllowed(headerOrigin, allowedPatterns)) {
    return headerOrigin
  }

  return baseUrl
}

async function createStripeCustomer(
  stripeSecretKey: string,
  email: string | null,
  groupId: string,
  userId: string
): Promise<{ id: string }> {
  const body = new URLSearchParams()
  if (email) body.append('email', email)
  body.append('metadata[group_id]', groupId)
  body.append('metadata[user_id]', userId)

  const response = await fetch('https://api.stripe.com/v1/customers', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const data = await response.json()
  if (!response.ok) {
    const message = typeof data?.error?.message === 'string' ? data.error.message : 'Stripe error'
    throw new Error(message)
  }

  return data as { id: string }
}

async function createCheckoutSession(options: {
  stripeSecretKey: string
  priceId: string
  customerId: string
  baseUrl: string
  groupId: string
  userId: string
}): Promise<{ url: string }> {
  const { stripeSecretKey, priceId, customerId, baseUrl, groupId, userId } = options

  const body = new URLSearchParams()
  body.append('mode', 'subscription')
  body.append('customer', customerId)
  body.append('line_items[0][price]', priceId)
  body.append('line_items[0][quantity]', '1')
  body.append('subscription_data[trial_period_days]', '14')
  body.append('subscription_data[trial_settings][end_behavior][missing_payment_method]', 'cancel')
  body.append('payment_method_collection', 'always')
  body.append('success_url', `${baseUrl}/billing/success`)
  body.append('cancel_url', `${baseUrl}/billing/cancel`)
  body.append('metadata[group_id]', groupId)
  body.append('metadata[user_id]', userId)

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const data = await response.json()
  if (!response.ok) {
    const message = typeof data?.error?.message === 'string' ? data.error.message : 'Stripe error'
    throw new Error(message)
  }

  const url = data?.url
  if (typeof url !== 'string') {
    throw new Error('Stripe session URL missing')
  }
  return { url }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
  const priceId = Deno.env.get('STRIPE_PRICE_ID')

  if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey || !priceId) {
    return new Response(
      JSON.stringify({ ok: false, error: 'server_configuration_error' } satisfies CheckoutSessionResponse),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }

  const userClient = createClient(supabaseUrl, supabaseServiceKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const adminClient = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { data: { user }, error: userError } = await userClient.auth.getUser()
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

    const { data: existingBilling } = await adminClient
      .from('billing_subscriptions')
      .select('stripe_customer_id')
      .eq('group_id', groupId)
      .maybeSingle()

    let stripeCustomerId = existingBilling?.stripe_customer_id ?? null
    if (!stripeCustomerId) {
      const customer = await createStripeCustomer(stripeSecretKey, email, groupId, user.id)
      stripeCustomerId = customer.id

      const { error: upsertError } = await adminClient
        .from('billing_subscriptions')
        .upsert(
          {
            group_id: groupId,
            stripe_customer_id: stripeCustomerId,
            status: 'pending',
          },
          { onConflict: 'group_id' }
        )

      if (upsertError) {
        console.error('Failed to upsert billing subscription', {
          groupId,
          stripeCustomerId,
          error: upsertError,
        })
        throw new Error('Failed to persist billing record')
      }
    }

    const baseUrl = getBaseUrl(req)
    const session = await createCheckoutSession({
      stripeSecretKey,
      priceId,
      customerId: stripeCustomerId,
      baseUrl,
      groupId,
      userId: user.id,
    })

    return new Response(JSON.stringify({ ok: true, url: session.url } satisfies CheckoutSessionResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal_error'
    return new Response(JSON.stringify({ ok: false, error: message } satisfies CheckoutSessionResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})

