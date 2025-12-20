/**
 * Component Props Contracts: Monthly Ritual Enhancement
 *
 * This file defines the TypeScript interfaces for new component props.
 * These serve as contracts between parent and child components.
 */

import type { BankAccount, CreditCard } from '../../../src/types'

// =============================================================================
// QUICK BALANCE UPDATE COMPONENTS
// =============================================================================

/**
 * Props for the main Quick Balance Update view
 */
export interface QuickUpdateViewProps {
  /**
   * Callback when user clicks "Done" button
   */
  onDone: () => void

  /**
   * Callback when user clicks "Cancel" or presses Escape
   */
  onCancel: () => void
}

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
 * Props for the balance list component
 */
export interface BalanceListProps {
  /**
   * Combined list of accounts and credit cards
   */
  items: BalanceItem[]

  /**
   * Callback when a balance is updated
   * @param item - The item being updated
   * @param newBalance - New balance value in cents
   * @returns Promise resolving to success/error result
   */
  onBalanceUpdate: (
    item: BalanceItem,
    newBalance: number
  ) => Promise<{ success: boolean; error?: string }>
}

/**
 * Props for individual balance list item
 */
export interface BalanceListItemProps {
  /**
   * The balance item to display
   */
  item: BalanceItem

  /**
   * Previous balance value (for reference display)
   * This is the balance at the start of the update session
   */
  previousBalance: number

  /**
   * Callback when balance field loses focus
   * @param newBalance - New balance value in cents
   */
  onBlur: (newBalance: number) => Promise<{ success: boolean; error?: string }>

  /**
   * Whether this item is currently saving
   */
  isSaving?: boolean

  /**
   * Error message to display (if save failed)
   */
  error?: string | null

  /**
   * Callback to retry failed save
   */
  onRetry?: () => void
}

/**
 * Props for empty state when no accounts/cards exist
 */
export interface QuickUpdateEmptyStateProps {
  /**
   * Callback to navigate to Manage page
   */
  onNavigateToManage: () => void
}

// =============================================================================
// DASHBOARD ENHANCEMENT COMPONENTS
// =============================================================================

/**
 * Props for the health indicator component
 */
export interface HealthIndicatorProps {
  /**
   * Current health status
   */
  status: 'good' | 'warning' | 'danger'

  /**
   * Human-readable status message
   */
  message: string

  /**
   * Whether any data is stale (>30 days old)
   */
  isStale: boolean

  /**
   * Number of stale entities (for badge display)
   */
  staleCount: number

  /**
   * Callback when stale data badge is clicked
   */
  onStaleClick?: () => void
}

/**
 * Props for the projection period selector
 */
export interface ProjectionSelectorProps {
  /**
   * Currently selected projection period
   */
  value: 7 | 14 | 30 | 60 | 90

  /**
   * Callback when selection changes
   */
  onChange: (days: 7 | 14 | 30 | 60 | 90) => void

  /**
   * Whether the selector is disabled
   */
  disabled?: boolean
}

/**
 * Props for the surplus/deficit display component
 */
export interface SurplusDeficitProps {
  /**
   * Optimistic scenario surplus (positive) or deficit (negative)
   * Value in dollars (not cents)
   */
  optimistic: number

  /**
   * Pessimistic scenario surplus (positive) or deficit (negative)
   * Value in dollars (not cents)
   */
  pessimistic: number
}

// =============================================================================
// SHARED TYPES
// =============================================================================

/**
 * Balance field state for controlled input
 */
export interface BalanceFieldState {
  /**
   * Current display value (formatted string)
   */
  displayValue: string

  /**
   * Actual value in cents
   */
  valueInCents: number

  /**
   * Whether the field is currently being edited
   */
  isEditing: boolean

  /**
   * Whether a save operation is in progress
   */
  isSaving: boolean

  /**
   * Error message from failed save (null if no error)
   */
  error: string | null
}

