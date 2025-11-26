import Dexie, { type Table } from 'dexie'
import type { BankAccount, Project, FixedExpense, CreditCard } from '../types'

export class FinanceDB extends Dexie {
  accounts!: Table<BankAccount, string>
  projects!: Table<Project, string>
  expenses!: Table<FixedExpense, string>
  creditCards!: Table<CreditCard, string>

  constructor() {
    super('FamilyFinanceDB')

    // Version 1: Original schema
    this.version(1).stores({
      accounts: 'id, name, type',
      projects: 'id, name, isActive',
      expenses: 'id, name, isActive',
      creditCards: 'id, name',
    })

    // Version 2: Add balanceUpdatedAt to accounts and creditCards
    // Note: No index needed on balanceUpdatedAt (only used for staleness check)
    // No upgrade function needed - new field is optional
    // Existing records will have balanceUpdatedAt: undefined (treated as stale)
    this.version(2).stores({
      accounts: 'id, name, type',
      projects: 'id, name, isActive',
      expenses: 'id, name, isActive',
      creditCards: 'id, name',
    })
  }
}

export const db = new FinanceDB()

