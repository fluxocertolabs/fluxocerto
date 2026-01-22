import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

type StripeEvent = Stripe.Event
type StripeSubscription = Stripe.Subscription

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function getPosthogConfig() {
  const key = Deno.env.get('POSTHOG_PROJECT_KEY')
  if (!key) return null
  const host = Deno.env.get('POSTHOG_HOST') || 'https://app.posthog.com'
  return { key, host }
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

  await fetch(`${config.host}/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
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

function normalizeStripeId(id: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!id) return null
  if (typeof id === 'string') return id
  if ('id' in id && typeof id.id === 'string') return id.id
  return null
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

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  })

  let event: StripeEvent
  const body = await req.text()

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
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
      const { data: existing } = await adminClient
        .from('billing_subscriptions')
        .select('group_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()

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
      return null
    }

    const { data } = await adminClient
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

    return data?.group_id ?? groupId
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId = normalizeStripeId(session.customer)
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null
        const metadataGroupId = session.metadata?.group_id ?? null

        if (metadataGroupId) {
          await adminClient
            .from('billing_subscriptions')
            .upsert(
              {
                group_id: metadataGroupId,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                status: 'checkout_completed',
              },
              { onConflict: 'group_id' }
            )
        }
        break
      }
      case 'customer.subscription.created': {
        const subscription = event.data.object as StripeSubscription
        const groupId = await upsertBillingSubscription(subscription)
        if (groupId) {
          await capturePosthogEvent(groupId, 'billing_subscription_created', subscriptionMetadata(subscription))
          if (subscription.status === 'trialing') {
            await capturePosthogEvent(groupId, 'billing_trial_started', subscriptionMetadata(subscription))
          }
        }
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as StripeSubscription
        const groupId = await upsertBillingSubscription(subscription)
        if (groupId) {
          await capturePosthogEvent(groupId, 'billing_subscription_updated', subscriptionMetadata(subscription))
        }
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as StripeSubscription
        const groupId = await upsertBillingSubscription(subscription)
        if (groupId) {
          await capturePosthogEvent(groupId, 'billing_subscription_canceled', subscriptionMetadata(subscription))
        }
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : null
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const groupId = await upsertBillingSubscription(subscription)
          if (groupId) {
            await capturePosthogEvent(groupId, 'billing_subscription_updated', subscriptionMetadata(subscription))
            await capturePosthogEvent(groupId, 'billing_payment_succeeded', {
              ...subscriptionMetadata(subscription),
              invoice_id: invoice.id,
              value_cents: invoice.amount_paid ?? null,
              currency: invoice.currency ?? null,
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
              await capturePosthogEvent(groupId, 'billing_trial_converted', subscriptionMetadata(subscription))
              await stripe.subscriptions.update(subscription.id, {
                metadata: {
                  ...subscription.metadata,
                  trial_converted_sent: 'true',
                },
              })
            }
          }
        }
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : null
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const groupId = await upsertBillingSubscription(subscription)
          if (groupId) {
            await capturePosthogEvent(groupId, 'billing_payment_failed', {
              ...subscriptionMetadata(subscription),
              invoice_id: invoice.id,
              value_cents: invoice.amount_due ?? null,
              currency: invoice.currency ?? null,
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

