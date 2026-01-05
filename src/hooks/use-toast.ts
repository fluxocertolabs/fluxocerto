/**
 * Hook for managing toast notification state.
 */

import { useCallback, useState } from 'react'
import type { ToastType } from '@/components/ui/toast'

interface ToastState {
  message: string
  type: ToastType
  onRetry?: () => void
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  const showToast = useCallback((message: string, type: ToastType, onRetry?: () => void) => {
    setToast({ message, type, onRetry })
  }, [])

  const hideToast = useCallback(() => {
    setToast(null)
  }, [])

  const showSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast])
  const showError = useCallback(
    (message: string, onRetry?: () => void) => showToast(message, 'error', onRetry),
    [showToast]
  )

  return {
    toast,
    showToast,
    hideToast,
    showSuccess,
    showError,
  }
}

