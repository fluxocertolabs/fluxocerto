import Dexie, { type Table } from 'dexie'
import type { BankAccount, Project, FixedExpense, CreditCard } from '../types'

export class FinanceDB extends Dexie {
  accounts!: Table<BankAccount, string>
  projects!: Table<Project, string>
  expenses!: Table<FixedExpense, string>
  creditCards!: Table<CreditCard, string>

  constructor() {
    super('FamilyFinanceDB')

    this.version(1).stores({
      accounts: 'id, name, type',
      projects: 'id, name, isActive',
      expenses: 'id, name, isActive',
      creditCards: 'id, name',
    })
  }
}

export const db = new FinanceDB()

