import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { BankAccount, Project, FixedExpense, CreditCard } from '@/types'

export interface UseFinanceDataReturn {
  accounts: BankAccount[]
  projects: Project[]
  expenses: FixedExpense[]
  creditCards: CreditCard[]
  isLoading: boolean
}

export function useFinanceData(): UseFinanceDataReturn {
  const accounts = useLiveQuery(() => db.accounts.toArray())
  const projects = useLiveQuery(() => db.projects.toArray())
  const expenses = useLiveQuery(() => db.expenses.toArray())
  const creditCards = useLiveQuery(() => db.creditCards.toArray())

  const isLoading =
    accounts === undefined ||
    projects === undefined ||
    expenses === undefined ||
    creditCards === undefined

  return {
    accounts: accounts ?? [],
    projects: projects ?? [],
    expenses: expenses ?? [],
    creditCards: creditCards ?? [],
    isLoading,
  }
}

