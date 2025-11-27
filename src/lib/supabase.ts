import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Result } from '@/stores/finance-store'

// Database row types for type-safe responses
export interface AccountRow {
  id: string
  user_id: string
  name: string
  type: 'checking' | 'savings' | 'investment'
  balance: number
  balance_updated_at: string | null
  created_at: string
  updated_at: string
}

export interface ProjectRow {
  id: string
  user_id: string
  name: string
  amount: number
  frequency: 'weekly' | 'biweekly' | 'twice-monthly' | 'monthly'
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
  }
  certainty: 'guaranteed' | 'probable' | 'uncertain'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ExpenseRow {
  id: string
  user_id: string
  name: string
  amount: number
  due_day: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreditCardRow {
  id: string
  user_id: string
  name: string
  statement_balance: number
  due_day: number
  balance_updated_at: string | null
  created_at: string
  updated_at: string
}

// Re-export types for use in hooks
export type Database = {
  public: {
    Tables: {
      accounts: { Row: AccountRow }
      projects: { Row: ProjectRow }
      expenses: { Row: ExpenseRow }
      credit_cards: { Row: CreditCardRow }
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
  if (!import.meta.env[SUPABASE_URL_VAR]) {
    missing.push(SUPABASE_URL_VAR)
  }
  if (!import.meta.env[SUPABASE_ANON_KEY_VAR]) {
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

  const url = import.meta.env[SUPABASE_URL_VAR]
  const anonKey = import.meta.env[SUPABASE_ANON_KEY_VAR]

  if (!url || !anonKey) {
    throw new Error(
      `Supabase configuration missing. Please set ${getMissingEnvVars().join(' and ')} in your .env file.`
    )
  }

  supabaseInstance = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // SPA doesn't use URL-based auth
    },
  })

  return supabaseInstance
}

/**
 * Initialize anonymous authentication.
 * Creates a new anonymous session if none exists.
 * Session persists in browser storage automatically.
 */
export async function initializeAuth(): Promise<void> {
  if (!isSupabaseConfigured()) {
    // Don't throw - let the app render the setup screen
    return
  }

  const client = getSupabase()
  const { data: { session }, error: sessionError } = await client.auth.getSession()
  
  if (sessionError) {
    console.error('Failed to get session:', sessionError.message)
    return
  }

  if (!session) {
    const { error: signInError } = await client.auth.signInAnonymously()
    if (signInError) {
      console.error('Failed to sign in anonymously:', signInError.message)
    }
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
 * Check if the app is online.
 * Uses navigator.onLine as a quick check.
 */
export function isOnline(): boolean {
  return navigator.onLine
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
    error: 'An unexpected error occurred.',
  }
}
