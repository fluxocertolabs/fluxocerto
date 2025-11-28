import type { SingleShotIncome } from '@/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SingleShotIncomeListItem } from './single-shot-income-list-item'

interface SingleShotIncomeListProps {
  income: SingleShotIncome[]
  onAdd: () => void
  onEdit: (income: SingleShotIncome) => void
  onDelete: (id: string) => void
}

export function SingleShotIncomeList({
  income,
  onAdd,
  onEdit,
  onDelete,
}: SingleShotIncomeListProps) {
  if (income.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center',
          'min-h-[200px] rounded-lg border border-dashed border-border',
          'bg-card p-6 text-center'
        )}
      >
        <h3 className="text-lg font-medium text-foreground mb-2">
          Nenhuma receita pontual cadastrada
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Adicione receitas que ocorrem uma única vez, como restituição de IR, bônus ou venda de bens
        </p>
        <Button onClick={onAdd}>Adicionar Receita Pontual</Button>
      </div>
    )
  }

  // Sort income chronologically by date (ascending)
  const sortedIncome = [...income].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {sortedIncome.map((item) => (
          <SingleShotIncomeListItem
            key={item.id}
            income={item}
            onEdit={() => onEdit(item)}
            onDelete={() => onDelete(item.id)}
          />
        ))}
      </div>
      <Button onClick={onAdd} variant="outline" className="w-full">
        Adicionar Receita Pontual
      </Button>
    </div>
  )
}

