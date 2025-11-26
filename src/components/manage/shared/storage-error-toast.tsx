import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StorageErrorToastProps {
  message: string
  onRetry?: () => void
  onDismiss: () => void
}

export function StorageErrorToast({
  message,
  onRetry,
  onDismiss,
}: StorageErrorToastProps) {
  return (
    <Card
      className={cn(
        'fixed bottom-4 right-4 z-50',
        'flex items-center gap-3 p-4',
        'bg-destructive/10 border-destructive/20',
        'animate-in slide-in-from-bottom-5'
      )}
    >
      <div className="flex-1">
        <p className="text-sm font-medium text-destructive">{message}</p>
      </div>
      <div className="flex gap-2">
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </Card>
  )
}

