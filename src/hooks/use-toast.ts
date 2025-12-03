/**
 * Hook for managing toast notification state.
 */

import { useState } from 'react'
import type { ToastType } from '@/components/ui/toast'

interface ToastState {
  message: string
  type: ToastType
  onRetry?: () => void
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  const showToast = (message: string, type: ToastType, onRetry?: () => void) => {
    setToast({ message, type, onRetry })
  }

  const hideToast = () => {
    setToast(null)
  }

  const showSuccess = (message: string) => showToast(message, 'success')
  const showError = (message: string, onRetry?: () => void) =>
    showToast(message, 'error', onRetry)

  return {
    toast,
    showToast,
    hideToast,
    showSuccess,
    showError,
  }
}

