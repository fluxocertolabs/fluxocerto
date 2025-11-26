import { z } from 'zod'

// === Bank Account ===
export const BankAccountInputSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  type: z.enum(['checking', 'savings', 'investment']),
  balance: z.number().min(0, 'Balance cannot be negative'),
})

export const BankAccountSchema = BankAccountInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  balanceUpdatedAt: z.date().optional(),
})

export type BankAccountInput = z.infer<typeof BankAccountInputSchema>
export type BankAccount = z.infer<typeof BankAccountSchema>

// === Project (Income Source) ===
export const ProjectInputSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  amount: z.number().positive('Amount must be positive'),
  paymentDay: z.number().int().min(1).max(31, 'Payment day must be 1-31'),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
  certainty: z.enum(['guaranteed', 'probable', 'uncertain']),
  isActive: z.boolean().default(true),
})

export const ProjectSchema = ProjectInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type ProjectInput = z.infer<typeof ProjectInputSchema>
export type Project = z.infer<typeof ProjectSchema>

// === Fixed Expense ===
export const FixedExpenseInputSchema = z.object({
  name: z.string().min(1, 'Expense name is required').max(100),
  amount: z.number().positive('Amount must be positive'),
  dueDay: z.number().int().min(1).max(31, 'Due day must be 1-31'),
  isActive: z.boolean().default(true),
})

export const FixedExpenseSchema = FixedExpenseInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type FixedExpenseInput = z.infer<typeof FixedExpenseInputSchema>
export type FixedExpense = z.infer<typeof FixedExpenseSchema>

// === Credit Card ===
export const CreditCardInputSchema = z.object({
  name: z.string().min(1, 'Card name is required').max(100),
  statementBalance: z.number().min(0, 'Balance cannot be negative'),
  dueDay: z.number().int().min(1).max(31, 'Due day must be 1-31'),
})

export const CreditCardSchema = CreditCardInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  balanceUpdatedAt: z.date().optional(),
})

export type CreditCardInput = z.infer<typeof CreditCardInputSchema>
export type CreditCard = z.infer<typeof CreditCardSchema>

// === Projection Days ===
export const ProjectionDaysSchema = z.union([
  z.literal(7),
  z.literal(14),
  z.literal(30),
  z.literal(60),
  z.literal(90),
])

export type ProjectionDays = z.infer<typeof ProjectionDaysSchema>

// === User Preferences ===
export interface UserPreferences {
  projectionDays: ProjectionDays
}

