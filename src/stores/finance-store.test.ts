/**
 * Finance Store Tests
 *
 * Unit tests for the finance store actions with mocked Supabase client.
 * Tests cover validation, error handling, and configuration checks.
 * 
 * Note: Full integration tests for database operations are covered in E2E tests.
 * These unit tests focus on input validation and error handling paths.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { useFinanceStore } from './finance-store'

// =============================================================================
// MOCK SETUP
// =============================================================================

// Track mock calls for assertions
const mockInsertCalls: unknown[] = []
const mockUpdateCalls: unknown[] = []

// Mock response state
let mockInsertResponse = { data: { id: 'test-id' }, error: null as unknown }
let mockUpdateResponse = { error: null as unknown, count: 1 }
let mockGroupId: string | null = 'test-group-id'
let mockIsConfigured = true

// Create chainable query builder
function createQueryBuilder() {
  const builder = {
    insert: vi.fn((data: unknown) => {
      mockInsertCalls.push(data)
      return builder
    }),
    update: vi.fn((data: unknown) => {
      mockUpdateCalls.push(data)
      return builder
    }),
    delete: vi.fn(() => builder),
    select: vi.fn(() => builder),
    eq: vi.fn(() => {
      // Return a thenable that also supports chaining
      const result = {
        ...builder,
        then: (resolve: (value: unknown) => void) => {
          resolve(mockUpdateResponse)
          return result
        },
      }
      return result
    }),
    not: vi.fn(() => Promise.resolve({ error: null })),
    single: vi.fn(() => Promise.resolve(mockInsertResponse)),
  }
  return builder
}

// Mock the supabase module
vi.mock('../lib/supabase', () => ({
  getSupabase: vi.fn(() => ({
    from: vi.fn(() => createQueryBuilder()),
  })),
  getGroupId: vi.fn(() => Promise.resolve(mockGroupId)),
  isSupabaseConfigured: vi.fn(() => mockIsConfigured),
  handleSupabaseError: vi.fn((error: unknown) => ({
    success: false,
    error: (error as { message?: string })?.message || 'Database error',
  })),
}))

// =============================================================================
// TEST HELPERS
// =============================================================================

function resetMocks() {
  vi.clearAllMocks()
  mockInsertCalls.length = 0
  mockUpdateCalls.length = 0
  mockInsertResponse = { data: { id: 'test-id' }, error: null }
  mockUpdateResponse = { error: null, count: 1 }
  mockGroupId = 'test-group-id'
  mockIsConfigured = true
}

// =============================================================================
// BANK ACCOUNT VALIDATION TESTS
// =============================================================================

describe('Bank Account Actions - Validation', () => {
  beforeEach(resetMocks)

  describe('addAccount validation', () => {
    it('returns validation error for empty name', async () => {
      const result = await useFinanceStore.getState().addAccount({
        name: '',
        type: 'checking',
        balance: 100000,
        ownerId: null,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
        expect(result.details).toBeDefined()
      }
    })

    it('returns validation error for name exceeding max length', async () => {
      const result = await useFinanceStore.getState().addAccount({
        name: 'a'.repeat(101), // Max is 100
        type: 'checking',
        balance: 100000,
        ownerId: null,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
      }
    })

    it('returns validation error for negative balance', async () => {
      const result = await useFinanceStore.getState().addAccount({
        name: 'Test Account',
        type: 'checking',
        balance: -100,
        ownerId: null,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
      }
    })

    it('returns validation error for invalid account type', async () => {
      const result = await useFinanceStore.getState().addAccount({
        name: 'Test Account',
        // @ts-expect-error - Testing invalid type
        type: 'invalid',
        balance: 100000,
        ownerId: null,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
      }
    })

    it('accepts valid checking account', async () => {
      const result = await useFinanceStore.getState().addAccount({
        name: 'Valid Account',
        type: 'checking',
        balance: 100000,
        ownerId: null,
      })

      // With mocks, this should succeed
      expect(result.success).toBe(true)
    })

    it('accepts valid savings account', async () => {
      const result = await useFinanceStore.getState().addAccount({
        name: 'Savings',
        type: 'savings',
        balance: 0,
        ownerId: null,
      })

      expect(result.success).toBe(true)
    })

    it('accepts valid investment account', async () => {
      const result = await useFinanceStore.getState().addAccount({
        name: 'Investments',
        type: 'investment',
        balance: 500000,
        ownerId: null,
      })

      expect(result.success).toBe(true)
    })
  })

  describe('updateAccount validation', () => {
    it('returns validation error for negative balance in update', async () => {
      const result = await useFinanceStore.getState().updateAccount('account-id', {
        balance: -500,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
      }
    })

    it('returns validation error for empty name in update', async () => {
      const result = await useFinanceStore.getState().updateAccount('account-id', {
        name: '',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
      }
    })

    it('accepts partial valid update', async () => {
      const result = await useFinanceStore.getState().updateAccount('account-id', {
        name: 'Updated Name',
      })

      expect(result.success).toBe(true)
    })
  })
})

// =============================================================================
// PROJECT VALIDATION TESTS
// =============================================================================

describe('Project Actions - Validation', () => {
  beforeEach(resetMocks)

  describe('addProject validation', () => {
    it('returns validation error for empty name', async () => {
      const result = await useFinanceStore.getState().addProject({
        type: 'recurring',
        name: '',
        amount: 800000,
        frequency: 'monthly',
        paymentSchedule: { type: 'dayOfMonth', dayOfMonth: 5 },
        certainty: 'guaranteed',
        isActive: true,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
      }
    })

    it('returns validation error for zero amount', async () => {
      const result = await useFinanceStore.getState().addProject({
        type: 'recurring',
        name: 'Invalid Project',
        amount: 0,
        frequency: 'monthly',
        paymentSchedule: { type: 'dayOfMonth', dayOfMonth: 5 },
        certainty: 'guaranteed',
        isActive: true,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
      }
    })

    it('returns validation error for negative amount', async () => {
      const result = await useFinanceStore.getState().addProject({
        type: 'recurring',
        name: 'Invalid Project',
        amount: -100,
        frequency: 'monthly',
        paymentSchedule: { type: 'dayOfMonth', dayOfMonth: 5 },
        certainty: 'guaranteed',
        isActive: true,
      })

      expect(result.success).toBe(false)
    })

    it('validates frequency-schedule match for monthly', async () => {
      // Monthly frequency requires dayOfMonth schedule
      const result = await useFinanceStore.getState().addProject({
        type: 'recurring',
        name: 'Salary',
        amount: 800000,
        frequency: 'monthly',
        paymentSchedule: { type: 'dayOfWeek', dayOfWeek: 1 },
        certainty: 'guaranteed',
        isActive: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
      }
    })

    it('validates frequency-schedule match for weekly', async () => {
      // Weekly frequency requires dayOfWeek schedule
      const result = await useFinanceStore.getState().addProject({
        type: 'recurring',
        name: 'Weekly Income',
        amount: 100000,
        frequency: 'weekly',
        paymentSchedule: { type: 'dayOfWeek', dayOfWeek: 5 },
        certainty: 'probable',
        isActive: true,
      })

      expect(result.success).toBe(true)
    })

    it('validates twice-monthly schedule requires different days', async () => {
      const result = await useFinanceStore.getState().addProject({
        type: 'recurring',
        name: 'Bi-monthly Income',
        amount: 400000,
        frequency: 'twice-monthly',
        paymentSchedule: { type: 'twiceMonthly', firstDay: 15, secondDay: 15 },
        certainty: 'guaranteed',
        isActive: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      expect(result.success).toBe(false)
    })

    it('accepts valid twice-monthly schedule', async () => {
      const result = await useFinanceStore.getState().addProject({
        type: 'recurring',
        name: 'Bi-monthly Income',
        amount: 400000,
        frequency: 'twice-monthly',
        paymentSchedule: { type: 'twiceMonthly', firstDay: 1, secondDay: 15 },
        certainty: 'guaranteed',
        isActive: true,
      })

      expect(result.success).toBe(true)
    })

    it('validates day of month range (1-31)', async () => {
      const result = await useFinanceStore.getState().addProject({
        type: 'recurring',
        name: 'Invalid Day',
        amount: 100000,
        frequency: 'monthly',
        paymentSchedule: { type: 'dayOfMonth', dayOfMonth: 32 },
        certainty: 'guaranteed',
        isActive: true,
      })

      expect(result.success).toBe(false)
    })

    it('validates day of week range (1-7)', async () => {
      const result = await useFinanceStore.getState().addProject({
        type: 'recurring',
        name: 'Invalid Day',
        amount: 100000,
        frequency: 'weekly',
        paymentSchedule: { type: 'dayOfWeek', dayOfWeek: 8 },
        certainty: 'guaranteed',
        isActive: true,
      })

      expect(result.success).toBe(false)
    })

    it('validates certainty enum values', async () => {
      const result = await useFinanceStore.getState().addProject({
        name: 'Invalid Certainty',
        amount: 100000,
        frequency: 'monthly',
        paymentSchedule: { type: 'dayOfMonth', dayOfMonth: 5 },
        // @ts-expect-error - Testing invalid certainty
        certainty: 'invalid',
        isActive: true,
      })

      expect(result.success).toBe(false)
    })
  })
})

// =============================================================================
// BALANCE UPDATE ACTIONS (QuickUpdate completion)
// =============================================================================

describe('Balance Update Actions - markAllBalancesUpdated', () => {
  beforeEach(() => {
    resetMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('updates balance_updated_at for accounts and credit cards', async () => {
    const result = await useFinanceStore.getState().markAllBalancesUpdated()

    expect(result.success).toBe(true)
    expect(mockUpdateCalls.length).toBe(2)

    const nowIso = new Date().toISOString()
    for (const call of mockUpdateCalls) {
      expect(call).toMatchObject({ balance_updated_at: nowIso })
    }
  })
})

// =============================================================================
// FIXED EXPENSE VALIDATION TESTS
// =============================================================================

describe('Fixed Expense Actions - Validation', () => {
  beforeEach(resetMocks)

  describe('addExpense validation', () => {
    it('returns validation error for empty name', async () => {
      const result = await useFinanceStore.getState().addExpense({
        type: 'fixed',
        name: '',
        amount: 100000,
        dueDay: 10,
        isActive: true,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
      }
    })

    it('returns validation error for zero amount', async () => {
      const result = await useFinanceStore.getState().addExpense({
        type: 'fixed',
        name: 'Invalid Expense',
        amount: 0,
        dueDay: 10,
        isActive: true,
      })

      expect(result.success).toBe(false)
    })

    it('returns validation error for invalid due day (0)', async () => {
      const result = await useFinanceStore.getState().addExpense({
        type: 'fixed',
        name: 'Invalid Expense',
        amount: 100000,
        dueDay: 0,
        isActive: true,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
      }
    })

    it('returns validation error for invalid due day (32)', async () => {
      const result = await useFinanceStore.getState().addExpense({
        type: 'fixed',
        name: 'Invalid Expense',
        amount: 100000,
        dueDay: 32,
        isActive: true,
      })

      expect(result.success).toBe(false)
    })

    it('accepts valid expense with due day 1', async () => {
      const result = await useFinanceStore.getState().addExpense({
        type: 'fixed',
        name: 'Rent',
        amount: 200000,
        dueDay: 1,
        isActive: true,
      })

      expect(result.success).toBe(true)
    })

    it('accepts valid expense with due day 31', async () => {
      const result = await useFinanceStore.getState().addExpense({
        type: 'fixed',
        name: 'Monthly Bill',
        amount: 15000,
        dueDay: 31,
        isActive: true,
      })

      expect(result.success).toBe(true)
    })
  })
})

// =============================================================================
// CREDIT CARD VALIDATION TESTS
// =============================================================================

describe('Credit Card Actions - Validation', () => {
  beforeEach(resetMocks)

  describe('addCreditCard validation', () => {
    it('returns validation error for empty name', async () => {
      const result = await useFinanceStore.getState().addCreditCard({
        name: '',
        statementBalance: 100000,
        dueDay: 15,
        ownerId: null,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
      }
    })

    it('returns validation error for negative balance', async () => {
      const result = await useFinanceStore.getState().addCreditCard({
        name: 'Invalid Card',
        statementBalance: -100,
        dueDay: 15,
        ownerId: null,
      })

      expect(result.success).toBe(false)
    })

    it('returns validation error for invalid due day (0)', async () => {
      const result = await useFinanceStore.getState().addCreditCard({
        name: 'Invalid Card',
        statementBalance: 100000,
        dueDay: 0,
        ownerId: null,
      })

      expect(result.success).toBe(false)
    })

    it('returns validation error for invalid due day (32)', async () => {
      const result = await useFinanceStore.getState().addCreditCard({
        name: 'Invalid Card',
        statementBalance: 100000,
        dueDay: 32,
        ownerId: null,
      })

      expect(result.success).toBe(false)
    })

    it('accepts valid credit card', async () => {
      const result = await useFinanceStore.getState().addCreditCard({
        name: 'Nubank',
        statementBalance: 300000,
        dueDay: 15,
        ownerId: null,
      })

      expect(result.success).toBe(true)
    })

    it('accepts zero balance', async () => {
      const result = await useFinanceStore.getState().addCreditCard({
        name: 'New Card',
        statementBalance: 0,
        dueDay: 10,
        ownerId: null,
      })

      expect(result.success).toBe(true)
    })
  })
})

// =============================================================================
// BALANCE UPDATE VALIDATION TESTS
// =============================================================================

describe('Balance Update Actions - Validation', () => {
  beforeEach(resetMocks)

  describe('updateAccountBalance', () => {
    it('returns error for negative balance', async () => {
      const result = await useFinanceStore.getState().updateAccountBalance(
        'account-id',
        -100
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Balance cannot be negative')
      }
    })

    it('accepts zero balance', async () => {
      const result = await useFinanceStore.getState().updateAccountBalance(
        'account-id',
        0
      )

      expect(result.success).toBe(true)
    })

    it('accepts positive balance', async () => {
      const result = await useFinanceStore.getState().updateAccountBalance(
        'account-id',
        150000
      )

      expect(result.success).toBe(true)
    })
  })

  describe('updateCreditCardBalance', () => {
    it('returns error for negative balance', async () => {
      const result = await useFinanceStore.getState().updateCreditCardBalance(
        'card-id',
        -100
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Balance cannot be negative')
      }
    })

    it('accepts zero balance', async () => {
      const result = await useFinanceStore.getState().updateCreditCardBalance(
        'card-id',
        0
      )

      expect(result.success).toBe(true)
    })
  })
})

// =============================================================================
// SINGLE-SHOT EXPENSE VALIDATION TESTS
// =============================================================================

describe('Single-Shot Expense Actions - Validation', () => {
  beforeEach(resetMocks)

  describe('addSingleShotExpense validation', () => {
    it('returns validation error for empty name', async () => {
      const result = await useFinanceStore.getState().addSingleShotExpense({
        type: 'single_shot',
        name: '',
        amount: 100000,
        date: new Date('2025-12-15'),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
      }
    })

    it('returns validation error for zero amount', async () => {
      const result = await useFinanceStore.getState().addSingleShotExpense({
        type: 'single_shot',
        name: 'Invalid Expense',
        amount: 0,
        date: new Date('2025-12-15'),
      })

      expect(result.success).toBe(false)
    })

    it('accepts valid single-shot expense', async () => {
      const result = await useFinanceStore.getState().addSingleShotExpense({
        type: 'single_shot',
        name: 'Furniture Purchase',
        amount: 500000,
        date: new Date('2025-12-15'),
      })

      expect(result.success).toBe(true)
    })
  })
})

// =============================================================================
// SINGLE-SHOT INCOME VALIDATION TESTS
// =============================================================================

describe('Single-Shot Income Actions - Validation', () => {
  beforeEach(resetMocks)

  describe('addSingleShotIncome validation', () => {
    it('returns validation error for empty name', async () => {
      const result = await useFinanceStore.getState().addSingleShotIncome({
        type: 'single_shot',
        name: '',
        amount: 100000,
        date: new Date('2025-12-20'),
        certainty: 'guaranteed',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
      }
    })

    it('returns validation error for zero amount', async () => {
      const result = await useFinanceStore.getState().addSingleShotIncome({
        type: 'single_shot',
        name: 'Invalid Income',
        amount: 0,
        date: new Date('2025-12-20'),
        certainty: 'guaranteed',
      })

      expect(result.success).toBe(false)
    })

    it('returns validation error for invalid certainty', async () => {
      const result = await useFinanceStore.getState().addSingleShotIncome({
        type: 'single_shot',
        name: 'Invalid Income',
        amount: 100000,
        date: new Date('2025-12-20'),
        // @ts-expect-error - Testing invalid certainty
        certainty: 'invalid',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
      }
    })

    it('accepts valid single-shot income with guaranteed certainty', async () => {
      const result = await useFinanceStore.getState().addSingleShotIncome({
        type: 'single_shot',
        name: 'Annual Bonus',
        amount: 1000000,
        date: new Date('2025-12-20'),
        certainty: 'guaranteed',
      })

      expect(result.success).toBe(true)
    })

    it('accepts valid single-shot income with probable certainty', async () => {
      const result = await useFinanceStore.getState().addSingleShotIncome({
        type: 'single_shot',
        name: 'Expected Bonus',
        amount: 500000,
        date: new Date('2025-12-20'),
        certainty: 'probable',
      })

      expect(result.success).toBe(true)
    })

    it('accepts valid single-shot income with uncertain certainty', async () => {
      const result = await useFinanceStore.getState().addSingleShotIncome({
        type: 'single_shot',
        name: 'Potential Bonus',
        amount: 200000,
        date: new Date('2025-12-20'),
        certainty: 'uncertain',
      })

      expect(result.success).toBe(true)
    })
  })
})

// =============================================================================
// CONFIGURATION ERROR TESTS
// =============================================================================

describe('Configuration Error Handling', () => {
  beforeEach(resetMocks)

  it('returns error when Supabase is not configured', async () => {
    mockIsConfigured = false

    const result = await useFinanceStore.getState().addAccount({
      name: 'Test Account',
      type: 'checking',
      balance: 100000,
      ownerId: null,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Supabase is not configured')
    }
  })

  it('returns error when group cannot be determined', async () => {
    mockGroupId = null

    const result = await useFinanceStore.getState().addAccount({
      name: 'Test Account',
      type: 'checking',
      balance: 100000,
      ownerId: null,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('grupo')
    }
  })

  it('handles missing group for project creation', async () => {
    mockGroupId = null

    const result = await useFinanceStore.getState().addProject({
      type: 'recurring',
      name: 'Salary',
      amount: 800000,
      frequency: 'monthly',
      paymentSchedule: { type: 'dayOfMonth', dayOfMonth: 5 },
      certainty: 'guaranteed',
      isActive: true,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('grupo')
    }
  })

  it('handles missing group for expense creation', async () => {
    mockGroupId = null

    const result = await useFinanceStore.getState().addExpense({
      type: 'fixed',
      name: 'Rent',
      amount: 200000,
      dueDay: 10,
      isActive: true,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('grupo')
    }
  })

  it('handles missing group for credit card creation', async () => {
    mockGroupId = null

    const result = await useFinanceStore.getState().addCreditCard({
      name: 'Nubank',
      statementBalance: 300000,
      dueDay: 15,
      ownerId: null,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('grupo')
    }
  })
})

// =============================================================================
// FUTURE STATEMENT VALIDATION TESTS
// =============================================================================

describe('Future Statement Actions - Validation', () => {
  beforeEach(resetMocks)

  // Valid UUID for tests
  const validUUID = '550e8400-e29b-41d4-a716-446655440000'

  describe('addFutureStatement validation', () => {
    it('returns validation error for empty creditCardId', async () => {
      const result = await useFinanceStore.getState().addFutureStatement({
        creditCardId: '',
        targetMonth: 6,
        targetYear: 2025,
        amount: 100000,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
      }
    })

    it('returns validation error for non-UUID creditCardId', async () => {
      const result = await useFinanceStore.getState().addFutureStatement({
        creditCardId: 'card-123', // Not a valid UUID
        targetMonth: 6,
        targetYear: 2025,
        amount: 100000,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
      }
    })

    it('returns validation error for invalid month (0)', async () => {
      const result = await useFinanceStore.getState().addFutureStatement({
        creditCardId: validUUID,
        targetMonth: 0,
        targetYear: 2025,
        amount: 100000,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
      }
    })

    it('returns validation error for invalid month (13)', async () => {
      const result = await useFinanceStore.getState().addFutureStatement({
        creditCardId: validUUID,
        targetMonth: 13,
        targetYear: 2025,
        amount: 100000,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
      }
    })

    it('returns validation error for invalid year (below 2020)', async () => {
      const result = await useFinanceStore.getState().addFutureStatement({
        creditCardId: validUUID,
        targetMonth: 6,
        targetYear: 2019,
        amount: 100000,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
      }
    })

    it('returns validation error for negative amount', async () => {
      const result = await useFinanceStore.getState().addFutureStatement({
        creditCardId: validUUID,
        targetMonth: 6,
        targetYear: 2025,
        amount: -100,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
      }
    })

    it('accepts valid future statement', async () => {
      const result = await useFinanceStore.getState().addFutureStatement({
        creditCardId: validUUID,
        targetMonth: 6,
        targetYear: 2025,
        amount: 150000,
      })

      expect(result.success).toBe(true)
    })

    it('accepts zero amount', async () => {
      const result = await useFinanceStore.getState().addFutureStatement({
        creditCardId: validUUID,
        targetMonth: 6,
        targetYear: 2025,
        amount: 0,
      })

      expect(result.success).toBe(true)
    })

    it('accepts boundary month values (1 and 12)', async () => {
      const result1 = await useFinanceStore.getState().addFutureStatement({
        creditCardId: validUUID,
        targetMonth: 1,
        targetYear: 2025,
        amount: 100000,
      })

      const result12 = await useFinanceStore.getState().addFutureStatement({
        creditCardId: validUUID,
        targetMonth: 12,
        targetYear: 2025,
        amount: 100000,
      })

      expect(result1.success).toBe(true)
      expect(result12.success).toBe(true)
    })
  })

  describe('updateFutureStatement validation', () => {
    it('returns validation error for negative amount in update', async () => {
      const result = await useFinanceStore.getState().updateFutureStatement('stmt-id', {
        amount: -100,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
      }
    })

    it('returns validation error for invalid month in update', async () => {
      const result = await useFinanceStore.getState().updateFutureStatement('stmt-id', {
        targetMonth: 15,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Validation failed')
      }
    })

    it('accepts partial valid update with only amount', async () => {
      const result = await useFinanceStore.getState().updateFutureStatement('stmt-id', {
        amount: 200000,
      })

      expect(result.success).toBe(true)
    })

    it('accepts partial valid update with only targetMonth', async () => {
      const result = await useFinanceStore.getState().updateFutureStatement('stmt-id', {
        targetMonth: 8,
      })

      expect(result.success).toBe(true)
    })
  })

  describe('deleteFutureStatement', () => {
    it('succeeds with valid id', async () => {
      const result = await useFinanceStore.getState().deleteFutureStatement('stmt-id')
      expect(result.success).toBe(true)
    })
  })
})

describe('Future Statement Configuration Error Handling', () => {
  beforeEach(resetMocks)

  const validUUID = '550e8400-e29b-41d4-a716-446655440000'

  it('returns error when Supabase is not configured for addFutureStatement', async () => {
    mockIsConfigured = false

    const result = await useFinanceStore.getState().addFutureStatement({
      creditCardId: validUUID,
      targetMonth: 6,
      targetYear: 2025,
      amount: 100000,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Supabase is not configured')
    }
  })

  it('returns error when group cannot be determined for addFutureStatement', async () => {
    mockGroupId = null

    const result = await useFinanceStore.getState().addFutureStatement({
      creditCardId: validUUID,
      targetMonth: 6,
      targetYear: 2025,
      amount: 100000,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('grupo')
    }
  })
})
