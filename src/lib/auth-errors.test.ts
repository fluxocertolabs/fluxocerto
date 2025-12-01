/**
 * Auth Error Utilities Tests
 *
 * Tests for auth error message mapping and error type detection functions.
 */

import { describe, expect, it } from 'vitest'
import {
  getAuthErrorMessage,
  isRateLimitError,
  isNetworkError,
  isExpiredLinkError,
  AUTH_ERROR_MESSAGES,
} from './auth-errors'

// =============================================================================
// getAuthErrorMessage TESTS
// =============================================================================

describe('getAuthErrorMessage', () => {
  describe('null/undefined handling', () => {
    it('returns default message for null error', () => {
      expect(getAuthErrorMessage(null)).toBe(AUTH_ERROR_MESSAGES['default'])
    })
  })

  describe('rate limit errors', () => {
    it('detects rate limit by "rate" keyword', () => {
      const error = new Error('over_request_rate_limit')
      expect(getAuthErrorMessage(error)).toBe(AUTH_ERROR_MESSAGES['over_request_rate_limit'])
    })

    it('detects rate limit by "too many" keyword', () => {
      const error = new Error('Too many attempts, please try again')
      expect(getAuthErrorMessage(error)).toBe(AUTH_ERROR_MESSAGES['over_request_rate_limit'])
    })
  })

  describe('network errors', () => {
    it('detects network by "fetch" keyword', () => {
      const error = new Error('fetch failed')
      expect(getAuthErrorMessage(error)).toBe(AUTH_ERROR_MESSAGES['network_error'])
    })

    it('detects network by "network" keyword', () => {
      const error = new Error('Network error occurred')
      expect(getAuthErrorMessage(error)).toBe(AUTH_ERROR_MESSAGES['network_error'])
    })

    it('detects network by "timeout" keyword', () => {
      const error = new Error('Request timeout')
      expect(getAuthErrorMessage(error)).toBe(AUTH_ERROR_MESSAGES['network_error'])
    })
  })

  describe('expired link errors', () => {
    it('detects expired by "expired" keyword', () => {
      const error = new Error('The link has expired')
      expect(getAuthErrorMessage(error)).toBe(AUTH_ERROR_MESSAGES['otp_expired'])
    })

    it('detects expired by "otp_expired" keyword', () => {
      const error = new Error('otp_expired')
      expect(getAuthErrorMessage(error)).toBe(AUTH_ERROR_MESSAGES['otp_expired'])
    })
  })

  describe('invalid token errors', () => {
    it('detects invalid token', () => {
      const error = new Error('Invalid token provided')
      expect(getAuthErrorMessage(error)).toBe(AUTH_ERROR_MESSAGES['invalid_token'])
    })
  })

  describe('validation errors', () => {
    it('detects validation by "validation" keyword', () => {
      const error = new Error('Validation failed')
      expect(getAuthErrorMessage(error)).toBe(AUTH_ERROR_MESSAGES['validation_failed'])
    })

    it('detects validation by "invalid email" keyword', () => {
      const error = new Error('Invalid email format')
      expect(getAuthErrorMessage(error)).toBe(AUTH_ERROR_MESSAGES['validation_failed'])
    })
  })

  describe('error code mapping', () => {
    it('maps error codes to messages', () => {
      const error = new Error('Unknown') as Error & { code?: string }
      error.code = 'otp_expired'
      expect(getAuthErrorMessage(error)).toBe(AUTH_ERROR_MESSAGES['otp_expired'])
    })

    it('ignores unknown error codes', () => {
      const error = new Error('Unknown') as Error & { code?: string }
      error.code = 'unknown_code'
      expect(getAuthErrorMessage(error)).toBe(AUTH_ERROR_MESSAGES['default'])
    })
  })

  describe('default fallback', () => {
    it('returns default message for unknown errors', () => {
      const error = new Error('Something completely random happened')
      expect(getAuthErrorMessage(error)).toBe(AUTH_ERROR_MESSAGES['default'])
    })
  })

  describe('case insensitivity', () => {
    it('handles uppercase messages', () => {
      const error = new Error('RATE LIMIT EXCEEDED')
      expect(getAuthErrorMessage(error)).toBe(AUTH_ERROR_MESSAGES['over_request_rate_limit'])
    })

    it('handles mixed case messages', () => {
      const error = new Error('Network Error')
      expect(getAuthErrorMessage(error)).toBe(AUTH_ERROR_MESSAGES['network_error'])
    })
  })
})

// =============================================================================
// isRateLimitError TESTS
// =============================================================================

describe('isRateLimitError', () => {
  it('returns false for null error', () => {
    expect(isRateLimitError(null)).toBe(false)
  })

  it('returns true for "rate" keyword', () => {
    expect(isRateLimitError(new Error('rate limit exceeded'))).toBe(true)
  })

  it('returns true for "too many" keyword', () => {
    expect(isRateLimitError(new Error('too many requests'))).toBe(true)
  })

  it('returns false for unrelated errors', () => {
    expect(isRateLimitError(new Error('invalid token'))).toBe(false)
    expect(isRateLimitError(new Error('network error'))).toBe(false)
  })

  it('handles case insensitivity', () => {
    expect(isRateLimitError(new Error('RATE LIMIT'))).toBe(true)
    expect(isRateLimitError(new Error('Too Many Attempts'))).toBe(true)
  })
})

// =============================================================================
// isNetworkError TESTS
// =============================================================================

describe('isNetworkError', () => {
  it('returns false for null error', () => {
    expect(isNetworkError(null)).toBe(false)
  })

  it('returns true for "fetch" keyword', () => {
    expect(isNetworkError(new Error('fetch failed'))).toBe(true)
  })

  it('returns true for "network" keyword', () => {
    expect(isNetworkError(new Error('network error'))).toBe(true)
  })

  it('returns true for "timeout" keyword', () => {
    expect(isNetworkError(new Error('request timeout'))).toBe(true)
  })

  it('returns false for unrelated errors', () => {
    expect(isNetworkError(new Error('invalid token'))).toBe(false)
    expect(isNetworkError(new Error('rate limit'))).toBe(false)
  })

  it('handles case insensitivity', () => {
    expect(isNetworkError(new Error('NETWORK ERROR'))).toBe(true)
    expect(isNetworkError(new Error('Fetch Failed'))).toBe(true)
  })
})

// =============================================================================
// isExpiredLinkError TESTS
// =============================================================================

describe('isExpiredLinkError', () => {
  it('returns false for null error', () => {
    expect(isExpiredLinkError(null)).toBe(false)
  })

  it('returns true for "expired" keyword', () => {
    expect(isExpiredLinkError(new Error('link expired'))).toBe(true)
  })

  it('returns true for "otp_expired" keyword', () => {
    expect(isExpiredLinkError(new Error('otp_expired'))).toBe(true)
  })

  it('returns false for unrelated errors', () => {
    expect(isExpiredLinkError(new Error('invalid token'))).toBe(false)
    expect(isExpiredLinkError(new Error('network error'))).toBe(false)
  })

  it('handles case insensitivity', () => {
    expect(isExpiredLinkError(new Error('EXPIRED'))).toBe(true)
    expect(isExpiredLinkError(new Error('OTP_EXPIRED'))).toBe(true)
  })
})

// =============================================================================
// AUTH_ERROR_MESSAGES CONSTANT TESTS
// =============================================================================

describe('AUTH_ERROR_MESSAGES', () => {
  it('contains all expected error codes', () => {
    const expectedCodes = [
      'otp_expired',
      'otp_disabled',
      'invalid_token',
      'over_request_rate_limit',
      'over_email_send_rate_limit',
      'validation_failed',
      'invalid_email',
      'user_not_found',
      'invalid_credentials',
      'email_not_confirmed',
      'network_error',
      'fetch_error',
      'default',
    ]

    for (const code of expectedCodes) {
      expect(AUTH_ERROR_MESSAGES[code]).toBeDefined()
      expect(typeof AUTH_ERROR_MESSAGES[code]).toBe('string')
    }
  })

  it('has non-empty messages', () => {
    for (const value of Object.values(AUTH_ERROR_MESSAGES)) {
      expect(value.length).toBeGreaterThan(0)
    }
  })
})

