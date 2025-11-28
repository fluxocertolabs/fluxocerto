import { useState, useMemo } from 'react'
import type { CreditCard, Profile } from '@/types'
import { EntityEmptyState } from '@/components/manage/shared/entity-empty-state'
import { CreditCardListItem } from './credit-card-list-item'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CreditCardListProps {
  creditCards: CreditCard[]
  profiles: Profile[]
  onAdd: () => void
  onEdit: (card: CreditCard) => void
  onDelete: (id: string) => void
  onUpdateBalance: (id: string, balance: number) => Promise<void>
}

export function CreditCardList({
  creditCards,
  profiles,
  onAdd,
  onEdit,
  onDelete,
  onUpdateBalance,
}: CreditCardListProps) {
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null)

  const filteredCards = useMemo(() => {
    if (ownerFilter === null) return creditCards
    if (ownerFilter === 'unassigned') return creditCards.filter((c) => !c.owner)
    return creditCards.filter((c) => c.owner?.id === ownerFilter)
  }, [creditCards, ownerFilter])

  if (creditCards.length === 0) {
    return <EntityEmptyState entityType="credit-card" onAdd={onAdd} />
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select
          value={ownerFilter ?? 'all'}
          onValueChange={(value) => setOwnerFilter(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por proprietário" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="unassigned">Não atribuído</SelectItem>
            {profiles.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                {profile.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filteredCards.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum cartão encontrado para este filtro.
          </p>
        ) : (
          filteredCards.map((card) => (
            <CreditCardListItem
              key={card.id}
              card={card}
              onEdit={() => onEdit(card)}
              onDelete={() => onDelete(card.id)}
              onUpdateBalance={async (balance) => onUpdateBalance(card.id, balance)}
            />
          ))
        )}
      </div>
    </div>
  )
}
