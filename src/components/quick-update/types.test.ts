/**
 * Unit tests for Quick Update types and helper functions
 */

import { describe, it, expect } from 'vitest'
import {
  getBalanceFromItem,
  getNameFromItem,
  getIdFromItem,
  getOwnerFromItem,
  getAccountTypeFromItem,
  type BalanceItem,
} from './types'
import type { BankAccount, CreditCard } from '@/types'

// Mock data factories
function createMockBankAccount(overrides: Partial<BankAccount> = {}): BankAccount {
  return {
    id: 'account-123',
    name: 'Test Account',
    type: 'checking',
    balance: 100000,
    owner: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockCreditCard(overrides: Partial<CreditCard> = {}): CreditCard {
  return {
    id: 'card-456',
    name: 'Test Card',
    statementBalance: 50000,
    dueDay: 15,
    owner: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('Quick Update Types', () => {
  describe('getBalanceFromItem', () => {
    it('returns balance for account items', () => {
      const item: BalanceItem = {
        type: 'account',
        entity: createMockBankAccount({ balance: 250000 }),
      }
      expect(getBalanceFromItem(item)).toBe(250000)
    })

    it('returns statementBalance for card items', () => {
      const item: BalanceItem = {
        type: 'card',
        entity: createMockCreditCard({ statementBalance: 75000 }),
      }
      expect(getBalanceFromItem(item)).toBe(75000)
    })
  })

  describe('getNameFromItem', () => {
    it('returns name for account items', () => {
      const item: BalanceItem = {
        type: 'account',
        entity: createMockBankAccount({ name: 'Nubank' }),
      }
      expect(getNameFromItem(item)).toBe('Nubank')
    })

    it('returns name for card items', () => {
      const item: BalanceItem = {
        type: 'card',
        entity: createMockCreditCard({ name: 'Platinum Card' }),
      }
      expect(getNameFromItem(item)).toBe('Platinum Card')
    })
  })

  describe('getIdFromItem', () => {
    it('returns id for account items', () => {
      const item: BalanceItem = {
        type: 'account',
        entity: createMockBankAccount({ id: 'acc-uuid-123' }),
      }
      expect(getIdFromItem(item)).toBe('acc-uuid-123')
    })

    it('returns id for card items', () => {
      const item: BalanceItem = {
        type: 'card',
        entity: createMockCreditCard({ id: 'card-uuid-456' }),
      }
      expect(getIdFromItem(item)).toBe('card-uuid-456')
    })
  })

  describe('getOwnerFromItem', () => {
    it('returns null when account has no owner', () => {
      const item: BalanceItem = {
        type: 'account',
        entity: createMockBankAccount({ owner: null }),
      }
      expect(getOwnerFromItem(item)).toBeNull()
    })

    it('returns null when card has no owner', () => {
      const item: BalanceItem = {
        type: 'card',
        entity: createMockCreditCard({ owner: null }),
      }
      expect(getOwnerFromItem(item)).toBeNull()
    })

    it('returns owner object for account with owner', () => {
      const owner = { id: 'owner-123', name: 'João' }
      const item: BalanceItem = {
        type: 'account',
        entity: createMockBankAccount({ owner }),
      }
      expect(getOwnerFromItem(item)).toEqual(owner)
    })

    it('returns owner object for card with owner', () => {
      const owner = { id: 'owner-456', name: 'Maria' }
      const item: BalanceItem = {
        type: 'card',
        entity: createMockCreditCard({ owner }),
      }
      expect(getOwnerFromItem(item)).toEqual(owner)
    })
  })

  describe('getAccountTypeFromItem', () => {
    it('returns checking type for checking account', () => {
      const item: BalanceItem = {
        type: 'account',
        entity: createMockBankAccount({ type: 'checking' }),
      }
      expect(getAccountTypeFromItem(item)).toBe('checking')
    })

    it('returns savings type for savings account', () => {
      const item: BalanceItem = {
        type: 'account',
        entity: createMockBankAccount({ type: 'savings' }),
      }
      expect(getAccountTypeFromItem(item)).toBe('savings')
    })

    it('returns investment type for investment account', () => {
      const item: BalanceItem = {
        type: 'account',
        entity: createMockBankAccount({ type: 'investment' }),
      }
      expect(getAccountTypeFromItem(item)).toBe('investment')
    })

    it('returns null for credit card items', () => {
      const item: BalanceItem = {
        type: 'card',
        entity: createMockCreditCard(),
      }
      expect(getAccountTypeFromItem(item)).toBeNull()
    })
  })
})


