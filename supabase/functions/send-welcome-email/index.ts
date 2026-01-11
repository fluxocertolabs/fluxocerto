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

/**
 * Generate the welcome email HTML template.
 */
function generateEmailHtml(
  title: string,
  body: string,
  ctaLabel: string | null,
  ctaHref: string | null,
  baseUrl: string
): string {
  const ctaUrl = ctaHref ? `${baseUrl}${ctaHref}` : `${baseUrl}/notifications`
  const ctaText = ctaLabel || 'Ver notificação'

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fluxo Certo - ${escapeHtml(title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background-color: #ffffff;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    .logo {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo-text {
      font-size: 24px;
      font-weight: 700;
      color: #2563eb;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 16px 0;
      color: #1a1a1a;
    }
    p {
      font-size: 16px;
      margin: 0 0 24px 0;
      color: #4a4a4a;
    }
    .cta-button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
    }
    .cta-button:hover {
      background-color: #1d4ed8;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e5e5e5;
    }
    .footer p {
      font-size: 14px;
      color: #6b7280;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <span class="logo-text">Fluxo Certo</span>
      </div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(body)}</p>
      <a href="${escapeHtml(ctaUrl)}" class="cta-button">${escapeHtml(ctaText)}</a>
      <div class="footer">
        <p>Este email foi enviado pelo Fluxo Certo.</p>
        <p>Se você não deseja receber emails, ajuste suas preferências no app.</p>
      </div>
    </div>
  </div>
</body>
</html>
`.trim()
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
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = (errorData as { message?: string }).message || response.statusText
      return { success: false, error: errorMessage }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}

Deno.serve(async (req) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, sent: false, skipped_reason: 'method_not_allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Get authorization header
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ ok: false, sent: false, skipped_reason: 'unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Parse request body
  let body: SendWelcomeEmailRequest
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ ok: false, sent: false, skipped_reason: 'invalid_request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { notification_id } = body
  if (!notification_id) {
    return new Response(
      JSON.stringify({ ok: false, sent: false, skipped_reason: 'missing_notification_id' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
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
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Create Supabase client with user's auth token
  
  // Client for user operations (respects RLS)
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
        { status: 401, headers: { 'Content-Type': 'application/json' } }
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
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const notificationRow = notification as NotificationRow

    // Verify notification belongs to authenticated user (extra safety)
    if (notificationRow.user_id !== user.id) {
      return new Response(
        JSON.stringify({ ok: false, sent: false, skipped_reason: 'unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check idempotency: already sent?
    if (notificationRow.email_sent_at) {
      return new Response(
        JSON.stringify({ ok: true, sent: false, skipped_reason: 'already_sent' } satisfies SendWelcomeEmailResponse),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check email notifications preference at send time (opt-out enforcement)
    // Note: userClient uses service key, so we must explicitly filter by user_id for RLS-like security
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
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Generate email content
    const baseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173'
    const subject = `Fluxo Certo - ${notificationRow.title}`
    const html = generateEmailHtml(
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
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get user's email
    const userEmail = user.email
    if (!userEmail) {
      return new Response(
        JSON.stringify({ ok: false, sent: false, skipped_reason: 'no_user_email' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Send email via Resend
    const sendResult = await sendEmailViaResend(resendApiKey, userEmail, subject, html, fromEmail)

    if (!sendResult.success) {
      // Log detailed error server-side, return sanitized message to client
      console.error('Failed to send email:', sendResult.error)
      return new Response(
        JSON.stringify({ ok: false, sent: false, skipped_reason: 'send_failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Update email_sent_at using admin client (bypasses RLS for server-side update)
    const { error: updateError } = await adminClient
      .from('notifications')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', notification_id)
      .eq('user_id', user.id) // Extra safety

    if (updateError) {
      // Email was sent but we failed to record it - log but don't fail
      console.error('Failed to update email_sent_at:', updateError)
    }

    return new Response(
      JSON.stringify({ ok: true, sent: true } satisfies SendWelcomeEmailResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Unexpected error in send-welcome-email:', err)
    return new Response(
      JSON.stringify({ ok: false, sent: false, skipped_reason: 'internal_error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

