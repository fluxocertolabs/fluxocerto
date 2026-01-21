/**
 * Onboarding wizard state store.
 * 
 * Provides global access to wizard open/close state.
 * The actual onboarding logic is handled by useOnboardingState hook.
 */

import { create } from 'zustand'

interface OnboardingStoreState {
  /** Whether the wizard dialog is open */
  isWizardOpen: boolean
  /** Last known open reason */
  openReason: 'manual' | 'auto' | null
  /** Open the wizard */
  openWizard: (reason?: 'manual' | 'auto') => void
  /** Close the wizard */
  closeWizard: () => void
  /** Toggle the wizard */
  toggleWizard: () => void
}

export const useOnboardingStore = create<OnboardingStoreState>()((set) => ({
  isWizardOpen: false,
  openReason: null,
  openWizard: (reason = 'manual') => set({ isWizardOpen: true, openReason: reason }),
  closeWizard: () => set({ isWizardOpen: false, openReason: null }),
  toggleWizard: () => set((state) => ({
    isWizardOpen: !state.isWizardOpen,
    openReason: state.isWizardOpen ? null : 'manual',
  })),
}))






