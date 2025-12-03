/**
 * Simple toast notification component.
 * Displays success or error messages with auto-dismiss.
 */

import { useEffect } from 'react'
import { Card } from '@/components/ui/card'
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
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [onDismiss, duration])

  const isError = type === 'error'

  return (
    <Card
      className={cn(
        'fixed bottom-4 right-4 z-50',
        'flex items-center gap-3 p-4 max-w-sm',
        'animate-in slide-in-from-bottom-5',
        isError
          ? 'bg-destructive/10 border-destructive/20'
          : 'bg-emerald-500/10 border-emerald-500/20'
      )}
    >
      {isError ? (
        <CrossCircledIcon className="h-5 w-5 text-destructive flex-shrink-0" />
      ) : (
        <CheckCircledIcon className="h-5 w-5 text-emerald-600 flex-shrink-0" />
      )}
      <div className="flex-1">
        <p
          className={cn(
            'text-sm font-medium',
            isError ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-400'
          )}
        >
          {message}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {onRetry && isError && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Tentar novamente
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-6 w-6 p-0"
        >
          <Cross2Icon className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </Button>
      </div>
    </Card>
  )
}


