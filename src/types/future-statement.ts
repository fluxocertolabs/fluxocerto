/**
 * Future Statement API Contracts
 * 
 * This file defines the Zod schemas and TypeScript types for the
 * Future Credit Card Statements feature (023-future-credit-statements).
 * 
 * These schemas serve as the contract between:
 * - UI components (form validation)
 * - Store actions (input validation)
 * - Database operations (data transformation)
 */

import { z } from 'zod'
import { addMonths, startOfMonth } from 'date-fns'

// =============================================================================
// CORE SCHEMAS
// =============================================================================

/**
 * Input schema for creating/updating a future statement.
 * Used in forms and store actions.
 */
export const FutureStatementInputSchema = z.object({
  creditCardId: z.string().uuid('ID do cartão inválido'),
  targetMonth: z
    .number()
    .int('Mês deve ser um número inteiro')
    .min(1, 'Mês deve ser entre 1 e 12')
    .max(12, 'Mês deve ser entre 1 e 12'),
  targetYear: z
    .number()
    .int('Ano deve ser um número inteiro')
    .min(2020, 'Ano deve ser 2020 ou posterior'),
  amount: z
    .number()
    .int('Valor deve ser um número inteiro (centavos)')
    .min(0, 'Valor não pode ser negativo'), // Zero allowed per FR-006
})

/**
 * Full schema including server-generated fields.
 * Represents a future statement as returned from the database.
 */
export const FutureStatementSchema = FutureStatementInputSchema.extend({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * Schema for updating an existing future statement.
 * Allows partial updates (only amount typically changes).
 */
export const FutureStatementUpdateSchema = z.object({
  amount: z
    .number()
    .int('Valor deve ser um número inteiro (centavos)')
    .min(0, 'Valor não pode ser negativo')
    .optional(),
  targetMonth: z
    .number()
    .int('Mês deve ser um número inteiro')
    .min(1, 'Mês deve ser entre 1 e 12')
    .max(12, 'Mês deve ser entre 1 e 12')
    .optional(),
  targetYear: z
    .number()
    .int('Ano deve ser um número inteiro')
    .min(2020, 'Ano deve ser 2020 ou posterior')
    .optional(),
})

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type FutureStatementInput = z.infer<typeof FutureStatementInputSchema>
export type FutureStatement = z.infer<typeof FutureStatementSchema>
export type FutureStatementUpdate = z.infer<typeof FutureStatementUpdateSchema>

// =============================================================================
// DATABASE ROW TRANSFORMATION
// =============================================================================

/**
 * Transform database row (snake_case) to domain object (camelCase).
 */
export interface FutureStatementRow {
  id: string
  credit_card_id: string
  group_id: string
  target_month: number
  target_year: number
  amount: number
  created_at: string
  updated_at: string
}

export function transformFutureStatementRow(row: FutureStatementRow): FutureStatement {
  return {
    id: row.id,
    creditCardId: row.credit_card_id,
    groupId: row.group_id,
    targetMonth: row.target_month,
    targetYear: row.target_year,
    amount: row.amount,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

// =============================================================================
// FORM FIELD HELPERS
// =============================================================================

/**
 * Portuguese month names for localized display.
 */
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const

/**
 * Generates month options for select dropdown.
 * Returns next 12 months from current date.
 */
export function getAvailableMonthOptions(): Array<{
  value: { month: number; year: number }
  label: string
}> {
  const options: Array<{ value: { month: number; year: number }; label: string }> = []
  const today = new Date()

  for (let i = 0; i < 12; i++) {
    const targetDate = addMonths(startOfMonth(today), i)
    const month = targetDate.getMonth() + 1
    const year = targetDate.getFullYear()
    
    options.push({
      value: { month, year },
      label: `${MONTH_NAMES[month - 1]}/${year}`,
    })
  }

  return options
}

/**
 * Formats a month/year pair into a localized label.
 */
export function formatMonthYear(month: number, year: number): string {
  return `${MONTH_NAMES[month - 1]}/${year}`
}

/**
 * Checks if a given month/year is in the past.
 */
export function isMonthInPast(month: number, year: number): boolean {
  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()
  
  return year < currentYear || (year === currentYear && month < currentMonth)
}

/**
 * Checks if a given month/year is the current month.
 */
export function isCurrentMonth(month: number, year: number): boolean {
  const today = new Date()
  return month === today.getMonth() + 1 && year === today.getFullYear()
}

