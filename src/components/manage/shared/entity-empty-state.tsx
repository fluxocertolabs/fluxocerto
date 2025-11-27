import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type EntityType = 'account' | 'project' | 'expense' | 'credit-card'

interface EntityEmptyStateProps {
  entityType: EntityType
  onAdd: () => void
}

const CONTENT: Record<EntityType, { title: string; description: string; buttonText: string }> = {
  account: {
    title: 'Nenhuma conta ainda',
    description: 'Adicione suas contas bancárias para acompanhar os saldos',
    buttonText: 'Adicionar Conta',
  },
  project: {
    title: 'Nenhuma fonte de renda ainda',
    description: 'Adicione suas fontes de renda para projetar o fluxo de caixa',
    buttonText: 'Adicionar Projeto',
  },
  expense: {
    title: 'Nenhuma despesa ainda',
    description: 'Adicione suas despesas fixas para acompanhar as saídas',
    buttonText: 'Adicionar Despesa',
  },
  'credit-card': {
    title: 'Nenhum cartão de crédito ainda',
    description: 'Adicione seus cartões de crédito para acompanhar os pagamentos',
    buttonText: 'Adicionar Cartão',
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

