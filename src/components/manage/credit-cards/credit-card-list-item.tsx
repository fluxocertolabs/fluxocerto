import { Button } from '@/components/ui/button'
import { InlineEditInput } from '@/components/manage/shared/inline-edit-input'
import { OwnerBadge } from '@/components/ui/owner-badge'
import { cn } from '@/lib/utils'
import type { CreditCard } from '@/types'

interface CreditCardListItemProps {
  card: CreditCard
  onEdit: () => void
  onDelete: () => void
  onUpdateBalance: (balance: number) => Promise<void>
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

export function CreditCardListItem({
  card,
  onEdit,
  onDelete,
  onUpdateBalance,
}: CreditCardListItemProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
        'p-4 rounded-lg border bg-card'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate" title={card.name}>
            {card.name}
          </span>
          <OwnerBadge owner={card.owner} />
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          Vencimento dia {card.dueDay}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <InlineEditInput
          value={card.statementBalance}
          onSave={onUpdateBalance}
          formatDisplay={formatCurrency}
          min={0}
          className="font-medium"
        />
        
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

