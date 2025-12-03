/**
 * Unit tests for use-snapshot-projection hook.
 * Tests data transformation, date parsing, and schema version handling.
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSnapshotProjection } from './use-snapshot-projection'
import type { ProjectionSnapshot } from '@/types/snapshot'
import type { CashflowProjection } from '@/lib/cashflow/types'

// =============================================================================
// TEST HELPERS
// =============================================================================

function createMockProjection(overrides: Partial<CashflowProjection> = {}): CashflowProjection {
  return {
    startDate: new Date('2025-01-01T00:00:00Z'),
    endDate: new Date('2025-01-31T00:00:00Z'),
    startingBalance: 100000,
    days: [
      {
        date: new Date('2025-01-01T00:00:00Z'),
        dayOffset: 0,
        optimisticBalance: 100000,
        pessimisticBalance: 90000,
        incomeEvents: [],
        expenseEvents: [],
        isOptimisticDanger: false,
        isPessimisticDanger: false,
      },
      {
        date: new Date('2025-01-02T00:00:00Z'),
        dayOffset: 1,
        optimisticBalance: 95000,
        pessimisticBalance: 85000,
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
    ...overrides,
  }
}

function createMockSnapshot(overrides: Partial<ProjectionSnapshot> = {}): ProjectionSnapshot {
  const projection = createMockProjection()
  return {
    id: 'test-snapshot-id',
    householdId: 'test-household-id',
    name: 'Test Snapshot',
    schemaVersion: 1,
    data: {
      inputs: {
        accounts: [
          {
            id: 'account-1',
            name: 'Checking',
            type: 'checking',
            balance: 100000,
            ownerId: null,
            owner: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        projects: [],
        singleShotIncome: [],
        fixedExpenses: [],
        singleShotExpenses: [],
        creditCards: [],
        futureStatements: [],
        projectionDays: 30,
      },
      projection,
      summaryMetrics: {
        startingBalance: 100000,
        endBalanceOptimistic: 120000,
        dangerDayCount: 0,
      },
    },
    createdAt: new Date('2025-01-15T10:00:00Z'),
    ...overrides,
  }
}

// Create a snapshot with JSON-serialized dates (as would come from database)
function createSerializedSnapshot(): ProjectionSnapshot {
  const snapshot = createMockSnapshot()
  // Simulate JSON serialization/deserialization (dates become strings)
  return JSON.parse(JSON.stringify(snapshot))
}

// =============================================================================
// NULL SNAPSHOT TESTS
// =============================================================================

describe('useSnapshotProjection - null snapshot', () => {
  it('should return empty chartData when snapshot is null', () => {
    const { result } = renderHook(() => useSnapshotProjection(null))

    expect(result.current.chartData).toEqual([])
  })

  it('should return empty dangerRanges when snapshot is null', () => {
    const { result } = renderHook(() => useSnapshotProjection(null))

    expect(result.current.dangerRanges).toEqual([])
  })

  it('should return null summaryStats when snapshot is null', () => {
    const { result } = renderHook(() => useSnapshotProjection(null))

    expect(result.current.summaryStats).toBeNull()
  })
})

// =============================================================================
// DATA TRANSFORMATION TESTS
// =============================================================================

describe('useSnapshotProjection - data transformation', () => {
  it('should transform snapshot data to chartData', () => {
    const snapshot = createMockSnapshot()
    const { result } = renderHook(() => useSnapshotProjection(snapshot))

    expect(result.current.chartData).toHaveLength(2)
    expect(result.current.chartData[0].optimisticBalance).toBe(1000) // 100000 cents / 100
    expect(result.current.chartData[0].pessimisticBalance).toBe(900) // 90000 cents / 100
  })

  it('should include investment balance in chartData', () => {
    const snapshot = createMockSnapshot()
    // Add investment account
    snapshot.data.inputs.accounts.push({
      id: 'investment-1',
      name: 'Investment',
      type: 'investment',
      balance: 50000, // R$500.00
      ownerId: null,
      owner: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const { result } = renderHook(() => useSnapshotProjection(snapshot))

    // investmentInclusiveBalance = (optimisticBalance + investmentTotal) / 100
    // = (100000 + 50000) / 100 = 1500
    expect(result.current.chartData[0].investmentInclusiveBalance).toBe(1500)
  })

  it('should calculate summaryStats correctly', () => {
    const snapshot = createMockSnapshot()
    const { result } = renderHook(() => useSnapshotProjection(snapshot))

    expect(result.current.summaryStats).not.toBeNull()
    expect(result.current.summaryStats?.startingBalance).toBe(1000) // 100000 cents / 100
    expect(result.current.summaryStats?.optimistic.endBalance).toBe(1200) // 120000 cents / 100
    expect(result.current.summaryStats?.pessimistic.endBalance).toBe(1100) // 110000 cents / 100
  })
})

// =============================================================================
// DATE PARSING TESTS
// =============================================================================

describe('useSnapshotProjection - date parsing', () => {
  it('should parse ISO date strings from JSON', () => {
    const snapshot = createSerializedSnapshot()
    const { result } = renderHook(() => useSnapshotProjection(snapshot))

    // Should have chartData (dates were parsed successfully)
    expect(result.current.chartData.length).toBeGreaterThan(0)
    
    // Check that dates are properly formatted in chartData
    // formatChartDate returns something like "1 jan."
    expect(result.current.chartData[0].date).toBeTruthy()
  })

  it('should handle dates in projection days', () => {
    const snapshot = createSerializedSnapshot()
    const { result } = renderHook(() => useSnapshotProjection(snapshot))

    // Each day should have a valid date string
    result.current.chartData.forEach((point) => {
      expect(typeof point.date).toBe('string')
      expect(point.date.length).toBeGreaterThan(0)
    })
  })
})

// =============================================================================
// DANGER RANGES TESTS
// =============================================================================

describe('useSnapshotProjection - danger ranges', () => {
  it('should return empty dangerRanges when no danger days', () => {
    const snapshot = createMockSnapshot()
    const { result } = renderHook(() => useSnapshotProjection(snapshot))

    expect(result.current.dangerRanges).toEqual([])
  })

  it('should identify danger ranges from projection data', () => {
    const snapshot = createMockSnapshot()
    // Mark first day as danger
    snapshot.data.projection.days[0].isOptimisticDanger = true
    snapshot.data.projection.days[0].optimisticBalance = -10000

    const { result } = renderHook(() => useSnapshotProjection(snapshot))

    expect(result.current.dangerRanges.length).toBeGreaterThan(0)
    expect(result.current.dangerRanges[0].scenario).toBe('optimistic')
  })

  it('should handle both optimistic and pessimistic danger', () => {
    const snapshot = createMockSnapshot()
    snapshot.data.projection.days[0].isOptimisticDanger = true
    snapshot.data.projection.days[0].isPessimisticDanger = true
    snapshot.data.projection.days[0].optimisticBalance = -10000
    snapshot.data.projection.days[0].pessimisticBalance = -20000

    const { result } = renderHook(() => useSnapshotProjection(snapshot))

    expect(result.current.dangerRanges.length).toBeGreaterThan(0)
    expect(result.current.dangerRanges[0].scenario).toBe('both')
  })
})

// =============================================================================
// SCHEMA VERSION TESTS
// =============================================================================

describe('useSnapshotProjection - schema version handling', () => {
  it('should handle current schema version', () => {
    const snapshot = createMockSnapshot({ schemaVersion: 1 })
    const { result } = renderHook(() => useSnapshotProjection(snapshot))

    expect(result.current.chartData.length).toBeGreaterThan(0)
    expect(result.current.summaryStats).not.toBeNull()
  })

  it('should warn for incompatible schema version', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    
    const snapshot = createMockSnapshot({ schemaVersion: 99 })
    renderHook(() => useSnapshotProjection(snapshot))

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('schema version 99 may not be fully compatible')
    )

    consoleSpy.mockRestore()
  })

  it('should still render data for incompatible schema version (best effort)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    
    const snapshot = createMockSnapshot({ schemaVersion: 99 })
    const { result } = renderHook(() => useSnapshotProjection(snapshot))

    // Should still attempt to render
    expect(result.current.chartData.length).toBeGreaterThan(0)
  })
})

// =============================================================================
// EDGE CASES
// =============================================================================

describe('useSnapshotProjection - edge cases', () => {
  it('should handle empty projection days', () => {
    const snapshot = createMockSnapshot()
    snapshot.data.projection.days = []

    const { result } = renderHook(() => useSnapshotProjection(snapshot))

    expect(result.current.chartData).toEqual([])
    expect(result.current.dangerRanges).toEqual([])
  })

  it('should handle zero balances', () => {
    const snapshot = createMockSnapshot()
    snapshot.data.projection.startingBalance = 0
    snapshot.data.projection.days[0].optimisticBalance = 0
    snapshot.data.projection.days[0].pessimisticBalance = 0

    const { result } = renderHook(() => useSnapshotProjection(snapshot))

    expect(result.current.chartData[0].optimisticBalance).toBe(0)
    expect(result.current.chartData[0].pessimisticBalance).toBe(0)
  })

  it('should handle negative balances', () => {
    const snapshot = createMockSnapshot()
    snapshot.data.projection.days[0].optimisticBalance = -50000
    snapshot.data.projection.days[0].pessimisticBalance = -100000

    const { result } = renderHook(() => useSnapshotProjection(snapshot))

    expect(result.current.chartData[0].optimisticBalance).toBe(-500)
    expect(result.current.chartData[0].pessimisticBalance).toBe(-1000)
  })

  it('should handle no investment accounts', () => {
    const snapshot = createMockSnapshot()
    snapshot.data.inputs.accounts = snapshot.data.inputs.accounts.filter(
      (a) => a.type !== 'investment'
    )

    const { result } = renderHook(() => useSnapshotProjection(snapshot))

    // investmentInclusiveBalance should equal optimisticBalance when no investments
    expect(result.current.chartData[0].investmentInclusiveBalance).toBe(
      result.current.chartData[0].optimisticBalance
    )
  })

  it('should handle single day projection', () => {
    const snapshot = createMockSnapshot()
    snapshot.data.projection.days = [snapshot.data.projection.days[0]]

    const { result } = renderHook(() => useSnapshotProjection(snapshot))

    expect(result.current.chartData).toHaveLength(1)
  })
})

