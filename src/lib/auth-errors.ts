/**
 * Auth error message mapping for user-friendly error display.
 * Maps Supabase auth error codes to clear, actionable messages.
 */

export interface AuthErrorMapping {
  [key: string]: string
}

export const AUTH_ERROR_MESSAGES: AuthErrorMapping = {
  // Magic Link errors
  'otp_expired': 'This link has expired. Please request a new one.',
  'otp_disabled': 'Login links are not enabled.',
  'invalid_token': 'Invalid login link. Please request a new one.',
  
  // Rate limiting
  'over_request_rate_limit': 'Too many requests. Please wait a few minutes and try again.',
  'over_email_send_rate_limit': 'Too many requests. Please wait a few minutes and try again.',
  
  // Validation errors
  'validation_failed': 'Please enter a valid email address.',
  'invalid_email': 'Please enter a valid email address.',
  
  // Security (same message to prevent enumeration)
  'user_not_found': 'Check your email for the login link.',
  'invalid_credentials': 'Check your email for the login link.',
  'email_not_confirmed': 'Check your email for the login link.',
  
  // Network errors
  'network_error': 'Unable to connect. Please check your internet connection.',
  'fetch_error': 'Unable to connect. Please check your internet connection.',
  
  // Generic
  'default': 'Something went wrong. Please try again.',
}

/**
 * Safely get a lowercase message string from an error.
 */
function getErrorMessageLowercase(error: Error | null): string {
  if (!error) return ''
  if (typeof error.message === 'string') {
    return error.message.toLowerCase()
  }
  return String(error).toLowerCase()
}

/**
 * Get a user-friendly error message from a Supabase auth error.
 */
export function getAuthErrorMessage(error: Error | null): string {
  if (!error) {
    return AUTH_ERROR_MESSAGES['default']
  }

  const message = getErrorMessageLowercase(error)
  
  // Check for rate limiting
  if (message.includes('rate') || message.includes('too many')) {
    return AUTH_ERROR_MESSAGES['over_request_rate_limit']
  }
  
  // Check for network errors
  if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
    return AUTH_ERROR_MESSAGES['network_error']
  }
  
  // Check for expired link
  if (message.includes('expired') || message.includes('otp_expired')) {
    return AUTH_ERROR_MESSAGES['otp_expired']
  }
  
  // Check for invalid token
  if (message.includes('invalid') && message.includes('token')) {
    return AUTH_ERROR_MESSAGES['invalid_token']
  }
  
  // Check for validation errors
  if (message.includes('validation') || message.includes('invalid email')) {
    return AUTH_ERROR_MESSAGES['validation_failed']
  }

  // Check for known error codes in the error object
  const errorWithCode = error as { code?: string }
  if (errorWithCode.code && AUTH_ERROR_MESSAGES[errorWithCode.code]) {
    return AUTH_ERROR_MESSAGES[errorWithCode.code]
  }

  // Return default message for unknown errors
  return AUTH_ERROR_MESSAGES['default']
}

/**
 * Check if an error is a rate limit error.
 */
export function isRateLimitError(error: Error | null): boolean {
  if (!error) return false
  const message = getErrorMessageLowercase(error)
  return message.includes('rate') || message.includes('too many')
}

/**
 * Check if an error is a network error.
 */
export function isNetworkError(error: Error | null): boolean {
  if (!error) return false
  const message = getErrorMessageLowercase(error)
  return message.includes('fetch') || message.includes('network') || message.includes('timeout')
}

/**
 * Check if an error is an expired link error.
 */
export function isExpiredLinkError(error: Error | null): boolean {
  if (!error) return false
  const message = getErrorMessageLowercase(error)
  return message.includes('expired') || message.includes('otp_expired')
}
