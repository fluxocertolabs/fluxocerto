import { create } from 'zustand'
import { z } from 'zod'
import { db } from '../db'
import {
  BankAccountInputSchema,
  ProjectInputSchema,
  FixedExpenseInputSchema,
  CreditCardInputSchema,
  type BankAccountInput,
  type ProjectInput,
  type FixedExpenseInput,
  type CreditCardInput,
} from '../types'

// Result type for explicit error handling
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }

// Store interface with all action signatures
interface FinanceStore {
  // Bank Account Actions
  addAccount: (input: BankAccountInput) => Promise<Result<string>>
  updateAccount: (
    id: string,
    input: Partial<BankAccountInput>
  ) => Promise<Result<void>>
  deleteAccount: (id: string) => Promise<Result<void>>

  // Project Actions
  addProject: (input: ProjectInput) => Promise<Result<string>>
  updateProject: (
    id: string,
    input: Partial<ProjectInput>
  ) => Promise<Result<void>>
  deleteProject: (id: string) => Promise<Result<void>>
  toggleProjectActive: (id: string) => Promise<Result<void>>

  // Fixed Expense Actions
  addExpense: (input: FixedExpenseInput) => Promise<Result<string>>
  updateExpense: (
    id: string,
    input: Partial<FixedExpenseInput>
  ) => Promise<Result<void>>
  deleteExpense: (id: string) => Promise<Result<void>>
  toggleExpenseActive: (id: string) => Promise<Result<void>>

  // Credit Card Actions
  addCreditCard: (input: CreditCardInput) => Promise<Result<string>>
  updateCreditCard: (
    id: string,
    input: Partial<CreditCardInput>
  ) => Promise<Result<void>>
  deleteCreditCard: (id: string) => Promise<Result<void>>
}

// Helper to handle common IndexedDB errors
function handleDatabaseError(error: unknown): Result<never> {
  if (error instanceof z.ZodError) {
    return { success: false, error: 'Validation failed', details: error.issues }
  }

  if (error instanceof Error) {
    if (error.name === 'QuotaExceededError') {
      return {
        success: false,
        error: 'Storage full. Please delete some data.',
      }
    }
    if (error.name === 'ConstraintError') {
      return { success: false, error: 'A record with this ID already exists.' }
    }
    if (error.name === 'InvalidStateError') {
      return {
        success: false,
        error: 'Database is unavailable. Please refresh the page.',
      }
    }
  }

  return { success: false, error: 'An unexpected error occurred.' }
}

export const useFinanceStore = create<FinanceStore>()(() => ({
  // === Bank Account Actions ===
  addAccount: async (input) => {
    try {
      const validated = BankAccountInputSchema.parse(input)
      const id = crypto.randomUUID()
      const now = new Date()
      await db.accounts.add({
        ...validated,
        id,
        createdAt: now,
        updatedAt: now,
      })
      return { success: true, data: id }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  updateAccount: async (id, input) => {
    try {
      const existing = await db.accounts.get(id)
      if (!existing) {
        return { success: false, error: 'Account not found' }
      }

      const validated = BankAccountInputSchema.partial().parse(input)
      await db.accounts.update(id, {
        ...validated,
        updatedAt: new Date(),
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  deleteAccount: async (id) => {
    try {
      const existing = await db.accounts.get(id)
      if (!existing) {
        return { success: false, error: 'Account not found' }
      }

      await db.accounts.delete(id)
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  // === Project Actions ===
  addProject: async (input) => {
    try {
      const validated = ProjectInputSchema.parse(input)
      const id = crypto.randomUUID()
      const now = new Date()
      await db.projects.add({
        ...validated,
        id,
        createdAt: now,
        updatedAt: now,
      })
      return { success: true, data: id }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  updateProject: async (id, input) => {
    try {
      const existing = await db.projects.get(id)
      if (!existing) {
        return { success: false, error: 'Project not found' }
      }

      const validated = ProjectInputSchema.partial().parse(input)
      await db.projects.update(id, {
        ...validated,
        updatedAt: new Date(),
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  deleteProject: async (id) => {
    try {
      const existing = await db.projects.get(id)
      if (!existing) {
        return { success: false, error: 'Project not found' }
      }

      await db.projects.delete(id)
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  toggleProjectActive: async (id) => {
    try {
      const existing = await db.projects.get(id)
      if (!existing) {
        return { success: false, error: 'Project not found' }
      }

      await db.projects.update(id, {
        isActive: !existing.isActive,
        updatedAt: new Date(),
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  // === Fixed Expense Actions ===
  addExpense: async (input) => {
    try {
      const validated = FixedExpenseInputSchema.parse(input)
      const id = crypto.randomUUID()
      const now = new Date()
      await db.expenses.add({
        ...validated,
        id,
        createdAt: now,
        updatedAt: now,
      })
      return { success: true, data: id }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  updateExpense: async (id, input) => {
    try {
      const existing = await db.expenses.get(id)
      if (!existing) {
        return { success: false, error: 'Expense not found' }
      }

      const validated = FixedExpenseInputSchema.partial().parse(input)
      await db.expenses.update(id, {
        ...validated,
        updatedAt: new Date(),
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  deleteExpense: async (id) => {
    try {
      const existing = await db.expenses.get(id)
      if (!existing) {
        return { success: false, error: 'Expense not found' }
      }

      await db.expenses.delete(id)
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  toggleExpenseActive: async (id) => {
    try {
      const existing = await db.expenses.get(id)
      if (!existing) {
        return { success: false, error: 'Expense not found' }
      }

      await db.expenses.update(id, {
        isActive: !existing.isActive,
        updatedAt: new Date(),
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  // === Credit Card Actions ===
  addCreditCard: async (input) => {
    try {
      const validated = CreditCardInputSchema.parse(input)
      const id = crypto.randomUUID()
      const now = new Date()
      await db.creditCards.add({
        ...validated,
        id,
        createdAt: now,
        updatedAt: now,
      })
      return { success: true, data: id }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  updateCreditCard: async (id, input) => {
    try {
      const existing = await db.creditCards.get(id)
      if (!existing) {
        return { success: false, error: 'Credit card not found' }
      }

      const validated = CreditCardInputSchema.partial().parse(input)
      await db.creditCards.update(id, {
        ...validated,
        updatedAt: new Date(),
      })
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },

  deleteCreditCard: async (id) => {
    try {
      const existing = await db.creditCards.get(id)
      if (!existing) {
        return { success: false, error: 'Credit card not found' }
      }

      await db.creditCards.delete(id)
      return { success: true, data: undefined }
    } catch (error) {
      return handleDatabaseError(error)
    }
  },
}))

