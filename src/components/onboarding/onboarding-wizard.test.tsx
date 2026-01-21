import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OnboardingWizard } from './onboarding-wizard'
import { notifyGroupDataInvalidated } from '@/lib/group-data-events'

const retryGroupMock = vi.fn()
const showErrorMock = vi.fn()

const mockOnboardingState = {
  isWizardActive: true,
  currentStep: 'group' as const,
  progress: 0,
  error: null as string | null,
  refetch: vi.fn(),
  nextStep: vi.fn(async () => {}),
  previousStep: vi.fn(async () => {}),
  complete: vi.fn(async () => {}),
  closeWizard: vi.fn(),
  accounts: [],
  isFinanceLoading: false,
}

const eqMock = vi.fn(async () => ({ error: null }))
const updateMock = vi.fn(() => ({ eq: eqMock }))
const fromMock = vi.fn(() => ({ update: updateMock }))

vi.mock('@/hooks/use-onboarding-state', () => ({
  useOnboardingState: () => mockOnboardingState,
}))

vi.mock('@/hooks/use-group', () => ({
  useGroup: () => ({
    group: { id: 'group-1', name: 'Old Group' },
    members: [],
    isLoading: false,
    error: null,
    isRecoverable: false,
    retry: retryGroupMock,
    recoverProvisioning: vi.fn(),
  }),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: null,
    showError: showErrorMock,
    hideToast: vi.fn(),
  }),
}))

vi.mock('@/stores/finance-store', () => ({
  useFinanceStore: () => ({}),
}))

vi.mock('@/lib/supabase', () => ({
  getSupabase: () => ({
    from: fromMock,
  }),
}))

vi.mock('@/lib/group-data-events', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/group-data-events')>()
  return {
    ...actual,
    notifyGroupDataInvalidated: vi.fn(),
  }
})

describe('OnboardingWizard - group rename', () => {
  beforeEach(() => {
    retryGroupMock.mockClear()
    showErrorMock.mockClear()
    eqMock.mockClear()
    updateMock.mockClear()
    fromMock.mockClear()
    vi.mocked(notifyGroupDataInvalidated).mockClear()
  })

  it('invalidates group data after successfully updating the group name', async () => {
    const user = userEvent.setup()
    render(<OnboardingWizard />)

    const input = screen.getByLabelText('Nome do Grupo')
    await user.clear(input)
    await user.type(input, 'New Name')

    await user.click(screen.getByRole('button', { name: /próximo/i }))

    await waitFor(() => {
      expect(eqMock).toHaveBeenCalledWith('id', 'group-1')
    })

    expect(retryGroupMock).toHaveBeenCalledTimes(1)
    expect(vi.mocked(notifyGroupDataInvalidated)).toHaveBeenCalledTimes(1)
    expect(showErrorMock).not.toHaveBeenCalled()
  })
})


