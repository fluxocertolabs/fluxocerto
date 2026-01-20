/**
 * Balance list component for Quick Update view
 * Renders accounts and credit cards with Tab navigation
 */

import { useMemo } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useFinanceData } from '@/hooks/use-finance-data'
import { useFinanceStore } from '@/stores/finance-store'
import { BalanceListItem } from './balance-list-item'
import type { BalanceItem } from './types'

interface BalanceListProps {
  /** Initial balances captured when modal opened (for "previous" display) */
  initialBalances: Map<string, number>
}

export function BalanceList({ initialBalances }: BalanceListProps) {
  const { updateAccountBalance, updateCreditCardBalance } = useFinanceStore()
  const shouldReduceMotion = useReducedMotion()

  // Fetch accounts and credit cards
  const { accounts, creditCards, isLoading } = useFinanceData()

  // Combine into balance items list (accounts first, then cards)
  const items: BalanceItem[] = useMemo(() => {
    const result: BalanceItem[] = []

    for (const account of accounts) {
      result.push({ type: 'account', entity: account })
    }

    for (const card of creditCards) {
      result.push({ type: 'card', entity: card })
    }

    return result
  }, [accounts, creditCards])

  // Use initialBalances directly (passed as prop, stable reference from parent)

  // Handle save for an item
  const handleSave = async (
    item: BalanceItem,
    newBalance: number
  ): Promise<{ success: boolean; error?: string }> => {
    if (item.type === 'account') {
      const result = await updateAccountBalance(item.entity.id, newBalance)
      return result.success
        ? { success: true }
        : { success: false, error: result.error }
    } else {
      const result = await updateCreditCardBalance(item.entity.id, newBalance)
      return result.success
        ? { success: true }
        : { success: false, error: result.error }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {/* Loading skeleton */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 rounded-lg border border-border bg-card animate-pulse"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Section: Bank Accounts */}
      {accounts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground px-1">
            Contas Bancárias
          </h3>
          <motion.div
            className="space-y-2"
            initial={shouldReduceMotion ? false : 'hidden'}
            animate={shouldReduceMotion ? undefined : 'show'}
            variants={{
              hidden: {},
              show: {
                transition: { staggerChildren: 0.06, delayChildren: 0.03 },
              },
            }}
          >
            {items
              .filter((item): item is BalanceItem & { type: 'account' } => item.type === 'account')
              .map((item) => (
                <motion.div
                  key={item.entity.id}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                >
                  <BalanceListItem
                    item={item}
                    previousBalance={
                      initialBalances.get(item.entity.id) ??
                      item.entity.balance
                    }
                    onSave={(newBalance) => handleSave(item, newBalance)}
                  />
                </motion.div>
              ))}
          </motion.div>
        </div>
      )}

      {/* Section: Credit Cards */}
      {creditCards.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground px-1">
            Cartões de Crédito
          </h3>
          <motion.div
            className="space-y-2"
            initial={shouldReduceMotion ? false : 'hidden'}
            animate={shouldReduceMotion ? undefined : 'show'}
            variants={{
              hidden: {},
              show: {
                transition: { staggerChildren: 0.06, delayChildren: 0.03 },
              },
            }}
          >
            {items
              .filter((item): item is BalanceItem & { type: 'card' } => item.type === 'card')
              .map((item) => (
                <motion.div
                  key={item.entity.id}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                >
                  <BalanceListItem
                    item={item}
                    previousBalance={
                      initialBalances.get(item.entity.id) ??
                      item.entity.statementBalance
                    }
                    onSave={(newBalance) => handleSave(item, newBalance)}
                  />
                </motion.div>
              ))}
          </motion.div>
        </div>
      )}
    </div>
  )
}
