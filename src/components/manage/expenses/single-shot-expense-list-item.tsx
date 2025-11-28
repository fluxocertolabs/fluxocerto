import { format, isBefore, isSameDay, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SingleShotExpense } from '@/types'

interface SingleShotExpenseListItemProps {
  expense: SingleShotExpense
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

function getExpenseStatus(date: Date): 'past' | 'today' | 'future' {
  const today = startOfDay(new Date())
  const expenseDate = startOfDay(date)

  if (isBefore(expenseDate, today)) return 'past'
  if (isSameDay(expenseDate, today)) return 'today'
  return 'future'
}

export function SingleShotExpenseListItem({
  expense,
  onEdit,
  onDelete,
}: SingleShotExpenseListItemProps) {
  const status = getExpenseStatus(expense.date)
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
            title={expense.name}
          >
            {expense.name}
          </span>
          {isPast && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded">Vencido</span>
          )}
          {isToday && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
              Hoje
            </span>
          )}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {format(expense.date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className={cn('font-medium', isPast ? 'text-muted-foreground' : 'text-foreground')}>
          {formatCurrency(expense.amount)}
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

