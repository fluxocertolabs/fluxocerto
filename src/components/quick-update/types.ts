/**
 * Types for Quick Balance Update components
 */

import type { BankAccount, CreditCard } from '@/types'

/**
 * Union type for balance items (accounts + credit cards)
 */
export type BalanceItem =
  | {
      type: 'account'
      entity: BankAccount
    }
  | {
      type: 'card'
      entity: CreditCard
    }

/**
 * Balance field state for controlled input
 */
export interface BalanceFieldState {
  /** Current display value (formatted string) */
  displayValue: string
  /** Actual value in cents */
  valueInCents: number
  /** Whether the field is currently being edited */
  isEditing: boolean
  /** Whether a save operation is in progress */
  isSaving: boolean
  /** Error message from failed save (null if no error) */
  error: string | null
}

/**
 * Get the balance value from a balance item
 */
export function getBalanceFromItem(item: BalanceItem): number {
  return item.type === 'account' ? item.entity.balance : item.entity.statementBalance
}

/**
 * Get the name from a balance item
 */
export function getNameFromItem(item: BalanceItem): string {
  return item.entity.name
}

/**
 * Get the ID from a balance item
 */
export function getIdFromItem(item: BalanceItem): string {
  return item.entity.id
}

/**
 * Get the owner from a balance item
 */
export function getOwnerFromItem(item: BalanceItem): { name: string } | null {
  return item.entity.owner
}

/**
 * Account type for bank accounts
 */
export type AccountType = 'checking' | 'savings' | 'investment'

/**
 * Get the account type from a balance item (only for accounts, not cards)
 */
export function getAccountTypeFromItem(item: BalanceItem): AccountType | null {
  return item.type === 'account' ? item.entity.type : null
}

/**
 * Get the balanceUpdatedAt date from a balance item
 */
export function getBalanceUpdatedAtFromItem(item: BalanceItem): Date | undefined {
  return item.entity.balanceUpdatedAt
}

