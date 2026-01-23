/**
 * Manage page skeleton component.
 * Matches the exact layout of the Manage (Gerenciar) page including:
 * - Tab bar
 * - Optional filter placeholder
 * - Grid/list of entity items
 * - Full-width add button placeholder
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

      {/* Tab bar */}
      <div className="mb-6">
        <SkeletonTabs />
      </div>

      {/* Filter/controls row placeholder */}
      <div className="flex justify-end mb-4">
        <SkeletonLine width="w-36" height="h-10" className="rounded-md" />
      </div>

      {/* Entity grid/list skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonListItem key={i} />
        ))}
      </div>

      {/* Add button placeholder */}
      <SkeletonLine width="w-full" height="h-10" className="rounded-md mt-4" />
    </div>
  )
}

