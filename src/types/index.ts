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

// === Payment Schedule (Flexible Payment Schedule Feature) ===

/**
 * Payment schedule for weekly/biweekly frequencies.
 * Uses ISO 8601 day numbering: 1 = Monday, 7 = Sunday
 */
export const DayOfWeekScheduleSchema = z.object({
  type: z.literal('dayOfWeek'),
  dayOfWeek: z.number().int().min(1).max(7, 'Day of week must be 1-7 (Monday-Sunday)'),
})

/**
 * Payment schedule for monthly frequency.
 * Day of month (1-31), with month-end handling for shorter months.
 */
export const DayOfMonthScheduleSchema = z.object({
  type: z.literal('dayOfMonth'),
  dayOfMonth: z.number().int().min(1).max(31, 'Day of month must be 1-31'),
})

/**
 * Payment schedule for twice-monthly frequency.
 * Two distinct days of month (1-31).
 * Optionally supports different amounts for each payment day.
 */
export const TwiceMonthlyScheduleSchema = z
  .object({
    type: z.literal('twiceMonthly'),
    firstDay: z.number().int().min(1).max(31, 'First day must be 1-31'),
    secondDay: z.number().int().min(1).max(31, 'Second day must be 1-31'),
    // Optional variable amounts (in cents, matching project.amount format)
    firstAmount: z.number().positive('First amount must be positive').optional(),
    secondAmount: z.number().positive('Second amount must be positive').optional(),
  })
  .refine((data) => data.firstDay !== data.secondDay, {
    message: 'Both payment days must be different',
    path: ['secondDay'],
  })
  .refine(
    (data) => {
      const hasFirst = data.firstAmount !== undefined
      const hasSecond = data.secondAmount !== undefined
      // Either both present or both absent
      return hasFirst === hasSecond
    },
    {
      message: 'Both amounts are required when variable amounts is enabled',
      path: ['secondAmount'],
    }
  )

/**
 * Discriminated union for all payment schedule types.
 */
export const PaymentScheduleSchema = z.discriminatedUnion('type', [
  DayOfWeekScheduleSchema,
  DayOfMonthScheduleSchema,
  TwiceMonthlyScheduleSchema,
])

export type DayOfWeekSchedule = z.infer<typeof DayOfWeekScheduleSchema>
export type DayOfMonthSchedule = z.infer<typeof DayOfMonthScheduleSchema>
export type TwiceMonthlySchedule = z.infer<typeof TwiceMonthlyScheduleSchema>
export type PaymentSchedule = z.infer<typeof PaymentScheduleSchema>

/**
 * Frequency options ordered by occurrence rate (most frequent first).
 */
export const FrequencySchema = z.enum(['weekly', 'biweekly', 'twice-monthly', 'monthly'])
export type Frequency = z.infer<typeof FrequencySchema>

/**
 * Validation helper for form submission.
 * Ensures payment schedule type matches frequency.
 */
export function validateFrequencyScheduleMatch(
  frequency: Frequency,
  schedule: PaymentSchedule
): boolean {
  switch (frequency) {
    case 'weekly':
    case 'biweekly':
      return schedule.type === 'dayOfWeek'
    case 'twice-monthly':
      return schedule.type === 'twiceMonthly'
    case 'monthly':
      return schedule.type === 'dayOfMonth'
  }
}

// === Project (Income Source) ===

// Base schema without refinement (for extension)
const ProjectInputBaseSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  amount: z.number().positive('Amount must be positive'),
  frequency: FrequencySchema,
  paymentSchedule: PaymentScheduleSchema,
  certainty: z.enum(['guaranteed', 'probable', 'uncertain']),
  isActive: z.boolean().default(true),
})

// Input schema with frequency-schedule validation
export const ProjectInputSchema = ProjectInputBaseSchema.refine(
  (data) => validateFrequencyScheduleMatch(data.frequency, data.paymentSchedule),
  {
    message: 'Payment schedule type must match frequency',
    path: ['paymentSchedule'],
  }
)

// Full schema with system fields
export const ProjectSchema = ProjectInputBaseSchema.extend({
  id: z.string().uuid(),
  // Legacy field - kept for backward compatibility during migration
  paymentDay: z.number().int().min(1).max(31).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
}).refine(
  (data) => validateFrequencyScheduleMatch(data.frequency, data.paymentSchedule),
  {
    message: 'Payment schedule type must match frequency',
    path: ['paymentSchedule'],
  }
)

export type ProjectInput = z.infer<typeof ProjectInputSchema>
export type Project = z.infer<typeof ProjectSchema>

// === Expense Types ===

// Expense type discriminator
export const ExpenseTypeSchema = z.enum(['fixed', 'single_shot'])
export type ExpenseType = z.infer<typeof ExpenseTypeSchema>

// === Fixed Expense ===
export const FixedExpenseInputSchema = z.object({
  type: z.literal('fixed'),
  name: z.string().min(1, 'Nome da despesa é obrigatório').max(100),
  amount: z.number().positive('Valor deve ser positivo'),
  dueDay: z.number().int().min(1).max(31, 'Dia deve ser entre 1 e 31'),
  isActive: z.boolean().default(true),
})

export const FixedExpenseSchema = FixedExpenseInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type FixedExpenseInput = z.infer<typeof FixedExpenseInputSchema>
export type FixedExpense = z.infer<typeof FixedExpenseSchema>

// === Single-Shot Expense ===
export const SingleShotExpenseInputSchema = z.object({
  type: z.literal('single_shot'),
  name: z.string().min(1, 'Nome da despesa é obrigatório').max(100),
  amount: z.number().positive('Valor deve ser positivo'),
  date: z.coerce.date(),
})

export const SingleShotExpenseSchema = SingleShotExpenseInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type SingleShotExpenseInput = z.infer<typeof SingleShotExpenseInputSchema>
export type SingleShotExpense = z.infer<typeof SingleShotExpenseSchema>

// === Unified Expense Types ===
export const ExpenseInputSchema = z.discriminatedUnion('type', [
  FixedExpenseInputSchema,
  SingleShotExpenseInputSchema,
])

export const ExpenseSchema = z.discriminatedUnion('type', [
  FixedExpenseSchema,
  SingleShotExpenseSchema,
])

export type ExpenseInput = z.infer<typeof ExpenseInputSchema>
export type Expense = z.infer<typeof ExpenseSchema>

// Type guards for filtering
export function isFixedExpense(expense: Expense): expense is FixedExpense {
  return expense.type === 'fixed'
}

export function isSingleShotExpense(expense: Expense): expense is SingleShotExpense {
  return expense.type === 'single_shot'
}

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
