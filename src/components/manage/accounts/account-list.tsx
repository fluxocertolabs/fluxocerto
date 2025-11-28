import { useState, useMemo } from 'react'
import type { BankAccount, Profile } from '@/types'
import { EntityEmptyState } from '@/components/manage/shared/entity-empty-state'
import { AccountListItem } from './account-list-item'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AccountListProps {
  accounts: BankAccount[]
  profiles: Profile[]
  onAdd: () => void
  onEdit: (account: BankAccount) => void
  onDelete: (id: string) => void
  onUpdateBalance: (id: string, balance: number) => Promise<void>
}

export function AccountList({
  accounts,
  profiles,
  onAdd,
  onEdit,
  onDelete,
  onUpdateBalance,
}: AccountListProps) {
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null)

  const filteredAccounts = useMemo(() => {
    if (ownerFilter === null) return accounts
    if (ownerFilter === 'unassigned') return accounts.filter((a) => !a.owner)
    return accounts.filter((a) => a.owner?.id === ownerFilter)
  }, [accounts, ownerFilter])

  if (accounts.length === 0) {
    return <EntityEmptyState entityType="account" onAdd={onAdd} />
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
        {filteredAccounts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma conta encontrada para este filtro.
          </p>
        ) : (
          filteredAccounts.map((account) => (
            <AccountListItem
              key={account.id}
              account={account}
              onEdit={() => onEdit(account)}
              onDelete={() => onDelete(account.id)}
              onUpdateBalance={async (balance) => onUpdateBalance(account.id, balance)}
            />
          ))
        )}
      </div>
    </div>
  )
}
