import { format, isBefore, isSameDay, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SingleShotIncome } from '@/types'

interface SingleShotIncomeListItemProps {
  income: SingleShotIncome
  onEdit: () => void
  onDelete: () => void
}

function formatCurrency(cents: number): string {
  // Convert cents to reais for display
  const reais = cents / 100
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(reais)
}

function getIncomeStatus(date: Date): 'past' | 'today' | 'future' {
  const today = startOfDay(new Date())
  const incomeDate = startOfDay(date)

  if (isBefore(incomeDate, today)) return 'past'
  if (isSameDay(incomeDate, today)) return 'today'
  return 'future'
}

const CERTAINTY_LABELS: Record<string, string> = {
  guaranteed: 'Garantida',
  probable: 'Provável',
  uncertain: 'Incerta',
}

const CERTAINTY_COLORS: Record<string, string> = {
  guaranteed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  probable: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  uncertain: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
}

export function SingleShotIncomeListItem({
  income,
  onEdit,
  onDelete,
}: SingleShotIncomeListItemProps) {
  const status = getIncomeStatus(income.date)
  const isPast = status === 'past'
  const isToday = status === 'today'

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
        'p-4 rounded-lg border bg-card transition-opacity',
        isPast && 'opacity-60'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn('font-medium truncate', isPast && 'text-muted-foreground')}
            title={income.name}
          >
            {income.name}
          </span>
          {isPast && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded">Recebido</span>
          )}
          {isToday && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
              Hoje
            </span>
          )}
          <span className={cn('text-xs px-2 py-0.5 rounded', CERTAINTY_COLORS[income.certainty])}>
            {CERTAINTY_LABELS[income.certainty]}
          </span>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {format(income.date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className={cn('font-medium', isPast ? 'text-muted-foreground' : 'text-foreground')}>
          {formatCurrency(income.amount)}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 px-2 text-muted-foreground hover:text-destructive"
          >
            Excluir
          </Button>
        </div>
      </div>
    </div>
  )
}

