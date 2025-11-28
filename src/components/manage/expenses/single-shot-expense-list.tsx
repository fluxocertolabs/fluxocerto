import type { SingleShotExpense } from '@/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SingleShotExpenseListItem } from './single-shot-expense-list-item'

interface SingleShotExpenseListProps {
  expenses: SingleShotExpense[]
  onAdd: () => void
  onEdit: (expense: SingleShotExpense) => void
  onDelete: (id: string) => void
}

export function SingleShotExpenseList({
  expenses,
  onAdd,
  onEdit,
  onDelete,
}: SingleShotExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center',
          'min-h-[200px] rounded-lg border border-dashed border-border',
          'bg-card p-6 text-center'
        )}
      >
        <h3 className="text-lg font-medium text-foreground mb-2">
          Nenhuma despesa pontual cadastrada
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Adicione despesas únicas como IPVA, matrícula escolar ou reparos
        </p>
        <Button onClick={onAdd}>Adicionar Despesa Pontual</Button>
      </div>
    )
  }

  // Sort expenses chronologically by date (ascending)
  const sortedExpenses = [...expenses].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )

  return (
    <div className="space-y-2">
      {sortedExpenses.map((expense) => (
        <SingleShotExpenseListItem
          key={expense.id}
          expense={expense}
          onEdit={() => onEdit(expense)}
          onDelete={() => onDelete(expense.id)}
        />
      ))}
    </div>
  )
}

