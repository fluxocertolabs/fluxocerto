/**
 * Error state component with inline error message and retry button.
 */

import { cn } from '@/lib/utils'

interface ErrorStateProps {
  error: Error
  onRetry: () => void
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center',
        'min-h-[400px] rounded-xl border border-destructive/30',
        'bg-card p-8 text-center'
      )}
    >
      {/* Error icon */}
      <div className="mb-4 rounded-full bg-destructive/10 p-4">
        <svg
          aria-hidden="true"
          className="h-12 w-12 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Unable to Load Projection
      </h2>

      {/* Error message */}
      <p className="text-muted-foreground max-w-md mb-6">
        {error.message || 'An unexpected error occurred while calculating your cashflow projection.'}
      </p>

      {/* Retry button */}
      <button
        onClick={onRetry}
        className={cn(
          'inline-flex items-center justify-center gap-2',
          'rounded-lg bg-primary px-4 py-2',
          'text-sm font-medium text-primary-foreground',
          'hover:bg-primary/90 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
        )}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>
        Try Again
      </button>
    </div>
  )
}

