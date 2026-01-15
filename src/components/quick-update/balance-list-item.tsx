/**
 * Individual balance list item with inline editing
 * Supports auto-save on blur and error display
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { OwnerBadge } from '@/components/ui/owner-badge'
import { AccountTypeBadge } from '@/components/ui/account-type-badge'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, parseDecimal, formatDecimalBR } from '@/lib/format'
import { getBalanceFreshness, type BalanceFreshness } from '@/components/manage/shared/format-utils'
import type { BalanceItem } from './types'
import { getBalanceFromItem, getNameFromItem, getOwnerFromItem, getAccountTypeFromItem, getBalanceUpdatedAtFromItem } from './types'

/**
 * CSS classes for the freshness indicator bar (left edge).
 * Colors indicate how recently the balance was updated.
 */
const FRESHNESS_BAR_CLASSES: Record<BalanceFreshness, string> = {
  fresh: 'bg-emerald-500',
  warning: 'bg-amber-500',
  stale: 'bg-red-500',
}

interface BalanceListItemProps {
  /** The balance item to display */
  item: BalanceItem
  /** Previous balance value (for reference display) */
  previousBalance: number
  /** Callback when balance is saved */
  onSave: (newBalance: number) => Promise<{ success: boolean; error?: string }>
}

export function BalanceListItem({
  item,
  previousBalance,
  onSave,
}: BalanceListItemProps) {
  const currentBalance = getBalanceFromItem(item)
  const name = getNameFromItem(item)
  const owner = getOwnerFromItem(item)
  const accountType = getAccountTypeFromItem(item)
  const balanceUpdatedAt = getBalanceUpdatedAtFromItem(item)
  const freshness = getBalanceFreshness(balanceUpdatedAt)

  // Convert cents to reais for display/editing (using Brazilian comma format)
  const [editValue, setEditValue] = useState(() => formatDecimalBR(currentBalance / 100))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Track the last synced balance to detect external changes
  const [lastSyncedBalance, setLastSyncedBalance] = useState(currentBalance)

  // Update edit value when external balance changes (e.g., after successful save or realtime update)
  // This effect only runs when currentBalance changes AND we're not saving
  useEffect(() => {
    if (!isSaving && currentBalance !== lastSyncedBalance) {
      setLastSyncedBalance(currentBalance)
      setEditValue(formatDecimalBR(currentBalance / 100))
    }
  }, [currentBalance, isSaving, lastSyncedBalance])

  const handleBlur = useCallback(async () => {
    // Parse decimal value (supports both comma and period as separator)
    const numValue = parseDecimal(editValue)

    // Validate input
    if (numValue < 0) {
      setEditValue(formatDecimalBR(currentBalance / 100))
      setError(null)
      return
    }

    // Convert to cents
    const valueInCents = Math.round(numValue * 100)

    // Skip save if value hasn't changed
    if (valueInCents === currentBalance) {
      setError(null)
      return
    }

    setIsSaving(true)
    setError(null)

    const result = await onSave(valueInCents)

    setIsSaving(false)

    if (!result.success) {
      setError(result.error ?? 'Falha ao salvar')
    }
  }, [editValue, currentBalance, onSave])

  const handleRetry = useCallback(async () => {
    await handleBlur()
  }, [handleBlur])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Reset to current value
        setEditValue(formatDecimalBR(currentBalance / 100))
        setError(null)
        inputRef.current?.blur()
      }
    },
    [currentBalance]
  )

  // Icon based on type - use type-specific icons for accounts
  const Icon = (() => {
    if (item.type === 'card') return CreditCardIcon
    // Use type-specific icons for bank accounts
    switch (accountType) {
      case 'investment':
        return InvestmentIcon
      case 'savings':
        return SavingsIcon
      default:
        return BankIcon
    }
  })()

  return (
    <div
      className={cn(
        'relative flex items-center gap-4 p-4 rounded-lg border overflow-hidden',
        error ? 'border-red-500/50 bg-red-500/5' : 'border-border bg-card'
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

      {/* Type indicator */}
      <div className="flex-shrink-0 ml-1">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Name, owner, account type, and previous balance */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-foreground truncate">{name}</p>
          <OwnerBadge owner={owner} />
          <AccountTypeBadge type={accountType} />
        </div>
        <p className="text-sm text-muted-foreground">
          Anterior: {formatCurrency(previousBalance)}
        </p>
      </div>

      {/* Balance input */}
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          {/* Reserve fixed space for spinner so layout doesn't shift while saving */}
          <div className="w-4 h-4 flex items-center justify-center">
            {isSaving ? (
              <Loader2
                className="h-4 w-4 animate-spin text-muted-foreground"
                role="img"
                aria-label="Salvando"
              />
            ) : (
              <span aria-hidden="true" className="h-4 w-4" />
            )}
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              R$
            </span>
            <Input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              aria-busy={isSaving}
              className={cn(
                'w-32 pl-7 text-right',
                isSaving && 'opacity-50'
              )}
              aria-label={`Saldo de ${name}`}
              placeholder="0,00"
            />
          </div>
        </div>

        {/* Error display with retry */}
        {error && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-600">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRetry}
              className="h-6 px-2 text-xs"
            >
              Tentar novamente
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// Icons
function BankIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"
      />
    </svg>
  )
}

function SavingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
      />
    </svg>
  )
}

function InvestmentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
      />
    </svg>
  )
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
      />
    </svg>
  )
}
