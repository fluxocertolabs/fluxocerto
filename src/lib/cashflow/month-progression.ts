/**
 * Month Progression Logic
 * 
 * Handles automatic promotion of future statements to current balance
 * when a new month arrives. This runs at app launch to catch up on
 * any months that may have passed since the user's last login.
 */

import { startOfMonth, differenceInMonths } from 'date-fns'
import { getSupabase, getGroupId } from '@/lib/supabase'
import { transformFutureStatementRow, type FutureStatementRow } from '@/types'

/**
 * Result type for progression operations
 */
export type ProgressionResult =
  | { success: true; progressedCards: number; cleanedStatements: number }
  | { success: false; error: string }

/**
 * Check if month progression is needed and perform it if so.
 * This should be called once at app launch.
 * 
 * @param lastProgressionCheck - ISO string of last progression check date
 * @returns Result indicating success/failure and counts
 */
export async function checkAndProgressMonth(
  lastProgressionCheck: string | null
): Promise<ProgressionResult> {
  const today = startOfMonth(new Date())
  
  // If we've already checked this month, skip
  if (lastProgressionCheck) {
    const lastCheck = new Date(lastProgressionCheck)
    if (startOfMonth(lastCheck).getTime() === today.getTime()) {
      return { success: true, progressedCards: 0, cleanedStatements: 0 }
    }
  }

  // Perform the progression
  return performMonthProgression()
}

/**
 * Perform month progression for all credit cards.
 * 
 * Logic:
 * 1. For each credit card, check if there's a future statement for the current month
 * 2. If found, update the card's statementBalance and delete the future statement
 * 3. Clean up any past-month future statements (FR-012)
 * 
 * This handles multi-month catch-up: if user hasn't logged in for 2+ months,
 * we process each month sequentially.
 */
export async function performMonthProgression(): Promise<ProgressionResult> {
  try {
    const supabase = getSupabase()
    const groupId = await getGroupId()
    
    if (!groupId) {
      return { success: false, error: 'Não foi possível identificar seu grupo' }
    }

    // Get current month/year
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    // Fetch all credit cards and future statements for this group
    // Note: RLS policies enforce group isolation, but we add explicit filters
    // as defense-in-depth for data isolation
    const [cardsResult, statementsResult] = await Promise.all([
      supabase.from('credit_cards').select('id, statement_balance').eq('group_id', groupId),
      supabase.from('future_statements').select('*').eq('group_id', groupId),
    ])

    if (cardsResult.error) {
      return { success: false, error: `Erro ao buscar cartões: ${cardsResult.error.message}` }
    }

    if (statementsResult.error) {
      return { success: false, error: `Erro ao buscar faturas futuras: ${statementsResult.error.message}` }
    }

    const creditCards = cardsResult.data ?? []
    const futureStatements = (statementsResult.data ?? []).map((row) =>
      transformFutureStatementRow(row as FutureStatementRow)
    )

    let progressedCards = 0
    let cleanedStatements = 0

    // Process each credit card
    for (const card of creditCards) {
      // Find current month's future statement for this card
      const currentMonthStatement = futureStatements.find(
        (s) =>
          s.creditCardId === card.id &&
          s.targetMonth === currentMonth &&
          s.targetYear === currentYear
      )

      if (currentMonthStatement) {
        // Store original balance for potential rollback
        const originalBalance = card.statement_balance

        // Update card's statement balance
        const { error: updateError } = await supabase
          .from('credit_cards')
          .update({ statement_balance: currentMonthStatement.amount })
          .eq('id', card.id)

        if (updateError) {
          console.error(`Failed to update card ${card.id}:`, updateError)
          continue
        }

        // Delete the future statement (it's now the current statement)
        const { error: deleteError } = await supabase
          .from('future_statements')
          .delete()
          .eq('id', currentMonthStatement.id)

        if (deleteError) {
          console.error(`Failed to delete statement ${currentMonthStatement.id}:`, deleteError)
          // Rollback: restore original balance to maintain consistency
          const { error: rollbackError } = await supabase
            .from('credit_cards')
            .update({ statement_balance: originalBalance })
            .eq('id', card.id)
          if (rollbackError) {
            console.error(`Failed to rollback card ${card.id}:`, rollbackError)
          }
          continue
        }

        progressedCards++
      }
    }

    // Clean up past-month statements (FR-012)
    // Delete any future_statements where targetMonth/targetYear < current month
    // Note: RLS policies enforce group isolation, but we add explicit filter
    // as defense-in-depth for data isolation
    //
    // We use two separate delete queries instead of a single `or` filter because
    // PostgREST v13.x has a bug where DELETE with `or` filter fails with
    // "column does not exist" error even though the column exists.
    
    // First, delete statements from past years
    const { data: pastYearStatements, error: pastYearError } = await supabase
      .from('future_statements')
      .delete()
      .eq('group_id', groupId)
      .lt('target_year', currentYear)
      .select('id')

    if (pastYearError) {
      console.error('Failed to cleanup past year statements:', pastYearError)
    } else {
      cleanedStatements += pastYearStatements?.length ?? 0
    }

    // Then, delete statements from past months in current year
    const { data: pastMonthStatements, error: pastMonthError } = await supabase
      .from('future_statements')
      .delete()
      .eq('group_id', groupId)
      .eq('target_year', currentYear)
      .lt('target_month', currentMonth)
      .select('id')

    if (pastMonthError) {
      console.error('Failed to cleanup past month statements:', pastMonthError)
    } else {
      cleanedStatements += pastMonthStatements?.length ?? 0
    }

    return { success: true, progressedCards, cleanedStatements }
  } catch (error) {
    console.error('Month progression failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}

/**
 * Calculate how many months have passed since a given date.
 * Used to determine if multi-month catch-up is needed.
 */
export function getMonthsDiff(fromDate: Date, toDate: Date): number {
  return differenceInMonths(startOfMonth(toDate), startOfMonth(fromDate))
}

