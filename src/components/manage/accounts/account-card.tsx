import { useState } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InlineEditInput } from '@/components/manage/shared/inline-edit-input'
import { formatCurrency, formatRelativeTime, isStale } from '@/components/manage/shared/format-utils'
import { cn } from '@/lib/utils'
import type { BankAccount } from '@/types'

interface AccountCardProps {
  account: BankAccount
  onEdit: () => void
  onDelete: () => void
  onUpdateBalance: (balance: number) => Promise<void>
}

const TYPE_LABELS: Record<BankAccount['type'], string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  investment: 'Investimento',
}

const TYPE_ICONS: Record<BankAccount['type'], string> = {
  checking: '🏦',
  savings: '💰',
  investment: '📈',
}

export function AccountCard({
  account,
  onEdit,
  onDelete,
  onUpdateBalance,
}: AccountCardProps) {
  const [showActions, setShowActions] = useState(false)
  const stale = isStale(account.balanceUpdatedAt)

  return (
    <div
      className={cn(
        'group relative flex flex-col p-5 rounded-xl border bg-card',
        'transition-all duration-200 hover:shadow-md hover:border-primary/20'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-2xl" role="img" aria-label={TYPE_LABELS[account.type]}>
            {TYPE_ICONS[account.type]}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base truncate" title={account.name}>
              {account.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {TYPE_LABELS[account.type]}
              {account.owner && <span className="text-primary"> · {account.owner.name}</span>}
            </p>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setShowActions(!showActions)}
            aria-label="Mais opções"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          
          {showActions && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowActions(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 bg-popover border rounded-lg shadow-lg py-1 min-w-[120px]">
                <button
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                  onClick={() => {
                    setShowActions(false)
                    onEdit()
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </button>
                <button
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                  onClick={() => {
                    setShowActions(false)
                    onDelete()
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Balance */}
      <div className="flex-1 flex flex-col justify-center">
        <InlineEditInput
          value={account.balance}
          onSave={onUpdateBalance}
          formatDisplay={formatCurrency}
          min={0}
          className="text-2xl font-bold tracking-tight"
        />
      </div>

      {/* Footer - Update Status */}
      <div className="mt-4 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Última atualização</span>
          <span className={cn(
            'font-medium',
            stale ? 'text-amber-500' : 'text-emerald-500'
          )}>
            {stale && '⚠️ '}
            {formatRelativeTime(account.balanceUpdatedAt)}
          </span>
        </div>
      </div>
    </div>
  )
}

