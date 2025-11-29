import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0'

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
      // No email provided - block signup
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

    // Create Supabase admin client to check allowed_emails
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Supabase environment variables not set')
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

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Check if email is in allowed list (profiles table, formerly allowed_emails)
    // citext handles case-insensitivity
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (error || !data) {
      // Email not in allowed list - block signup
      // Return 400 to prevent user creation
      // Note: Not logging email to avoid PII in logs
      console.log('Blocked signup attempt for non-approved email')
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

    // Email is allowed - permit signup
    // Note: Not logging email to avoid PII in logs
    console.log('Allowed signup for approved email')
    return new Response('{}', { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    })
    
  } catch (error) {
    // Fail closed on any error (signature verification, network, etc.)
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

