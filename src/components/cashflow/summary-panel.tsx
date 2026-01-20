/**
 * SummaryPanel - Statistics summary cards for the dashboard.
 * Displays starting balance, income, expenses, ending balance, danger day count, and surplus/deficit.
 */

import { motion, useReducedMotion } from 'motion/react'
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
        'rounded-xl border bg-card p-4 h-full',
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
  const shouldReduceMotion = useReducedMotion()

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
    <motion.div
      data-testid="summary-panel"
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
      initial={shouldReduceMotion ? false : 'hidden'}
      animate={shouldReduceMotion ? undefined : 'show'}
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: 0.08, delayChildren: 0.05 },
        },
      }}
    >
      {/* Starting Balance */}
      <motion.div
        className="h-full"
        variants={{
          hidden: { opacity: 0, y: 10 },
          show: { opacity: 1, y: 0 },
        }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        <StatCard
          label="Saldo Inicial"
          value={formatCurrency(startingBalance * 100)}
        />
      </motion.div>

      {/* Total Income (showing both scenarios) */}
      <motion.div
        className="h-full"
        variants={{
          hidden: { opacity: 0, y: 10 },
          show: { opacity: 1, y: 0 },
        }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        <StatCard
          label="Renda Esperada"
          value={formatCurrency(optimistic.totalIncome * 100)}
          sublabel={
            optimistic.totalIncome !== pessimistic.totalIncome
              ? `Garantido: ${formatCurrency(pessimistic.totalIncome * 100)}`
              : undefined
          }
          variant="success"
        />
      </motion.div>

      {/* Total Expenses */}
      <motion.div
        className="h-full"
        variants={{
          hidden: { opacity: 0, y: 10 },
          show: { opacity: 1, y: 0 },
        }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        <StatCard
          label="Total de Despesas"
          value={formatCurrency(optimistic.totalExpenses * 100)}
        />
      </motion.div>

      {/* Ending Balance (optimistic) */}
      <motion.div
        className="h-full"
        variants={{
          hidden: { opacity: 0, y: 10 },
          show: { opacity: 1, y: 0 },
        }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        <StatCard
          label="Saldo Final"
          value={formatCurrency(optimistic.endBalance * 100)}
          sublabel={
            optimistic.endBalance !== pessimistic.endBalance
              ? `Pessimista: ${formatCurrency(pessimistic.endBalance * 100)}`
              : undefined
          }
          variant={getBalanceVariant(optimistic.endBalance)}
        />
      </motion.div>

      {/* Surplus/Deficit */}
      <motion.div
        className="col-span-2 md:col-span-2 h-full"
        variants={{
          hidden: { opacity: 0, y: 10 },
          show: { opacity: 1, y: 0 },
        }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        <SurplusDeficit
          optimistic={optimistic.surplus}
          pessimistic={pessimistic.surplus}
        />
      </motion.div>

      {/* Danger Days (only show if there are any) */}
      {hasDangerDays && (
        <motion.div
          className="col-span-2 md:col-span-4"
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className={cn(
              'rounded-xl border border-red-500/30 bg-red-500/5 p-4',
              'fc-glow-red',
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
                {maxDangerDays} {maxDangerDays !== 1 ? 'Dias de Perigo Detectados' : 'Dia de Perigo Detectado'}
              </p>
              <p className="text-sm text-muted-foreground">
                {optimistic.dangerDayCount > 0 && pessimistic.dangerDayCount > 0 ? (
                  <>
                    {optimistic.dangerDayCount} no cenário otimista,{' '}
                    {pessimistic.dangerDayCount} no cenário pessimista
                  </>
                ) : optimistic.dangerDayCount > 0 ? (
                  'Mesmo no cenário otimista'
                ) : (
                  'Apenas no cenário pessimista'
                )}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

