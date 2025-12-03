/**
 * User preferences store with localStorage persistence.
 * Stores user preferences like projection period.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProjectionDays } from '@/types'

interface PreferencesState {
  /** Current projection period in days. Default: 30 */
  projectionDays: ProjectionDays
  /** Update projection period. Persists to localStorage automatically. */
  setProjectionDays: (days: ProjectionDays) => void
  /** ISO string of last month progression check. Used to avoid re-running progression. */
  lastProgressionCheck: string | null
  /** Update last progression check timestamp. */
  setLastProgressionCheck: (timestamp: string) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      projectionDays: 30,
      setProjectionDays: (days) => set({ projectionDays: days }),
      lastProgressionCheck: null,
      setLastProgressionCheck: (timestamp) => set({ lastProgressionCheck: timestamp }),
    }),
    { name: 'family-finance-preferences' }
  )
)

