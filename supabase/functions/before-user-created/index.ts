import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

interface BeforeUserCreatedPayload {
  metadata: {
    uuid: string
    time: string
    name: 'before-user-created'
    ip_address: string
  }
  user: {
    id: string
    aud: string
    role: string
    email: string
    phone: string
    app_metadata: {
      provider: string
      providers: string[]
    }
    user_metadata: Record<string, unknown>
    identities: unknown[]
    created_at: string
    updated_at: string
    is_anonymous: boolean
  }
}

/**
 * Before User Created Auth Hook
 * 
 * This hook runs before a new user is created in Supabase Auth.
 * 
 * SELF-SERVE SIGNUPS: This hook now allows all signups with valid emails.
 * User provisioning (group + profile creation) is handled by:
 * 1. The on_auth_user_created trigger (best-effort)
 * 2. The ensure_current_user_group() RPC (client-side recovery)
 * 
 * The hook still validates the webhook signature for security.
 */
Deno.serve(async (req) => {
  // Get the webhook secret from environment
  const hookSecret = Deno.env.get('BEFORE_USER_CREATED_HOOK_SECRET')
  
  if (!hookSecret) {
    console.error('BEFORE_USER_CREATED_HOOK_SECRET is not set')
    // Fail closed on configuration error
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: 'System error during signup validation',
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Verify the webhook signature
    const payload = await req.text()
    const headers = Object.fromEntries(req.headers)
    
    // Remove the 'v1,whsec_' prefix if present
    const secret = hookSecret.replace('v1,whsec_', '')
    const wh = new Webhook(secret)
    
    // Verify throws if signature is invalid
    const verifiedPayload = wh.verify(payload, headers) as BeforeUserCreatedPayload
    
    const email = verifiedPayload.user.email?.toLowerCase() || ''
    
    if (!email) {
      // No email provided - block signup (email is required for Magic Link auth)
      return new Response(
        JSON.stringify({
          error: {
            http_code: 400,
            message: 'Signup not allowed',
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Self-serve signups: Allow all valid emails
    // User provisioning is handled by the on_auth_user_created trigger
    // and the ensure_current_user_group() RPC for recovery
    console.log('Allowed self-serve signup')
    return new Response('{}', { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    })
    
  } catch (error) {
    // Fail closed on any error (signature verification, etc.)
    console.error('Error in before-user-created hook:', error)
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: 'System error during signup validation',
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
