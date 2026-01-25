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
import {
  addSentryBreadcrumb,
  captureSentryException,
  startSentrySpan,
} from '@/lib/observability/sentry'

// =============================================================================
// SORTING UTILITIES
// Deterministic alphabetical ordering (pt-BR locale) to prevent list "jumping"
// =============================================================================

/**
 * Collator for pt-BR locale-aware string comparison.
 * Case-insensitive and diacritics-insensitive for natural sorting.
 */
const ptBRCollator = new Intl.Collator('pt-BR', {
  sensitivity: 'base', // ignore case and diacritics
  numeric: true, // sort "Account 2" before "Account 10"
})

/**
 * Compare two named entities by name (pt-BR locale) with id as tie-breaker.
 * Ensures deterministic ordering across refetches and realtime updates.
 */
export function compareByNameThenId<T extends { name: string; id: string }>(a: T, b: T): number {
  const nameCompare = ptBRCollator.compare(a.name, b.name)
  if (nameCompare !== 0) return nameCompare
  // Tie-breaker: compare by id for deterministic order when names are equal
  return a.id.localeCompare(b.id)
}

/**
 * Sort an array of named entities by name (pt-BR) then id.
 * Returns a new sorted array (does not mutate input).
 */
export function sortByNameThenId<T extends { name: string; id: string }>(items: T[]): T[] {
  return [...items].sort(compareByNameThenId)
}

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
  // Note: groupIdRef is captured at subscription setup time. If the user's group
  // changes mid-session, subscriptions won't automatically update. This is acceptable
  // for current usage patterns where group switching is not a feature.
  const groupIdRef = useRef<string | null>(null)
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

    // Under DEV/test (local Supabase + parallel E2E), PostgREST can legitimately take longer.
    // Keep production snappy, but give DEV more headroom to avoid false timeouts.
    const REQUEST_TIMEOUT_MS = import.meta.env.DEV ? 45000 : 20000
    // Avoid compounding long waits in DEV (a second full timeout can exceed typical E2E budgets).
    const MAX_ATTEMPTS = import.meta.env.DEV ? 1 : 2

    try {
      setError(null)

      await startSentrySpan({ op: 'finance.fetch_all', name: 'finance.fetch_all' }, async () => {
        const client = getSupabase()
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          const controller = new AbortController()
          const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

          try {
            // Fetch all tables in parallel - no user_id filter needed (shared family data)
            const [accountsResult, projectsResult, expensesResult, creditCardsResult, futureStatementsResult, profilesResult] = await Promise.all([
              startSentrySpan({ op: 'supabase.select', name: 'accounts.select' }, () =>
                client.from('accounts').select(`
                  id, name, type, balance, balance_updated_at, owner_id,
                  owner:profiles!owner_id(id, name),
                  created_at, updated_at
                `).abortSignal(controller.signal),
              ),
              startSentrySpan({ op: 'supabase.select', name: 'projects.select' }, () =>
                client.from('projects').select('*').abortSignal(controller.signal),
              ),
              startSentrySpan({ op: 'supabase.select', name: 'expenses.select' }, () =>
                client.from('expenses').select('*').abortSignal(controller.signal),
              ),
              startSentrySpan({ op: 'supabase.select', name: 'credit_cards.select' }, () =>
                client.from('credit_cards').select(`
                  id, name, statement_balance, due_day, balance_updated_at, owner_id,
                  owner:profiles!owner_id(id, name),
                  created_at, updated_at
                `).abortSignal(controller.signal),
              ),
              startSentrySpan({ op: 'supabase.select', name: 'future_statements.select' }, () =>
                client.from('future_statements').select('*')
                  .order('target_year', { ascending: true })
                  .order('target_month', { ascending: true })
                  .abortSignal(controller.signal),
              ),
              startSentrySpan({ op: 'supabase.select', name: 'profiles.select' }, () =>
                client.from('profiles').select('id, name, group_id').order('name').abortSignal(controller.signal),
              ),
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
          groupIdRef.current = mappedProfiles[0]?.groupId ?? null

          // Sort accounts and credit cards alphabetically for stable ordering
          // This prevents "jumping" when balances are updated and data is refetched
          setAccounts(sortByNameThenId(mappedAccounts))
          setProjects(mappedProjects)
          setSingleShotIncome(mappedSingleShotIncome)
          setExpenses(mappedExpenses)
          setCreditCards(sortByNameThenId(mappedCreditCards))
          setFutureStatements(mappedFutureStatements)
          setProfiles(mappedProfiles)

            // Success
            window.clearTimeout(timeoutId)
            break
          } catch (err) {
            // Abort any in-flight requests before retrying
            controller.abort()
            window.clearTimeout(timeoutId)

            const isAbort =
              (err instanceof DOMException && err.name === 'AbortError') ||
              (err instanceof Error && err.name === 'AbortError')

            const isRetryable = isAbort || (err instanceof TypeError && /fetch/i.test(err.message))

            if (attempt < MAX_ATTEMPTS && isRetryable) {
              console.warn(`[FinanceData] Fetch attempt ${attempt} failed (${isAbort ? 'timeout' : 'network'}); retrying...`)
              await new Promise((resolve) => setTimeout(resolve, 300))
              continue
            }

            throw err
          }
        }
      })
    } catch (err) {
      const isAbort =
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err instanceof Error && err.name === 'AbortError')
      const message = isAbort ? 'A requisição demorou muito. Por favor, tente novamente.' : (err instanceof Error ? err.message : 'Falha ao carregar dados')
      setError(message)
      console.error('Error fetching finance data:', err)
      captureSentryException(err, {
        tags: { scope: 'finance.fetch_all' },
      })
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
          setAccounts((prev) => sortByNameThenId(upsertUniqueById(prev, mapped)))
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

            // Sort to maintain stable ordering after upsert
            return sortByNameThenId(upsertUniqueById(prev, next))
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
          setCreditCards((prev) => sortByNameThenId(upsertUniqueById(prev, mapped)))
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

            // Sort to maintain stable ordering after upsert
            return sortByNameThenId(upsertUniqueById(prev, next))
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
      const groupFilter = groupIdRef.current ? `group_id=eq.${groupIdRef.current}` : undefined
      type FinanceRealtimeTable = 'accounts' | 'projects' | 'expenses' | 'credit_cards' | 'future_statements'
      const changes = (table: FinanceRealtimeTable) => ({
        event: '*',
        schema: 'public',
        table,
        ...(groupFilter ? { filter: groupFilter } : {}),
      } as const)
      channel = client
        .channel(channelNameRef.current!)
        .on(
          'postgres_changes',
          changes('accounts'),
          handleAccountChange
        )
        .on(
          'postgres_changes',
          changes('projects'),
          handleProjectChange
        )
        .on(
          'postgres_changes',
          changes('expenses'),
          handleExpenseChange
        )
        .on(
          'postgres_changes',
          changes('credit_cards'),
          handleCreditCardChange
        )
        .on(
          'postgres_changes',
          changes('future_statements'),
          handleFutureStatementChange
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR') {
            console.error('Realtime channel error:', err)
            setError('Falha ao conectar às atualizações em tempo real')
            addSentryBreadcrumb({
              category: 'realtime',
              level: 'error',
              message: 'Realtime channel error',
              data: err ? { error: String(err) } : undefined,
            })
          }
          if (status === 'TIMED_OUT') {
            console.warn('Realtime subscription timed out')
            addSentryBreadcrumb({
              category: 'realtime',
              level: 'warning',
              message: 'Realtime subscription timed out',
            })
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
