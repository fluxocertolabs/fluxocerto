import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type EntityType = 'account' | 'project' | 'expense' | 'credit-card'

interface EntityEmptyStateProps {
  entityType: EntityType
  onAdd: () => void
}

const CONTENT: Record<EntityType, { title: string; description: string; buttonText: string }> = {
  account: {
    title: 'No accounts yet',
    description: 'Add your bank accounts to track balances',
    buttonText: 'Add Account',
  },
  project: {
    title: 'No income sources yet',
    description: 'Add your income sources to project cashflow',
    buttonText: 'Add Project',
  },
  expense: {
    title: 'No expenses yet',
    description: 'Add your fixed expenses to track outflows',
    buttonText: 'Add Expense',
  },
  'credit-card': {
    title: 'No credit cards yet',
    description: 'Add your credit cards to track payments',
    buttonText: 'Add Credit Card',
  },
}

export function EntityEmptyState({ entityType, onAdd }: EntityEmptyStateProps) {
  const content = CONTENT[entityType]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        'min-h-[200px] rounded-lg border border-dashed border-border',
        'bg-card p-6 text-center'
      )}
    >
      <h3 className="text-lg font-medium text-foreground mb-2">{content.title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{content.description}</p>
      <Button onClick={onAdd}>{content.buttonText}</Button>
    </div>
  )
}

