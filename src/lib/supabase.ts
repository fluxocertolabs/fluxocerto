import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { Result } from '@/stores/finance-store'
import type {
  OnboardingStateRow,
  OnboardingState,
  OnboardingStep,
  OnboardingStatus,
  TourStateRow,
  TourState,
  TourKey,
  TourStatus,
  NotificationRow,
  Notification,
  BillingSubscriptionRow,
  BillingSubscription,
} from '@/types'
import {
  transformOnboardingStateRow,
  transformTourStateRow,
  transformNotificationRow,
  transformBillingSubscriptionRow,
} from '@/types'

// Database row types for type-safe responses

export interface GroupRow {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface ProfileRow {
  id: string
  name: string
  email: string | null
  group_id: string
  created_at: string
  created_by: string | null
}

// Base account row without joined data
interface AccountRowBase {
  id: string
  name: string
  type: 'checking' | 'savings' | 'investment'
  balance: number
  balance_updated_at: string | null
  owner_id: string | null
  created_at: string
  updated_at: string
}

// Account row with joined owner (Supabase returns single object or null for FK joins)
export interface AccountRow extends AccountRowBase {
  owner: { id: string; name: string } | null
}

export interface ProjectRow {
  id: string
  name: string
  amount: number
  type: 'recurring' | 'single_shot'
  // Recurring project fields (required when type = 'recurring', null for single_shot)
  frequency: 'weekly' | 'biweekly' | 'twice-monthly' | 'monthly' | null
  payment_schedule: {
    type: 'dayOfWeek'
    dayOfWeek: number
  } | {
    type: 'dayOfMonth'
    dayOfMonth: number
  } | {
    type: 'twiceMonthly'
    firstDay: number
    secondDay: number
  } | null
  is_active: boolean | null
  // Single-shot income field (required when type = 'single_shot', null for recurring)
  date: string | null  // ISO date string
  // Common fields
  certainty: 'guaranteed' | 'probable' | 'uncertain'
  created_at: string
  updated_at: string
}

export interface ExpenseRow {
  id: string
  name: string
  amount: number
  type: 'fixed' | 'single_shot'
  due_day: number | null      // Present for fixed, null for single_shot
  date: string | null         // ISO date string, present for single_shot, null for fixed
  is_active: boolean
  created_at: string
  updated_at: string
}

// Base credit card row without joined data
interface CreditCardRowBase {
  id: string
  name: string
  statement_balance: number
  due_day: number
  balance_updated_at: string | null
  owner_id: string | null
  created_at: string
  updated_at: string
}

// Credit card row with joined owner
export interface CreditCardRow extends CreditCardRowBase {
  owner: { id: string; name: string } | null
}

// Re-export types for use in hooks
export type Database = {
  public: {
    Tables: {
      accounts: { Row: AccountRow }
      projects: { Row: ProjectRow }
      expenses: { Row: ExpenseRow }
      credit_cards: { Row: CreditCardRow }
      profiles: { Row: ProfileRow }
    }
  }
}

// Environment variable names
const SUPABASE_URL_VAR = 'VITE_SUPABASE_URL'
const SUPABASE_ANON_KEY_VAR = 'VITE_SUPABASE_ANON_KEY'

/**
 * Check which environment variables are missing.
 * Used by setup screen to show user which vars need to be configured.
 */
export function getMissingEnvVars(): string[] {
  const missing: string[] = []
  if (!import.meta.env.VITE_SUPABASE_URL) {
    missing.push(SUPABASE_URL_VAR)
  }
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
    missing.push(SUPABASE_ANON_KEY_VAR)
  }
  return missing
}

/**
 * Check if Supabase is properly configured.
 */
export function isSupabaseConfigured(): boolean {
  return getMissingEnvVars().length === 0
}

// Create Supabase client singleton
// Using 'any' for database type to avoid complex generic issues
// Type safety is maintained through explicit row types
let supabaseInstance: SupabaseClient | null = null

/**
 * Get the Supabase client instance.
 * Creates a new instance if one doesn't exist.
 * Throws an error if environment variables are missing.
 */
export function getSupabase(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance
  }

  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      `Supabase configuration missing. Please set ${getMissingEnvVars().join(' and ')} in your .env file.`
    )
  }

  supabaseInstance = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true, // Enable for Magic Link callback handling
    },
  })

  return supabaseInstance
}

/**
 * Check if dev authentication tokens are present in environment.
 * Used to determine if dev auth bypass should be attempted.
 * 
 * DEV MODE ONLY: This function is part of the local development auth bypass system.
 * It checks for pre-generated session tokens that allow skipping the login flow.
 * 
 * @returns true if both VITE_DEV_ACCESS_TOKEN and VITE_DEV_REFRESH_TOKEN are set
 * @see injectDevSession for the token injection logic
 * @see scripts/generate-dev-token.ts for token generation
 */
export function hasDevTokens(): boolean {
  const accessToken = import.meta.env.VITE_DEV_ACCESS_TOKEN
  const refreshToken = import.meta.env.VITE_DEV_REFRESH_TOKEN
  return Boolean(accessToken && refreshToken)
}

/**
 * Check if dev auth bypass should be disabled for the current page.
 * Useful for login/visual/auth tests that must exercise the real login flow.
 */
export function isDevAuthBypassDisabled(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  const raw = params.get('disableDevAuth')
  return raw === '1' || raw === 'true'
}

/**
 * Preview-only auth bypass toggle.
 *
 * This is intended for PR preview deployments (e.g. Vercel "Preview") where we
 * want to skip the Magic Link login flow while reviewing changes.
 *
 * IMPORTANT: This must never be enabled for production deployments.
 */
export function isPreviewAuthBypassEnabled(): boolean {
  const raw = import.meta.env.VITE_PREVIEW_AUTH_BYPASS
  return raw === 'true' || raw === '1'
}

/**
 * Inject dev session tokens into Supabase client.
 * DEV MODE ONLY - This function bypasses normal authentication for local development.
 * 
 * Allows AI agents and developers to immediately access authenticated views
 * without manual login by using pre-generated session tokens.
 * 
 * Security guards:
 * - Only works when import.meta.env.DEV is true (Vite dev mode)
 * - Requires both access and refresh tokens to be present
 * - Falls back to normal login if injection fails
 * 
 * Usage flow:
 * 1. Run `pnpm run gen:token` to generate tokens
 * 2. Script writes tokens to .env
 * 3. Start dev server with `pnpm dev:app`
 * 4. App auto-authenticates without login screen
 * 
 * @returns Result indicating success or failure with error message
 * @see hasDevTokens for token detection
 * @see scripts/generate-dev-token.ts for token generation
 */
export async function injectDevSession(): Promise<{ success: boolean; error?: string }> {
  // Guard: Only works in DEV mode
  if (!import.meta.env.DEV) {
    return { success: false, error: 'Dev session injection only works in DEV mode' }
  }

  // Guard: Require both tokens
  if (!hasDevTokens()) {
    return { success: false, error: 'Dev tokens not present in environment' }
  }

  // Guard: Supabase must be configured
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase is not configured' }
  }

  const accessToken = import.meta.env.VITE_DEV_ACCESS_TOKEN!
  const refreshToken = import.meta.env.VITE_DEV_REFRESH_TOKEN!

  try {
    const client = getSupabase()
    const { error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    if (error) {
      return { success: false, error: `setSession failed: ${error.message}` }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: `Dev session injection failed: ${message}` }
  }
}

/**
 * Inject a preview session (PR preview deployments).
 *
 * This calls a server endpoint that mints a session for a known preview user and
 * then injects the returned access/refresh tokens into the Supabase client.
 *
 * Security guards:
 * - Only runs when VITE_PREVIEW_AUTH_BYPASS is enabled (build-time flag)
 * - The server endpoint is expected to be disabled outside Preview deployments
 */
export async function injectPreviewSession(): Promise<{ success: boolean; error?: string }> {
  // Guard: require explicit enable
  if (!isPreviewAuthBypassEnabled()) {
    return { success: false, error: 'Preview auth bypass is disabled' }
  }

  // Guard: Supabase must be configured
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase is not configured' }
  }

  try {
    const response = await fetch('/api/preview-auth-bypass', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    let payload: unknown = null
    try {
      payload = await response.json()
    } catch {
      // ignore JSON parse error, handle below
    }

    if (!response.ok) {
      const message =
        typeof payload === 'object' && payload !== null && 'error' in payload
          ? String((payload as { error?: unknown }).error ?? 'Unknown error')
          : `HTTP ${response.status}`
      return { success: false, error: `Preview auth endpoint failed: ${message}` }
    }

    const data = payload as { accessToken?: unknown; refreshToken?: unknown }
    const accessToken = typeof data.accessToken === 'string' ? data.accessToken : null
    const refreshToken = typeof data.refreshToken === 'string' ? data.refreshToken : null

    if (!accessToken || !refreshToken) {
      return { success: false, error: 'Preview auth endpoint returned invalid tokens' }
    }

    const client = getSupabase()
    const { error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (error) {
      return { success: false, error: `setSession failed: ${error.message}` }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: `Preview session injection failed: ${message}` }
  }
}

/**
 * Initialize authentication state.
 * For Magic Link auth, we just check if there's an existing session.
 * No automatic sign-in - users must authenticate via Magic Link.
 */
export async function initializeAuth(): Promise<void> {
  if (!isSupabaseConfigured()) {
    // Don't throw - let the app render the setup screen
    return
  }

  // Just initialize the client and check for existing session
  // The auth state will be managed by onAuthStateChange
  const client = getSupabase()
  const { error: sessionError } = await client.auth.getSession()
  
  if (sessionError) {
    console.error('Failed to get session:', sessionError.message)
  }
}

/**
 * Get the current user's ID.
 * Returns null if not authenticated.
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  const client = getSupabase()
  const { data: { user } } = await client.auth.getUser()
  return user?.id ?? null
}

/**
 * Get the current authenticated user.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  const client = getSupabase()
  const { data: { user } } = await client.auth.getUser()
  return user
}

/**
 * Request a Magic Link for email authentication.
 * Always shows success message to prevent email enumeration.
 * Self-serve signups are allowed for any email address.
 */
export async function signInWithMagicLink(email: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase is not configured') }
  }

  const client = getSupabase()
  const emailRedirectTo = `${window.location.origin}/auth/confirm`

  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      shouldCreateUser: true, // Let the hook handle validation
    },
  })

  return { error }
}

/**
 * Sign out the current user.
 * Clears session from browser storage.
 */
export async function signOut(): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase is not configured') }
  }

  const client = getSupabase()
  const { error } = await client.auth.signOut()
  return { error }
}

/**
 * Check if the app is online.
 * Uses navigator.onLine as a quick check.
 */
export function isOnline(): boolean {
  return navigator.onLine
}

/**
 * Get the current user's group_id.
 * Returns null if not authenticated or no profile found.
 * Uses email to lookup profile since profiles.id may not match auth.uid().
 */
export async function getGroupId(): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  const client = getSupabase()
  // Prefer getSession() (reads local storage) over getUser() (network call).
  // In E2E/CI under heavy parallel load, the auth service call can become a bottleneck
  // and occasionally stall long enough to cause UI flows (e.g. add account/card) to hang.
  const { data: { session } } = await client.auth.getSession()
  let email = session?.user?.email ?? null

  // Fallback: if there's no session yet (rare, but can happen during early hydration),
  // ask Supabase for the user (network).
  if (!email) {
    const { data: { user } } = await client.auth.getUser()
    email = user?.email ?? null
  }

  if (!email) return null

  const { data: profile, error } = await client
    .from('profiles')
    .select('group_id')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (error || !profile) {
    return null
  }

  return profile.group_id
}

/**
 * Invite a new user to the current user's group.
 * Creates a profile entry with the group_id, allowing the user to sign up.
 * 
 * @param email - Email address of the user to invite
 * @returns Result with success/error status
 */
export async function inviteUser(email: string): Promise<Result<void>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase não está configurado' }
  }

  const client = getSupabase()
  
  // Get current user's group_id
  const groupId = await getGroupId()
  if (!groupId) {
    return { success: false, error: 'Não foi possível identificar seu grupo' }
  }

  // Check if email already exists in any group
  const { data: existingProfile, error: checkError } = await client
    .from('profiles')
    .select('id, group_id')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (checkError) {
    return handleSupabaseError(checkError)
  }

  if (existingProfile) {
    if (existingProfile.group_id === groupId) {
      return { success: false, error: 'Este email já é membro do seu grupo' }
    }
    return { success: false, error: 'Este email já pertence a outro grupo' }
  }

  // Extract name from email (part before @)
  const name = email.split('@')[0].replace(/[._-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

  // Create profile with group_id
  const { error: insertError } = await client
    .from('profiles')
    .insert({
      name,
      email: email.toLowerCase(),
      group_id: groupId,
    })

  if (insertError) {
    // Handle duplicate key error specifically
    if (insertError.code === '23505') {
      return { success: false, error: 'Este email já está cadastrado no sistema' }
    }
    return handleSupabaseError(insertError)
  }

  return { success: true, data: undefined }
}

// Error code mappings for Supabase/PostgREST errors
const ERROR_MESSAGES: Record<string, string> = {
  // PostgreSQL error codes
  '23505': 'A record with this ID already exists.',
  '42501': "You don't have permission to perform this action.",
  '54000': 'Storage limit reached. Please upgrade your Supabase plan or delete unused data.',
  // PostgREST error codes
  'PGRST116': 'Record not found.',
  // PGRST205: table/view not found in schema cache (usually means migrations not applied or API schema not refreshed)
  'PGRST205': import.meta.env.DEV
    ? 'Banco de dados local desatualizado: tabela não encontrada. Rode `pnpm db:reset` e reinicie o app.'
    : 'Banco de dados desatualizado: recurso indisponível no momento.',
  // Network errors
  'NETWORK_ERROR': 'Unable to connect. Please check your internet connection.',
  'TIMEOUT': 'Request timed out. Please try again.',
}

/**
 * Map Supabase/PostgREST errors to user-friendly messages.
 * Returns a Result<T> type matching existing store interface.
 */
export function handleSupabaseError<T = never>(error: unknown): Result<T> {
  // Check for network errors
  if (!isOnline()) {
    return {
      success: false,
      error: ERROR_MESSAGES['NETWORK_ERROR'],
    }
  }

  if (error instanceof Error) {
    // Check for timeout
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      return {
        success: false,
        error: ERROR_MESSAGES['TIMEOUT'],
      }
    }

    // Check for network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        success: false,
        error: ERROR_MESSAGES['NETWORK_ERROR'],
      }
    }
  }

  // Handle Supabase error objects
  if (typeof error === 'object' && error !== null) {
    const err = error as { code?: string; message?: string; details?: string }
    
    // Check for known error codes
    if (err.code && ERROR_MESSAGES[err.code]) {
      return {
        success: false,
        error: ERROR_MESSAGES[err.code],
        details: err.details,
      }
    }

    // Check for PostgREST errors in message
    if (err.message) {
      for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
        if (err.message.includes(code)) {
          return {
            success: false,
            error: message,
            details: err.details,
          }
        }
      }

      // Return the original message if no mapping found
      return {
        success: false,
        error: err.message,
        details: err.details,
      }
    }
  }

  return {
    success: false,
    error: 'Ocorreu um erro inesperado.',
  }
}

// ============================================================================
// PROVISIONING HELPERS
// ============================================================================

/**
 * Ensure the current user has a valid group and profile membership.
 * Calls the ensure_current_user_group RPC function.
 * 
 * This is idempotent and safe to call multiple times.
 * For self-serve signups, creates a new group with id = auth.uid().
 * For invited users, uses their existing group membership.
 * 
 * @returns Result with group_id and created flag, or error
 */
export async function ensureCurrentUserGroup(): Promise<Result<{ groupId: string; created: boolean }>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase não está configurado' }
  }

  const client = getSupabase()

  try {
    const { data, error } = await client.rpc('ensure_current_user_group')

    if (error) {
      // Handle specific error codes
      if (error.code === 'P0001') {
        return { success: false, error: 'Você precisa estar autenticado para continuar' }
      }
      if (error.code === 'P0002') {
        return { success: false, error: 'Email não encontrado. Por favor, faça login novamente.' }
      }
      return handleSupabaseError(error)
    }

    const result = data as { group_id: string; created: boolean }
    return {
      success: true,
      data: {
        groupId: result.group_id,
        created: result.created,
      },
    }
  } catch (err) {
    return handleSupabaseError(err)
  }
}

// ============================================================================
// ONBOARDING STATE HELPERS
// ============================================================================

/**
 * Get the current user's onboarding state for their group.
 * Returns null if no onboarding state exists.
 */
export async function getOnboardingState(): Promise<Result<OnboardingState | null>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase não está configurado' }
  }

  const client = getSupabase()

  try {
    const { data, error } = await client
      .from('onboarding_states')
      .select('*')
      .maybeSingle()

    if (error) {
      // PGRST116 means no rows - this is expected for new users
      if (error.code === 'PGRST116') {
        return { success: true, data: null }
      }
      return handleSupabaseError(error)
    }

    if (!data) {
      return { success: true, data: null }
    }

    return { success: true, data: transformOnboardingStateRow(data as OnboardingStateRow) }
  } catch (err) {
    return handleSupabaseError(err)
  }
}

/**
 * Create or update the onboarding state for the current user.
 */
export async function upsertOnboardingState(
  state: Partial<{
    status: OnboardingStatus
    currentStep: OnboardingStep
    autoShownAt: Date | null
    dismissedAt: Date | null
    completedAt: Date | null
    metadata: Record<string, unknown> | null
  }>
): Promise<Result<OnboardingState>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase não está configurado' }
  }

  const client = getSupabase()
  const { data: { user } } = await client.auth.getUser()
  
  if (!user) {
    return { success: false, error: 'Você precisa estar autenticado' }
  }

  const groupId = await getGroupId()
  if (!groupId) {
    return { success: false, error: 'Grupo não encontrado' }
  }

  try {
    const row: Partial<OnboardingStateRow> = {
      user_id: user.id,
      group_id: groupId,
    }

    if (state.status !== undefined) row.status = state.status
    if (state.currentStep !== undefined) row.current_step = state.currentStep
    if (state.autoShownAt !== undefined) row.auto_shown_at = state.autoShownAt?.toISOString() ?? null
    if (state.dismissedAt !== undefined) row.dismissed_at = state.dismissedAt?.toISOString() ?? null
    if (state.completedAt !== undefined) row.completed_at = state.completedAt?.toISOString() ?? null
    if (state.metadata !== undefined) row.metadata = state.metadata

    const { data, error } = await client
      .from('onboarding_states')
      .upsert(row, { onConflict: 'user_id,group_id' })
      .select()
      .single()

    if (error) {
      return handleSupabaseError(error)
    }

    return { success: true, data: transformOnboardingStateRow(data as OnboardingStateRow) }
  } catch (err) {
    return handleSupabaseError(err)
  }
}

// ============================================================================
// BILLING SUBSCRIPTION HELPERS
// ============================================================================

/**
 * Get the current group's billing subscription status.
 * Returns null if no billing record exists yet.
 */
export async function getBillingSubscription(): Promise<Result<BillingSubscription | null>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase não está configurado' }
  }

  const client = getSupabase()

  try {
    const groupId = await getGroupId()
    if (!groupId) {
      return { success: false, error: 'Grupo não encontrado' }
    }

    const { data, error } = await client
      .from('billing_subscriptions')
      .select('*')
      .eq('group_id', groupId)
      .maybeSingle()

    if (error) {
      return handleSupabaseError(error)
    }

    if (!data) {
      return { success: true, data: null }
    }

    return { success: true, data: transformBillingSubscriptionRow(data as BillingSubscriptionRow) }
  } catch (err) {
    return handleSupabaseError(err)
  }
}

/**
 * Create a Stripe Checkout Session for the current group.
 * Returns the Stripe-hosted checkout URL.
 */
export async function createStripeCheckoutSession(): Promise<Result<{ url: string }>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase não está configurado' }
  }

  const client = getSupabase()

  try {
    const { data: { session }, error: sessionError } = await client.auth.getSession()
    if (sessionError || !session) {
      return { success: false, error: 'Você precisa estar autenticado' }
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const functionUrl = `${supabaseUrl}/functions/v1/create-stripe-checkout-session`
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!anonKey) {
      return { success: false, error: 'Supabase não está configurado' }
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 10_000)

    let response: Response
    try {
      response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${session.access_token}`,
        },
        signal: controller.signal,
      })
    } finally {
      window.clearTimeout(timeout)
    }

    let payload: { ok: boolean; url?: string; error?: string } | null = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    if (!response.ok || !payload?.ok || !payload.url) {
      return {
        success: false,
        error: payload?.error ?? 'Falha ao iniciar pagamento',
      }
    }

    return { success: true, data: { url: payload.url } }
  } catch (err) {
    return handleSupabaseError(err)
  }
}

/**
 * Create a Stripe Customer Portal Session for the current group.
 * Returns the Stripe-hosted portal URL.
 */
export async function createStripeCustomerPortalSession(): Promise<Result<{ url: string }>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase não está configurado' }
  }

  const client = getSupabase()

  try {
    const { data: { session }, error: sessionError } = await client.auth.getSession()
    if (sessionError || !session) {
      return { success: false, error: 'Você precisa estar autenticado' }
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const functionUrl = `${supabaseUrl}/functions/v1/create-stripe-customer-portal-session`
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!anonKey) {
      return { success: false, error: 'Supabase não está configurado' }
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 10_000)

    let response: Response
    try {
      response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${session.access_token}`,
        },
        signal: controller.signal,
      })
    } finally {
      window.clearTimeout(timeout)
    }

    let payload: { ok: boolean; url?: string; error?: string } | null = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    if (!response.ok || !payload?.ok || !payload.url) {
      const errorKey = payload?.error ?? 'Falha ao abrir portal'
      const errorMessages: Record<string, string> = {
        billing_customer_not_found: 'Nenhuma assinatura encontrada para este grupo.',
        group_not_found: 'Grupo não encontrado.',
        unauthorized: 'Você precisa estar autenticado.',
        origin_not_allowed: 'Origem não permitida.',
        server_configuration_error: 'Configuração do servidor indisponível.',
      }
      return {
        success: false,
        error: errorMessages[errorKey] ?? errorKey,
      }
    }

    return { success: true, data: { url: payload.url } }
  } catch (err) {
    return handleSupabaseError(err)
  }
}

// ============================================================================
// TOUR STATE HELPERS
// ============================================================================

/**
 * Get all tour states for the current user.
 */
export async function getTourStates(): Promise<Result<TourState[]>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase não está configurado' }
  }

  const client = getSupabase()

  try {
    const { data, error } = await client
      .from('tour_states')
      .select('*')

    if (error) {
      return handleSupabaseError(error)
    }

    return {
      success: true,
      data: (data as TourStateRow[]).map(transformTourStateRow),
    }
  } catch (err) {
    return handleSupabaseError(err)
  }
}

/**
 * Get a specific tour state for the current user.
 */
export async function getTourState(tourKey: TourKey): Promise<Result<TourState | null>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase não está configurado' }
  }

  const client = getSupabase()

  try {
    const { data, error } = await client
      .from('tour_states')
      .select('*')
      .eq('tour_key', tourKey)
      .maybeSingle()

    if (error) {
      // PGRST116 means no rows - tour not yet seen
      if (error.code === 'PGRST116') {
        return { success: true, data: null }
      }
      return handleSupabaseError(error)
    }

    if (!data) {
      return { success: true, data: null }
    }

    return { success: true, data: transformTourStateRow(data as TourStateRow) }
  } catch (err) {
    return handleSupabaseError(err)
  }
}

/**
 * Create or update a tour state for the current user.
 */
export async function upsertTourState(
  tourKey: TourKey,
  state: {
    status: TourStatus
    version: number
  }
): Promise<Result<TourState>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase não está configurado' }
  }

  const client = getSupabase()
  const { data: { user } } = await client.auth.getUser()
  
  if (!user) {
    return { success: false, error: 'Você precisa estar autenticado' }
  }

  try {
    const now = new Date().toISOString()
    const row: Partial<TourStateRow> = {
      user_id: user.id,
      tour_key: tourKey,
      status: state.status,
      version: state.version,
      completed_at: state.status === 'completed' ? now : null,
      dismissed_at: state.status === 'dismissed' ? now : null,
    }

    const { data, error } = await client
      .from('tour_states')
      .upsert(row, { onConflict: 'user_id,tour_key' })
      .select()
      .single()

    if (error) {
      return handleSupabaseError(error)
    }

    return { success: true, data: transformTourStateRow(data as TourStateRow) }
  } catch (err) {
    return handleSupabaseError(err)
  }
}

// ============================================================================
// NOTIFICATION HELPERS
// ============================================================================

/**
 * Response shape from ensure_welcome_notification RPC.
 */
interface EnsureWelcomeNotificationResponse {
  created: boolean
  notification_id: string
}

/**
 * Ensure the welcome notification exists for the current user.
 * This is idempotent - calling multiple times will not create duplicates.
 * 
 * @returns Result with { created: boolean, notificationId: string }
 */
export async function ensureWelcomeNotification(): Promise<Result<{ created: boolean; notificationId: string }>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase não está configurado' }
  }

  const client = getSupabase()

  try {
    const { data, error } = await client.rpc('ensure_welcome_notification')

    if (error) {
      return handleSupabaseError(error)
    }

    // Validate RPC response shape before using
    if (
      data === null ||
      typeof data !== 'object' ||
      typeof (data as Record<string, unknown>).created !== 'boolean' ||
      typeof (data as Record<string, unknown>).notification_id !== 'string'
    ) {
      return { success: false, error: 'Resposta inválida do servidor' }
    }

    const result = data as EnsureWelcomeNotificationResponse
    return {
      success: true,
      data: {
        created: result.created,
        notificationId: result.notification_id,
      },
    }
  } catch (err) {
    return handleSupabaseError(err)
  }
}

/**
 * List notifications for the current user, newest first.
 * 
 * @param options.limit - Maximum number of notifications to return (default: 50, max: 100)
 * @param options.unreadOnly - If true, only return unread notifications
 * @returns Result with array of Notification objects
 */
export async function listNotifications(options?: {
  limit?: number
  unreadOnly?: boolean
}): Promise<Result<Notification[]>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase não está configurado' }
  }

  const client = getSupabase()
  // Clamp limit to avoid accidental expensive queries (min 1, max 100)
  const rawLimit = options?.limit ?? 50
  const limit = Math.max(1, Math.min(100, rawLimit))
  const unreadOnly = options?.unreadOnly ?? false

  try {
    let query = client
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.is('read_at', null)
    }

    const { data, error } = await query

    if (error) {
      return handleSupabaseError(error)
    }

    return {
      success: true,
      data: (data as NotificationRow[]).map(transformNotificationRow),
    }
  } catch (err) {
    return handleSupabaseError(err)
  }
}

/**
 * Get the count of unread notifications for the current user.
 * 
 * @returns Result with unread count
 */
export async function getUnreadNotificationCount(): Promise<Result<number>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase não está configurado' }
  }

  const client = getSupabase()

  try {
    const { count, error } = await client
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .is('read_at', null)

    if (error) {
      return handleSupabaseError(error)
    }

    return { success: true, data: count ?? 0 }
  } catch (err) {
    return handleSupabaseError(err)
  }
}

/**
 * Mark a notification as read.
 * Uses the SECURITY DEFINER RPC for least-privilege access.
 * 
 * @param notificationId - The notification ID to mark as read
 * @returns Result indicating success or failure
 */
export async function markNotificationRead(notificationId: string): Promise<Result<void>> {
  if (!notificationId || notificationId.trim() === '') {
    return { success: false, error: 'ID de notificação inválido' }
  }

  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase não está configurado' }
  }

  const client = getSupabase()

  try {
    const { error } = await client.rpc('mark_notification_read', {
      notification_id: notificationId,
    })

    if (error) {
      return handleSupabaseError(error)
    }

    return { success: true, data: undefined }
  } catch (err) {
    return handleSupabaseError(err)
  }
}

// ============================================================================
// USER PREFERENCE HELPERS (per-user preferences)
// ============================================================================

type UserPreferenceKey =
  | 'email_notifications_enabled'
  | 'analytics_enabled'
  | 'session_recordings_enabled'

async function getUserPreferenceValue(
  key: UserPreferenceKey
): Promise<Result<string | null>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase não está configurado' }
  }

  const client = getSupabase()
  const { data: { user } } = await client.auth.getUser()

  if (!user) {
    return { success: false, error: 'Você precisa estar autenticado' }
  }

  try {
    const { data, error } = await client
      .from('user_preferences')
      .select('value')
      .eq('user_id', user.id)
      .eq('key', key)
      .maybeSingle()

    if (error) {
      return handleSupabaseError(error)
    }

    return { success: true, data: data?.value ?? null }
  } catch (err) {
    return handleSupabaseError(err)
  }
}

async function setUserPreferenceValue(
  key: UserPreferenceKey,
  value: string
): Promise<Result<void>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase não está configurado' }
  }

  const client = getSupabase()
  const { data: { user } } = await client.auth.getUser()

  if (!user) {
    return { success: false, error: 'Você precisa estar autenticado' }
  }

  try {
    const { error } = await client.from('user_preferences').upsert(
      {
        user_id: user.id,
        key,
        value,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,key',
      }
    )

    if (error) {
      return handleSupabaseError(error)
    }

    return { success: true, data: undefined }
  } catch (err) {
    return handleSupabaseError(err)
  }
}

async function getUserPreferenceBoolean(
  key: UserPreferenceKey,
  defaultValue: boolean
): Promise<Result<boolean>> {
  const result = await getUserPreferenceValue(key)
  if (!result.success) {
    return result
  }

  if (result.data === null) {
    return { success: true, data: defaultValue }
  }

  return { success: true, data: result.data !== 'false' }
}

async function setUserPreferenceBoolean(
  key: UserPreferenceKey,
  enabled: boolean
): Promise<Result<void>> {
  return setUserPreferenceValue(key, enabled ? 'true' : 'false')
}

/**
 * Get the email notifications enabled preference for the current user.
 * Returns true (enabled) when the preference row is missing (opt-out semantics).
 * 
 * @returns Result with boolean indicating if email notifications are enabled
 */
export async function getEmailNotificationsEnabled(): Promise<Result<boolean>> {
  return getUserPreferenceBoolean('email_notifications_enabled', true)
}

/**
 * Set the email notifications enabled preference for the current user.
 * 
 * @param enabled - Whether email notifications should be enabled
 * @returns Result indicating success or failure
 */
export async function setEmailNotificationsEnabled(enabled: boolean): Promise<Result<void>> {
  return setUserPreferenceBoolean('email_notifications_enabled', enabled)
}

/**
 * Get analytics enabled preference for the current user.
 * Defaults to true (opt-out semantics).
 */
export async function getAnalyticsEnabled(): Promise<Result<boolean>> {
  return getUserPreferenceBoolean('analytics_enabled', true)
}

/**
 * Set analytics enabled preference for the current user.
 */
export async function setAnalyticsEnabled(enabled: boolean): Promise<Result<void>> {
  return setUserPreferenceBoolean('analytics_enabled', enabled)
}

/**
 * Get session recordings enabled preference for the current user.
 * Defaults to true (opt-out semantics).
 */
export async function getSessionRecordingsEnabled(): Promise<Result<boolean>> {
  return getUserPreferenceBoolean('session_recordings_enabled', true)
}

/**
 * Set session recordings enabled preference for the current user.
 */
export async function setSessionRecordingsEnabled(enabled: boolean): Promise<Result<void>> {
  return setUserPreferenceBoolean('session_recordings_enabled', enabled)
}

// ============================================================================
// WELCOME EMAIL HELPERS
// ============================================================================

/**
 * Response shape from send-welcome-email Edge Function.
 */
interface SendWelcomeEmailResponse {
  ok: boolean
  sent: boolean
  skipped_reason?: string
  preview?: {
    subject: string
    html: string
  }
}

/**
 * Trigger the welcome email for a notification via the Edge Function.
 * 
 * This function:
 * - Validates the notification belongs to the user
 * - Checks email_notifications_enabled preference
 * - Enforces idempotency (won't send twice)
 * - Returns a preview when email provider is not configured (dev/test)
 * 
 * @param notificationId - The notification ID to send the welcome email for
 * @returns Result with send status and optional preview
 */
export async function triggerWelcomeEmail(notificationId: string): Promise<Result<{
  sent: boolean
  skippedReason?: string
  preview?: { subject: string; html: string }
}>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase não está configurado' }
  }

  const client = getSupabase()
  
  try {
    // Get the current session for auth header
    const { data: { session }, error: sessionError } = await client.auth.getSession()
    if (sessionError || !session) {
      return { success: false, error: 'Você precisa estar autenticado' }
    }

    // Construct the Edge Function URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const functionUrl = `${supabaseUrl}/functions/v1/send-welcome-email`

    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!anonKey) {
      return { success: false, error: 'Supabase não está configurado' }
    }

    // Add timeout to prevent hanging requests
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 10_000)
    
    let response: Response
    try {
      response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Supabase API gateway expects apikey even when using a user JWT.
          // Without it, the request can be rejected before reaching the Edge Function.
          apikey: anonKey,
          'Authorization': `Bearer ${session.access_token}`,
        },
        signal: controller.signal,
        body: JSON.stringify({ notification_id: notificationId }),
      })
    } finally {
      window.clearTimeout(timeout)
    }

    let data: SendWelcomeEmailResponse
    try {
      data = await response.json()
    } catch {
      return { success: false, error: 'Resposta inválida do servidor' }
    }

    if (!data.ok) {
      // Map common skip reasons to user-friendly messages
      const reasonMessages: Record<string, string> = {
        'unauthorized': 'Você não tem permissão para esta ação',
        'notification_not_found': 'Notificação não encontrada',
        'missing_notification_id': 'ID da notificação não informado',
        'invalid_request': 'Requisição inválida',
        'no_user_email': 'Email do usuário não encontrado',
        'internal_error': 'Erro interno do servidor',
      }
      const message = data.skipped_reason 
        ? (reasonMessages[data.skipped_reason] || data.skipped_reason)
        : 'Falha ao enviar email'
      return { success: false, error: message }
    }

    return {
      success: true,
      data: {
        sent: data.sent,
        skippedReason: data.skipped_reason,
        preview: data.preview,
      },
    }
  } catch (err) {
    return handleSupabaseError(err)
  }
}
