/**
 * Loading skeleton component for the dashboard.
 * Displays shimmer placeholders matching chart and summary panel shapes.
 */

import { cn } from '@/lib/utils'

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-xl border border-border bg-card p-4',
        'animate-pulse',
        className
      )}
    >
      <div className="h-4 w-20 rounded bg-muted mb-2" />
      <div className="h-8 w-28 rounded bg-muted" />
    </div>
  )
}

export function LoadingSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="space-y-6">
      {/* Screen reader text */}
      <span className="sr-only">Loading cashflow dashboard...</span>
      {/* Summary panel skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Chart skeleton */}
      <div
        className={cn(
          'rounded-xl border border-border bg-card p-4',
          'animate-pulse'
        )}
      >
        {/* Chart title placeholder */}
        <div className="h-6 w-48 rounded bg-muted mb-4" />

        {/* Chart area placeholder */}
        <div className="h-[300px] md:h-[400px] rounded-lg bg-muted relative overflow-hidden">
          {/* Shimmer effect */}
          <div
            className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
            }}
          />
        </div>

        {/* X-axis labels placeholder */}
        <div className="flex justify-between mt-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-4 w-10 rounded bg-muted" />
          ))}
        </div>
      </div>
    </div>
  )
}

