/**
 * Zustand store for managing tour state.
 * 
 * This store provides a global way to trigger tours from anywhere in the app,
 * particularly from the header's "Mostrar tour" button.
 */

import { create } from 'zustand'
import type { TourKey } from '@/types'

interface TourStoreState {
  /** The currently active tour key, or null if no tour is active */
  activeTourKey: TourKey | null
  /** Whether a tour was manually triggered (vs auto-started) */
  isManuallyTriggered: boolean
  /** Start a specific tour */
  startTour: (key: TourKey) => void
  /** Stop the current tour */
  stopTour: () => void
  /** Reset the store state */
  reset: () => void
}

const initialState = {
  activeTourKey: null as TourKey | null,
  isManuallyTriggered: false,
}

export const useTourStore = create<TourStoreState>((set) => ({
  ...initialState,
  
  startTour: (key) => set({ 
    activeTourKey: key, 
    isManuallyTriggered: true 
  }),
  
  stopTour: () => set({ 
    activeTourKey: null, 
    isManuallyTriggered: false 
  }),
  
  reset: () => set(initialState),
}))






