import { useState, useEffect, useCallback, useRef } from 'react'
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
import { FINANCE_DATA_INVALIDATED_EVENT } from '@/lib/finance-data-events'
import { upsertUniqueById } from '@/lib/utils'

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
   * Background refresh of all finance data (does not force full-page loading state).
   * Useful as a deterministic fallback when realtime delivery is delayed.
   */
  refresh: () => Promise<void>
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

type OwnerRef = { id: string; name: string } | null
export type RealtimeOwnerSource = 'mapped' | 'existing' | 'profiles' | 'null'

/**
 * Supabase realtime payloads for base tables (accounts/credit_cards) do NOT include
 * our joined `owner` field (from `owner:profiles!owner_id(id, name)`).
 *
 * When the join is missing, we preserve/resolve owner to prevent UI flicker and
 * accidental tag loss after balance updates.
 */
export function mergeRealtimeOwner<T extends { ownerId?: string | null; owner: OwnerRef }>(
  mapped: T,
  existing: T | undefined,
  ownerJoinPresent: boolean,
  profiles: Profile[]
): { next: T; ownerSource: RealtimeOwnerSource } {
  // If the join is present, trust the mapped payload (even if null).
  if (ownerJoinPresent) {
    return { next: mapped, ownerSource: mapped.owner ? 'mapped' : 'null' }
  }

  // No join present — resolve owner from local sources.
  if (mapped.ownerId == null) {
    if (mapped.owner == null) return { next: mapped, ownerSource: 'null' }
    return { next: { ...mapped, owner: null }, ownerSource: 'null' }
  }

  if (existing?.owner && existing.ownerId === mapped.ownerId) {
    return {
      next: mapped.owner === existing.owner ? mapped : ({ ...mapped, owner: existing.owner } as T),
      ownerSource: 'existing',
    }
  }

  const profile = profiles.find((p) => p.id === mapped.ownerId)
  if (profile) {
    const resolved = { id: profile.id, name: profile.name }
    return {
      next: mapped.owner?.id === resolved.id && mapped.owner?.name === resolved.name
        ? mapped
        : ({ ...mapped, owner: resolved } as T),
      ownerSource: 'profiles',
    }
  }

  if (mapped.owner == null) return { next: mapped, ownerSource: 'null' }
  return { next: { ...mapped, owner: null }, ownerSource: 'null' }
}

export function useFinanceData(): UseFinanceDataReturn {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [singleShotIncome, setSingleShotIncome] = useState<SingleShotIncome[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [creditCards, setCreditCards] = useState<CreditCard[]>([])
  const [futureStatements, setFutureStatements] = useState<FutureStatement[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const profilesRef = useRef<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Each hook instance must use a unique realtime channel name.
  // Multiple mounted instances (e.g. dashboard + quick update) can otherwise
  // interfere with each other if they share the same channel identifier.
  const channelNameRef = useRef<string | null>(null)
  if (!channelNameRef.current) {
    const id =
      globalThis.crypto?.randomUUID?.() ??
      Math.random().toString(36).slice(2)

    channelNameRef.current = `finance-data-changes-${id}`
  }

  const { isAuthenticated } = useAuth()

  // Keep latest profiles in a ref so realtime handlers can resolve owner names
  // without re-subscribing on every profiles change.
  useEffect(() => {
    profilesRef.current = profiles
  }, [profiles])

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
      const mappedAccounts = (accountsResult.data ?? []).map((row) =>
        mapAccountFromDb(row as unknown as AccountRow)
      )
      
      // Separate projects by type: recurring vs single-shot income
      const allProjects = projectsResult.data ?? []
      const recurringProjects = allProjects.filter((p) => p.type === 'recurring' || !p.type)
      const singleShotIncomeRows = allProjects.filter((p) => p.type === 'single_shot')
      const mappedProjects = recurringProjects.map(mapProjectFromDb)
      const mappedSingleShotIncome = singleShotIncomeRows.map(mapSingleShotIncomeFromDb)
      
      const mappedExpenses = (expensesResult.data ?? []).map(mapExpenseFromDb)
      const mappedCreditCards = (creditCardsResult.data ?? []).map((row) =>
        mapCreditCardFromDb(row as unknown as CreditCardRow)
      )
      const mappedFutureStatements = (futureStatementsResult.data ?? []).map((row) =>
        transformFutureStatementRow(row as FutureStatementRow)
      )
      const mappedProfiles = (profilesResult.data ?? []).map((row) =>
        mapProfileFromDb(row as ProfileRow)
      )

      setAccounts(mappedAccounts)
      setProjects(mappedProjects)
      setSingleShotIncome(mappedSingleShotIncome)
      setExpenses(mappedExpenses)
      setCreditCards(mappedCreditCards)
      setFutureStatements(mappedFutureStatements)
      setProfiles(mappedProfiles)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar dados'
      setError(message)
      console.error('Error fetching finance data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Background refresh (does NOT set isLoading=true, so UI won't remount)
  const refresh = useCallback(async () => {
    await fetchAllData()
  }, [fetchAllData])

  /**
   * Idempotent upsert helper for realtime events.
   *
   * Problem: we can receive a realtime INSERT/UPDATE for a record that was already
   * included by a refetch (e.g. after explicit invalidation). If we blindly append
   * on INSERT we can end up with duplicated items in state, which then breaks UI
   * counts (e.g. "Próximas Faturas" badge) and can cause flakiness.
   *
   * This helper:
   * - Replaces the first occurrence (preserving list order)
   * - Removes any duplicates of the same id
   * - Appends if the id does not exist yet
   */
  // Note: moved to shared util (`src/lib/utils/array.ts`) so other hooks/components can reuse it.

  // Handle realtime changes for accounts
  const handleAccountChange = useCallback((payload: RealtimePostgresChangesPayload<AccountRow>) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    switch (eventType) {
      case 'INSERT':
        if (newRecord) {
          const mapped = mapAccountFromDb(newRecord as AccountRow)
          setAccounts((prev) => upsertUniqueById(prev, mapped))
        }
        break
      case 'UPDATE':
        if (newRecord) {
          const mapped = mapAccountFromDb(newRecord as AccountRow)
          setAccounts((prev) => {
            const existing = prev.find((a) => a.id === mapped.id)

            // Supabase realtime payloads for base tables do NOT include our joined `owner` field
            // (from `owner:profiles!owner_id(...)` select). Preserve/resolve owner to avoid UI flicker.
            const ownerJoinPresent = Object.prototype.hasOwnProperty.call(
              newRecord as unknown as Record<string, unknown>,
              'owner'
            )
            const { next } = mergeRealtimeOwner(
              mapped,
              existing,
              ownerJoinPresent,
              profilesRef.current
            )

            return upsertUniqueById(prev, next)
          })
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
            const mapped = mapSingleShotIncomeFromDb(row)
            setSingleShotIncome((prev) => upsertUniqueById(prev, mapped))
            // Defensive: ensure it doesn't exist in recurring list
            setProjects((prev) => prev.filter((p) => p.id !== row.id))
          } else {
            const mapped = mapProjectFromDb(row)
            setProjects((prev) => upsertUniqueById(prev, mapped))
            // Defensive: ensure it doesn't exist in single-shot list
            setSingleShotIncome((prev) => prev.filter((p) => p.id !== row.id))
          }
        }
        break
      case 'UPDATE':
        if (newRecord) {
          const row = newRecord as ProjectRow
          if (row.type === 'single_shot') {
            const mapped = mapSingleShotIncomeFromDb(row)
            setSingleShotIncome((prev) => upsertUniqueById(prev, mapped))
            setProjects((prev) => prev.filter((p) => p.id !== row.id))
          } else {
            const mapped = mapProjectFromDb(row)
            setProjects((prev) => upsertUniqueById(prev, mapped))
            setSingleShotIncome((prev) => prev.filter((p) => p.id !== row.id))
          }
        }
        break
      case 'DELETE':
        if (oldRecord) {
          const row = oldRecord as ProjectRow
          setSingleShotIncome((prev) => prev.filter((income) => income.id !== row.id))
          setProjects((prev) => prev.filter((project) => project.id !== row.id))
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
          const mapped = mapExpenseFromDb(newRecord as ExpenseRow)
          setExpenses((prev) => upsertUniqueById(prev, mapped))
        }
        break
      case 'UPDATE':
        if (newRecord) {
          const mapped = mapExpenseFromDb(newRecord as ExpenseRow)
          setExpenses((prev) => upsertUniqueById(prev, mapped))
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
          const mapped = mapCreditCardFromDb(newRecord as CreditCardRow)
          setCreditCards((prev) => upsertUniqueById(prev, mapped))
        }
        break
      case 'UPDATE':
        if (newRecord) {
          const mapped = mapCreditCardFromDb(newRecord as CreditCardRow)
          setCreditCards((prev) => {
            const existing = prev.find((c) => c.id === mapped.id)

            // Preserve/resolve joined `owner` to avoid flicker (realtime payload won't include join).
            const ownerJoinPresent = Object.prototype.hasOwnProperty.call(
              newRecord as unknown as Record<string, unknown>,
              'owner'
            )
            const { next } = mergeRealtimeOwner(
              mapped,
              existing,
              ownerJoinPresent,
              profilesRef.current
            )

            return upsertUniqueById(prev, next)
          })
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
            const mapped = transformFutureStatementRow(newRecord as FutureStatementRow)
            const next = upsertUniqueById(prev, mapped)
            return next.sort((a, b) => {
              if (a.targetYear !== b.targetYear) return a.targetYear - b.targetYear
              return a.targetMonth - b.targetMonth
            })
          })
        }
        break
      case 'UPDATE':
        if (newRecord) {
          setFutureStatements(prev => {
            const mapped = transformFutureStatementRow(newRecord as FutureStatementRow)
            const next = upsertUniqueById(prev, mapped)
            return next.sort((a, b) => {
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
        .channel(channelNameRef.current!)
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

  // Listen for explicit invalidation signals after mutations (fallback to realtime).
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isSupabaseConfigured()) return
    if (!isAuthenticated) return

    const onInvalidated = () => {
      // Fire and forget; fetchAllData already manages error state.
      void fetchAllData()
    }

    window.addEventListener(FINANCE_DATA_INVALIDATED_EVENT, onInvalidated)
    return () => window.removeEventListener(FINANCE_DATA_INVALIDATED_EVENT, onInvalidated)
  }, [isAuthenticated, fetchAllData])

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
    refresh,
    optimisticallyRemoveExpense,
  }
}
