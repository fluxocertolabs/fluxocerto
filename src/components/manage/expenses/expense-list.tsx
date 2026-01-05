import type { FixedExpense } from '@/types'
import { Button } from '@/components/ui/button'
import { EntityEmptyState } from '@/components/manage/shared/entity-empty-state'
import { ExpenseListItem } from './expense-list-item'

interface ExpenseListProps {
  expenses: FixedExpense[]
  onAdd: () => void
  onEdit: (expense: FixedExpense) => void
  onDelete: (id: string) => void
  onToggleActive: (id: string) => void
  /** Optional callback to open the onboarding wizard */
  onStartSetup?: () => void
}

export function ExpenseList({
  expenses,
  onAdd,
  onEdit,
  onDelete,
  onToggleActive,
  onStartSetup,
}: ExpenseListProps) {
  if (expenses.length === 0) {
    return <EntityEmptyState entityType="expense" onAdd={onAdd} onStartSetup={onStartSetup} />
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {expenses.map((expense) => (
          <ExpenseListItem
            key={expense.id}
            expense={expense}
            onEdit={() => onEdit(expense)}
            onDelete={() => onDelete(expense.id)}
            onToggleActive={() => onToggleActive(expense.id)}
          />
        ))}
      </div>
      <Button onClick={onAdd} variant="outline" className="w-full">
        Adicionar Despesa Fixa
      </Button>
    </div>
  )
}
