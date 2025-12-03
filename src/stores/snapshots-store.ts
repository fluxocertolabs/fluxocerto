/**
 * Zustand store for projection snapshots CRUD operations.
 * Manages snapshot state and Supabase interactions.
 */

import { create } from 'zustand'
import {
  getSupabase,
  getHouseholdId,
  handleSupabaseError,
  isSupabaseConfigured,
} from '@/lib/supabase'
import { CURRENT_SCHEMA_VERSION } from '@/lib/snapshots'
import type {
  ProjectionSnapshot,
  SnapshotListItem,
  SnapshotSummaryMetrics,
  SnapshotData,
  CreateSnapshotInput,
} from '@/types/snapshot'

// Result type for explicit error handling
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// Error-only result type for config checks
type ErrorResult = { success: false; error: string }

// Database row type for projection_snapshots
interface SnapshotRow {
  id: string
  household_id: string
  name: string
  schema_version: number
  data: SnapshotData
  created_at: string
}

// List query result type (only summary metrics from data)
interface SnapshotListRow {
  id: string
  name: string
  created_at: string
  data: {
    summaryMetrics: SnapshotSummaryMetrics
  }
}

interface SnapshotsStore {
  // State
  snapshots: SnapshotListItem[]
  currentSnapshot: ProjectionSnapshot | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchSnapshots: () => Promise<void>
  fetchSnapshot: (id: string) => Promise<ProjectionSnapshot | null>
  createSnapshot: (input: CreateSnapshotInput) => Promise<Result<string>>
  deleteSnapshot: (id: string) => Promise<Result<void>>
  clearError: () => void
}

// Error message for unconfigured Supabase
const SUPABASE_NOT_CONFIGURED_ERROR = 'Supabase não está configurado.'

// Helper to check if Supabase is configured and return error result
function getSupabaseConfigError(): ErrorResult | null {
  if (!isSupabaseConfigured()) {
    return { success: false, error: SUPABASE_NOT_CONFIGURED_ERROR }
  }
  return null
}

export const useSnapshotsStore = create<SnapshotsStore>()((set) => ({
  // Initial state
  snapshots: [],
  currentSnapshot: null,
  isLoading: false,
  error: null,

  // Fetch all snapshots for current household (list view)
  fetchSnapshots: async () => {
    const configError = getSupabaseConfigError()
    if (configError) {
      set({ error: configError.error, isLoading: false })
      return
    }

    set({ isLoading: true, error: null })

    try {
      const { data, error } = await getSupabase()
        .from('projection_snapshots')
        .select('id, name, created_at, data')
        .order('created_at', { ascending: false })

      if (error) {
        const errorResult = handleSupabaseError(error)
        set({ error: errorResult.success ? null : errorResult.error, isLoading: false })
        return
      }

      // Transform to SnapshotListItem array
      const snapshots: SnapshotListItem[] = (data as SnapshotListRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        createdAt: new Date(row.created_at),
        summaryMetrics: row.data.summaryMetrics,
      }))

      set({ snapshots, isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar snapshots'
      set({ error: message, isLoading: false })
    }
  },

  // Fetch a single snapshot with full data (detail view)
  fetchSnapshot: async (id: string) => {
    const configError = getSupabaseConfigError()
    if (configError) {
      set({ error: configError.error, isLoading: false })
      return null
    }

    set({ isLoading: true, error: null })

    try {
      const { data, error } = await getSupabase()
        .from('projection_snapshots')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          set({ currentSnapshot: null, isLoading: false })
          return null
        }
        const errorResult = handleSupabaseError(error)
        set({ error: errorResult.success ? null : errorResult.error, isLoading: false })
        return null
      }

      const row = data as SnapshotRow

      // Transform to ProjectionSnapshot
      const snapshot: ProjectionSnapshot = {
        id: row.id,
        householdId: row.household_id,
        name: row.name,
        schemaVersion: row.schema_version,
        data: row.data,
        createdAt: new Date(row.created_at),
      }

      set({ currentSnapshot: snapshot, isLoading: false })
      return snapshot
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar snapshot'
      set({ error: message, isLoading: false })
      return null
    }
  },

  // Create a new snapshot from current projection state
  createSnapshot: async (input: CreateSnapshotInput) => {
    const configError = getSupabaseConfigError()
    if (configError) return configError

    try {
      // Get current user's household_id
      const householdId = await getHouseholdId()
      if (!householdId) {
        return { success: false, error: 'Não foi possível identificar sua residência' }
      }

      // Build snapshot data
      const snapshotData: SnapshotData = {
        inputs: input.inputs,
        projection: input.projection,
        summaryMetrics: {
          startingBalance: input.projection.startingBalance,
          endBalanceOptimistic: input.projection.optimistic.endBalance,
          dangerDayCount: input.projection.optimistic.dangerDayCount,
        },
      }

      const { data, error } = await getSupabase()
        .from('projection_snapshots')
        .insert({
          household_id: householdId,
          name: input.name,
          schema_version: CURRENT_SCHEMA_VERSION,
          data: snapshotData,
        })
        .select('id, name, created_at, data')
        .single()

      if (error) {
        return handleSupabaseError(error)
      }

      // Add to snapshots list (at the beginning since sorted by date desc)
      const newListItem: SnapshotListItem = {
        id: data.id,
        name: data.name,
        createdAt: new Date(data.created_at),
        summaryMetrics: (data.data as SnapshotData).summaryMetrics,
      }

      set((state) => ({
        snapshots: [newListItem, ...state.snapshots],
      }))

      return { success: true, data: data.id }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar snapshot'
      return { success: false, error: message }
    }
  },

  // Delete a snapshot
  deleteSnapshot: async (id: string) => {
    const configError = getSupabaseConfigError()
    if (configError) return configError

    try {
      const { error, count } = await getSupabase()
        .from('projection_snapshots')
        .delete({ count: 'exact' })
        .eq('id', id)

      if (error) {
        return handleSupabaseError(error)
      }

      if ((count ?? 0) === 0) {
        return { success: false, error: 'Snapshot não encontrado' }
      }

      // Remove from snapshots list
      set((state) => ({
        snapshots: state.snapshots.filter((s) => s.id !== id),
        // Clear currentSnapshot if it's the one being deleted
        currentSnapshot: state.currentSnapshot?.id === id ? null : state.currentSnapshot,
      }))

      return { success: true, data: undefined }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir snapshot'
      return { success: false, error: message }
    }
  },

  // Clear error state
  clearError: () => {
    set({ error: null })
  },
}))

