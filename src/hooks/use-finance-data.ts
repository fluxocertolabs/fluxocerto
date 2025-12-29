import { useState, useEffect, useCallback } from 'react'
import {
  getSupabase,
  isSupabaseConfigured,
  type AccountRow,
  type ProjectRow,
  type ExpenseRow,
  type CreditCardRow,
  type ProfileRow,
} from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type {
  BankAccount,
  Project,
  FixedExpense,
  SingleShotExpense,
  SingleShotIncome,
  Expense,
  CreditCard,
  Profile,
  PaymentSchedule,
  FutureStatement,
  FutureStatementRow,
} from '@/types'
import { transformFutureStatementRow } from '@/types'
import { isFixedExpense, isSingleShotExpense } from '@/types'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { parse } from 'date-fns'

export interface UseFinanceDataReturn {
  accounts: BankAccount[]
  projects: Project[]
  singleShotIncome: SingleShotIncome[]
  expenses: Expense[]
  fixedExpenses: FixedExpense[]
  singleShotExpenses: SingleShotExpense[]
  creditCards: CreditCard[]
  futureStatements: FutureStatement[]
  profiles: Profile[]
  isLoading: boolean
  error: string | null
  /** Retry function for error recovery */
  retry: () => void
  /**
   * Optimistically remove an expense from local state.
   * Useful when realtime updates are slow/unavailable.
   */
  optimisticallyRemoveExpense: (id: string) => void
}

// =============================================================================
// DATABASE ROW MAPPERS
// Exported for unit testing - convert snake_case database rows to camelCase types
// =============================================================================

/**
 * Map profile database row to Profile type.
 */
export function mapProfileFromDb(row: ProfileRow): Profile {
  return {
    id: row.id,
    name: row.name,
    groupId: row.group_id,
  }
}

/**
 * Normalize owner field from Supabase FK join.
 * Supabase returns owner as array for FK joins, we need to extract first element or null.
 */
export function normalizeOwner(owner: unknown): { id: string; name: string } | null {
  if (!owner) return null
  if (Array.isArray(owner)) {
    return owner.length > 0 ? owner[0] : null
  }
  return owner as { id: string; name: string }
}

/**
 * Map account database row to BankAccount type.
 */
export function mapAccountFromDb(row: AccountRow): BankAccount {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    balance: row.balance,
    ownerId: row.owner_id,
    owner: normalizeOwner(row.owner),
    balanceUpdatedAt: row.balance_updated_at ? new Date(row.balance_updated_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

/**
 * Map project database row to Project type (recurring income).
 */
export function mapProjectFromDb(row: ProjectRow): Project {
  return {
    id: row.id,
    type: 'recurring',
    name: row.name,
    amount: row.amount,
    frequency: row.frequency!,
    paymentSchedule: row.payment_schedule as PaymentSchedule,
    certainty: row.certainty,
    isActive: row.is_active!,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

/**
 * Map project database row to SingleShotIncome type.
 */
export function mapSingleShotIncomeFromDb(row: ProjectRow): SingleShotIncome {
  const parsedDate = parse(row.date!, 'yyyy-MM-dd', new Date())

  return {
    id: row.id,
    type: 'single_shot',
    name: row.name,
    amount: row.amount,
    date: parsedDate,
    certainty: row.certainty,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

/**
 * Map expense database row to Expense type (fixed or single-shot).
 */
export function mapExpenseFromDb(row: ExpenseRow): Expense {
  const base = {
    id: row.id,
    name: row.name,
    amount: row.amount,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }

  if (row.type === 'fixed') {
    return {
      ...base,
      type: 'fixed' as const,
      dueDay: row.due_day!,
      isActive: row.is_active,
    }
  }

  const parsedDate = parse(row.date!, 'yyyy-MM-dd', new Date())

  return {
    ...base,
    type: 'single_shot' as const,
    date: parsedDate,
  }
}

/**
 * Map credit card database row to CreditCard type.
 */
export function mapCreditCardFromDb(row: CreditCardRow): CreditCard {
  return {
    id: row.id,
    name: row.name,
    statementBalance: row.statement_balance,
    dueDay: row.due_day,
    ownerId: row.owner_id,
    owner: normalizeOwner(row.owner),
    balanceUpdatedAt: row.balance_updated_at ? new Date(row.balance_updated_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export function useFinanceData(): UseFinanceDataReturn {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [singleShotIncome, setSingleShotIncome] = useState<SingleShotIncome[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [creditCards, setCreditCards] = useState<CreditCard[]>([])
  const [futureStatements, setFutureStatements] = useState<FutureStatement[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  
  const { isAuthenticated } = useAuth()

  // Derive filtered expense lists
  const fixedExpenses = expenses.filter(isFixedExpense)
  const singleShotExpenses = expenses.filter(isSingleShotExpense)

  // Retry function for error recovery
  const retry = useCallback(() => {
    setRetryCount((c) => c + 1)
  }, [])

  // Optimistic local update helpers (do not rely on realtime)
  const optimisticallyRemoveExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((expense) => expense.id !== id))
  }, [])

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
      // Fetch all tables in parallel - no user_id filter needed (shared family data)
      const [accountsResult, projectsResult, expensesResult, creditCardsResult, futureStatementsResult, profilesResult] = await Promise.all([
        client.from('accounts').select(`
          id, name, type, balance, balance_updated_at, owner_id,
          owner:profiles!owner_id(id, name),
          created_at, updated_at
        `),
        client.from('projects').select('*'),
        client.from('expenses').select('*'),
        client.from('credit_cards').select(`
          id, name, statement_balance, due_day, balance_updated_at, owner_id,
          owner:profiles!owner_id(id, name),
          created_at, updated_at
        `),
        client.from('future_statements').select('*')
          .order('target_year', { ascending: true })
          .order('target_month', { ascending: true }),
        client.from('profiles').select('id, name').order('name'),
      ])

      // Check for errors
      if (accountsResult.error) throw accountsResult.error
      if (projectsResult.error) throw projectsResult.error
      if (expensesResult.error) throw expensesResult.error
      if (creditCardsResult.error) throw creditCardsResult.error
      if (futureStatementsResult.error) throw futureStatementsResult.error
      if (profilesResult.error) throw profilesResult.error

      // Map database rows to TypeScript types
      // Type assertions needed because Supabase infers complex types from select strings
      setAccounts((accountsResult.data ?? []).map((row) => mapAccountFromDb(row as unknown as AccountRow)))
      
      // Separate projects by type: recurring vs single-shot income
      const allProjects = projectsResult.data ?? []
      const recurringProjects = allProjects.filter((p) => p.type === 'recurring' || !p.type)
      const singleShotIncomeRows = allProjects.filter((p) => p.type === 'single_shot')
      setProjects(recurringProjects.map(mapProjectFromDb))
      setSingleShotIncome(singleShotIncomeRows.map(mapSingleShotIncomeFromDb))
      
      setExpenses((expensesResult.data ?? []).map(mapExpenseFromDb))
      setCreditCards((creditCardsResult.data ?? []).map((row) => mapCreditCardFromDb(row as unknown as CreditCardRow)))
      setFutureStatements((futureStatementsResult.data ?? []).map((row) => transformFutureStatementRow(row as FutureStatementRow)))
      setProfiles((profilesResult.data ?? []).map((row) => mapProfileFromDb(row as ProfileRow)))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar dados'
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

  // Handle realtime changes for projects (both recurring and single-shot income)
  const handleProjectChange = useCallback((payload: RealtimePostgresChangesPayload<ProjectRow>) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    switch (eventType) {
      case 'INSERT':
        if (newRecord) {
          const row = newRecord as ProjectRow
          if (row.type === 'single_shot') {
            setSingleShotIncome(prev => [...prev, mapSingleShotIncomeFromDb(row)])
          } else {
            setProjects(prev => [...prev, mapProjectFromDb(row)])
          }
        }
        break
      case 'UPDATE':
        if (newRecord) {
          const row = newRecord as ProjectRow
          if (row.type === 'single_shot') {
            setSingleShotIncome(prev =>
              prev.map(income =>
                income.id === row.id ? mapSingleShotIncomeFromDb(row) : income
              )
            )
          } else {
            setProjects(prev =>
              prev.map(project =>
                project.id === row.id ? mapProjectFromDb(row) : project
              )
            )
          }
        }
        break
      case 'DELETE':
        if (oldRecord) {
          const row = oldRecord as ProjectRow
          if (row.type === 'single_shot') {
            setSingleShotIncome(prev => prev.filter(income => income.id !== row.id))
          } else {
            setProjects(prev => prev.filter(project => project.id !== row.id))
          }
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

  // Handle realtime changes for future statements
  const handleFutureStatementChange = useCallback((payload: RealtimePostgresChangesPayload<FutureStatementRow>) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    switch (eventType) {
      case 'INSERT':
        if (newRecord) {
          setFutureStatements(prev => {
            const newStatement = transformFutureStatementRow(newRecord as FutureStatementRow)
            // Insert in sorted order (by year, then month)
            const newList = [...prev, newStatement]
            return newList.sort((a, b) => {
              if (a.targetYear !== b.targetYear) return a.targetYear - b.targetYear
              return a.targetMonth - b.targetMonth
            })
          })
        }
        break
      case 'UPDATE':
        if (newRecord) {
          setFutureStatements(prev => {
            const updated = prev.map(statement =>
              statement.id === (newRecord as FutureStatementRow).id
                ? transformFutureStatementRow(newRecord as FutureStatementRow)
                : statement
            )
            // Re-sort in case date changed
            return updated.sort((a, b) => {
              if (a.targetYear !== b.targetYear) return a.targetYear - b.targetYear
              return a.targetMonth - b.targetMonth
            })
          })
        }
        break
      case 'DELETE':
        if (oldRecord) {
          setFutureStatements(prev => prev.filter(statement => statement.id !== (oldRecord as FutureStatementRow).id))
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

    // Only fetch data when authenticated
    // Don't set error for unauthenticated state - just keep loading
    // The auth flow will redirect to login if truly unauthenticated
    if (!isAuthenticated) {
      return
    }

    let channel: RealtimeChannel | null = null

    async function setup() {
      // Reset loading state on retry
      setIsLoading(true)
      
      // Fetch initial data
      await fetchAllData()

      // Subscribe to realtime changes (no user_id filter - shared family data)
      const client = getSupabase()
      channel = client
        .channel('finance-data-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'accounts',
          },
          handleAccountChange
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'projects',
          },
          handleProjectChange
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'expenses',
          },
          handleExpenseChange
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'credit_cards',
          },
          handleCreditCardChange
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'future_statements',
          },
          handleFutureStatementChange
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR') {
            console.error('Realtime channel error:', err)
            setError('Falha ao conectar às atualizações em tempo real')
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
  }, [isAuthenticated, fetchAllData, handleAccountChange, handleProjectChange, handleExpenseChange, handleCreditCardChange, handleFutureStatementChange, retryCount])

  return {
    accounts,
    projects,
    singleShotIncome,
    expenses,
    fixedExpenses,
    singleShotExpenses,
    creditCards,
    futureStatements,
    profiles,
    isLoading,
    error,
    retry,
    optimisticallyRemoveExpense,
  }
}
