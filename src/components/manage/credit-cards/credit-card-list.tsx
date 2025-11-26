import type { CreditCard } from '@/types'
import { EntityEmptyState } from '@/components/manage/shared/entity-empty-state'
import { CreditCardListItem } from './credit-card-list-item'

interface CreditCardListProps {
  creditCards: CreditCard[]
  onAdd: () => void
  onEdit: (card: CreditCard) => void
  onDelete: (id: string) => void
  onUpdateBalance: (id: string, balance: number) => Promise<void>
}

export function CreditCardList({
  creditCards,
  onAdd,
  onEdit,
  onDelete,
  onUpdateBalance,
}: CreditCardListProps) {
  if (creditCards.length === 0) {
    return <EntityEmptyState entityType="credit-card" onAdd={onAdd} />
  }

  return (
    <div className="space-y-2">
      {creditCards.map((card) => (
        <CreditCardListItem
          key={card.id}
          card={card}
          onEdit={() => onEdit(card)}
          onDelete={() => onDelete(card.id)}
          onUpdateBalance={async (balance) => onUpdateBalance(card.id, balance)}
        />
      ))}
    </div>
  )
}
