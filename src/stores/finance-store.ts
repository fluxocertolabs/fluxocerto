import { create } from 'zustand'
import { z } from 'zod'
import {
  getSupabase,
  getGroupId,
  handleSupabaseError,
  isSupabaseConfigured,
} from '../lib/supabase'
import { notifyFinanceDataInvalidated } from '../lib/finance-data-events'
import { captureEvent } from '../lib/analytics/posthog'
import {
  BankAccountInputSchema,
  ProjectInputSchema,
  FixedExpenseInputSchema,
  CreditCardInputSchema,
  SingleShotExpenseInputSchema,
  SingleShotIncomeInputSchema,
  FutureStatementInputSchema,
  FutureStatementUpdateSchema,
  type BankAccountInput,
  type ProjectInput,
  type FixedExpenseInput,
  type CreditCardInput,
  type SingleShotExpenseInput,
  type SingleShotIncomeInput,
  type FutureStatementInput,
  type FutureStatementUpdate,
} from '../types'

// Result type for explicit error handling
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }

// Store interface with all action signatures
interface FinanceStore {
  // Bank Account Actions
  addAccount: (input: BankAccountInput, meta?: AnalyticsMeta) => Promise<Result<string>>
  updateAccount: (
    id: string,
    input: Partial<BankAccountInput>,
    meta?: AnalyticsMeta
  ) => Promise<Result<void>>
  deleteAccount: (id: string, meta?: AnalyticsMeta) => Promise<Result<void>>

  // Project Actions
  addProject: (input: ProjectInput, meta?: AnalyticsMeta) => Promise<Result<string>>
  updateProject: (
    id: string,
    input: Partial<ProjectInput>,
    meta?: AnalyticsMeta
  ) => Promise<Result<void>>
  deleteProject: (id: string, meta?: AnalyticsMeta) => Promise<Result<void>>
  toggleProjectActive: (id: string, meta?: AnalyticsMeta) => Promise<Result<void>>

  // Fixed Expense Actions
  addExpense: (input: FixedExpenseInput, meta?: AnalyticsMeta) => Promise<Result<string>>
  updateExpense: (
    id: string,
    input: Partial<FixedExpenseInput>,
    meta?: AnalyticsMeta
  ) => Promise<Result<void>>
  deleteExpense: (id: string, meta?: AnalyticsMeta) => Promise<Result<void>>
  toggleExpenseActive: (id: string, meta?: AnalyticsMeta) => Promise<Result<void>>

  // Single-Shot Expense Actions
  addSingleShotExpense: (input: SingleShotExpenseInput, meta?: AnalyticsMeta) => Promise<Result<string>>
  updateSingleShotExpense: (
    id: string,
    input: Partial<Omit<SingleShotExpenseInput, 'type'>>,
    meta?: AnalyticsMeta
  ) => Promise<Result<void>>
  deleteSingleShotExpense: (id: string, meta?: AnalyticsMeta) => Promise<Result<void>>

  // Single-Shot Income Actions
  addSingleShotIncome: (input: SingleShotIncomeInput, meta?: AnalyticsMeta) => Promise<Result<string>>
  updateSingleShotIncome: (
    id: string,
    input: Partial<Omit<SingleShotIncomeInput, 'type'>>,
    meta?: AnalyticsMeta
  ) => Promise<Result<void>>
  deleteSingleShotIncome: (id: string, meta?: AnalyticsMeta) => Promise<Result<void>>

  // Credit Card Actions
  addCreditCard: (input: CreditCardInput, meta?: AnalyticsMeta) => Promise<Result<string>>
  updateCreditCard: (
    id: string,
    input: Partial<CreditCardInput>,
    meta?: AnalyticsMeta
  ) => Promise<Result<void>>
  deleteCreditCard: (id: string, meta?: AnalyticsMeta) => Promise<Result<void>>

  // Future Statement Actions
  addFutureStatement: (input: FutureStatementInput, meta?: AnalyticsMeta) => Promise<Result<string>>
  updateFutureStatement: (
    id: string,
    input: FutureStatementUpdate,
    meta?: AnalyticsMeta
  ) => Promise<Result<void>>
  deleteFutureStatement: (id: string, meta?: AnalyticsMeta) => Promise<Result<void>>

  // Balance Update Actions (for Quick Balance Update feature)
  updateAccountBalance: (id: string, balance: number, meta?: AnalyticsMeta) => Promise<Result<void>>
  updateCreditCardBalance: (
    id: string,
    statementBalance: number,
    meta?: AnalyticsMeta
  ) => Promise<Result<void>>
  
  // Mark all balances as updated (for Quick Update "Concluir" action)
  markAllBalancesUpdated: (meta?: AnalyticsMeta) => Promise<Result<void>>
}

type AnalyticsSource = 'app' | 'manage' | 'onboarding' | 'quick_update'

interface AnalyticsMeta {
  source?: AnalyticsSource
}

// Helper to handle common errors (Zod validation + Supabase errors)
function handleDatabaseError(error: unknown): Result<never> {
  if (error instanceof z.ZodError) {
    return { success: false, error: 'Validation failed', details: error.issues }
  }

  return handleSupabaseError(error)
}

// Helper to check if Supabase is configured
function checkSupabaseConfigured(): Result<never> | null {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Supabase is not configured. Please set up your environment variables.',
    }
  }
  return null
}

function getAnalyticsSource(meta?: AnalyticsMeta): AnalyticsSource {
  return meta?.source ?? 'app'
}

function captureFinanceEvent(
  event: string,
  meta: AnalyticsMeta | undefined,
  properties: Record<string, unknown>
): void {
  captureEvent(event, {
    source: getAnalyticsSource(meta),
    ...properties,
  })
}

export const useFinanceStore = create<FinanceStore>()(() => ({
  // === Bank Account Actions ===
  addAccount: async (input, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      const validated = BankAccountInputSchema.parse(input)
      
      // Get current user's group_id
      const groupId = await getGroupId()
      if (!groupId) {
        return { success: false, error: 'Não foi possível identificar seu grupo' }
      }

      const { data, error } = await getSupabase()
        .from('accounts')
        .insert({
          name: validated.name,
          type: validated.type,
          balance: validated.balance,
          owner_id: validated.ownerId ?? null,
          group_id: groupId,
          // Set balance_updated_at to now so new accounts show as "fresh"
          balance_updated_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (error) {
        return handleSupabaseError(error)
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('account_created', meta, {
        entity_type: 'account',
        owner_assigned: Boolean(validated.ownerId),
      })
      return { success: true, data: data.id }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  updateAccount: async (id, input, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      const validated = BankAccountInputSchema.partial().parse(input)
      
      // Build update object with snake_case keys
      const updateData: Record<string, unknown> = {}
      if (validated.name !== undefined) updateData.name = validated.name
      if (validated.type !== undefined) updateData.type = validated.type
      if (validated.balance !== undefined) {
        updateData.balance = validated.balance
        // Also update balance_updated_at when balance changes
        updateData.balance_updated_at = new Date().toISOString()
      }
      if (validated.ownerId !== undefined) updateData.owner_id = validated.ownerId

      const { error, count } = await getSupabase()
        .from('accounts')
        .update(updateData)
        .eq('id', id)

      if (error) {
        return handleSupabaseError(error)
      }

      if (count === 0) {
        return { success: false, error: 'Account not found' }
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('account_updated', meta, {
        entity_type: 'account',
        owner_assigned: validated.ownerId !== undefined ? validated.ownerId !== null : undefined,
        balance_updated: validated.balance !== undefined,
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  deleteAccount: async (id, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      const { error, count } = await getSupabase()
        .from('accounts')
        .delete()
        .eq('id', id)

      if (error) {
        return handleSupabaseError(error)
      }

      if (count === 0) {
        return { success: false, error: 'Account not found' }
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('account_deleted', meta, {
        entity_type: 'account',
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  // === Project Actions ===
  addProject: async (input, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      const validated = ProjectInputSchema.parse(input)
      
      // Get current user's group_id
      const groupId = await getGroupId()
      if (!groupId) {
        return { success: false, error: 'Não foi possível identificar seu grupo' }
      }

      const { data, error } = await getSupabase()
        .from('projects')
        .insert({
          name: validated.name,
          amount: validated.amount,
          frequency: validated.frequency,
          payment_schedule: validated.paymentSchedule,
          certainty: validated.certainty,
          is_active: validated.isActive,
          group_id: groupId,
        })
        .select('id')
        .single()

      if (error) {
        return handleSupabaseError(error)
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('project_created', meta, {
        entity_type: 'project',
        is_active: validated.isActive,
      })
      return { success: true, data: data.id }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  updateProject: async (id, input, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      const validated = ProjectInputSchema.partial().parse(input)
      
      // Build update object with snake_case keys
      const updateData: Record<string, unknown> = {}
      if (validated.name !== undefined) updateData.name = validated.name
      if (validated.amount !== undefined) updateData.amount = validated.amount
      if (validated.frequency !== undefined) updateData.frequency = validated.frequency
      if (validated.paymentSchedule !== undefined) updateData.payment_schedule = validated.paymentSchedule
      if (validated.certainty !== undefined) updateData.certainty = validated.certainty
      if (validated.isActive !== undefined) updateData.is_active = validated.isActive

      const { error, count } = await getSupabase()
        .from('projects')
        .update(updateData)
        .eq('id', id)

      if (error) {
        return handleSupabaseError(error)
      }

      if (count === 0) {
        return { success: false, error: 'Project not found' }
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('project_updated', meta, {
        entity_type: 'project',
        is_active: validated.isActive,
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  deleteProject: async (id, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      const { error, count } = await getSupabase()
        .from('projects')
        .delete()
        .eq('id', id)

      if (error) {
        return handleSupabaseError(error)
      }

      if (count === 0) {
        return { success: false, error: 'Project not found' }
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('project_deleted', meta, {
        entity_type: 'project',
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  toggleProjectActive: async (id, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      // First, fetch current state
      const { data: existing, error: fetchError } = await getSupabase()
        .from('projects')
        .select('is_active')
        .eq('id', id)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return { success: false, error: 'Project not found' }
        }
        return handleSupabaseError(fetchError)
      }

      // Toggle the value
      const { error: updateError } = await getSupabase()
        .from('projects')
        .update({ is_active: !existing.is_active })
        .eq('id', id)

      if (updateError) {
        return handleSupabaseError(updateError)
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('project_toggled_active', meta, {
        entity_type: 'project',
        is_active: !existing.is_active,
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  // === Fixed Expense Actions ===
  addExpense: async (input, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      const validated = FixedExpenseInputSchema.parse(input)
      
      // Get current user's group_id
      const groupId = await getGroupId()
      if (!groupId) {
        return { success: false, error: 'Não foi possível identificar seu grupo' }
      }

      const { data, error } = await getSupabase()
        .from('expenses')
        .insert({
          name: validated.name,
          amount: validated.amount,
          type: 'fixed',
          due_day: validated.dueDay,
          date: null,
          is_active: validated.isActive,
          group_id: groupId,
        })
        .select('id')
        .single()

      if (error) {
        return handleSupabaseError(error)
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('expense_created', meta, {
        entity_type: 'expense',
        is_active: validated.isActive,
      })
      return { success: true, data: data.id }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  updateExpense: async (id, input, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      const validated = FixedExpenseInputSchema.partial().parse(input)
      
      // Build update object with snake_case keys
      const updateData: Record<string, unknown> = {}
      if (validated.name !== undefined) updateData.name = validated.name
      if (validated.amount !== undefined) updateData.amount = validated.amount
      if (validated.dueDay !== undefined) updateData.due_day = validated.dueDay
      if (validated.isActive !== undefined) updateData.is_active = validated.isActive

      const { error, count } = await getSupabase()
        .from('expenses')
        .update(updateData)
        .eq('id', id)

      if (error) {
        return handleSupabaseError(error)
      }

      if (count === 0) {
        return { success: false, error: 'Expense not found' }
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('expense_updated', meta, {
        entity_type: 'expense',
        is_active: validated.isActive,
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  deleteExpense: async (id, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      const { error, count } = await getSupabase()
        .from('expenses')
        .delete({ count: 'exact' })
        .eq('id', id)

      if (error) {
        return handleSupabaseError(error)
      }

      if ((count ?? 0) === 0) {
        return { success: false, error: 'Despesa não encontrada' }
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('expense_deleted', meta, {
        entity_type: 'expense',
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  toggleExpenseActive: async (id, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      // First, fetch current state
      const { data: existing, error: fetchError } = await getSupabase()
        .from('expenses')
        .select('is_active')
        .eq('id', id)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return { success: false, error: 'Expense not found' }
        }
        return handleSupabaseError(fetchError)
      }

      // Toggle the value
      const { error: updateError } = await getSupabase()
        .from('expenses')
        .update({ is_active: !existing.is_active })
        .eq('id', id)

      if (updateError) {
        return handleSupabaseError(updateError)
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('expense_toggled_active', meta, {
        entity_type: 'expense',
        is_active: !existing.is_active,
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  // === Single-Shot Expense Actions ===
  addSingleShotExpense: async (input, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      const validated = SingleShotExpenseInputSchema.parse(input)
      
      // Get current user's group_id
      const groupId = await getGroupId()
      if (!groupId) {
        return { success: false, error: 'Não foi possível identificar seu grupo' }
      }

      const { data, error } = await getSupabase()
        .from('expenses')
        .insert({
          name: validated.name,
          amount: validated.amount,
          type: 'single_shot',
          date: validated.date.toISOString().split('T')[0],
          due_day: null,
          is_active: true,
          group_id: groupId,
        })
        .select('id')
        .single()

      if (error) {
        return handleSupabaseError(error)
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('single_shot_expense_created', meta, {
        entity_type: 'single_shot_expense',
      })
      return { success: true, data: data.id }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  updateSingleShotExpense: async (id, input, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      const updateData: Record<string, unknown> = {}
      if (input.name !== undefined) updateData.name = input.name
      if (input.amount !== undefined) updateData.amount = input.amount
      if (input.date !== undefined) updateData.date = input.date.toISOString().split('T')[0]

      const { error, count } = await getSupabase()
        .from('expenses')
        .update(updateData)
        .eq('id', id)
        .eq('type', 'single_shot')

      if (error) {
        return handleSupabaseError(error)
      }

      if (count === 0) {
        return { success: false, error: 'Despesa não encontrada' }
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('single_shot_expense_updated', meta, {
        entity_type: 'single_shot_expense',
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  deleteSingleShotExpense: async (id, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      const { error, count } = await getSupabase()
        .from('expenses')
        .delete({ count: 'exact' })
        .eq('id', id)
        .eq('type', 'single_shot')

      if (error) {
        return handleSupabaseError(error)
      }

      if ((count ?? 0) === 0) {
        return { success: false, error: 'Despesa não encontrada' }
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('single_shot_expense_deleted', meta, {
        entity_type: 'single_shot_expense',
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  // === Single-Shot Income Actions ===
  addSingleShotIncome: async (input, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      const validated = SingleShotIncomeInputSchema.parse(input)
      
      // Get current user's group_id
      const groupId = await getGroupId()
      if (!groupId) {
        return { success: false, error: 'Não foi possível identificar seu grupo' }
      }

      const { data, error } = await getSupabase()
        .from('projects')
        .insert({
          type: 'single_shot',
          name: validated.name,
          amount: validated.amount,
          date: validated.date.toISOString().split('T')[0],
          certainty: validated.certainty,
          frequency: null,
          payment_schedule: null,
          is_active: null,
          group_id: groupId,
        })
        .select('id')
        .single()

      if (error) {
        return handleSupabaseError(error)
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('single_shot_income_created', meta, {
        entity_type: 'single_shot_income',
      })
      return { success: true, data: data.id }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  updateSingleShotIncome: async (id, input, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      const updateData: Record<string, unknown> = {}
      if (input.name !== undefined) updateData.name = input.name
      if (input.amount !== undefined) updateData.amount = input.amount
      if (input.date !== undefined) updateData.date = input.date.toISOString().split('T')[0]
      if (input.certainty !== undefined) updateData.certainty = input.certainty

      const { error, count } = await getSupabase()
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .eq('type', 'single_shot')

      if (error) {
        return handleSupabaseError(error)
      }

      if (count === 0) {
        return { success: false, error: 'Receita não encontrada' }
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('single_shot_income_updated', meta, {
        entity_type: 'single_shot_income',
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  deleteSingleShotIncome: async (id, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      const { error, count } = await getSupabase()
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('type', 'single_shot')

      if (error) {
        return handleSupabaseError(error)
      }

      if (count === 0) {
        return { success: false, error: 'Receita não encontrada' }
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('single_shot_income_deleted', meta, {
        entity_type: 'single_shot_income',
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  // === Credit Card Actions ===
  addCreditCard: async (input, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      const validated = CreditCardInputSchema.parse(input)
      
      // Get current user's group_id
      const groupId = await getGroupId()
      if (!groupId) {
        return { success: false, error: 'Não foi possível identificar seu grupo' }
      }

      const { data, error } = await getSupabase()
        .from('credit_cards')
        .insert({
          name: validated.name,
          statement_balance: validated.statementBalance,
          due_day: validated.dueDay,
          owner_id: validated.ownerId ?? null,
          group_id: groupId,
          // Set balance_updated_at to now so new cards show as "fresh"
          balance_updated_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (error) {
        return handleSupabaseError(error)
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('credit_card_created', meta, {
        entity_type: 'credit_card',
        owner_assigned: Boolean(validated.ownerId),
      })
      return { success: true, data: data.id }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  updateCreditCard: async (id, input, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      const validated = CreditCardInputSchema.partial().parse(input)
      
      // Build update object with snake_case keys
      const updateData: Record<string, unknown> = {}
      if (validated.name !== undefined) updateData.name = validated.name
      if (validated.statementBalance !== undefined) {
        updateData.statement_balance = validated.statementBalance
        // Also update balance_updated_at when balance changes
        updateData.balance_updated_at = new Date().toISOString()
      }
      if (validated.dueDay !== undefined) updateData.due_day = validated.dueDay
      if (validated.ownerId !== undefined) updateData.owner_id = validated.ownerId

      const { error, count } = await getSupabase()
        .from('credit_cards')
        .update(updateData)
        .eq('id', id)

      if (error) {
        return handleSupabaseError(error)
      }

      if (count === 0) {
        return { success: false, error: 'Credit card not found' }
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('credit_card_updated', meta, {
        entity_type: 'credit_card',
        owner_assigned: validated.ownerId !== undefined ? validated.ownerId !== null : undefined,
        balance_updated: validated.statementBalance !== undefined,
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  deleteCreditCard: async (id, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      const { error, count } = await getSupabase()
        .from('credit_cards')
        .delete()
        .eq('id', id)

      if (error) {
        return handleSupabaseError(error)
      }

      if (count === 0) {
        return { success: false, error: 'Credit card not found' }
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('credit_card_deleted', meta, {
        entity_type: 'credit_card',
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  // === Future Statement Actions ===
  addFutureStatement: async (input, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      const validated = FutureStatementInputSchema.parse(input)
      
      // Get current user's group_id
      const groupId = await getGroupId()
      if (!groupId) {
        return { success: false, error: 'Não foi possível identificar seu grupo' }
      }

      const { data, error } = await getSupabase()
        .from('future_statements')
        .insert({
          credit_card_id: validated.creditCardId,
          group_id: groupId,
          target_month: validated.targetMonth,
          target_year: validated.targetYear,
          amount: validated.amount,
        })
        .select('id')
        .single()

      if (error) {
        // Handle unique constraint violation
        if (error.code === '23505') {
          return { success: false, error: 'Já existe uma fatura definida para este mês' }
        }
        return handleSupabaseError(error)
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('future_statement_created', meta, {
        entity_type: 'future_statement',
      })
      return { success: true, data: data.id }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  updateFutureStatement: async (id, input, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      const validated = FutureStatementUpdateSchema.parse(input)
      
      // Build update object with snake_case keys
      const updateData: Record<string, unknown> = {}
      if (validated.amount !== undefined) updateData.amount = validated.amount
      if (validated.targetMonth !== undefined) updateData.target_month = validated.targetMonth
      if (validated.targetYear !== undefined) updateData.target_year = validated.targetYear

      const { error, count } = await getSupabase()
        .from('future_statements')
        .update(updateData)
        .eq('id', id)

      if (error) {
        // Handle unique constraint violation
        if (error.code === '23505') {
          return { success: false, error: 'Já existe uma fatura definida para este mês' }
        }
        return handleSupabaseError(error)
      }

      if (count === 0) {
        return { success: false, error: 'Fatura futura não encontrada' }
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('future_statement_updated', meta, {
        entity_type: 'future_statement',
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  deleteFutureStatement: async (id, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      const { error, count } = await getSupabase()
        .from('future_statements')
        .delete()
        .eq('id', id)

      if (error) {
        return handleSupabaseError(error)
      }

      if (count === 0) {
        return { success: false, error: 'Fatura futura não encontrada' }
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('future_statement_deleted', meta, {
        entity_type: 'future_statement',
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  // === Balance Update Actions ===
  updateAccountBalance: async (id, balance, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      if (balance < 0) {
        return { success: false, error: 'Balance cannot be negative' }
      }

      const now = new Date().toISOString()
      const { error, count } = await getSupabase()
        .from('accounts')
        .update({
          balance,
          balance_updated_at: now,
        })
        .eq('id', id)

      if (error) {
        return handleSupabaseError(error)
      }

      if (count === 0) {
        return { success: false, error: 'Account not found' }
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('account_updated', meta, {
        entity_type: 'account',
        balance_updated: true,
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  updateCreditCardBalance: async (id, statementBalance, meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      if (statementBalance < 0) {
        return { success: false, error: 'Balance cannot be negative' }
      }

      const now = new Date().toISOString()
      const { error, count } = await getSupabase()
        .from('credit_cards')
        .update({
          statement_balance: statementBalance,
          balance_updated_at: now,
        })
        .eq('id', id)

      if (error) {
        return handleSupabaseError(error)
      }

      if (count === 0) {
        return { success: false, error: 'Credit card not found' }
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('credit_card_updated', meta, {
        entity_type: 'credit_card',
        balance_updated: true,
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  markAllBalancesUpdated: async (meta) => {
    const configError = checkSupabaseConfigured()
    if (configError) return configError

    try {
      const now = new Date().toISOString()
      const supabase = getSupabase()

      // Update all accounts' balance_updated_at
      const { error: accountsError } = await supabase
        .from('accounts')
        .update({ balance_updated_at: now })
        .not('id', 'is', null) // Match all rows

      if (accountsError) {
        return handleSupabaseError(accountsError)
      }

      // Update all credit cards' balance_updated_at
      const { error: cardsError } = await supabase
        .from('credit_cards')
        .update({ balance_updated_at: now })
        .not('id', 'is', null) // Match all rows

      if (cardsError) {
        return handleSupabaseError(cardsError)
      }

      notifyFinanceDataInvalidated()
      captureFinanceEvent('balances_marked_updated', meta, {
        entity_type: 'balances',
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },
}))
