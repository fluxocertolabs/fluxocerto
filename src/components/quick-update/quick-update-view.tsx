/**
 * Quick Balance Update View
 * Full-screen modal for rapid balance updates with smooth loading transitions.
 */

import { useEffect, useCallback, useState } from 'react'
import { useFinanceData } from '@/hooks/use-finance-data'
import { useFinanceStore } from '@/stores/finance-store'
import { useCoordinatedLoading } from '@/hooks/use-coordinated-loading'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BalanceList } from './balance-list'
import { QuickUpdateEmptyState } from './empty-state'
import { ModalSkeleton } from '@/components/loading/modal-skeleton'
import { ErrorState } from '@/components/cashflow/error-state'
import { ERROR_MESSAGES } from '@/types/loading'

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
  const { accounts, creditCards, isLoading, error, retry } = useFinanceData()
  const { markAllBalancesUpdated } = useFinanceStore()
  const [isMarkingComplete, setIsMarkingComplete] = useState(false)

  // Coordinated loading state for smooth transitions
  const loadingState = useCoordinatedLoading(
    isLoading,
    error,
    retry
  )

  const isEmpty =
    !loadingState.showSkeleton && !loadingState.showError && accounts.length === 0 && creditCards.length === 0

  // Track whether we've captured initial balances - use lazy initialization
  const [capturedBalances, setCapturedBalances] = useState<{
    captured: boolean
    balances: Map<string, number>
  }>(() => ({ captured: false, balances: new Map() }))

  // Capture initial balances once when data is first available
  const shouldCapture = !capturedBalances.captured && !loadingState.showSkeleton && !loadingState.showError && (accounts.length > 0 || creditCards.length > 0)

  useEffect(() => {
    if (shouldCapture) {
      setCapturedBalances({
        captured: true,
        balances: createInitialBalances(accounts, creditCards)
      })
    }
  }, [shouldCapture, accounts, creditCards])

  // Handle "Concluir" click - marks all balances as updated before closing
  const handleDone = useCallback(async () => {
    // Only mark as updated if there are items (not empty state)
    if (accounts.length > 0 || creditCards.length > 0) {
      setIsMarkingComplete(true)
      try {
        await markAllBalancesUpdated()
      } catch (err) {
        console.error('Failed to mark balances as updated:', err)
        // Continue with onDone even if marking fails - user still wants to close
      } finally {
        setIsMarkingComplete(false)
      }
    }
    onDone()
  }, [accounts.length, creditCards.length, markAllBalancesUpdated, onDone])

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
            <Button variant="ghost" onClick={onCancel} disabled={isMarkingComplete}>
              Cancelar
            </Button>
            <Button onClick={handleDone} disabled={isMarkingComplete}>
              {isMarkingComplete ? 'Salvando...' : 'Concluir'}
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
        <div className="container mx-auto max-w-2xl">
          {/* Error state */}
          {loadingState.showError ? (
            <ErrorState
              error={new Error(loadingState.errorMessage ?? ERROR_MESSAGES.unknown)}
              onRetry={loadingState.retry}
            />
          ) : (
            <div
              role="status"
              aria-live="polite"
              aria-busy={loadingState.showSkeleton}
              className="relative"
            >
              {/* Skeleton layer */}
              <div
                className={cn(
                  'transition-opacity duration-[250ms] ease-out',
                  loadingState.showSkeleton
                    ? 'opacity-100'
                    : 'opacity-0 pointer-events-none absolute inset-0'
                )}
                aria-hidden={!loadingState.showSkeleton}
              >
                <ModalSkeleton />
              </div>

              {/* Content layer */}
              <div
                className={cn(
                  'transition-opacity duration-[250ms] ease-out',
                  loadingState.showSkeleton ? 'opacity-0' : 'opacity-100'
                )}
              >
                {!loadingState.showSkeleton && (
                  isEmpty ? (
                    <QuickUpdateEmptyState onClose={onCancel} />
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground mb-6">
                        Digite seus saldos atuais. As alterações são salvas automaticamente quando
                        você passa para o próximo campo.
                      </p>
                      <BalanceList initialBalances={capturedBalances.balances} />
                    </>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
