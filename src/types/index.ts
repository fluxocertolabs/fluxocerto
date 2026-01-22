import { z } from 'zod'

// === Profile (Owner) ===
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  groupId: z.string().uuid(),
})

export type Profile = z.infer<typeof ProfileSchema>

// Owner object schema for joined data
const OwnerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
}).nullable()

// === Bank Account ===
export const BankAccountInputSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  type: z.enum(['checking', 'savings', 'investment']),
  balance: z.number().min(0, 'Balance cannot be negative'),
  ownerId: z.string().uuid().nullable().optional(),
})

export const BankAccountSchema = BankAccountInputSchema.extend({
  id: z.string().uuid(),
  owner: OwnerSchema,
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
const DayOfWeekScheduleSchema = z.object({
  type: z.literal('dayOfWeek'),
  dayOfWeek: z.number().int().min(1).max(7, 'Day of week must be 1-7 (Monday-Sunday)'),
})

/**
 * Payment schedule for monthly frequency.
 * Day of month (1-31), with month-end handling for shorter months.
 */
const DayOfMonthScheduleSchema = z.object({
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

// === Recurring Project (Income Source) ===

// Base schema without refinement (for extension)
const RecurringProjectInputBaseSchema = z.object({
  type: z.literal('recurring').default('recurring'),
  name: z.string().min(1, 'Project name is required').max(100),
  amount: z.number().positive('Amount must be positive'),
  frequency: FrequencySchema,
  paymentSchedule: PaymentScheduleSchema,
  certainty: z.enum(['guaranteed', 'probable', 'uncertain']),
  isActive: z.boolean().default(true),
})

// Input schema with frequency-schedule validation
const RecurringProjectInputSchema = RecurringProjectInputBaseSchema.refine(
  (data) => validateFrequencyScheduleMatch(data.frequency, data.paymentSchedule),
  {
    message: 'Payment schedule type must match frequency',
    path: ['paymentSchedule'],
  }
)

// Full schema with system fields
export const RecurringProjectSchema = RecurringProjectInputBaseSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
}).refine(
  (data) => validateFrequencyScheduleMatch(data.frequency, data.paymentSchedule),
  {
    message: 'Payment schedule type must match frequency',
    path: ['paymentSchedule'],
  }
)

export type RecurringProjectInput = z.infer<typeof RecurringProjectInputSchema>
export type RecurringProject = z.infer<typeof RecurringProjectSchema>

// Backward compatibility aliases - Project refers to RecurringProject
export const ProjectInputSchema = RecurringProjectInputSchema
export const ProjectSchema = RecurringProjectSchema
export type ProjectInput = RecurringProjectInput
export type Project = RecurringProject

// === Single-Shot Income ===

export const SingleShotIncomeInputSchema = z.object({
  type: z.literal('single_shot'),
  name: z.string().min(1, 'Nome da receita é obrigatório').max(100),
  amount: z.number().positive('Valor deve ser positivo'),
  date: z.coerce.date(),
  certainty: z.enum(['guaranteed', 'probable', 'uncertain']),
})

export const SingleShotIncomeSchema = SingleShotIncomeInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type SingleShotIncomeInput = z.infer<typeof SingleShotIncomeInputSchema>
export type SingleShotIncome = z.infer<typeof SingleShotIncomeSchema>

// Type guard for single-shot income
export function isSingleShotIncome(project: unknown): project is SingleShotIncome {
  return typeof project === 'object' && project !== null && 
    'type' in project && project.type === 'single_shot'
}

// Type guard for recurring project
export function isRecurringProject(project: unknown): project is RecurringProject {
  return typeof project === 'object' && project !== null && 
    'type' in project && project.type === 'recurring'
}

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

export const ExpenseSchema = z.discriminatedUnion('type', [
  FixedExpenseSchema,
  SingleShotExpenseSchema,
])

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
  ownerId: z.string().uuid().nullable().optional(),
})

export const CreditCardSchema = CreditCardInputSchema.extend({
  id: z.string().uuid(),
  owner: OwnerSchema,
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

// === Future Statement ===
export {
  FutureStatementInputSchema,
  FutureStatementUpdateSchema,
  type FutureStatementInput,
  type FutureStatement,
  type FutureStatementUpdate,
  type FutureStatementRow,
  transformFutureStatementRow,
  getAvailableMonthOptions,
  formatMonthYear,
  isMonthInPast,
  isCurrentMonth,
} from './future-statement'

// === Onboarding ===

/**
 * Onboarding wizard step identifiers.
 * Steps are completed in order during the onboarding flow.
 */
export const OnboardingStepSchema = z.enum([
  'profile',
  'group',
  'bank_account',
  'income',
  'expense',
  'credit_card',
  'done',
])
export type OnboardingStep = z.infer<typeof OnboardingStepSchema>

/**
 * Onboarding status values.
 */
export const OnboardingStatusSchema = z.enum(['in_progress', 'dismissed', 'completed'])
export type OnboardingStatus = z.infer<typeof OnboardingStatusSchema>

/**
 * Onboarding state row shape (matches database table).
 */
export interface OnboardingStateRow {
  id: string
  user_id: string
  group_id: string
  status: OnboardingStatus
  current_step: OnboardingStep
  auto_shown_at: string | null
  dismissed_at: string | null
  completed_at: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

/**
 * Onboarding state for client use (camelCase).
 */
export interface OnboardingState {
  id: string
  userId: string
  groupId: string
  status: OnboardingStatus
  currentStep: OnboardingStep
  autoShownAt: Date | null
  dismissedAt: Date | null
  completedAt: Date | null
  metadata: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

// === Page Tours ===

/**
 * Tour key identifiers for each page with a tour.
 */
export const TourKeySchema = z.enum(['dashboard', 'manage', 'history'])
export type TourKey = z.infer<typeof TourKeySchema>

/**
 * Tour status values.
 */
export const TourStatusSchema = z.enum(['completed', 'dismissed'])
export type TourStatus = z.infer<typeof TourStatusSchema>

/**
 * Tour state row shape (matches database table).
 */
export interface TourStateRow {
  id: string
  user_id: string
  tour_key: TourKey
  status: TourStatus
  version: number
  completed_at: string | null
  dismissed_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Tour state for client use (camelCase).
 */
export interface TourState {
  id: string
  userId: string
  tourKey: TourKey
  status: TourStatus
  version: number
  completedAt: Date | null
  dismissedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Transform onboarding state row to client format.
 */
export function transformOnboardingStateRow(row: OnboardingStateRow): OnboardingState {
  return {
    id: row.id,
    userId: row.user_id,
    groupId: row.group_id,
    status: row.status,
    currentStep: row.current_step,
    autoShownAt: row.auto_shown_at ? new Date(row.auto_shown_at) : null,
    dismissedAt: row.dismissed_at ? new Date(row.dismissed_at) : null,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    metadata: row.metadata,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

/**
 * Transform tour state row to client format.
 */
export function transformTourStateRow(row: TourStateRow): TourState {
  return {
    id: row.id,
    userId: row.user_id,
    tourKey: row.tour_key,
    status: row.status,
    version: row.version,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    dismissedAt: row.dismissed_at ? new Date(row.dismissed_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

// === Notifications ===

/**
 * Notification type identifiers.
 * v1 supports only 'welcome', extensible in future versions.
 */
export const NotificationTypeSchema = z.enum(['welcome'])
export type NotificationType = z.infer<typeof NotificationTypeSchema>

/**
 * Notification row shape (matches database table).
 */
export interface NotificationRow {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  primary_action_label: string | null
  primary_action_href: string | null
  dedupe_key: string | null
  read_at: string | null
  email_sent_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Notification for client use (camelCase).
 */
export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  primaryActionLabel: string | null
  primaryActionHref: string | null
  dedupeKey: string | null
  readAt: Date | null
  emailSentAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Transform notification row to client format.
 */
export function transformNotificationRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    primaryActionLabel: row.primary_action_label,
    primaryActionHref: row.primary_action_href,
    dedupeKey: row.dedupe_key,
    readAt: row.read_at ? new Date(row.read_at) : null,
    emailSentAt: row.email_sent_at ? new Date(row.email_sent_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

// === Billing ===

export {
  type BillingSubscriptionStatus,
  type BillingSubscriptionRow,
  type BillingSubscription,
  transformBillingSubscriptionRow,
} from './billing'
