/**
 * PageLoadingWrapper - Coordinates loading skeleton and content transitions.
 * Provides smooth fade transitions, ARIA accessibility, and error state handling.
 */

import { cn } from '@/lib/utils'
import { ErrorState } from '@/components/cashflow/error-state'
import { ERROR_MESSAGES } from '@/types/loading'
import type { CoordinatedLoadingState } from '@/types/loading'

interface PageLoadingWrapperProps {
  /** Coordinated loading state from useCoordinatedLoading hook */
  loadingState: CoordinatedLoadingState
  /** Skeleton component to display during loading */
  skeleton: React.ReactNode
  /** Actual content to display when loaded */
  children: React.ReactNode
  /** Optional additional CSS classes */
  className?: string
}

/**
 * Wrapper component that handles the transition between skeleton and content.
 *
 * Features:
 * - ARIA live region for screen reader announcements
 * - Smooth opacity fade transition (250ms)
 * - Error state display with retry functionality
 * - Zero layout shift (skeleton and content occupy same space)
 */
export function PageLoadingWrapper({
  loadingState,
  skeleton,
  children,
  className,
}: PageLoadingWrapperProps) {
  const { showSkeleton, showError, errorMessage, retry } = loadingState

  // Show error state if loading failed or timed out
  if (showError) {
    return (
      <ErrorState
        error={new Error(errorMessage ?? ERROR_MESSAGES.unknown)}
        onRetry={retry}
      />
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={showSkeleton}
      className={cn('relative', className)}
    >
      {/* Skeleton layer - fades out when content is ready */}
      <div
        className={cn(
          'transition-opacity duration-[250ms] ease-out',
          showSkeleton
            ? 'opacity-100'
            : 'opacity-0 pointer-events-none absolute inset-0'
        )}
        aria-hidden={!showSkeleton}
      >
        {showSkeleton && (
          <span className="sr-only">Carregando conteúdo...</span>
        )}
        {skeleton}
      </div>

      {/* Content layer - fades in when ready */}
      <div
        className={cn(
          'transition-opacity duration-[250ms] ease-out',
          showSkeleton ? 'opacity-0' : 'opacity-100'
        )}
      >
        {!showSkeleton && children}
      </div>
    </div>
  )
}

