/**
 * Manage page skeleton component.
 * Matches the exact layout of the Manage (Gerenciar) page including:
 * - Tab bar with 4 tabs
 * - Add button placeholder
 * - List of entity items
 */

import { cn } from '@/lib/utils'
import { SkeletonTabs, SkeletonListItem, SkeletonLine } from './skeleton-primitives'
import type { PageSkeletonProps } from '@/types/loading'

/**
 * Manage page skeleton matching the full manage page layout.
 * Provides visual placeholders for tabs and entity lists.
 */
export function ManageSkeleton({ className }: PageSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn(className)}
    >
      {/* Screen reader text */}
      <span className="sr-only">Carregando dados financeiros...</span>

      {/* Tab bar and add button row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <SkeletonTabs />
        {/* Add button placeholder */}
        <SkeletonLine width="w-36" height="h-10" className="rounded-md" />
      </div>

      {/* Entity list skeleton - 5 items */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <SkeletonListItem key={i} />
        ))}
      </div>
    </div>
  )
}

