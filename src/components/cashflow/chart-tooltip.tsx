/**
 * ChartTooltip - Custom tooltip for day-level details.
 * Shows date, balances, and income/expense events.
 */

import { cn } from '@/lib/utils'
import { formatCurrency, formatTooltipDate } from '@/lib/format'
import type { ChartDataPoint } from './types'

// Color constants
const COLORS = {
  optimistic: '#22c55e',
  pessimistic: '#f59e0b',
  danger: '#ef4444',
  income: '#22c55e',
  expense: '#ef4444',
} as const

interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{ payload: ChartDataPoint }>
}

export function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  // Get the data point from payload
  const dataPoint = payload[0]?.payload as ChartDataPoint | undefined
  if (!dataPoint) return null

  const { snapshot } = dataPoint
  const isDanger = snapshot.isOptimisticDanger || snapshot.isPessimisticDanger

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-3 shadow-lg',
        'min-w-[200px] max-w-[280px]',
        isDanger && 'border-destructive/30'
      )}
    >
      {/* Date header */}
      <p className="font-medium text-foreground mb-2">
        {formatTooltipDate(snapshot.date)}
      </p>

      {/* Balance section */}
      <div className="space-y-1 mb-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Optimistic:</span>
          <span
            className={cn(
              'text-sm font-medium',
              snapshot.isOptimisticDanger ? 'text-destructive' : ''
            )}
            style={{ color: snapshot.isOptimisticDanger ? COLORS.danger : COLORS.optimistic }}
          >
            {formatCurrency(snapshot.optimisticBalance)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Pessimistic:</span>
          <span
            className={cn(
              'text-sm font-medium',
              snapshot.isPessimisticDanger ? 'text-destructive' : ''
            )}
            style={{ color: snapshot.isPessimisticDanger ? COLORS.danger : COLORS.pessimistic }}
          >
            {formatCurrency(snapshot.pessimisticBalance)}
          </span>
        </div>
      </div>

      {/* Income events */}
      {snapshot.incomeEvents.length > 0 && (
        <div className="border-t border-border pt-2 mb-2">
          <p className="text-xs font-medium text-muted-foreground mb-1">Income</p>
          <div className="space-y-1">
            {snapshot.incomeEvents.map((event, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-foreground truncate mr-2">
                  {event.projectName}
                  {event.certainty !== 'guaranteed' && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({event.certainty})
                    </span>
                  )}
                </span>
                <span style={{ color: COLORS.income }}>
                  +{formatCurrency(event.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense events */}
      {snapshot.expenseEvents.length > 0 && (
        <div className="border-t border-border pt-2">
          <p className="text-xs font-medium text-muted-foreground mb-1">Expenses</p>
          <div className="space-y-1">
            {snapshot.expenseEvents.map((event, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-foreground truncate mr-2">
                  {event.sourceName}
                  {event.sourceType === 'credit_card' && (
                    <span className="text-xs text-muted-foreground ml-1">(CC)</span>
                  )}
                </span>
                <span style={{ color: COLORS.expense }}>
                  -{formatCurrency(event.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No events message */}
      {snapshot.incomeEvents.length === 0 && snapshot.expenseEvents.length === 0 && (
        <p className="text-xs text-muted-foreground border-t border-border pt-2">
          No transactions on this day
        </p>
      )}
    </div>
  )
}

