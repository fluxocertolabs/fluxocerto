/**
 * EstimatedBalanceIndicator
 *
 * Shows a clear "Saldo estimado" marker, explains the base date/range, and
 * provides a direct CTA to "Atualizar Saldos".
 */

import { cn } from '@/lib/utils'
import { Sparkles } from 'lucide-react'
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
        'flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4',
        className
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        <Sparkles className="h-6 w-6 flex-shrink-0 text-amber-700 dark:text-amber-400" />
        <div className="min-w-0">
          <p className="font-semibold text-amber-800 dark:text-amber-300">
            Saldo estimado
          </p>
          <p
            data-testid="estimated-balance-base"
            className="text-sm text-muted-foreground break-words"
          >
            {getBaseText(base)}
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onUpdateBalances}
        className="w-full sm:w-auto"
      >
        Atualizar Saldos
      </Button>
    </div>
  )
}
