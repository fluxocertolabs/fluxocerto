import type { User as SupabaseUser } from '@supabase/supabase-js'

export interface AuthState {
  user: SupabaseUser | null
  isLoading: boolean
  isAuthenticated: boolean
}

export interface LoginFormData {
  email: string
}

export interface AuthError {
  code: string
  message: string
}

