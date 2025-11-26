/**
 * Quick Balance Update View
 * Full-screen modal for rapid balance updates
 */

import { useEffect, useRef, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BalanceList } from './balance-list'
import { QuickUpdateEmptyState } from './empty-state'

interface QuickUpdateViewProps {
  /** Callback when user clicks "Done" button */
  onDone: () => void
  /** Callback when user clicks "Cancel" or presses Escape */
  onCancel: () => void
}

export function QuickUpdateView({ onDone, onCancel }: QuickUpdateViewProps) {
  // Fetch data to check if empty and capture initial balances
  const accounts = useLiveQuery(() => db.accounts.toArray())
  const creditCards = useLiveQuery(() => db.creditCards.toArray())

  const isLoading = accounts === undefined || creditCards === undefined
  const isEmpty =
    !isLoading && (accounts?.length ?? 0) === 0 && (creditCards?.length ?? 0) === 0

  // Use ref to capture initial balances exactly once when data becomes available
  const initialBalancesRef = useRef<Map<string, number> | null>(null)

  // Capture initial balances once when data is first available
  useEffect(() => {
    if (initialBalancesRef.current === null && accounts && creditCards) {
      const balances = new Map<string, number>()

      for (const account of accounts) {
        balances.set(account.id, account.balance)
      }

      for (const card of creditCards) {
        balances.set(card.id, card.statementBalance)
      }

      initialBalancesRef.current = balances
    }
  }, [accounts, creditCards])

  // Provide a stable empty map until data is loaded
  const initialBalances = initialBalancesRef.current ?? new Map<string, number>()

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    },
    [onCancel]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div
      className={cn(
        'fixed inset-0 z-50',
        'bg-background/95 backdrop-blur-sm',
        'flex flex-col'
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-update-title"
    >
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border bg-background px-4 py-4 md:px-6">
        <div className="container mx-auto max-w-2xl flex items-center justify-between">
          <h1
            id="quick-update-title"
            className="text-xl font-semibold text-foreground"
          >
            Update Balances
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onDone}>Done</Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
        <div className="container mx-auto max-w-2xl">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-lg border border-border bg-card animate-pulse"
                />
              ))}
            </div>
          ) : isEmpty ? (
            <QuickUpdateEmptyState onClose={onCancel} />
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your current balances. Changes are saved automatically when
                you move to the next field.
              </p>
              <BalanceList initialBalances={initialBalances} />
            </>
          )}
        </div>
      </main>
    </div>
  )
}

