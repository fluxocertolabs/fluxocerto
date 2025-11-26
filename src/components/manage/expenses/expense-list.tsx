import type { FixedExpense } from '@/types'
import { EntityEmptyState } from '@/components/manage/shared/entity-empty-state'
import { ExpenseListItem } from './expense-list-item'

interface ExpenseListProps {
  expenses: FixedExpense[]
  onAdd: () => void
  onEdit: (expense: FixedExpense) => void
  onDelete: (id: string) => void
  onToggleActive: (id: string) => void
}

export function ExpenseList({
  expenses,
  onAdd,
  onEdit,
  onDelete,
  onToggleActive,
}: ExpenseListProps) {
  if (expenses.length === 0) {
    return <EntityEmptyState entityType="expense" onAdd={onAdd} />
  }

  return (
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
  )
}
