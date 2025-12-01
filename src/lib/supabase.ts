import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { Result } from '@/stores/finance-store'

// Database row types for type-safe responses

export interface HouseholdRow {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface ProfileRow {
  id: string
  name: string
  email: string | null
  household_id: string
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
 * The before-user-created hook handles invite validation.
 */
export async function signInWithMagicLink(email: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase is not configured') }
  }

  const client = getSupabase()
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/confirm`,
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
 * Get the current user's household_id.
 * Returns null if not authenticated or no profile found.
 */
export async function getHouseholdId(): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  const client = getSupabase()
  const { data: { user } } = await client.auth.getUser()
  
  if (!user) {
    return null
  }

  const { data: profile, error } = await client
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    return null
  }

  return profile.household_id
}

/**
 * Invite a new user to the current user's household.
 * Creates a profile entry with the household_id, allowing the user to sign up.
 * 
 * @param email - Email address of the user to invite
 * @returns Result with success/error status
 */
export async function inviteUser(email: string): Promise<Result<void>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase não está configurado' }
  }

  const client = getSupabase()
  
  // Get current user's household_id
  const householdId = await getHouseholdId()
  if (!householdId) {
    return { success: false, error: 'Não foi possível identificar sua residência' }
  }

  // Check if email already exists in any household
  const { data: existingProfile, error: checkError } = await client
    .from('profiles')
    .select('id, household_id')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (checkError) {
    return handleSupabaseError(checkError)
  }

  if (existingProfile) {
    if (existingProfile.household_id === householdId) {
      return { success: false, error: 'Este email já é membro da sua residência' }
    }
    return { success: false, error: 'Este email já pertence a outra residência' }
  }

  // Extract name from email (part before @)
  const name = email.split('@')[0].replace(/[._-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

  // Create profile with household_id
  const { error: insertError } = await client
    .from('profiles')
    .insert({
      name,
      email: email.toLowerCase(),
      household_id: householdId,
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
