/**
 * Send Welcome Email Edge Function
 * 
 * This function sends a welcome email for a notification.
 * 
 * Features:
 * - Validates notification belongs to the authenticated user
 * - Checks email_notifications_enabled preference at send time (opt-out enforcement)
 * - Enforces idempotency via notifications.email_sent_at
 * - Returns safe preview when provider credentials are missing (dev/test mode - FR-013)
 * - Updates email_sent_at only after successful send
 * 
 * Request body: { notification_id: string }
 * Response: { ok: boolean, sent: boolean, skipped_reason?: string, preview?: { subject, html } }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
import { welcomeTemplate } from './welcome-template.ts'
import {
  addEdgeBreadcrumb,
  captureEdgeException,
  initSentry,
  setEdgeTag,
  setRequestContext,
  startEdgeSpan,
} from '../_shared/sentry.ts'

interface SendWelcomeEmailRequest {
  notification_id: string
}

interface SendWelcomeEmailResponse {
  ok: boolean
  sent: boolean
  skipped_reason?: string
  preview?: {
    subject: string
    html: string
  }
}

interface NotificationRow {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  primary_action_label: string | null
  primary_action_href: string | null
  email_sent_at: string | null
}

interface UserPreferenceRow {
  value: string
}

let cachedWelcomeTemplate: string | null = null

async function getWelcomeTemplate(): Promise<string> {
  if (!cachedWelcomeTemplate) {
    cachedWelcomeTemplate = welcomeTemplate
  }
  return cachedWelcomeTemplate ?? welcomeTemplate
}

/**
 * Generate the welcome email HTML template.
 */
async function generateEmailHtml(
  title: string,
  body: string,
  ctaLabel: string | null,
  ctaHref: string | null,
  baseUrl: string
): Promise<string> {
  const ctaUrl = ctaHref
    ? (ctaHref.startsWith('http') ? ctaHref : `${baseUrl}${ctaHref}`)
    : `${baseUrl}/notifications`
  const ctaText = ctaLabel || 'Ver notificação'
  const previewText = `Fluxo Certo - ${title}`
  const template = await getWelcomeTemplate()

  return template
    .replaceAll('{{PREVIEW}}', escapeHtml(previewText))
    .replaceAll('{{TITLE}}', escapeHtml(title))
    .replaceAll('{{BODY}}', escapeHtml(body))
    .replaceAll('{{CTA_URL}}', escapeHtml(ctaUrl))
    .replaceAll('{{CTA_LABEL}}', escapeHtml(ctaText))
}

/**
 * Escape HTML special characters to prevent XSS.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Timeout for Resend API requests (fail fast) */
const RESEND_API_TIMEOUT_MS = 10_000

/**
 * Send email via Resend API.
 */
async function sendEmailViaResend(
  apiKey: string,
  to: string,
  subject: string,
  html: string,
  fromEmail: string
): Promise<{ success: boolean; error?: string }> {
  return startEdgeSpan({ op: 'http.client', name: 'resend.send_email' }, async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), RESEND_API_TIMEOUT_MS)

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject,
          html,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = (errorData as { message?: string }).message || response.statusText
        return { success: false, error: errorMessage }
      }

      return { success: true }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, error: `Request timed out after ${RESEND_API_TIMEOUT_MS}ms` }
      }
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { success: false, error: message }
    } finally {
      clearTimeout(timeoutId)
    }
  })
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

initSentry()

Deno.serve(async (req) => {
  setRequestContext(req)
  setEdgeTag('function', 'send-welcome-email')
  return startEdgeSpan({ op: 'http.server', name: `${req.method} /send-welcome-email` }, async () => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, sent: false, skipped_reason: 'method_not_allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }

  // Get authorization header
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ ok: false, sent: false, skipped_reason: 'unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }

  // Parse request body
  let body: SendWelcomeEmailRequest
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ ok: false, sent: false, skipped_reason: 'invalid_request' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }

  const { notification_id } = body
  if (!notification_id) {
    return new Response(
      JSON.stringify({ ok: false, sent: false, skipped_reason: 'missing_notification_id' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }

  // Validate required environment variables
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    const missingVars = []
    if (!supabaseUrl) missingVars.push('SUPABASE_URL')
    if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY')
    console.error('Missing required environment variables:', missingVars.join(', '))
    return new Response(
      JSON.stringify({ ok: false, sent: false, skipped_reason: 'server_configuration_error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }

  // Create Supabase client with user's auth token
  
  // Client for user operations (RLS enforced via user's JWT in Authorization header)
  const userClient = createClient(supabaseUrl, supabaseServiceKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  })

  // Admin client for server-side operations
  const adminClient = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Get the authenticated user
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ ok: false, sent: false, skipped_reason: 'unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Fetch the notification (RLS ensures it belongs to the user)
    const { data: notification, error: notificationError } = await userClient
      .from('notifications')
      .select('id, user_id, type, title, body, primary_action_label, primary_action_href, email_sent_at')
      .eq('id', notification_id)
      .single()

    if (notificationError || !notification) {
      return new Response(
        JSON.stringify({ ok: false, sent: false, skipped_reason: 'notification_not_found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    const notificationRow = notification as NotificationRow

    // Verify notification belongs to authenticated user (extra safety)
    if (notificationRow.user_id !== user.id) {
      return new Response(
        JSON.stringify({ ok: false, sent: false, skipped_reason: 'unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Check idempotency: already sent?
    if (notificationRow.email_sent_at) {
      return new Response(
        JSON.stringify({ ok: true, sent: false, skipped_reason: 'already_sent' } satisfies SendWelcomeEmailResponse),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Check email notifications preference at send time (opt-out enforcement)
    // Note: Explicit user_id filter for defense-in-depth (RLS applies via JWT in Authorization header)
    const { data: prefData } = await userClient
      .from('user_preferences')
      .select('value')
      .eq('user_id', user.id)
      .eq('key', 'email_notifications_enabled')
      .single()

    const prefRow = prefData as UserPreferenceRow | null
    // Default to enabled when preference row is missing (opt-out semantics)
    const emailEnabled = prefRow?.value !== 'false'

    if (!emailEnabled) {
      return new Response(
        JSON.stringify({ ok: true, sent: false, skipped_reason: 'opted_out' } satisfies SendWelcomeEmailResponse),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Generate email content
    const baseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173'
    const subject = `Fluxo Certo - ${notificationRow.title}`
    const html = await generateEmailHtml(
      notificationRow.title,
      notificationRow.body,
      notificationRow.primary_action_label,
      notificationRow.primary_action_href,
      baseUrl
    )

    // Check for email provider credentials
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('EMAIL_FROM') || 'noreply@fluxocerto.app'

    if (!resendApiKey) {
      // Dev/test mode: return safe preview without sending (FR-013)
      console.log('RESEND_API_KEY not set - returning preview instead of sending')
      return new Response(
        JSON.stringify({
          ok: true,
          sent: false,
          skipped_reason: 'missing_credentials',
          preview: { subject, html },
        } satisfies SendWelcomeEmailResponse),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Get user's email
    const userEmail = user.email
    if (!userEmail) {
      return new Response(
        JSON.stringify({ ok: false, sent: false, skipped_reason: 'no_user_email' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Send email via Resend
    const sendResult = await sendEmailViaResend(resendApiKey, userEmail, subject, html, fromEmail)

    if (!sendResult.success) {
      // Log detailed error server-side, return sanitized message to client
      console.error('Failed to send email:', sendResult.error)
      return new Response(
        JSON.stringify({ ok: false, sent: false, skipped_reason: 'send_failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Update email_sent_at using admin client (bypasses RLS for server-side update)
    const { data: updated, error: updateError } = await adminClient
      .from('notifications')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', notification_id)
      .eq('user_id', user.id) // Extra safety
      .is('email_sent_at', null) // Only update if not already sent
      .select('id')
      .maybeSingle()

    if (updateError) {
      // Email was sent but we failed to record it - log but don't fail
      console.error('Failed to update email_sent_at:', updateError, { notification_id, user_id: user.id })
    } else if (!updated) {
      // Another request already recorded the send - this is fine
      console.log('Email already sent by concurrent request', { notification_id })
    }
    return new Response(
      JSON.stringify({ ok: true, sent: true } satisfies SendWelcomeEmailResponse),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (err) {
    addEdgeBreadcrumb({
      category: 'send-welcome-email',
      level: 'error',
      message: 'Unhandled send-welcome-email error',
    })
    captureEdgeException(err, { tags: { scope: 'send-welcome-email' } })
    console.error('Unexpected error in send-welcome-email:', err)
    return new Response(
      JSON.stringify({ ok: false, sent: false, skipped_reason: 'internal_error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
  })
})

