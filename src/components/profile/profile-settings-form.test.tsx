/**
 * Tests for ProfileSettingsForm component.
 * Tests pt-BR labels, disabled email field, validation, and save UX.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileSettingsForm } from './profile-settings-form'
import type { ProfileData } from '@/hooks/use-profile'

// Default profile data
const createMockProfile = (overrides: Partial<ProfileData> = {}): ProfileData => ({
  name: 'Test User',
  email: 'test@example.com',
  emailNotificationsEnabled: true,
  analyticsEnabled: true,
  sessionRecordingsEnabled: true,
  ...overrides,
})

// Default mock handlers
const mockOnUpdateName = vi.fn()
const mockOnUpdateEmailNotifications = vi.fn()
const mockOnUpdateAnalytics = vi.fn()
const mockOnUpdateSessionRecordings = vi.fn()

const renderForm = (
  profile: ProfileData = createMockProfile(),
  onUpdateName = mockOnUpdateName,
  onUpdateEmailNotifications = mockOnUpdateEmailNotifications,
  onUpdateAnalytics = mockOnUpdateAnalytics,
  onUpdateSessionRecordings = mockOnUpdateSessionRecordings
) => {
  return render(
    <ProfileSettingsForm
      profile={profile}
      onUpdateName={onUpdateName}
      onUpdateEmailNotifications={onUpdateEmailNotifications}
      onUpdateAnalytics={onUpdateAnalytics}
      onUpdateSessionRecordings={onUpdateSessionRecordings}
    />
  )
}

describe('ProfileSettingsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOnUpdateName.mockResolvedValue({ success: true })
    mockOnUpdateEmailNotifications.mockResolvedValue({ success: true })
    mockOnUpdateAnalytics.mockResolvedValue({ success: true })
    mockOnUpdateSessionRecordings.mockResolvedValue({ success: true })
  })

  // =============================================================================
  // PT-BR LABELS TESTS
  // =============================================================================

  describe('pt-BR labels', () => {
    it('displays "Nome de exibição" heading', () => {
      renderForm()
      expect(screen.getByText('Nome de exibição')).toBeInTheDocument()
    })

    it('displays Email section', () => {
      renderForm()
      // Email section exists with email input
      const emailInput = screen.getByLabelText(/^email$/i)
      expect(emailInput).toBeInTheDocument()
    })

    it('displays "Notificações por email" heading', () => {
      renderForm()
      expect(screen.getByText('Notificações por email')).toBeInTheDocument()
    })

    it('displays analytics section heading', () => {
      renderForm()
      expect(screen.getByText('Analytics de uso')).toBeInTheDocument()
    })

    it('displays session recordings section heading', () => {
      renderForm()
      expect(screen.getByText('Gravações de sessão')).toBeInTheDocument()
    })

    it('displays "Salvar nome" button text', () => {
      renderForm()
      expect(screen.getByRole('button', { name: /salvar nome/i })).toBeInTheDocument()
    })
  })

  // =============================================================================
  // EMAIL FIELD TESTS
  // =============================================================================

  describe('email field', () => {
    it('displays email value', () => {
      renderForm(createMockProfile({ email: 'custom@example.com' }))
      const emailInput = screen.getByLabelText(/^email$/i)
      expect(emailInput).toHaveValue('custom@example.com')
    })

    it('email field is disabled (read-only)', () => {
      renderForm()
      const emailInput = screen.getByLabelText(/^email$/i)
      expect(emailInput).toBeDisabled()
    })

    it('displays hint explaining email cannot be changed', () => {
      renderForm()
      // The hint appears in the email section
      expect(screen.getByText(/usado para autenticação/i)).toBeInTheDocument()
    })
  })

  // =============================================================================
  // DISPLAY NAME TESTS
  // =============================================================================

  describe('display name', () => {
    it('displays current display name', () => {
      renderForm(createMockProfile({ name: 'Current Name' }))
      const nameInput = screen.getByLabelText(/^nome$/i)
      expect(nameInput).toHaveValue('Current Name')
    })

    it('allows editing display name', async () => {
      const user = userEvent.setup()
      renderForm()

      const nameInput = screen.getByLabelText(/^nome$/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'New Name')

      expect(nameInput).toHaveValue('New Name')
    })

    it('calls onUpdateName on form submit', async () => {
      const user = userEvent.setup()
      renderForm()

      const nameInput = screen.getByLabelText(/^nome$/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'Updated Name')

      const saveButton = screen.getByRole('button', { name: /salvar nome/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnUpdateName).toHaveBeenCalledWith('Updated Name')
      })
    })
  })

  // =============================================================================
  // VALIDATION TESTS
  // =============================================================================

  describe('validation', () => {
    it('shows error for empty display name', async () => {
      const user = userEvent.setup()
      renderForm()

      const nameInput = screen.getByLabelText(/^nome$/i)
      await user.clear(nameInput)

      const saveButton = screen.getByRole('button', { name: /salvar nome/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/nome.*obrigatório/i)).toBeInTheDocument()
      })
    })

    it('shows error for display name with only whitespace', async () => {
      const user = userEvent.setup()
      renderForm()

      const nameInput = screen.getByLabelText(/^nome$/i)
      await user.clear(nameInput)
      await user.type(nameInput, '   ')

      const saveButton = screen.getByRole('button', { name: /salvar nome/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/nome.*obrigatório/i)).toBeInTheDocument()
      })
    })

    it('clears validation error when user types valid name', async () => {
      const user = userEvent.setup()
      renderForm()

      const nameInput = screen.getByLabelText(/^nome$/i)
      await user.clear(nameInput)

      const saveButton = screen.getByRole('button', { name: /salvar nome/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/nome.*obrigatório/i)).toBeInTheDocument()
      })

      await user.type(nameInput, 'Valid Name')

      await waitFor(() => {
        expect(screen.queryByText(/nome.*obrigatório/i)).not.toBeInTheDocument()
      })
    })
  })

  // =============================================================================
  // EMAIL NOTIFICATIONS TOGGLE TESTS
  // =============================================================================

  describe('email notifications toggle', () => {
    it('displays toggle in checked state when enabled', () => {
      renderForm(createMockProfile({ emailNotificationsEnabled: true }))

      const toggle = screen.getByLabelText('Ativar notificações por email')
      expect(toggle).toHaveAttribute('data-state', 'checked')
    })

    it('displays toggle in unchecked state when disabled', () => {
      renderForm(createMockProfile({ emailNotificationsEnabled: false }))

      const toggle = screen.getByLabelText('Ativar notificações por email')
      expect(toggle).toHaveAttribute('data-state', 'unchecked')
    })

    it('calls onUpdateEmailNotifications when toggle is clicked', async () => {
      const user = userEvent.setup()
      renderForm(createMockProfile({ emailNotificationsEnabled: true }))

      const toggle = screen.getByLabelText('Ativar notificações por email')
      await user.click(toggle)

      await waitFor(() => {
        expect(mockOnUpdateEmailNotifications).toHaveBeenCalledWith(false)
      })
    })
  })

  // =============================================================================
  // ANALYTICS TOGGLES
  // =============================================================================

  describe('analytics toggles', () => {
    it('toggles analytics preference', async () => {
      const user = userEvent.setup()
      renderForm(createMockProfile({ analyticsEnabled: true }))

      const toggle = screen.getByLabelText('Ativar analytics de uso')
      await user.click(toggle)

      await waitFor(() => {
        expect(mockOnUpdateAnalytics).toHaveBeenCalledWith(false)
      })
    })

    it('toggles session recordings preference', async () => {
      const user = userEvent.setup()
      renderForm(createMockProfile({ sessionRecordingsEnabled: true }))

      const toggle = screen.getByLabelText('Ativar gravações de sessão')
      await user.click(toggle)

      await waitFor(() => {
        expect(mockOnUpdateSessionRecordings).toHaveBeenCalledWith(false)
      })
    })
  })

  // =============================================================================
  // SAVE UX TESTS
  // =============================================================================

  describe('save UX', () => {
    it('shows success indicator on successful save', async () => {
      const user = userEvent.setup()
      mockOnUpdateName.mockResolvedValue({ success: true })
      renderForm()

      const nameInput = screen.getByLabelText(/^nome$/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'New Name')

      const saveButton = screen.getByRole('button', { name: /salvar nome/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/salvo/i)).toBeInTheDocument()
      })
    })

    it('shows error message on failed save', async () => {
      const user = userEvent.setup()
      mockOnUpdateName.mockResolvedValue({ success: false, error: 'Falha ao salvar' })
      renderForm()

      const nameInput = screen.getByLabelText(/^nome$/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'New Name')

      const saveButton = screen.getByRole('button', { name: /salvar nome/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/falha ao salvar/i)).toBeInTheDocument()
      })
    })
  })

  // =============================================================================
  // TOGGLE REVERT ON FAILURE
  // =============================================================================

  describe('toggle revert on failure', () => {
    it('reverts toggle state when update fails', async () => {
      const user = userEvent.setup()
      mockOnUpdateEmailNotifications.mockResolvedValue({ success: false, error: 'Failed' })
      renderForm(createMockProfile({ emailNotificationsEnabled: true }))

      const toggle = screen.getByLabelText('Ativar notificações por email')
      expect(toggle).toHaveAttribute('data-state', 'checked')

      await user.click(toggle)

      // Should revert to original state after failure
      await waitFor(() => {
        expect(toggle).toHaveAttribute('data-state', 'checked')
      })
    })
  })
})
