/**
 * Store Action Contracts: Monthly Ritual Enhancement
 *
 * This file defines the TypeScript interfaces for new store actions.
 * These are internal contracts (no external API - local-first app).
 */

import type { Result } from '../../../src/stores/finance-store'

// =============================================================================
// FINANCE STORE EXTENSIONS
// =============================================================================

/**
 * New actions to add to useFinanceStore
 */
export interface FinanceStoreExtensions {
  /**
   * Update account balance with timestamp tracking.
   * Sets both `balance` and `balanceUpdatedAt` fields.
   *
   * @param id - Account UUID
   * @param balance - New balance in cents (must be >= 0)
   * @returns Result with void on success, error message on failure
   *
   * @example
   * const result = await updateAccountBalance('uuid', 150000)
   * if (!result.success) {
   *   showError(result.error)
   * }
   */
  updateAccountBalance: (id: string, balance: number) => Promise<Result<void>>

  /**
   * Update credit card statement balance with timestamp tracking.
   * Sets both `statementBalance` and `balanceUpdatedAt` fields.
   *
   * @param id - Credit card UUID
   * @param statementBalance - New statement balance in cents (must be >= 0)
   * @returns Result with void on success, error message on failure
   */
  updateCreditCardBalance: (
    id: string,
    statementBalance: number
  ) => Promise<Result<void>>
}

// =============================================================================
// PREFERENCES STORE
// =============================================================================

/**
 * Valid projection day values
 */
export type ProjectionDays = 7 | 14 | 30 | 60 | 90

/**
 * User preferences store interface
 */
export interface PreferencesStore {
  /**
   * Current projection period in days.
   * Default: 30
   */
  projectionDays: ProjectionDays

  /**
   * Update projection period.
   * Persists to localStorage automatically.
   *
   * @param days - New projection period
   */
  setProjectionDays: (days: ProjectionDays) => void
}

// =============================================================================
// HOOK CONTRACTS
// =============================================================================

/**
 * Balance update hook return type
 */
export interface UseBalanceUpdateResult {
  /**
   * Update a bank account balance.
   * Handles validation, persistence, and error state.
   */
  updateAccountBalance: (id: string, balance: number) => Promise<Result<void>>

  /**
   * Update a credit card statement balance.
   */
  updateCreditCardBalance: (
    id: string,
    statementBalance: number
  ) => Promise<Result<void>>

  /**
   * Whether any save operation is in progress
   */
  isSaving: boolean
}

/**
 * Health indicator hook return type
 */
export interface UseHealthIndicatorResult {
  /**
   * Current health status
   */
  status: 'good' | 'warning' | 'danger'

  /**
   * Human-readable status message
   */
  message: string

  /**
   * Whether any entity has stale data (>30 days)
   */
  isStale: boolean

  /**
   * List of entities with stale data
   */
  staleEntities: Array<{
    id: string
    name: string
    type: 'account' | 'card'
  }>

  /**
   * Danger day counts for display
   */
  dangerDays: {
    optimistic: number
    pessimistic: number
  }
}

/**
 * Extended cashflow projection hook (updated signature)
 */
export interface UseCashflowProjectionOptions {
  /**
   * Override projection days (defaults to user preference)
   */
  projectionDays?: ProjectionDays
}

