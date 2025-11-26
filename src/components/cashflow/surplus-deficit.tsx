/**
 * Surplus/Deficit display component
 * Shows net change (end balance - starting balance) for both scenarios
 */

import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'

interface SurplusDeficitProps {
  /** Optimistic scenario surplus (positive) or deficit (negative) in dollars */
  optimistic: number
  /** Pessimistic scenario surplus (positive) or deficit (negative) in dollars */
  pessimistic: number
}

export function SurplusDeficit({ optimistic, pessimistic }: SurplusDeficitProps) {
  const formatValue = (value: number) => {
    const isSurplus = value >= 0
    const label = isSurplus ? 'Surplus' : 'Deficit'
    // Convert to cents for formatCurrency, use absolute value
    const formatted = formatCurrency(Math.abs(value) * 100)

    return {
      label,
      formatted,
      isSurplus,
    }
  }

  const optimisticData = formatValue(optimistic)
  const pessimisticData = formatValue(pessimistic)

  // Check if both scenarios are the same
  const isSameScenario =
    optimisticData.isSurplus === pessimisticData.isSurplus &&
    Math.abs(optimistic - pessimistic) < 0.01

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        'bg-card border-border'
      )}
    >
      <p className="text-sm text-muted-foreground mb-3">Projected Change</p>

      <div className="space-y-2">
        {/* Optimistic scenario */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Best case:</span>
          <span
            className={cn(
              'font-semibold',
              optimisticData.isSurplus ? 'text-green-600' : 'text-red-600'
            )}
          >
            {optimisticData.isSurplus ? '+' : '-'}{optimisticData.formatted}
            <span className="text-xs font-normal ml-1">
              ({optimisticData.label})
            </span>
          </span>
        </div>

        {/* Pessimistic scenario (only show if different) */}
        {!isSameScenario && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Worst case:</span>
            <span
              className={cn(
                'font-semibold',
                pessimisticData.isSurplus ? 'text-green-600' : 'text-red-600'
              )}
            >
              {pessimisticData.isSurplus ? '+' : '-'}{pessimisticData.formatted}
              <span className="text-xs font-normal ml-1">
                ({pessimisticData.label})
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

