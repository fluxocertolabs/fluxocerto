import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

type StripeEvent = { type: string; data: { object: unknown } }
type StripeSubscription = {
  id: string
  status: string
  customer: string | { id?: string } | null
  items?: { data?: Array<{ price?: { id?: string; recurring?: { interval?: string } } }> }
  cancel_at_period_end?: boolean
  trial_end?: number | null
  current_period_end?: number | null
  metadata?: Record<string, string>
}
type StripeInvoice = { id: string; subscription: string | null; amount_paid?: number; amount_due?: number; currency?: string; created?: number }
type StripeCheckoutSession = { customer: string | null; subscription: string | null; metadata?: Record<string, string> }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type StripeSubscriptionUpdatedEvent = StripeEvent & {
  data: {
    object: StripeSubscription
    previous_attributes?: {
      cancel_at_period_end?: boolean
      status?: string
    }
  }
}

function getPosthogConfig() {
  const key = Deno.env.get('POSTHOG_PROJECT_KEY')
  if (!key) return null
  const host = Deno.env.get('POSTHOG_HOST') || 'https://app.posthog.com'
  return { key, host }
}

function getMetaCapiConfig() {
  const pixelId = Deno.env.get('META_PIXEL_ID')
  const accessToken = Deno.env.get('META_CAPI_ACCESS_TOKEN')
  if (!pixelId || !accessToken) return null
  const testEventCode = Deno.env.get('META_TEST_EVENT_CODE') || null
  const eventSourceUrl = Deno.env.get('META_EVENT_SOURCE_URL') || null
  const apiVersion = Deno.env.get('META_GRAPH_API_VERSION') || 'v19.0'
  return { pixelId, accessToken, testEventCode, eventSourceUrl, apiVersion }
}

function normalizeForHash(value: string): string {
  return value.trim().toLowerCase()
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function captureMetaEvent(options: {
  externalId: string | null
  eventName: string
  eventId: string
  eventTimeSeconds?: number
  customData?: Record<string, unknown>
}): Promise<void> {
  const config = getMetaCapiConfig()
  if (!config) return
  if (!options.externalId) return

  const eventTimeSeconds = options.eventTimeSeconds ?? Math.floor(Date.now() / 1000)
  const externalIdHash = await sha256Hex(normalizeForHash(options.externalId))

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: options.eventName,
        event_time: eventTimeSeconds,
        event_id: options.eventId,
        action_source: 'website',
        ...(config.eventSourceUrl ? { event_source_url: config.eventSourceUrl } : {}),
        user_data: {
          external_id: [externalIdHash],
        },
        ...(options.customData ? { custom_data: options.customData } : {}),
      },
    ],
  }

  if (config.testEventCode) {
    payload.test_event_code = config.testEventCode
  }

  const url = `https://graph.facebook.com/${config.apiVersion}/${config.pixelId}/events?access_token=${encodeURIComponent(config.accessToken)}`
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      if (!response.ok) {
        console.warn('Meta CAPI event failed', { status: response.status, event: options.eventName })
      }
    } finally {
      clearTimeout(timeout)
    }
  } catch (err) {
    const isAbort =
      err instanceof Error && (err.name === 'AbortError' || err.message.toLowerCase().includes('aborted'))
    console.warn('Meta CAPI event failed', { err: isAbort ? 'timeout' : err, event: options.eventName })
  }
}

async function capturePosthogEvent(
  distinctId: string,
  event: string,
  properties: Record<string, unknown>
): Promise<void> {
  const config = getPosthogConfig()
  if (!config) return

  const payload = {
    api_key: config.key,
    event,
    distinct_id: distinctId,
    properties,
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    try {
      const response = await fetch(`${config.host}/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      if (!response.ok) {
        console.warn('PostHog capture failed', { status: response.status })
      }
    } finally {
      clearTimeout(timeout)
    }
  } catch (err) {
    const isAbort =
      err instanceof Error && (err.name === 'AbortError' || err.message.toLowerCase().includes('aborted'))
    console.warn('PostHog capture failed', { err: isAbort ? 'timeout' : err })
  }
}

function getUserIdFromMetadata(metadata: Record<string, string> | undefined): string | null {
  if (!metadata) return null
  const userId = metadata.user_id
  return typeof userId === 'string' && userId.length > 0 ? userId : null
}

function withGroups(properties: Record<string, unknown>, groupId: string): Record<string, unknown> {
  return {
    ...properties,
    group_id: groupId,
    // Connect server-side billing events to PostHog Group Analytics ("group" is the group type used in the app).
    $groups: { group: groupId },
  }
}

async function captureBillingEvent(options: {
  groupId: string
  userId: string | null
  event: string
  properties: Record<string, unknown>
}): Promise<void> {
  const { groupId, userId, event, properties } = options
  const payload = withGroups(properties, groupId)

  // Prefer user-level attribution so funnels that start on the landing/app (person distinct_id) can end on billing events.
  if (userId) {
    await capturePosthogEvent(userId, event, payload)
    return
  }

  // Fallback: preserve legacy behavior if user_id wasn't available.
  await capturePosthogEvent(groupId, event, payload)
}

function subscriptionMetadata(subscription: StripeSubscription) {
  const price = subscription.items?.data?.[0]?.price ?? null
  return {
    price_id: price?.id ?? null,
    interval: price?.recurring?.interval ?? null,
    status: subscription.status,
    cancel_at_period_end: subscription.cancel_at_period_end,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    current_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
  }
}

function normalizeStripeId(id: string | { id?: string } | null): string | null {
  if (!id) return null
  if (typeof id === 'string') return id
  if (typeof id === 'object' && 'id' in id && typeof (id as { id?: unknown }).id === 'string') {
    return (id as { id: string }).id
  }
  return null
}

function parseStripeSignature(header: string): { timestamp: number; signatures: string[] } | null {
  const parts = header.split(',').map((p) => p.trim())
  const tPart = parts.find((p) => p.startsWith('t='))
  const v1 = parts.filter((p) => p.startsWith('v1=')).map((p) => p.slice(3))
  if (!tPart) return null
  const ts = Number(tPart.slice(2))
  if (!Number.isFinite(ts) || ts <= 0) return null
  return { timestamp: ts, signatures: v1 }
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return out === 0
}

async function verifyStripeWebhookSignature(options: {
  payload: string
  signatureHeader: string
  secret: string
  toleranceSeconds?: number
}): Promise<boolean> {
  const parsed = parseStripeSignature(options.signatureHeader)
  if (!parsed) return false

  const tolerance = options.toleranceSeconds ?? 300
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSeconds - parsed.timestamp) > tolerance) return false

  const signedPayload = `${parsed.timestamp}.${options.payload}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(options.secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload))
  const expected = bytesToHex(signature)
  return parsed.signatures.some((sig) => timingSafeEqual(sig, expected))
}

async function stripeRetrieveSubscription(
  stripeSecretKey: string,
  subscriptionId: string
): Promise<StripeSubscription> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      headers: { Authorization: `Bearer ${stripeSecretKey}` },
      signal: controller.signal,
    })
    const data = await response.json()
    if (!response.ok) {
      const message = typeof data?.error?.message === 'string' ? data.error.message : 'Stripe error'
      throw new Error(message)
    }
    return data as StripeSubscription
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Stripe request timed out')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

async function stripeUpdateSubscriptionMetadata(
  stripeSecretKey: string,
  subscriptionId: string,
  metadata: Record<string, string>
): Promise<void> {
  const body = new URLSearchParams()
  for (const [key, value] of Object.entries(metadata)) {
    body.append(`metadata[${key}]`, value)
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      signal: controller.signal,
    })
    const data = await response.json()
    if (!response.ok) {
      const message = typeof data?.error?.message === 'string' ? data.error.message : 'Stripe error'
      throw new Error(message)
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Stripe request timed out')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ ok: false, error: 'server_configuration_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const signature = req.headers.get('Stripe-Signature')
  if (!signature) {
    return new Response(JSON.stringify({ ok: false, error: 'missing_signature' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  let event: StripeEvent
  const body = await req.text()

  try {
    const ok = await verifyStripeWebhookSignature({
      payload: body,
      signatureHeader: signature,
      secret: webhookSecret,
    })
    if (!ok) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    event = JSON.parse(body) as StripeEvent
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid_signature'
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey)

  async function upsertBillingSubscription(subscription: StripeSubscription) {
    const customerId = normalizeStripeId(subscription.customer)
    const subscriptionId = subscription.id
    const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null

    let groupId: string | null = null

    if (customerId) {
      const { data: existing, error: lookupError } = await adminClient
        .from('billing_subscriptions')
        .select('group_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()

      if (lookupError) {
        throw new Error(
          `Failed to resolve group_id for customerId=${customerId}: ${lookupError.message}`
        )
      }

      groupId = existing?.group_id ?? null
    }

    if (!groupId && subscription.metadata?.group_id) {
      groupId = subscription.metadata.group_id
    }

    if (!groupId) {
      console.warn('Stripe webhook: unable to resolve group_id for subscription', {
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        metadata_group_id: subscription.metadata?.group_id ?? null,
      })
      throw new Error(
        `Unable to resolve group_id for subscription (customerId=${customerId ?? 'null'} subscriptionId=${subscriptionId} metadata_group_id=${subscription.metadata?.group_id ?? 'null'})`
      )
    }

    const { data, error } = await adminClient
      .from('billing_subscriptions')
      .upsert(
        {
          group_id: groupId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: subscription.status,
          trial_end: trialEnd,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: subscription.cancel_at_period_end,
        },
        { onConflict: 'group_id' }
      )
      .select('group_id')
      .maybeSingle()

    if (error) {
      throw new Error(
        `Failed to upsert billing_subscriptions for groupId=${groupId} customerId=${customerId ?? 'null'} subscriptionId=${subscriptionId}: ${error.message}`
      )
    }

    return data?.group_id ?? groupId
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as StripeCheckoutSession
        const customerId = normalizeStripeId(session.customer)
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null
        const metadataGroupId = session.metadata?.group_id ?? null
        const metadataUserId = getUserIdFromMetadata(session.metadata)

        if (metadataGroupId) {
          const { error } = await adminClient
            .from('billing_subscriptions')
            .upsert(
              {
                group_id: metadataGroupId,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
              },
              { onConflict: 'group_id' }
            )

          if (error) {
            throw new Error(
              `Failed to mark checkout_completed for groupId=${metadataGroupId} customerId=${customerId ?? 'null'} subscriptionId=${subscriptionId ?? 'null'}: ${error.message}`
            )
          }
        }

        // If the session includes a subscription, sync it immediately. This avoids getting stuck in
        // "checkout_completed" if events arrive out-of-order or subscription webhooks are delayed.
        if (subscriptionId) {
          const subscription = await stripeRetrieveSubscription(stripeSecretKey, subscriptionId)
          await upsertBillingSubscription(subscription)
        }

        // Record a “checkout completed” event for funnel step alignment (best-effort).
        // Use userId when available so it joins funnels; include $groups for group analytics.
        if (metadataGroupId) {
          await captureBillingEvent({
            groupId: metadataGroupId,
            userId: metadataUserId,
            event: 'billing_checkout_completed',
            properties: {
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
            },
          })
        }
        break
      }
      case 'customer.subscription.created': {
        const subscription = event.data.object as StripeSubscription
        const groupId = await upsertBillingSubscription(subscription)
        if (groupId) {
          const userId = getUserIdFromMetadata(subscription.metadata)
          await captureBillingEvent({
            groupId,
            userId,
            event: 'billing_subscription_created',
            properties: subscriptionMetadata(subscription),
          })
          if (subscription.status === 'trialing') {
            await captureBillingEvent({
              groupId,
              userId,
              event: 'billing_trial_started',
              properties: subscriptionMetadata(subscription),
            })
            await captureMetaEvent({
              externalId: userId ?? groupId,
              eventName: 'StartTrial',
              eventId: `stripe_sub_${subscription.id}_trial_started`,
            })
          }
        }
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as StripeSubscription
        const groupId = await upsertBillingSubscription(subscription)
        if (groupId) {
          const userId = getUserIdFromMetadata(subscription.metadata)
          await captureBillingEvent({
            groupId,
            userId,
            event: 'billing_subscription_updated',
            properties: subscriptionMetadata(subscription),
          })

          // Track user-initiated cancellation intent (most users "cancel" by setting cancel_at_period_end=true).
          // Stripe includes `previous_attributes` for updated events which lets us detect toggles.
          const updatedEvent = event as StripeSubscriptionUpdatedEvent
          const previousCancelAtPeriodEnd = updatedEvent.data.previous_attributes?.cancel_at_period_end
          if (typeof previousCancelAtPeriodEnd === 'boolean') {
            const currentCancelAtPeriodEnd = subscription.cancel_at_period_end === true
            if (!previousCancelAtPeriodEnd && currentCancelAtPeriodEnd) {
              await captureBillingEvent({
                groupId,
                userId,
                event: 'billing_cancellation_scheduled',
                properties: subscriptionMetadata(subscription),
              })
            }
            if (previousCancelAtPeriodEnd && !currentCancelAtPeriodEnd) {
              await captureBillingEvent({
                groupId,
                userId,
                event: 'billing_cancellation_unscheduled',
                properties: subscriptionMetadata(subscription),
              })
            }
          }
        }
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as StripeSubscription
        const groupId = await upsertBillingSubscription(subscription)
        if (groupId) {
          const userId = getUserIdFromMetadata(subscription.metadata)
          await captureBillingEvent({
            groupId,
            userId,
            event: 'billing_subscription_canceled',
            properties: subscriptionMetadata(subscription),
          })
        }
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as StripeInvoice
        const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : null
        if (subscriptionId) {
          const subscription = await stripeRetrieveSubscription(stripeSecretKey, subscriptionId)
          const groupId = await upsertBillingSubscription(subscription)
          if (groupId) {
            const userId = getUserIdFromMetadata(subscription.metadata)
            await captureBillingEvent({
              groupId,
              userId,
              event: 'billing_subscription_updated',
              properties: subscriptionMetadata(subscription),
            })
            await captureBillingEvent({
              groupId,
              userId,
              event: 'billing_payment_succeeded',
              properties: {
                ...subscriptionMetadata(subscription),
                invoice_id: invoice.id,
                value_cents: invoice.amount_paid ?? null,
                currency: invoice.currency ?? null,
              },
            })
            const trialEnd = subscription.trial_end ? subscription.trial_end * 1000 : null
            const paymentAt = invoice.created ? invoice.created * 1000 : null
            const alreadyMarked = subscription.metadata?.trial_converted_sent === 'true'
            const shouldMarkConversion =
              subscription.status === 'active' &&
              !!trialEnd &&
              !!paymentAt &&
              paymentAt >= trialEnd &&
              !alreadyMarked

            if (shouldMarkConversion) {
              await captureBillingEvent({
                groupId,
                userId,
                event: 'billing_trial_converted',
                properties: subscriptionMetadata(subscription),
              })
              const amountCents = invoice.amount_paid ?? null
              const currency = invoice.currency ?? null
              if (typeof amountCents === 'number' && amountCents > 0 && typeof currency === 'string' && currency) {
                await captureMetaEvent({
                  externalId: userId ?? groupId,
                  eventName: 'Purchase',
                  eventId: `stripe_invoice_${invoice.id}_trial_conversion`,
                  eventTimeSeconds: invoice.created ?? undefined,
                  customData: {
                    currency,
                    value: amountCents / 100,
                  },
                })
              }
              await stripeUpdateSubscriptionMetadata(stripeSecretKey, subscription.id, {
                ...(subscription.metadata ?? {}),
                trial_converted_sent: 'true',
              })
            }
          }
        }
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as StripeInvoice
        const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : null
        if (subscriptionId) {
          const subscription = await stripeRetrieveSubscription(stripeSecretKey, subscriptionId)
          const groupId = await upsertBillingSubscription(subscription)
          if (groupId) {
            const userId = getUserIdFromMetadata(subscription.metadata)
            await captureBillingEvent({
              groupId,
              userId,
              event: 'billing_payment_failed',
              properties: {
                ...subscriptionMetadata(subscription),
                invoice_id: invoice.id,
                value_cents: invoice.amount_due ?? null,
                currency: invoice.currency ?? null,
              },
            })
          }
        }
        break
      }
      default:
        break
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal_error'
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})

