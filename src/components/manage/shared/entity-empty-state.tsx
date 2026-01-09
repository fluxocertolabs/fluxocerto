import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type EntityType = 'account' | 'project' | 'expense' | 'credit-card'

interface EntityEmptyStateProps {
  entityType: EntityType
  onAdd: () => void
  /** Optional callback to open the onboarding wizard instead of the add dialog */
  onStartSetup?: () => void
}

const CONTENT: Record<EntityType, { title: string; description: string; buttonText: string; setupDescription: string }> = {
  account: {
    title: 'Nenhuma conta ainda',
    description: 'Adicione suas contas bancárias para acompanhar os saldos',
    buttonText: 'Adicionar Conta',
    setupDescription: 'Ou use o assistente de configuração para começar rapidamente',
  },
  project: {
    title: 'Nenhuma fonte de renda ainda',
    description: 'Adicione suas fontes de renda para projetar o fluxo de caixa',
    buttonText: 'Adicionar Projeto',
    setupDescription: 'Ou use o assistente de configuração para começar rapidamente',
  },
  expense: {
    title: 'Nenhuma despesa ainda',
    description: 'Adicione suas despesas fixas para acompanhar as saídas',
    buttonText: 'Adicionar Despesa',
    setupDescription: 'Ou use o assistente de configuração para começar rapidamente',
  },
  'credit-card': {
    title: 'Nenhum cartão de crédito ainda',
    description: 'Adicione seus cartões de crédito para acompanhar os pagamentos',
    buttonText: 'Adicionar Cartão',
    setupDescription: 'Ou use o assistente de configuração para começar rapidamente',
  },
}

export function EntityEmptyState({ entityType, onAdd, onStartSetup }: EntityEmptyStateProps) {
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
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={onAdd}>{content.buttonText}</Button>
        {onStartSetup && (
          <Button variant="outline" onClick={onStartSetup}>
            Configurar Agora
          </Button>
        )}
      </div>
      {onStartSetup && (
        <p className="text-xs text-muted-foreground mt-3">{content.setupDescription}</p>
      )}
    </div>
  )
}

