import { useState } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InlineEditInput } from '@/components/manage/shared/inline-edit-input'
import { formatCurrency, formatRelativeTime, getBalanceFreshness, type BalanceFreshness } from '@/components/manage/shared/format-utils'
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

/**
 * CSS classes for the freshness indicator bar (left edge).
 * Colors indicate how recently the balance was updated.
 */
const FRESHNESS_BAR_CLASSES: Record<BalanceFreshness, string> = {
  fresh: 'bg-emerald-500',
  warning: 'bg-amber-500',
  stale: 'bg-red-500',
}

/**
 * CSS classes for the footer text color (tri-state).
 */
const FRESHNESS_TEXT_CLASSES: Record<BalanceFreshness, string> = {
  fresh: 'text-emerald-500',
  warning: 'text-amber-500',
  stale: 'text-red-500',
}

export function AccountCard({
  account,
  onEdit,
  onDelete,
  onUpdateBalance,
}: AccountCardProps) {
  const [showActions, setShowActions] = useState(false)
  const freshness = getBalanceFreshness(account.balanceUpdatedAt)

  return (
    <div
      className={cn(
        'group relative flex flex-col p-5 rounded-xl border bg-card overflow-hidden',
        'transition-all duration-200 hover:shadow-md hover:border-primary/20'
      )}
    >
      {/* Freshness indicator bar (left edge) */}
      <div
        data-freshness={freshness}
        className={cn(
          'absolute left-0 top-0 bottom-0 w-1',
          FRESHNESS_BAR_CLASSES[freshness]
        )}
        aria-hidden="true"
      />

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
            className={cn(
              'h-8 w-8 transition-opacity',
              // Mobile: always visible (no hover)
              'opacity-100',
              // Desktop: reveal on hover/focus for a cleaner card UI
              'sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'
            )}
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
            FRESHNESS_TEXT_CLASSES[freshness]
          )}>
            {freshness === 'stale' && '⚠️ '}
            {formatRelativeTime(account.balanceUpdatedAt)}
          </span>
        </div>
      </div>
    </div>
  )
}

