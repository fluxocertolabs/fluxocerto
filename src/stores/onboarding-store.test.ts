/**
 * Tests for onboarding wizard state store.
 * Tests all store actions and state transitions.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useOnboardingStore } from './onboarding-store'

describe('useOnboardingStore', () => {
  // Reset store state before each test
  beforeEach(() => {
    useOnboardingStore.setState({ isWizardOpen: false })
  })

  // =============================================================================
  // INITIAL STATE TESTS
  // =============================================================================

  describe('initial state', () => {
    it('has isWizardOpen set to false', () => {
      const state = useOnboardingStore.getState()
      expect(state.isWizardOpen).toBe(false)
    })

    it('has all required methods', () => {
      const state = useOnboardingStore.getState()
      expect(typeof state.openWizard).toBe('function')
      expect(typeof state.closeWizard).toBe('function')
      expect(typeof state.toggleWizard).toBe('function')
    })
  })

  // =============================================================================
  // openWizard TESTS
  // =============================================================================

  describe('openWizard', () => {
    it('sets isWizardOpen to true', () => {
      const { openWizard } = useOnboardingStore.getState()
      
      openWizard()
      
      expect(useOnboardingStore.getState().isWizardOpen).toBe(true)
    })

    it('is idempotent (calling multiple times has same effect)', () => {
      const { openWizard } = useOnboardingStore.getState()
      
      openWizard()
      openWizard()
      openWizard()
      
      expect(useOnboardingStore.getState().isWizardOpen).toBe(true)
    })

    it('works when wizard is already open', () => {
      useOnboardingStore.setState({ isWizardOpen: true })
      const { openWizard } = useOnboardingStore.getState()
      
      openWizard()
      
      expect(useOnboardingStore.getState().isWizardOpen).toBe(true)
    })
  })

  // =============================================================================
  // closeWizard TESTS
  // =============================================================================

  describe('closeWizard', () => {
    it('sets isWizardOpen to false', () => {
      useOnboardingStore.setState({ isWizardOpen: true })
      const { closeWizard } = useOnboardingStore.getState()
      
      closeWizard()
      
      expect(useOnboardingStore.getState().isWizardOpen).toBe(false)
    })

    it('is idempotent (calling multiple times has same effect)', () => {
      useOnboardingStore.setState({ isWizardOpen: true })
      const { closeWizard } = useOnboardingStore.getState()
      
      closeWizard()
      closeWizard()
      closeWizard()
      
      expect(useOnboardingStore.getState().isWizardOpen).toBe(false)
    })

    it('works when wizard is already closed', () => {
      const { closeWizard } = useOnboardingStore.getState()
      
      closeWizard()
      
      expect(useOnboardingStore.getState().isWizardOpen).toBe(false)
    })
  })

  // =============================================================================
  // toggleWizard TESTS
  // =============================================================================

  describe('toggleWizard', () => {
    it('opens wizard when closed', () => {
      const { toggleWizard } = useOnboardingStore.getState()
      
      toggleWizard()
      
      expect(useOnboardingStore.getState().isWizardOpen).toBe(true)
    })

    it('closes wizard when open', () => {
      useOnboardingStore.setState({ isWizardOpen: true })
      const { toggleWizard } = useOnboardingStore.getState()
      
      toggleWizard()
      
      expect(useOnboardingStore.getState().isWizardOpen).toBe(false)
    })

    it('toggles correctly multiple times', () => {
      const { toggleWizard } = useOnboardingStore.getState()
      
      // Start: false
      expect(useOnboardingStore.getState().isWizardOpen).toBe(false)
      
      toggleWizard() // -> true
      expect(useOnboardingStore.getState().isWizardOpen).toBe(true)
      
      toggleWizard() // -> false
      expect(useOnboardingStore.getState().isWizardOpen).toBe(false)
      
      toggleWizard() // -> true
      expect(useOnboardingStore.getState().isWizardOpen).toBe(true)
      
      toggleWizard() // -> false
      expect(useOnboardingStore.getState().isWizardOpen).toBe(false)
    })
  })

  // =============================================================================
  // STATE TRANSITIONS TESTS
  // =============================================================================

  describe('state transitions', () => {
    it('open -> close -> open cycle', () => {
      const state = useOnboardingStore.getState()
      
      state.openWizard()
      expect(useOnboardingStore.getState().isWizardOpen).toBe(true)
      
      state.closeWizard()
      expect(useOnboardingStore.getState().isWizardOpen).toBe(false)
      
      state.openWizard()
      expect(useOnboardingStore.getState().isWizardOpen).toBe(true)
    })

    it('mixed operations maintain correct state', () => {
      const state = useOnboardingStore.getState()
      
      state.openWizard()
      state.toggleWizard()
      expect(useOnboardingStore.getState().isWizardOpen).toBe(false)
      
      state.toggleWizard()
      state.closeWizard()
      expect(useOnboardingStore.getState().isWizardOpen).toBe(false)
      
      state.toggleWizard()
      state.openWizard()
      expect(useOnboardingStore.getState().isWizardOpen).toBe(true)
    })
  })

  // =============================================================================
  // ZUSTAND STORE BEHAVIOR TESTS
  // =============================================================================

  describe('zustand store behavior', () => {
    it('getState returns current state', () => {
      const state1 = useOnboardingStore.getState()
      expect(state1.isWizardOpen).toBe(false)
      
      state1.openWizard()
      
      const state2 = useOnboardingStore.getState()
      expect(state2.isWizardOpen).toBe(true)
    })

    it('setState updates state directly', () => {
      useOnboardingStore.setState({ isWizardOpen: true })
      expect(useOnboardingStore.getState().isWizardOpen).toBe(true)
      
      useOnboardingStore.setState({ isWizardOpen: false })
      expect(useOnboardingStore.getState().isWizardOpen).toBe(false)
    })

    it('subscribe notifies on state changes', () => {
      const changes: boolean[] = []
      
      const unsubscribe = useOnboardingStore.subscribe((state) => {
        changes.push(state.isWizardOpen)
      })
      
      useOnboardingStore.getState().openWizard()
      useOnboardingStore.getState().closeWizard()
      useOnboardingStore.getState().toggleWizard()
      
      unsubscribe()
      
      expect(changes).toEqual([true, false, true])
    })
  })
})


