import type { BankAccount } from '@/types'
import { EntityEmptyState } from '@/components/manage/shared/entity-empty-state'
import { AccountListItem } from './account-list-item'

interface AccountListProps {
  accounts: BankAccount[]
  onAdd: () => void
  onEdit: (account: BankAccount) => void
  onDelete: (id: string) => void
  onUpdateBalance: (id: string, balance: number) => Promise<void>
}

export function AccountList({
  accounts,
  onAdd,
  onEdit,
  onDelete,
  onUpdateBalance,
}: AccountListProps) {
  if (accounts.length === 0) {
    return <EntityEmptyState entityType="account" onAdd={onAdd} />
  }

  return (
    <div className="space-y-2">
      {accounts.map((account) => (
        <AccountListItem
          key={account.id}
          account={account}
          onEdit={() => onEdit(account)}
          onDelete={() => onDelete(account.id)}
          onUpdateBalance={async (balance) => onUpdateBalance(account.id, balance)}
        />
      ))}
    </div>
  )
}
