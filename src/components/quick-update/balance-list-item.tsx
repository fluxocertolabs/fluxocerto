/**
 * Individual balance list item with inline editing
 * Supports auto-save on blur and error display
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import type { BalanceItem } from './types'
import { getBalanceFromItem, getNameFromItem } from './types'

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

  // Convert cents to dollars for display/editing
  const [editValue, setEditValue] = useState(() => (currentBalance / 100).toFixed(2))
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
      setEditValue((currentBalance / 100).toFixed(2))
    }
  }, [currentBalance, isSaving, lastSyncedBalance])

  const handleBlur = useCallback(async () => {
    const numValue = parseFloat(editValue)

    // Validate input
    if (isNaN(numValue) || numValue < 0) {
      setEditValue((currentBalance / 100).toFixed(2))
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
      setError(result.error ?? 'Failed to save')
    }
  }, [editValue, currentBalance, onSave])

  const handleRetry = useCallback(async () => {
    await handleBlur()
  }, [handleBlur])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Reset to current value
        setEditValue((currentBalance / 100).toFixed(2))
        setError(null)
        inputRef.current?.blur()
      }
    },
    [currentBalance]
  )

  // Icon based on type
  const Icon = item.type === 'account' ? BankIcon : CreditCardIcon

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg border',
        error ? 'border-red-500/50 bg-red-500/5' : 'border-border bg-card'
      )}
    >
      {/* Type indicator */}
      <div className="flex-shrink-0">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Name and previous balance */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{name}</p>
        <p className="text-sm text-muted-foreground">
          Previous: {formatCurrency(previousBalance)}
        </p>
      </div>

      {/* Balance input */}
      <div className="flex flex-col items-end gap-1">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            R$
          </span>
          <Input
            ref={inputRef}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            min={0}
            step={0.01}
            disabled={isSaving}
            className={cn(
              'w-32 pl-7 text-right',
              isSaving && 'opacity-50'
            )}
            aria-label={`Balance for ${name}`}
          />
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
              Retry
            </Button>
          </div>
        )}

        {/* Saving indicator */}
        {isSaving && (
          <span className="text-xs text-muted-foreground">Saving...</span>
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
