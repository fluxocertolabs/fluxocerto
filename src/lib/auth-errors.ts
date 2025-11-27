/**
 * Auth error message mapping for user-friendly error display.
 * Maps Supabase auth error codes to clear, actionable messages.
 */

export interface AuthErrorMapping {
  [key: string]: string
}

export const AUTH_ERROR_MESSAGES: AuthErrorMapping = {
  // Magic Link errors
  'otp_expired': 'Este link expirou. Por favor, solicite um novo.',
  'otp_disabled': 'Links de acesso não estão habilitados.',
  'invalid_token': 'Link de acesso inválido. Por favor, solicite um novo.',
  
  // Rate limiting
  'over_request_rate_limit': 'Muitas tentativas. Por favor, aguarde alguns minutos e tente novamente.',
  'over_email_send_rate_limit': 'Muitas tentativas. Por favor, aguarde alguns minutos e tente novamente.',
  
  // Validation errors
  'validation_failed': 'Por favor, insira um endereço de e-mail válido.',
  'invalid_email': 'Por favor, insira um endereço de e-mail válido.',
  
  // Security (same message to prevent enumeration)
  'user_not_found': 'Verifique seu e-mail para o link de acesso.',
  'invalid_credentials': 'Verifique seu e-mail para o link de acesso.',
  'email_not_confirmed': 'Verifique seu e-mail para o link de acesso.',
  
  // Network errors
  'network_error': 'Não foi possível conectar. Verifique sua conexão com a internet.',
  'fetch_error': 'Não foi possível conectar. Verifique sua conexão com a internet.',
  
  // Generic
  'default': 'Algo deu errado. Por favor, tente novamente.',
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
