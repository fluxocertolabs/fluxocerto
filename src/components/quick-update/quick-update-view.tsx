/**
 * Quick Balance Update View
 * Full-screen modal for rapid balance updates
 */

import { useEffect, useCallback, useState } from 'react'
import { useFinanceData } from '@/hooks/use-finance-data'
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

/**
 * Creates a map of initial balances from accounts and credit cards.
 * This is extracted as a pure function to be used in state initialization.
 */
function createInitialBalances(
  accounts: Array<{ id: string; balance: number }>,
  creditCards: Array<{ id: string; statementBalance: number }>
): Map<string, number> {
  const balances = new Map<string, number>()

  for (const account of accounts) {
    balances.set(account.id, account.balance)
  }

  for (const card of creditCards) {
    balances.set(card.id, card.statementBalance)
  }

  return balances
}

export function QuickUpdateView({ onDone, onCancel }: QuickUpdateViewProps) {
  // Fetch data to check if empty and capture initial balances
  const { accounts, creditCards, isLoading } = useFinanceData()

  const isEmpty =
    !isLoading && accounts.length === 0 && creditCards.length === 0

  // Track whether we've captured initial balances - use lazy initialization
  const [capturedBalances, setCapturedBalances] = useState<{
    captured: boolean
    balances: Map<string, number>
  }>(() => ({ captured: false, balances: new Map() }))

  // Capture initial balances once when data is first available
  // Compute new state based on current state to avoid calling setState directly
  const shouldCapture = !capturedBalances.captured && !isLoading && (accounts.length > 0 || creditCards.length > 0)
  
  // Use state update in effect only when necessary
  useEffect(() => {
    if (shouldCapture) {
      setCapturedBalances({
        captured: true,
        balances: createInitialBalances(accounts, creditCards)
      })
    }
  }, [shouldCapture, accounts, creditCards])

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
            Atualizar Saldos
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
            <Button onClick={onDone}>Concluir</Button>
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
                Digite seus saldos atuais. As alterações são salvas automaticamente quando
                você passa para o próximo campo.
              </p>
              <BalanceList initialBalances={capturedBalances.balances} />
            </>
          )}
        </div>
      </main>
    </div>
  )
}
