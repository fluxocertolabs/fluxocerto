/**
 * Tests for tour state store.
 * Tests all store actions and state transitions.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useTourStore } from './tour-store'
import type { TourKey } from '@/types'

describe('useTourStore', () => {
  // Reset store state before each test
  beforeEach(() => {
    useTourStore.getState().reset()
  })

  // =============================================================================
  // INITIAL STATE TESTS
  // =============================================================================

  describe('initial state', () => {
    it('has activeTourKey set to null', () => {
      const state = useTourStore.getState()
      expect(state.activeTourKey).toBeNull()
    })

    it('has isManuallyTriggered set to false', () => {
      const state = useTourStore.getState()
      expect(state.isManuallyTriggered).toBe(false)
    })

    it('has all required methods', () => {
      const state = useTourStore.getState()
      expect(typeof state.startTour).toBe('function')
      expect(typeof state.stopTour).toBe('function')
      expect(typeof state.reset).toBe('function')
    })
  })

  // =============================================================================
  // startTour TESTS
  // =============================================================================

  describe('startTour', () => {
    const tourKeys: TourKey[] = ['dashboard', 'manage', 'history']

    tourKeys.forEach(key => {
      it(`sets activeTourKey to "${key}"`, () => {
        const { startTour } = useTourStore.getState()
        
        startTour(key)
        
        expect(useTourStore.getState().activeTourKey).toBe(key)
      })
    })

    it('sets isManuallyTriggered to true', () => {
      const { startTour } = useTourStore.getState()
      
      startTour('dashboard')
      
      expect(useTourStore.getState().isManuallyTriggered).toBe(true)
    })

    it('overwrites previous tour key', () => {
      const { startTour } = useTourStore.getState()
      
      startTour('dashboard')
      expect(useTourStore.getState().activeTourKey).toBe('dashboard')
      
      startTour('manage')
      expect(useTourStore.getState().activeTourKey).toBe('manage')
      
      startTour('history')
      expect(useTourStore.getState().activeTourKey).toBe('history')
    })

    it('is idempotent for same key', () => {
      const { startTour } = useTourStore.getState()
      
      startTour('dashboard')
      startTour('dashboard')
      startTour('dashboard')
      
      expect(useTourStore.getState().activeTourKey).toBe('dashboard')
      expect(useTourStore.getState().isManuallyTriggered).toBe(true)
    })
  })

  // =============================================================================
  // stopTour TESTS
  // =============================================================================

  describe('stopTour', () => {
    it('sets activeTourKey to null', () => {
      useTourStore.setState({ activeTourKey: 'dashboard', isManuallyTriggered: true })
      const { stopTour } = useTourStore.getState()
      
      stopTour()
      
      expect(useTourStore.getState().activeTourKey).toBeNull()
    })

    it('sets isManuallyTriggered to false', () => {
      useTourStore.setState({ activeTourKey: 'dashboard', isManuallyTriggered: true })
      const { stopTour } = useTourStore.getState()
      
      stopTour()
      
      expect(useTourStore.getState().isManuallyTriggered).toBe(false)
    })

    it('is idempotent (calling multiple times has same effect)', () => {
      useTourStore.setState({ activeTourKey: 'dashboard', isManuallyTriggered: true })
      const { stopTour } = useTourStore.getState()
      
      stopTour()
      stopTour()
      stopTour()
      
      expect(useTourStore.getState().activeTourKey).toBeNull()
      expect(useTourStore.getState().isManuallyTriggered).toBe(false)
    })

    it('works when no tour is active', () => {
      const { stopTour } = useTourStore.getState()
      
      stopTour()
      
      expect(useTourStore.getState().activeTourKey).toBeNull()
      expect(useTourStore.getState().isManuallyTriggered).toBe(false)
    })
  })

  // =============================================================================
  // reset TESTS
  // =============================================================================

  describe('reset', () => {
    it('resets activeTourKey to null', () => {
      useTourStore.setState({ activeTourKey: 'dashboard', isManuallyTriggered: true })
      const { reset } = useTourStore.getState()
      
      reset()
      
      expect(useTourStore.getState().activeTourKey).toBeNull()
    })

    it('resets isManuallyTriggered to false', () => {
      useTourStore.setState({ activeTourKey: 'dashboard', isManuallyTriggered: true })
      const { reset } = useTourStore.getState()
      
      reset()
      
      expect(useTourStore.getState().isManuallyTriggered).toBe(false)
    })

    it('returns store to initial state', () => {
      useTourStore.setState({ activeTourKey: 'manage', isManuallyTriggered: true })
      const { reset } = useTourStore.getState()
      
      reset()
      
      const state = useTourStore.getState()
      expect(state.activeTourKey).toBeNull()
      expect(state.isManuallyTriggered).toBe(false)
    })

    it('is idempotent', () => {
      useTourStore.setState({ activeTourKey: 'dashboard', isManuallyTriggered: true })
      const { reset } = useTourStore.getState()
      
      reset()
      reset()
      reset()
      
      const state = useTourStore.getState()
      expect(state.activeTourKey).toBeNull()
      expect(state.isManuallyTriggered).toBe(false)
    })
  })

  // =============================================================================
  // STATE TRANSITIONS TESTS
  // =============================================================================

  describe('state transitions', () => {
    it('start -> stop -> start cycle', () => {
      const state = useTourStore.getState()
      
      state.startTour('dashboard')
      expect(useTourStore.getState().activeTourKey).toBe('dashboard')
      expect(useTourStore.getState().isManuallyTriggered).toBe(true)
      
      state.stopTour()
      expect(useTourStore.getState().activeTourKey).toBeNull()
      expect(useTourStore.getState().isManuallyTriggered).toBe(false)
      
      state.startTour('manage')
      expect(useTourStore.getState().activeTourKey).toBe('manage')
      expect(useTourStore.getState().isManuallyTriggered).toBe(true)
    })

    it('switching between tours', () => {
      const state = useTourStore.getState()
      
      state.startTour('dashboard')
      expect(useTourStore.getState().activeTourKey).toBe('dashboard')
      
      state.startTour('manage')
      expect(useTourStore.getState().activeTourKey).toBe('manage')
      
      state.startTour('history')
      expect(useTourStore.getState().activeTourKey).toBe('history')
    })

    it('reset after starting tour', () => {
      const state = useTourStore.getState()
      
      state.startTour('dashboard')
      state.reset()
      
      expect(useTourStore.getState().activeTourKey).toBeNull()
      expect(useTourStore.getState().isManuallyTriggered).toBe(false)
    })
  })

  // =============================================================================
  // ZUSTAND STORE BEHAVIOR TESTS
  // =============================================================================

  describe('zustand store behavior', () => {
    it('getState returns current state', () => {
      const state1 = useTourStore.getState()
      expect(state1.activeTourKey).toBeNull()
      
      state1.startTour('dashboard')
      
      const state2 = useTourStore.getState()
      expect(state2.activeTourKey).toBe('dashboard')
    })

    it('setState updates state directly', () => {
      useTourStore.setState({ activeTourKey: 'dashboard', isManuallyTriggered: true })
      expect(useTourStore.getState().activeTourKey).toBe('dashboard')
      
      useTourStore.setState({ activeTourKey: null, isManuallyTriggered: false })
      expect(useTourStore.getState().activeTourKey).toBeNull()
    })

    it('subscribe notifies on state changes', () => {
      const changes: (TourKey | null)[] = []
      
      const unsubscribe = useTourStore.subscribe((state) => {
        changes.push(state.activeTourKey)
      })
      
      useTourStore.getState().startTour('dashboard')
      useTourStore.getState().stopTour()
      useTourStore.getState().startTour('manage')
      
      unsubscribe()
      
      expect(changes).toEqual(['dashboard', null, 'manage'])
    })

    it('partial setState preserves other state', () => {
      useTourStore.setState({ activeTourKey: 'dashboard', isManuallyTriggered: true })
      
      // Only update activeTourKey
      useTourStore.setState({ activeTourKey: 'manage' })
      
      const state = useTourStore.getState()
      expect(state.activeTourKey).toBe('manage')
      expect(state.isManuallyTriggered).toBe(true) // Should be preserved
    })
  })

  // =============================================================================
  // EDGE CASES TESTS
  // =============================================================================

  describe('edge cases', () => {
    it('handles rapid start/stop calls', () => {
      const state = useTourStore.getState()
      
      for (let i = 0; i < 100; i++) {
        state.startTour('dashboard')
        state.stopTour()
      }
      
      expect(useTourStore.getState().activeTourKey).toBeNull()
      expect(useTourStore.getState().isManuallyTriggered).toBe(false)
    })

    it('handles all tour keys in sequence', () => {
      const state = useTourStore.getState()
      const keys: TourKey[] = ['dashboard', 'manage', 'history']
      
      keys.forEach(key => {
        state.startTour(key)
        expect(useTourStore.getState().activeTourKey).toBe(key)
        expect(useTourStore.getState().isManuallyTriggered).toBe(true)
      })
    })
  })
})




