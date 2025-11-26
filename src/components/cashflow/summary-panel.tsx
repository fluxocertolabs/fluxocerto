/**
 * SummaryPanel - Statistics summary cards for the dashboard.
 * Displays starting balance, income, expenses, ending balance, danger day count, and surplus/deficit.
 */

import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { SurplusDeficit } from './surplus-deficit'
import type { SummaryStats } from './types'

interface SummaryPanelProps {
  stats: SummaryStats
}

interface StatCardProps {
  label: string
  value: string
  sublabel?: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

function StatCard({ label, value, sublabel, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'border-border',
    success: 'border-green-500/30 bg-green-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    danger: 'border-red-500/30 bg-red-500/5',
  }

  const valueStyles = {
    default: 'text-foreground',
    success: 'text-green-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
  }

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4',
        variantStyles[variant]
      )}
    >
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className={cn('text-xl font-semibold', valueStyles[variant])}>
        {value}
      </p>
      {sublabel && (
        <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
      )}
    </div>
  )
}

export function SummaryPanel({ stats }: SummaryPanelProps) {
  const { startingBalance, optimistic, pessimistic } = stats

  // Determine danger status
  const hasDangerDays = optimistic.dangerDayCount > 0 || pessimistic.dangerDayCount > 0
  const maxDangerDays = Math.max(optimistic.dangerDayCount, pessimistic.dangerDayCount)

  // Determine ending balance variant
  const getBalanceVariant = (balance: number): StatCardProps['variant'] => {
    if (balance < 0) return 'danger'
    if (balance < startingBalance * 0.2) return 'warning'
    return 'success'
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Starting Balance */}
      <StatCard
        label="Starting Balance"
        value={formatCurrency(startingBalance * 100)}
      />

      {/* Total Income (showing both scenarios) */}
      <StatCard
        label="Expected Income"
        value={formatCurrency(optimistic.totalIncome * 100)}
        sublabel={
          optimistic.totalIncome !== pessimistic.totalIncome
            ? `Guaranteed: ${formatCurrency(pessimistic.totalIncome * 100)}`
            : undefined
        }
        variant="success"
      />

      {/* Total Expenses */}
      <StatCard
        label="Total Expenses"
        value={formatCurrency(optimistic.totalExpenses * 100)}
      />

      {/* Ending Balance (optimistic) */}
      <StatCard
        label="Ending Balance"
        value={formatCurrency(optimistic.endBalance * 100)}
        sublabel={
          optimistic.endBalance !== pessimistic.endBalance
            ? `Pessimistic: ${formatCurrency(pessimistic.endBalance * 100)}`
            : undefined
        }
        variant={getBalanceVariant(optimistic.endBalance)}
      />

      {/* Surplus/Deficit */}
      <div className="col-span-2 md:col-span-2">
        <SurplusDeficit
          optimistic={optimistic.surplus}
          pessimistic={pessimistic.surplus}
        />
      </div>

      {/* Danger Days (only show if there are any) */}
      {hasDangerDays && (
        <div className="col-span-2 md:col-span-4">
          <div
            className={cn(
              'rounded-xl border border-red-500/30 bg-red-500/5 p-4',
              'flex items-center gap-3'
            )}
          >
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-red-600">
                {maxDangerDays} Danger Day{maxDangerDays !== 1 ? 's' : ''} Detected
              </p>
              <p className="text-sm text-muted-foreground">
                {optimistic.dangerDayCount > 0 && pessimistic.dangerDayCount > 0 ? (
                  <>
                    {optimistic.dangerDayCount} in optimistic scenario,{' '}
                    {pessimistic.dangerDayCount} in pessimistic scenario
                  </>
                ) : optimistic.dangerDayCount > 0 ? (
                  'Even in the optimistic scenario'
                ) : (
                  'Only in the pessimistic scenario'
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

