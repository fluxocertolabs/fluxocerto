/**
 * Modal skeleton component for Quick Update modal.
 * Matches the exact layout of the Quick Update modal content including:
 * - Description text placeholder
 * - Balance list items (3 items)
 */

import { cn } from '@/lib/utils'
import { SkeletonBalanceItem, SkeletonLine } from './skeleton-primitives'
import type { PageSkeletonProps } from '@/types/loading'

/**
 * Modal skeleton matching the Quick Update modal content layout.
 * Provides visual placeholders for the balance update list.
 */
export function ModalSkeleton({ className }: PageSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn(className)}
    >
      {/* Screen reader text */}
      <span className="sr-only">Carregando saldos...</span>

      {/* Description text placeholder */}
      <div className="mb-6 space-y-2">
        <SkeletonLine width="w-full" height="h-4" />
        <SkeletonLine width="w-3/4" height="h-4" />
      </div>

      {/* Balance list items skeleton */}
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <SkeletonBalanceItem key={i} />
        ))}
      </div>
    </div>
  )
}

