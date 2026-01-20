/**
 * Simple toast notification component.
 * Displays success or error messages with auto-dismiss.
 */

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CheckCircledIcon, CrossCircledIcon, Cross2Icon } from '@radix-ui/react-icons'

export type ToastType = 'success' | 'error'

interface ToastProps {
  message: string
  type: ToastType
  onDismiss: () => void
  onRetry?: () => void
  duration?: number
}

export function Toast({
  message,
  type,
  onDismiss,
  onRetry,
  duration = 5000,
}: ToastProps) {
  const [isExiting, setIsExiting] = useState(false)
  const dismissTimeoutRef = useRef<number | null>(null)

  const requestDismiss = () => {
    if (isExiting) return
    setIsExiting(true)

    // Let the exit animation play before unmounting.
    dismissTimeoutRef.current = window.setTimeout(() => {
      onDismiss()
    }, 190)
  }

  useEffect(() => {
    const timer = window.setTimeout(requestDismiss, duration)
    return () => {
      window.clearTimeout(timer)
      if (dismissTimeoutRef.current) {
        window.clearTimeout(dismissTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration])

  const isError = type === 'error'

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-[9999]',
        'w-[360px] max-w-[calc(100vw-2rem)]',
        'rounded-lg shadow-lg',
        'flex items-center gap-3 p-4',
        'fc-toast-enter',
        isExiting && 'fc-toast-exit',
        isError
          ? 'bg-destructive text-destructive-foreground'
          : 'bg-emerald-600 text-white'
      )}
      role="status"
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0',
          isError ? 'bg-white/15 text-white' : 'bg-white/15 text-white'
        )}
        aria-hidden="true"
      >
        {isError ? (
          <CrossCircledIcon className="h-5 w-5" />
        ) : (
          <CheckCircledIcon className="h-5 w-5" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium leading-snug text-white'
          )}
        >
          {message}
        </p>
      </div>

      <div className="flex items-center gap-1">
        {onRetry && isError && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            Tentar novamente
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={requestDismiss}
          className={cn(
            'h-8 w-8 text-white/90 hover:text-white',
            isError ? 'hover:bg-white/10' : 'hover:bg-white/10'
          )}
        >
          <Cross2Icon className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </Button>
      </div>
    </div>
  )
}


