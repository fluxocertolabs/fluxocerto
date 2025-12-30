/**
 * EstimatedBalanceIndicator
 *
 * Shows a clear "Saldo estimado" marker, explains the base date/range, and
 * provides a direct CTA to "Atualizar Saldos".
 */

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { formatDayMonth, formatDayMonthRange } from '@/lib/format'
import type { BalanceUpdateBase } from '@/lib/cashflow'

interface EstimatedBalanceIndicatorProps {
  base: BalanceUpdateBase
  onUpdateBalances: () => void
  className?: string
}

function getBaseText(base: BalanceUpdateBase): string {
  if (base.kind === 'single') {
    return `Baseado na última atualização em ${formatDayMonth(base.date)}`
  }

  return `Baseado nas últimas atualizações entre ${formatDayMonthRange(base.from, base.to)}`
}

export function EstimatedBalanceIndicator({
  base,
  onUpdateBalances,
  className,
}: EstimatedBalanceIndicatorProps) {
  return (
    <div
      data-testid="estimated-balance-indicator"
      className={cn(
        'rounded-xl border p-4',
        'bg-amber-500/10 border-amber-500/30',
        'flex items-start justify-between gap-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <SparklesIcon className="h-6 w-6 flex-shrink-0 text-amber-700 dark:text-amber-400" />
        <div>
          <p className="font-semibold text-amber-800 dark:text-amber-300">
            Saldo estimado
          </p>
          <p
            data-testid="estimated-balance-base"
            className="text-sm text-muted-foreground"
          >
            {getBaseText(base)}
          </p>
        </div>
      </div>

      <Button variant="outline" size="sm" onClick={onUpdateBalances}>
        Atualizar Saldos
      </Button>
    </div>
  )
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
      focusable="false"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-2.377-2.377L3 12.75l2.846-.813a4.5 4.5 0 0 0 2.377-2.377L9 6.75l.813 2.846a4.5 4.5 0 0 0 2.377 2.377L15 12.75l-2.846.813a4.5 4.5 0 0 0-2.377 2.377ZM18.25 10.5l.375 1.313a2.25 2.25 0 0 0 1.187 1.187L21.125 13l-1.313.375a2.25 2.25 0 0 0-1.187 1.187L18.25 15.875l-.375-1.313a2.25 2.25 0 0 0-1.187-1.187L15.375 13l1.313-.375a2.25 2.25 0 0 0 1.187-1.187L18.25 10.5Z"
      />
    </svg>
  )
}


