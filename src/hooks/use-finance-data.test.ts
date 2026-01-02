/**
 * Tests for use-finance-data hook mapper functions.
 * Tests the pure transformation functions that convert database rows to TypeScript types.
 */

import { describe, it, expect } from 'vitest'
import { format } from 'date-fns'
import {
  normalizeOwner,
  mapProfileFromDb,
  mapAccountFromDb,
  mapProjectFromDb,
  mapSingleShotIncomeFromDb,
  mapExpenseFromDb,
  mapCreditCardFromDb,
  mergeRealtimeOwner,
} from './use-finance-data'
import type { ProfileRow, AccountRow, ProjectRow, ExpenseRow, CreditCardRow } from '@/lib/supabase'

// =============================================================================
// TEST HELPERS
// =============================================================================

const TEST_DATES = {
  created: '2025-01-15T10:00:00Z',
  updated: '2025-01-16T12:00:00Z',
  balanceUpdated: '2025-01-17T08:00:00Z',
}

// =============================================================================
// normalizeOwner TESTS
// =============================================================================

describe('normalizeOwner', () => {
  describe('null/undefined handling', () => {
    it('returns null for null input', () => {
      expect(normalizeOwner(null)).toBeNull()
    })

    it('returns null for undefined input', () => {
      expect(normalizeOwner(undefined)).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(normalizeOwner('')).toBeNull()
    })

    it('returns null for zero', () => {
      expect(normalizeOwner(0)).toBeNull()
    })
  })

  describe('array handling (Supabase FK join format)', () => {
    it('returns first element from array with one item', () => {
      const owner = [{ id: '123', name: 'John' }]
      expect(normalizeOwner(owner)).toEqual({ id: '123', name: 'John' })
    })

    it('returns first element from array with multiple items', () => {
      const owner = [
        { id: '123', name: 'John' },
        { id: '456', name: 'Jane' },
      ]
      expect(normalizeOwner(owner)).toEqual({ id: '123', name: 'John' })
    })

    it('returns null for empty array', () => {
      expect(normalizeOwner([])).toBeNull()
    })
  })

  describe('direct object handling', () => {
    it('returns the object directly when not an array', () => {
      const owner = { id: '123', name: 'John' }
      expect(normalizeOwner(owner)).toEqual({ id: '123', name: 'John' })
    })
  })
})

// =============================================================================
// mapProfileFromDb TESTS
// =============================================================================

describe('mapProfileFromDb', () => {
  it('maps profile row to Profile type', () => {
    const row: ProfileRow = {
      id: 'profile-123',
      name: 'John Doe',
      email: 'john@example.com',
      group_id: 'group-789',
      created_at: TEST_DATES.created,
      created_by: 'user-456',
    }

    const result = mapProfileFromDb(row)

    expect(result).toEqual({
      id: 'profile-123',
      name: 'John Doe',
      groupId: 'group-789',
    })
  })

  it('excludes email and other fields from result', () => {
    const row: ProfileRow = {
      id: 'profile-123',
      name: 'John Doe',
      email: 'john@example.com',
      group_id: 'group-789',
      created_at: TEST_DATES.created,
      created_by: 'user-456',
    }

    const result = mapProfileFromDb(row)

    expect(result).not.toHaveProperty('email')
    expect(result).not.toHaveProperty('created_at')
    expect(result).not.toHaveProperty('created_by')
    expect(result).not.toHaveProperty('group_id') // Should be camelCase groupId
  })
})

// =============================================================================
// mapAccountFromDb TESTS
// =============================================================================

describe('mapAccountFromDb', () => {
  const baseAccountRow: AccountRow = {
    id: 'account-123',
    name: 'Main Checking',
    type: 'checking',
    balance: 150000,
    balance_updated_at: TEST_DATES.balanceUpdated,
    owner_id: 'owner-456',
    owner: { id: 'owner-456', name: 'John' },
    created_at: TEST_DATES.created,
    updated_at: TEST_DATES.updated,
  }

  it('maps all account fields correctly', () => {
    const result = mapAccountFromDb(baseAccountRow)

    expect(result).toEqual({
      id: 'account-123',
      name: 'Main Checking',
      type: 'checking',
      balance: 150000,
      ownerId: 'owner-456',
      owner: { id: 'owner-456', name: 'John' },
      balanceUpdatedAt: new Date(TEST_DATES.balanceUpdated),
      createdAt: new Date(TEST_DATES.created),
      updatedAt: new Date(TEST_DATES.updated),
    })
  })

  it('converts snake_case to camelCase', () => {
    const result = mapAccountFromDb(baseAccountRow)

    expect(result).toHaveProperty('ownerId')
    expect(result).toHaveProperty('balanceUpdatedAt')
    expect(result).toHaveProperty('createdAt')
    expect(result).toHaveProperty('updatedAt')
    expect(result).not.toHaveProperty('owner_id')
    expect(result).not.toHaveProperty('balance_updated_at')
    expect(result).not.toHaveProperty('created_at')
    expect(result).not.toHaveProperty('updated_at')
  })

  it('handles null balance_updated_at', () => {
    const row: AccountRow = {
      ...baseAccountRow,
      balance_updated_at: null,
    }

    const result = mapAccountFromDb(row)

    expect(result.balanceUpdatedAt).toBeUndefined()
  })

  it('normalizes owner from array format', () => {
    const row: AccountRow = {
      ...baseAccountRow,
      owner: [{ id: 'owner-456', name: 'John' }] as unknown as { id: string; name: string },
    }

    const result = mapAccountFromDb(row)

    expect(result.owner).toEqual({ id: 'owner-456', name: 'John' })
  })

  it('handles null owner', () => {
    const row: AccountRow = {
      ...baseAccountRow,
      owner_id: null,
      owner: null,
    }

    const result = mapAccountFromDb(row)

    expect(result.ownerId).toBeNull()
    expect(result.owner).toBeNull()
  })

  it('handles different account types', () => {
    const savingsRow: AccountRow = { ...baseAccountRow, type: 'savings' }
    const investmentRow: AccountRow = { ...baseAccountRow, type: 'investment' }

    expect(mapAccountFromDb(savingsRow).type).toBe('savings')
    expect(mapAccountFromDb(investmentRow).type).toBe('investment')
  })
})

// =============================================================================
// mapProjectFromDb TESTS
// =============================================================================

describe('mapProjectFromDb', () => {
  const baseProjectRow: ProjectRow = {
    id: 'project-123',
    name: 'Monthly Salary',
    amount: 500000,
    type: 'recurring',
    frequency: 'monthly',
    payment_schedule: { type: 'dayOfMonth', dayOfMonth: 25 },
    is_active: true,
    date: null,
    certainty: 'guaranteed',
    created_at: TEST_DATES.created,
    updated_at: TEST_DATES.updated,
  }

  it('maps project row to Project type', () => {
    const result = mapProjectFromDb(baseProjectRow)

    expect(result).toEqual({
      id: 'project-123',
      type: 'recurring',
      name: 'Monthly Salary',
      amount: 500000,
      frequency: 'monthly',
      paymentSchedule: { type: 'dayOfMonth', dayOfMonth: 25 },
      certainty: 'guaranteed',
      isActive: true,
      createdAt: new Date(TEST_DATES.created),
      updatedAt: new Date(TEST_DATES.updated),
    })
  })

  it('always sets type to recurring', () => {
    const result = mapProjectFromDb(baseProjectRow)
    expect(result.type).toBe('recurring')
  })

  it('handles different frequencies', () => {
    const frequencies: Array<'weekly' | 'biweekly' | 'twice-monthly' | 'monthly'> = [
      'weekly',
      'biweekly',
      'twice-monthly',
      'monthly',
    ]

    for (const frequency of frequencies) {
      const row: ProjectRow = { ...baseProjectRow, frequency }
      const result = mapProjectFromDb(row)
      expect(result.frequency).toBe(frequency)
    }
  })

  it('handles different certainty levels', () => {
    const certainties: Array<'guaranteed' | 'probable' | 'uncertain'> = [
      'guaranteed',
      'probable',
      'uncertain',
    ]

    for (const certainty of certainties) {
      const row: ProjectRow = { ...baseProjectRow, certainty }
      const result = mapProjectFromDb(row)
      expect(result.certainty).toBe(certainty)
    }
  })

  it('handles twiceMonthly payment schedule', () => {
    const row: ProjectRow = {
      ...baseProjectRow,
      frequency: 'twice-monthly',
      payment_schedule: { type: 'twiceMonthly', firstDay: 5, secondDay: 20 },
    }

    const result = mapProjectFromDb(row)

    expect(result.paymentSchedule).toEqual({
      type: 'twiceMonthly',
      firstDay: 5,
      secondDay: 20,
    })
  })

  it('handles dayOfWeek payment schedule', () => {
    const row: ProjectRow = {
      ...baseProjectRow,
      frequency: 'weekly',
      payment_schedule: { type: 'dayOfWeek', dayOfWeek: 5 },
    }

    const result = mapProjectFromDb(row)

    expect(result.paymentSchedule).toEqual({
      type: 'dayOfWeek',
      dayOfWeek: 5,
    })
  })
})

// =============================================================================
// mapSingleShotIncomeFromDb TESTS
// =============================================================================

describe('mapSingleShotIncomeFromDb', () => {
  const baseRow: ProjectRow = {
    id: 'income-123',
    name: 'Tax Refund',
    amount: 250000,
    type: 'single_shot',
    frequency: null,
    payment_schedule: null,
    is_active: null,
    date: '2025-03-15',
    certainty: 'probable',
    created_at: TEST_DATES.created,
    updated_at: TEST_DATES.updated,
  }

  it('maps single-shot income row to SingleShotIncome type', () => {
    const result = mapSingleShotIncomeFromDb(baseRow)

    expect(result.id).toBe('income-123')
    expect(result.type).toBe('single_shot')
    expect(result.name).toBe('Tax Refund')
    expect(result.amount).toBe(250000)
    // Important: DB `DATE` must map to the same local calendar day (no timezone shift)
    expect(format(result.date, 'yyyy-MM-dd')).toBe('2025-03-15')
    expect(result.certainty).toBe('probable')
    expect(result.createdAt).toEqual(new Date(TEST_DATES.created))
    expect(result.updatedAt).toEqual(new Date(TEST_DATES.updated))
  })

  it('always sets type to single_shot', () => {
    const result = mapSingleShotIncomeFromDb(baseRow)
    expect(result.type).toBe('single_shot')
  })

  it('converts date string to Date object', () => {
    const result = mapSingleShotIncomeFromDb(baseRow)
    expect(result.date).toBeInstanceOf(Date)
    expect(result.date.toISOString()).toContain('2025-03-15')
  })
})

// =============================================================================
// mapExpenseFromDb TESTS
// =============================================================================

describe('mapExpenseFromDb', () => {
  describe('fixed expenses', () => {
    const fixedExpenseRow: ExpenseRow = {
      id: 'expense-123',
      name: 'Rent',
      amount: 200000,
      type: 'fixed',
      due_day: 5,
      date: null,
      is_active: true,
      created_at: TEST_DATES.created,
      updated_at: TEST_DATES.updated,
    }

    it('maps fixed expense row correctly', () => {
      const result = mapExpenseFromDb(fixedExpenseRow)

      expect(result).toEqual({
        id: 'expense-123',
        name: 'Rent',
        amount: 200000,
        type: 'fixed',
        dueDay: 5,
        isActive: true,
        createdAt: new Date(TEST_DATES.created),
        updatedAt: new Date(TEST_DATES.updated),
      })
    })

    it('includes dueDay for fixed expenses', () => {
      const result = mapExpenseFromDb(fixedExpenseRow)
      expect(result).toHaveProperty('dueDay', 5)
    })

    it('includes isActive for fixed expenses', () => {
      const result = mapExpenseFromDb(fixedExpenseRow)
      expect(result).toHaveProperty('isActive', true)
    })

    it('does not include date for fixed expenses', () => {
      const result = mapExpenseFromDb(fixedExpenseRow)
      expect(result).not.toHaveProperty('date')
    })
  })

  describe('single-shot expenses', () => {
    const singleShotExpenseRow: ExpenseRow = {
      id: 'expense-456',
      name: 'Annual Insurance',
      amount: 120000,
      type: 'single_shot',
      due_day: null,
      date: '2025-06-01',
      is_active: true,
      created_at: TEST_DATES.created,
      updated_at: TEST_DATES.updated,
    }

    it('maps single-shot expense row correctly', () => {
      const result = mapExpenseFromDb(singleShotExpenseRow)

      expect(result.id).toBe('expense-456')
      expect(result.name).toBe('Annual Insurance')
      expect(result.amount).toBe(120000)
      expect(result.type).toBe('single_shot')
      // Important: DB `DATE` must map to the same local calendar day (no timezone shift)
      expect(format((result as { date: Date }).date, 'yyyy-MM-dd')).toBe('2025-06-01')
      expect(result.createdAt).toEqual(new Date(TEST_DATES.created))
      expect(result.updatedAt).toEqual(new Date(TEST_DATES.updated))
    })

    it('includes date for single-shot expenses', () => {
      const result = mapExpenseFromDb(singleShotExpenseRow)
      expect(result).toHaveProperty('date')
      expect((result as { date: Date }).date).toBeInstanceOf(Date)
    })

    it('does not include dueDay for single-shot expenses', () => {
      const result = mapExpenseFromDb(singleShotExpenseRow)
      expect(result).not.toHaveProperty('dueDay')
    })

    it('does not include isActive for single-shot expenses', () => {
      const result = mapExpenseFromDb(singleShotExpenseRow)
      expect(result).not.toHaveProperty('isActive')
    })
  })
})

// =============================================================================
// mapCreditCardFromDb TESTS
// =============================================================================

describe('mapCreditCardFromDb', () => {
  const baseCreditCardRow: CreditCardRow = {
    id: 'card-123',
    name: 'Visa Platinum',
    statement_balance: 85000,
    due_day: 15,
    balance_updated_at: TEST_DATES.balanceUpdated,
    owner_id: 'owner-789',
    owner: { id: 'owner-789', name: 'Jane' },
    created_at: TEST_DATES.created,
    updated_at: TEST_DATES.updated,
  }

  it('maps credit card row correctly', () => {
    const result = mapCreditCardFromDb(baseCreditCardRow)

    expect(result).toEqual({
      id: 'card-123',
      name: 'Visa Platinum',
      statementBalance: 85000,
      dueDay: 15,
      ownerId: 'owner-789',
      owner: { id: 'owner-789', name: 'Jane' },
      balanceUpdatedAt: new Date(TEST_DATES.balanceUpdated),
      createdAt: new Date(TEST_DATES.created),
      updatedAt: new Date(TEST_DATES.updated),
    })
  })

  it('converts snake_case to camelCase', () => {
    const result = mapCreditCardFromDb(baseCreditCardRow)

    expect(result).toHaveProperty('statementBalance')
    expect(result).toHaveProperty('dueDay')
    expect(result).toHaveProperty('ownerId')
    expect(result).toHaveProperty('balanceUpdatedAt')
    expect(result).not.toHaveProperty('statement_balance')
    expect(result).not.toHaveProperty('due_day')
    expect(result).not.toHaveProperty('owner_id')
    expect(result).not.toHaveProperty('balance_updated_at')
  })

  it('handles null balance_updated_at', () => {
    const row: CreditCardRow = {
      ...baseCreditCardRow,
      balance_updated_at: null,
    }

    const result = mapCreditCardFromDb(row)

    expect(result.balanceUpdatedAt).toBeUndefined()
  })

  it('normalizes owner from array format', () => {
    const row: CreditCardRow = {
      ...baseCreditCardRow,
      owner: [{ id: 'owner-789', name: 'Jane' }] as unknown as { id: string; name: string },
    }

    const result = mapCreditCardFromDb(row)

    expect(result.owner).toEqual({ id: 'owner-789', name: 'Jane' })
  })

  it('handles null owner', () => {
    const row: CreditCardRow = {
      ...baseCreditCardRow,
      owner_id: null,
      owner: null,
    }

    const result = mapCreditCardFromDb(row)

    expect(result.ownerId).toBeNull()
    expect(result.owner).toBeNull()
  })
})

// =============================================================================
// mergeRealtimeOwner TESTS (regression: realtime UPDATE payloads omit joined owner)
// =============================================================================

describe('mergeRealtimeOwner', () => {
  type Owner = { id: string; name: string } | null
  type Entity = { id: string; ownerId: string | null; owner: Owner }

  const profiles = [
    { id: 'p1', name: 'João', groupId: 'g1' },
    { id: 'p2', name: 'Maria', groupId: 'g1' },
  ]

  it('returns mapped as-is when owner join is present', () => {
    const mapped: Entity = { id: 'a1', ownerId: 'p1', owner: { id: 'p1', name: 'João' } }
    const existing: Entity = { id: 'a1', ownerId: 'p1', owner: { id: 'p1', name: 'Old' } }

    const result = mergeRealtimeOwner(mapped, existing, true, profiles)

    expect(result.next).toEqual(mapped)
    expect(result.ownerSource).toBe('mapped')
  })

  it('preserves existing owner when join is missing and ownerId matches', () => {
    const mapped: Entity = { id: 'a1', ownerId: 'p1', owner: null } // join missing -> mapped owner null
    const existing: Entity = { id: 'a1', ownerId: 'p1', owner: { id: 'p1', name: 'João' } }

    const result = mergeRealtimeOwner(mapped, existing, false, profiles)

    expect(result.next.owner).toEqual({ id: 'p1', name: 'João' })
    expect(result.ownerSource).toBe('existing')
  })

  it('resolves owner from profiles when join is missing and existing has no owner', () => {
    const mapped: Entity = { id: 'a1', ownerId: 'p2', owner: null }
    const existing: Entity = { id: 'a1', ownerId: 'p2', owner: null }

    const result = mergeRealtimeOwner(mapped, existing, false, profiles)

    expect(result.next.owner).toEqual({ id: 'p2', name: 'Maria' })
    expect(result.ownerSource).toBe('profiles')
  })

  it('keeps owner null when join is missing and ownerId is null', () => {
    const mapped: Entity = { id: 'a1', ownerId: null, owner: null }
    const existing: Entity = { id: 'a1', ownerId: 'p1', owner: { id: 'p1', name: 'João' } }

    const result = mergeRealtimeOwner(mapped, existing, false, profiles)

    expect(result.next.owner).toBeNull()
    expect(result.ownerSource).toBe('null')
  })

  it('does not incorrectly keep old owner when ownerId changed', () => {
    const mapped: Entity = { id: 'a1', ownerId: 'p2', owner: null }
    const existing: Entity = { id: 'a1', ownerId: 'p1', owner: { id: 'p1', name: 'João' } }

    const result = mergeRealtimeOwner(mapped, existing, false, profiles)

    expect(result.next.owner).toEqual({ id: 'p2', name: 'Maria' })
    expect(result.ownerSource).toBe('profiles')
  })
})

