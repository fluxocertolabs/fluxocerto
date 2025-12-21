/**
 * Snapshots Store Tests
 *
 * Unit tests for the snapshots store actions with mocked Supabase client.
 * Tests cover validation, error handling, and state management.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useSnapshotsStore } from './snapshots-store'
import type { CashflowProjection } from '@/lib/cashflow/types'

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock response state
let mockSelectResponse: { data: unknown; error: unknown } = { data: [], error: null }
let mockInsertResponse: { data: unknown; error: unknown } = { data: { id: 'test-id' }, error: null }
let mockDeleteResponse: { error: unknown; count: number } = { error: null, count: 1 }
let mockGroupId: string | null = 'test-group-id'
let mockIsConfigured = true

// Mock the supabase module
vi.mock('../lib/supabase', () => ({
  getSupabase: vi.fn(() => {
    return {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve(mockSelectResponse)),
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(mockSelectResponse)),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(mockInsertResponse)),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve(mockDeleteResponse)),
        })),
      })),
    }
  }),
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
  mockSelectResponse = { data: [], error: null }
  mockInsertResponse = { data: { id: 'test-id', name: 'Test', created_at: new Date().toISOString(), data: { summaryMetrics: { startingBalance: 100000, endBalanceOptimistic: 120000, dangerDayCount: 0 } } }, error: null }
  mockDeleteResponse = { error: null, count: 1 }
  mockGroupId = 'test-group-id'
  mockIsConfigured = true
  
  // Reset store state
  useSnapshotsStore.setState({
    snapshots: [],
    currentSnapshot: null,
    isLoading: false,
    error: null,
  })
}

function createMockProjection(): CashflowProjection {
  return {
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-31'),
    startingBalance: 100000,
    days: [
      {
        date: new Date('2025-01-01'),
        dayOffset: 0,
        optimisticBalance: 100000,
        pessimisticBalance: 90000,
        incomeEvents: [],
        expenseEvents: [],
        isOptimisticDanger: false,
        isPessimisticDanger: false,
      },
    ],
    optimistic: {
      totalIncome: 50000,
      totalExpenses: 30000,
      endBalance: 120000,
      dangerDays: [],
      dangerDayCount: 0,
    },
    pessimistic: {
      totalIncome: 40000,
      totalExpenses: 30000,
      endBalance: 110000,
      dangerDays: [],
      dangerDayCount: 0,
    },
  }
}

// =============================================================================
// INITIAL STATE TESTS
// =============================================================================

describe('Snapshots Store - Initial State', () => {
  beforeEach(resetMocks)

  it('should have empty snapshots array initially', () => {
    const state = useSnapshotsStore.getState()
    expect(state.snapshots).toEqual([])
  })

  it('should have null currentSnapshot initially', () => {
    const state = useSnapshotsStore.getState()
    expect(state.currentSnapshot).toBeNull()
  })

  it('should have isLoading false initially', () => {
    const state = useSnapshotsStore.getState()
    expect(state.isLoading).toBe(false)
  })

  it('should have null error initially', () => {
    const state = useSnapshotsStore.getState()
    expect(state.error).toBeNull()
  })
})

// =============================================================================
// FETCH SNAPSHOTS TESTS
// =============================================================================

describe('Snapshots Store - fetchSnapshots', () => {
  beforeEach(resetMocks)

  it('should set error when Supabase is not configured', async () => {
    mockIsConfigured = false

    await useSnapshotsStore.getState().fetchSnapshots()

    const state = useSnapshotsStore.getState()
    expect(state.error).toBe('Supabase não está configurado.')
    expect(state.isLoading).toBe(false)
  })

  it('should set isLoading true during fetch', async () => {
    // Create a promise we can control
    let resolvePromise: (value: unknown) => void
    const controlledPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    // Override mock to use controlled promise
    vi.mocked(await import('../lib/supabase')).getSupabase.mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => controlledPromise),
        })),
      })),
    } as never)

    const fetchPromise = useSnapshotsStore.getState().fetchSnapshots()

    // Check loading state is true during fetch
    expect(useSnapshotsStore.getState().isLoading).toBe(true)

    // Resolve the promise
    resolvePromise!({ data: [], error: null })
    await fetchPromise
  })

  it('should transform data correctly when fetch succeeds', async () => {
    const mockData = [
      {
        id: 'snapshot-1',
        name: 'Test Snapshot',
        created_at: '2025-01-15T10:00:00Z',
        data: {
          summaryMetrics: {
            startingBalance: 100000,
            endBalanceOptimistic: 120000,
            dangerDayCount: 2,
          },
        },
      },
    ]
    mockSelectResponse = { data: mockData, error: null }

    await useSnapshotsStore.getState().fetchSnapshots()

    const state = useSnapshotsStore.getState()
    expect(state.snapshots).toHaveLength(1)
    expect(state.snapshots[0].id).toBe('snapshot-1')
    expect(state.snapshots[0].name).toBe('Test Snapshot')
    expect(state.snapshots[0].summaryMetrics.startingBalance).toBe(100000)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })
})

// =============================================================================
// FETCH SINGLE SNAPSHOT TESTS
// =============================================================================

describe('Snapshots Store - fetchSnapshot', () => {
  beforeEach(resetMocks)

  it('should set error when Supabase is not configured', async () => {
    mockIsConfigured = false

    const result = await useSnapshotsStore.getState().fetchSnapshot('test-id')

    expect(result).toBeNull()
    const state = useSnapshotsStore.getState()
    expect(state.error).toBe('Supabase não está configurado.')
  })

  it('should return null when snapshot not found', async () => {
    mockSelectResponse = { data: null, error: { code: 'PGRST116', message: 'Not found' } }

    const result = await useSnapshotsStore.getState().fetchSnapshot('nonexistent-id')

    expect(result).toBeNull()
    const state = useSnapshotsStore.getState()
    expect(state.currentSnapshot).toBeNull()
  })
})

// =============================================================================
// CREATE SNAPSHOT TESTS
// =============================================================================

describe('Snapshots Store - createSnapshot', () => {
  beforeEach(resetMocks)

  it('should return error when Supabase is not configured', async () => {
    mockIsConfigured = false

    const result = await useSnapshotsStore.getState().createSnapshot({
      name: 'Test',
      inputs: {
        accounts: [],
        projects: [],
        singleShotIncome: [],
        fixedExpenses: [],
        singleShotExpenses: [],
        creditCards: [],
        futureStatements: [],
        projectionDays: 30,
      },
      projection: createMockProjection(),
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Supabase não está configurado.')
    }
  })

  it('should return error when group ID is not found', async () => {
    mockGroupId = null

    const result = await useSnapshotsStore.getState().createSnapshot({
      name: 'Test',
      inputs: {
        accounts: [],
        projects: [],
        singleShotIncome: [],
        fixedExpenses: [],
        singleShotExpenses: [],
        creditCards: [],
        futureStatements: [],
        projectionDays: 30,
      },
      projection: createMockProjection(),
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Não foi possível identificar seu grupo')
    }
  })

  it('should add snapshot to list on success', async () => {
    mockInsertResponse = {
      data: {
        id: 'new-snapshot-id',
        name: 'New Snapshot',
        created_at: new Date().toISOString(),
        data: {
          summaryMetrics: {
            startingBalance: 100000,
            endBalanceOptimistic: 120000,
            dangerDayCount: 0,
          },
        },
      },
      error: null,
    }

    const result = await useSnapshotsStore.getState().createSnapshot({
      name: 'New Snapshot',
      inputs: {
        accounts: [],
        projects: [],
        singleShotIncome: [],
        fixedExpenses: [],
        singleShotExpenses: [],
        creditCards: [],
        futureStatements: [],
        projectionDays: 30,
      },
      projection: createMockProjection(),
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('new-snapshot-id')
    }

    const state = useSnapshotsStore.getState()
    expect(state.snapshots).toHaveLength(1)
    expect(state.snapshots[0].id).toBe('new-snapshot-id')
  })
})

// =============================================================================
// DELETE SNAPSHOT TESTS
// =============================================================================

describe('Snapshots Store - deleteSnapshot', () => {
  beforeEach(resetMocks)

  it('should return error when Supabase is not configured', async () => {
    mockIsConfigured = false

    const result = await useSnapshotsStore.getState().deleteSnapshot('test-id')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Supabase não está configurado.')
    }
  })

  it('should return error when snapshot not found', async () => {
    mockDeleteResponse = { error: null, count: 0 }

    const result = await useSnapshotsStore.getState().deleteSnapshot('nonexistent-id')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Projeção não encontrada')
    }
  })

  it('should remove snapshot from list on success', async () => {
    // Set initial state with a snapshot
    useSnapshotsStore.setState({
      snapshots: [
        {
          id: 'snapshot-to-delete',
          name: 'Test',
          createdAt: new Date(),
          summaryMetrics: {
            startingBalance: 100000,
            endBalanceOptimistic: 120000,
            dangerDayCount: 0,
          },
        },
      ],
    })

    mockDeleteResponse = { error: null, count: 1 }

    const result = await useSnapshotsStore.getState().deleteSnapshot('snapshot-to-delete')

    expect(result.success).toBe(true)

    const state = useSnapshotsStore.getState()
    expect(state.snapshots).toHaveLength(0)
  })

  it('should clear currentSnapshot if deleted', async () => {
    // Set initial state with currentSnapshot
    useSnapshotsStore.setState({
      snapshots: [
        {
          id: 'snapshot-to-delete',
          name: 'Test',
          createdAt: new Date(),
          summaryMetrics: {
            startingBalance: 100000,
            endBalanceOptimistic: 120000,
            dangerDayCount: 0,
          },
        },
      ],
      currentSnapshot: {
        id: 'snapshot-to-delete',
        groupId: 'test-group',
        name: 'Test',
        schemaVersion: 1,
        data: {
          inputs: {
            accounts: [],
            projects: [],
            singleShotIncome: [],
            fixedExpenses: [],
            singleShotExpenses: [],
            creditCards: [],
            futureStatements: [],
            projectionDays: 30,
          },
          projection: createMockProjection(),
          summaryMetrics: {
            startingBalance: 100000,
            endBalanceOptimistic: 120000,
            dangerDayCount: 0,
          },
        },
        createdAt: new Date(),
      },
    })

    mockDeleteResponse = { error: null, count: 1 }

    await useSnapshotsStore.getState().deleteSnapshot('snapshot-to-delete')

    const state = useSnapshotsStore.getState()
    expect(state.currentSnapshot).toBeNull()
  })
})

// =============================================================================
// CLEAR ERROR TESTS
// =============================================================================

describe('Snapshots Store - clearError', () => {
  beforeEach(resetMocks)

  it('should clear error state', () => {
    useSnapshotsStore.setState({ error: 'Some error' })

    useSnapshotsStore.getState().clearError()

    const state = useSnapshotsStore.getState()
    expect(state.error).toBeNull()
  })
})

