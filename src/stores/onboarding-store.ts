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
  /** Open the wizard */
  openWizard: () => void
  /** Close the wizard */
  closeWizard: () => void
  /** Toggle the wizard */
  toggleWizard: () => void
}

export const useOnboardingStore = create<OnboardingStoreState>()((set) => ({
  isWizardOpen: false,
  openWizard: () => set({ isWizardOpen: true }),
  closeWizard: () => set({ isWizardOpen: false }),
  toggleWizard: () => set((state) => ({ isWizardOpen: !state.isWizardOpen })),
}))


