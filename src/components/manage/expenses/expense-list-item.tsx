import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { FixedExpense } from '@/types'

interface ExpenseListItemProps {
  expense: FixedExpense
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(navigator.language, {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

export function ExpenseListItem({
  expense,
  onEdit,
  onDelete,
  onToggleActive,
}: ExpenseListItemProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
        'p-4 rounded-lg border bg-card transition-opacity',
        !expense.isActive && 'opacity-60'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate" title={expense.name}>
            {expense.name}
          </span>
          {!expense.isActive && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded">Inativo</span>
          )}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          Vencimento dia {expense.dueDay}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-medium text-muted-foreground">
          {formatCurrency(expense.amount)}
        </span>
        
        <div className="flex items-center gap-1">
          <Switch
            checked={expense.isActive}
            onCheckedChange={onToggleActive}
            aria-label={expense.isActive ? 'Desativar despesa' : 'Ativar despesa'}
          />
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

