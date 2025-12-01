/**
 * Supabase Utility Functions Tests
 *
 * Tests for pure utility functions in the supabase module.
 * Functions that interact with Supabase client are tested through integration tests.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { getMissingEnvVars, isSupabaseConfigured, isOnline, handleSupabaseError } from './supabase'

// =============================================================================
// getMissingEnvVars TESTS
// =============================================================================

describe('getMissingEnvVars', () => {
  beforeEach(() => {
    // Reset env vars before each test
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns both vars when neither is set', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    
    const missing = getMissingEnvVars()
    
    expect(missing).toContain('VITE_SUPABASE_URL')
    expect(missing).toContain('VITE_SUPABASE_ANON_KEY')
    expect(missing.length).toBe(2)
  })

  it('returns only URL when URL is missing', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key')
    
    const missing = getMissingEnvVars()
    
    expect(missing).toContain('VITE_SUPABASE_URL')
    expect(missing).not.toContain('VITE_SUPABASE_ANON_KEY')
    expect(missing.length).toBe(1)
  })

  it('returns only ANON_KEY when key is missing', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    
    const missing = getMissingEnvVars()
    
    expect(missing).not.toContain('VITE_SUPABASE_URL')
    expect(missing).toContain('VITE_SUPABASE_ANON_KEY')
    expect(missing.length).toBe(1)
  })

  it('returns empty array when both are set', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key')
    
    const missing = getMissingEnvVars()
    
    expect(missing.length).toBe(0)
  })
})

// =============================================================================
// isSupabaseConfigured TESTS
// =============================================================================

describe('isSupabaseConfigured', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns false when env vars are missing', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    
    expect(isSupabaseConfigured()).toBe(false)
  })

  it('returns false when only URL is set', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    
    expect(isSupabaseConfigured()).toBe(false)
  })

  it('returns false when only ANON_KEY is set', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key')
    
    expect(isSupabaseConfigured()).toBe(false)
  })

  it('returns true when both are set', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key')
    
    expect(isSupabaseConfigured()).toBe(true)
  })
})

// =============================================================================
// isOnline TESTS
// =============================================================================

describe('isOnline', () => {
  it('returns true when navigator.onLine is true', () => {
    vi.stubGlobal('navigator', { onLine: true })
    
    expect(isOnline()).toBe(true)
    
    vi.unstubAllGlobals()
  })

  it('returns false when navigator.onLine is false', () => {
    vi.stubGlobal('navigator', { onLine: false })
    
    expect(isOnline()).toBe(false)
    
    vi.unstubAllGlobals()
  })
})

// =============================================================================
// handleSupabaseError TESTS
// =============================================================================

// Helper type for error results (always returns failure from handleSupabaseError)
type ErrorResult = { success: false; error: string; details?: unknown }

describe('handleSupabaseError', () => {
  beforeEach(() => {
    // Default to online
    vi.stubGlobal('navigator', { onLine: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('network errors', () => {
    it('returns network error when offline', () => {
      vi.stubGlobal('navigator', { onLine: false })
      
      const result = handleSupabaseError(new Error('any error')) as ErrorResult
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Unable to connect. Please check your internet connection.')
    })

    it('returns network error for fetch errors', () => {
      const result = handleSupabaseError(new Error('Failed to fetch')) as ErrorResult
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Unable to connect. Please check your internet connection.')
    })

    it('returns network error for network errors', () => {
      const result = handleSupabaseError(new Error('network request failed')) as ErrorResult
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Unable to connect. Please check your internet connection.')
    })
  })

  describe('timeout errors', () => {
    it('returns timeout error for timeout messages', () => {
      const result = handleSupabaseError(new Error('Request timeout')) as ErrorResult
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Request timed out. Please try again.')
    })

    it('returns timeout error for Timeout messages (case variation)', () => {
      const result = handleSupabaseError(new Error('Operation Timeout exceeded')) as ErrorResult
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Request timed out. Please try again.')
    })
  })

  describe('PostgreSQL error codes', () => {
    it('returns duplicate error for code 23505', () => {
      const result = handleSupabaseError({ code: '23505', message: 'duplicate key' }) as ErrorResult
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('A record with this ID already exists.')
    })

    it('returns permission error for code 42501', () => {
      const result = handleSupabaseError({ code: '42501', message: 'permission denied' }) as ErrorResult
      
      expect(result.success).toBe(false)
      expect(result.error).toBe("You don't have permission to perform this action.")
    })

    it('returns storage limit error for code 54000', () => {
      const result = handleSupabaseError({ code: '54000', message: 'storage exceeded' }) as ErrorResult
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Storage limit reached. Please upgrade your Supabase plan or delete unused data.')
    })
  })

  describe('PostgREST error codes', () => {
    it('returns not found error for PGRST116', () => {
      const result = handleSupabaseError({ code: 'PGRST116', message: 'not found' }) as ErrorResult
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Record not found.')
    })

    it('detects PGRST codes in error message', () => {
      const result = handleSupabaseError({ message: 'Error PGRST116: resource not found' }) as ErrorResult
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Record not found.')
    })
  })

  describe('error details preservation', () => {
    it('preserves error details when available', () => {
      const result = handleSupabaseError({
        code: '23505',
        message: 'duplicate key',
        details: 'Key (id)=(123) already exists',
      }) as ErrorResult
      
      expect(result.success).toBe(false)
      expect(result.details).toBe('Key (id)=(123) already exists')
    })

    it('returns original message when no code mapping found', () => {
      const result = handleSupabaseError({
        message: 'Custom database error',
        details: 'Some details',
      }) as ErrorResult
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Custom database error')
      expect(result.details).toBe('Some details')
    })
  })

  describe('fallback error handling', () => {
    it('returns generic error for unknown error types', () => {
      const result = handleSupabaseError({}) as ErrorResult
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Ocorreu um erro inesperado.')
    })

    it('returns generic error for null', () => {
      const result = handleSupabaseError(null) as ErrorResult
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Ocorreu um erro inesperado.')
    })

    it('returns generic error for undefined', () => {
      const result = handleSupabaseError(undefined) as ErrorResult
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Ocorreu um erro inesperado.')
    })

    it('returns generic error for primitive values', () => {
      const result = handleSupabaseError('string error') as ErrorResult
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Ocorreu um erro inesperado.')
    })
  })
})
