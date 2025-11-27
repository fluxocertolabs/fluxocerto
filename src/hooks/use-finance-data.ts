import { useState, useEffect, useCallback } from 'react'
import {
  getSupabase,
  getCurrentUserId,
  isSupabaseConfigured,
  type AccountRow,
  type ProjectRow,
  type ExpenseRow,
  type CreditCardRow,
} from '@/lib/supabase'
import type {
  BankAccount,
  Project,
  FixedExpense,
  CreditCard,
  PaymentSchedule,
} from '@/types'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface UseFinanceDataReturn {
  accounts: BankAccount[]
  projects: Project[]
  expenses: FixedExpense[]
  creditCards: CreditCard[]
  isLoading: boolean
  error: string | null
}

// Helper to convert snake_case database rows to camelCase TypeScript types
function mapAccountFromDb(row: AccountRow): BankAccount {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    balance: row.balance,
    balanceUpdatedAt: row.balance_updated_at ? new Date(row.balance_updated_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function mapProjectFromDb(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    frequency: row.frequency,
    paymentSchedule: row.payment_schedule as PaymentSchedule,
    certainty: row.certainty,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function mapExpenseFromDb(row: ExpenseRow): FixedExpense {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    dueDay: row.due_day,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function mapCreditCardFromDb(row: CreditCardRow): CreditCard {
  return {
    id: row.id,
    name: row.name,
    statementBalance: row.statement_balance,
    dueDay: row.due_day,
    balanceUpdatedAt: row.balance_updated_at ? new Date(row.balance_updated_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export function useFinanceData(): UseFinanceDataReturn {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [expenses, setExpenses] = useState<FixedExpense[]>([])
  const [creditCards, setCreditCards] = useState<CreditCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all data from Supabase
  const fetchAllData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false)
      setError('Supabase is not configured')
      return
    }

    try {
      setError(null)

      const client = getSupabase()
      // Fetch all tables in parallel
      const [accountsResult, projectsResult, expensesResult, creditCardsResult] = await Promise.all([
        client.from('accounts').select('*'),
        client.from('projects').select('*'),
        client.from('expenses').select('*'),
        client.from('credit_cards').select('*'),
      ])

      // Check for errors
      if (accountsResult.error) throw accountsResult.error
      if (projectsResult.error) throw projectsResult.error
      if (expensesResult.error) throw expensesResult.error
      if (creditCardsResult.error) throw creditCardsResult.error

      // Map database rows to TypeScript types
      setAccounts((accountsResult.data ?? []).map(mapAccountFromDb))
      setProjects((projectsResult.data ?? []).map(mapProjectFromDb))
      setExpenses((expensesResult.data ?? []).map(mapExpenseFromDb))
      setCreditCards((creditCardsResult.data ?? []).map(mapCreditCardFromDb))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch data'
      setError(message)
      console.error('Error fetching finance data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle realtime changes for accounts
  const handleAccountChange = useCallback((payload: RealtimePostgresChangesPayload<AccountRow>) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    switch (eventType) {
      case 'INSERT':
        if (newRecord) {
          setAccounts(prev => [...prev, mapAccountFromDb(newRecord as AccountRow)])
        }
        break
      case 'UPDATE':
        if (newRecord) {
          setAccounts(prev =>
            prev.map(account =>
              account.id === (newRecord as AccountRow).id
                ? mapAccountFromDb(newRecord as AccountRow)
                : account
            )
          )
        }
        break
      case 'DELETE':
        if (oldRecord) {
          setAccounts(prev => prev.filter(account => account.id !== (oldRecord as AccountRow).id))
        }
        break
    }
  }, [])

  // Handle realtime changes for projects
  const handleProjectChange = useCallback((payload: RealtimePostgresChangesPayload<ProjectRow>) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    switch (eventType) {
      case 'INSERT':
        if (newRecord) {
          setProjects(prev => [...prev, mapProjectFromDb(newRecord as ProjectRow)])
        }
        break
      case 'UPDATE':
        if (newRecord) {
          setProjects(prev =>
            prev.map(project =>
              project.id === (newRecord as ProjectRow).id
                ? mapProjectFromDb(newRecord as ProjectRow)
                : project
            )
          )
        }
        break
      case 'DELETE':
        if (oldRecord) {
          setProjects(prev => prev.filter(project => project.id !== (oldRecord as ProjectRow).id))
        }
        break
    }
  }, [])

  // Handle realtime changes for expenses
  const handleExpenseChange = useCallback((payload: RealtimePostgresChangesPayload<ExpenseRow>) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    switch (eventType) {
      case 'INSERT':
        if (newRecord) {
          setExpenses(prev => [...prev, mapExpenseFromDb(newRecord as ExpenseRow)])
        }
        break
      case 'UPDATE':
        if (newRecord) {
          setExpenses(prev =>
            prev.map(expense =>
              expense.id === (newRecord as ExpenseRow).id
                ? mapExpenseFromDb(newRecord as ExpenseRow)
                : expense
            )
          )
        }
        break
      case 'DELETE':
        if (oldRecord) {
          setExpenses(prev => prev.filter(expense => expense.id !== (oldRecord as ExpenseRow).id))
        }
        break
    }
  }, [])

  // Handle realtime changes for credit cards
  const handleCreditCardChange = useCallback((payload: RealtimePostgresChangesPayload<CreditCardRow>) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    switch (eventType) {
      case 'INSERT':
        if (newRecord) {
          setCreditCards(prev => [...prev, mapCreditCardFromDb(newRecord as CreditCardRow)])
        }
        break
      case 'UPDATE':
        if (newRecord) {
          setCreditCards(prev =>
            prev.map(card =>
              card.id === (newRecord as CreditCardRow).id
                ? mapCreditCardFromDb(newRecord as CreditCardRow)
                : card
            )
          )
        }
        break
      case 'DELETE':
        if (oldRecord) {
          setCreditCards(prev => prev.filter(card => card.id !== (oldRecord as CreditCardRow).id))
        }
        break
    }
  }, [])

  // Setup subscription and initial data fetch
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false)
      setError('Supabase is not configured')
      return
    }

    let channel: RealtimeChannel | null = null

    async function setup() {
      // Get user ID for filtering
      const userId = await getCurrentUserId()
      
      if (!userId) {
        setIsLoading(false)
        setError('Not authenticated')
        return
      }

      // Fetch initial data
      await fetchAllData()

      // Subscribe to realtime changes filtered by user_id
      const client = getSupabase()
      channel = client
        .channel('finance-data-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'accounts',
            filter: `user_id=eq.${userId}`,
          },
          handleAccountChange
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'projects',
            filter: `user_id=eq.${userId}`,
          },
          handleProjectChange
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'expenses',
            filter: `user_id=eq.${userId}`,
          },
          handleExpenseChange
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'credit_cards',
            filter: `user_id=eq.${userId}`,
          },
          handleCreditCardChange
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR') {
            console.error('Realtime channel error:', err)
            setError('Failed to connect to realtime updates')
          }
          if (status === 'TIMED_OUT') {
            console.warn('Realtime subscription timed out')
          }
        })
    }

    setup()

    // Cleanup subscription on unmount
    return () => {
      if (channel) {
        channel.unsubscribe()
      }
    }
  }, [fetchAllData, handleAccountChange, handleProjectChange, handleExpenseChange, handleCreditCardChange])

  return {
    accounts,
    projects,
    expenses,
    creditCards,
    isLoading,
    error,
  }
}
