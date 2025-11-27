import { Button } from '@/components/ui/button'
import { InlineEditInput } from '@/components/manage/shared/inline-edit-input'
import { cn } from '@/lib/utils'
import type { BankAccount } from '@/types'

interface AccountListItemProps {
  account: BankAccount
  onEdit: () => void
  onDelete: () => void
  onUpdateBalance: (balance: number) => Promise<void>
}

const TYPE_LABELS: Record<BankAccount['type'], string> = {
  checking: 'Checking',
  savings: 'Savings',
  investment: 'Investment',
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(navigator.language, {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

export function AccountListItem({
  account,
  onEdit,
  onDelete,
  onUpdateBalance,
}: AccountListItemProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
        'p-4 rounded-lg border bg-card'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate" title={account.name}>
            {account.name}
          </span>
          <span className="text-xs bg-muted px-2 py-0.5 rounded">
            {TYPE_LABELS[account.type]}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <InlineEditInput
          value={account.balance}
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
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 px-2 text-muted-foreground hover:text-destructive"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}

