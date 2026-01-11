/**
 * Tests for AuthCallbackPage component.
 *
 * Covers:
 * - auth_error UI when URL has error params
 * - provisioning_error UI when ensureCurrentUserGroup fails
 * - retry button calls ensureCurrentUserGroup and navigates on success
 * - help dialog shows troubleshooting text
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthCallbackPage } from './auth-callback'

// Mock navigate
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock Supabase
const mockGetSession = vi.fn()
const mockEnsureCurrentUserGroup = vi.fn()
const mockSignOut = vi.fn()
const mockIsSupabaseConfigured = vi.fn()
const mockGetSupabase = vi.fn()

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => mockIsSupabaseConfigured(),
  getSupabase: () => mockGetSupabase(),
  ensureCurrentUserGroup: () => mockEnsureCurrentUserGroup(),
  signOut: () => mockSignOut(),
}))

// Mock auth-errors
vi.mock('@/lib/auth-errors', () => ({
  getAuthErrorMessage: (error: Error) => error.message || 'Auth error',
  isExpiredLinkError: (error: Error) => error.message?.includes('expired') ?? false,
}))

// Helper to render with router
function renderWithRouter(initialEntries: string[] = ['/auth-callback']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/auth-callback" element={<AuthCallbackPage />} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsSupabaseConfigured.mockReturnValue(true)
    mockGetSupabase.mockReturnValue({
      auth: {
        getSession: mockGetSession,
      },
    })
    mockSignOut.mockResolvedValue({ error: null })
  })

  describe('loading state', () => {
    it('shows loading UI initially', () => {
      mockGetSession.mockReturnValue(new Promise(() => {})) // Never resolves
      
      renderWithRouter()

      expect(screen.getByText(/completando login/i)).toBeInTheDocument()
    })
  })

  describe('auth_error UI', () => {
    it('shows error when URL has error params', async () => {
      renderWithRouter(['/auth-callback?error=access_denied&error_description=Link%20expired'])

      await waitFor(() => {
        expect(screen.getByText(/link inválido ou expirado/i)).toBeInTheDocument()
      })

      expect(screen.getByText('Link expired')).toBeInTheDocument()
    })

    it('shows generic auth error for non-expired errors', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid token' },
      })

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByText(/erro ao entrar/i)).toBeInTheDocument()
      })
    })

    it('shows "Solicitar Novo Link" button on auth error', async () => {
      renderWithRouter(['/auth-callback?error=access_denied&error_description=expired'])

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /solicitar novo link/i })).toBeInTheDocument()
      })
    })

    it('navigates to /login when "Solicitar Novo Link" is clicked', async () => {
      const user = userEvent.setup()
      renderWithRouter(['/auth-callback?error=access_denied&error_description=expired'])

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /solicitar novo link/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /solicitar novo link/i }))

      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
    })
  })

  describe('provisioning_error UI', () => {
    it('shows provisioning error when ensureCurrentUserGroup fails', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-id' } } },
        error: null,
      })
      mockEnsureCurrentUserGroup.mockResolvedValue({
        success: false,
        error: 'Provisioning failed',
      })

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByText(/erro ao configurar conta/i)).toBeInTheDocument()
      })

      expect(screen.getByText('Provisioning failed')).toBeInTheDocument()
    })

    it('shows "Tentar Novamente" button on provisioning error', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-id' } } },
        error: null,
      })
      mockEnsureCurrentUserGroup.mockResolvedValue({
        success: false,
        error: 'Provisioning failed',
      })

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument()
      })
    })

    it('shows "Sair" button on provisioning error', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-id' } } },
        error: null,
      })
      mockEnsureCurrentUserGroup.mockResolvedValue({
        success: false,
        error: 'Provisioning failed',
      })

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^sair$/i })).toBeInTheDocument()
      })
    })

    it('shows "Ajuda" button on provisioning error', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-id' } } },
        error: null,
      })
      mockEnsureCurrentUserGroup.mockResolvedValue({
        success: false,
        error: 'Provisioning failed',
      })

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /ajuda/i })).toBeInTheDocument()
      })
    })
  })

  describe('retry functionality', () => {
    it('calls ensureCurrentUserGroup when retry is clicked', async () => {
      const user = userEvent.setup()
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-id' } } },
        error: null,
      })
      mockEnsureCurrentUserGroup
        .mockResolvedValueOnce({ success: false, error: 'Failed' })
        .mockResolvedValueOnce({ success: true, data: { groupId: 'group-id', created: false } })

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /tentar novamente/i }))

      await waitFor(() => {
        expect(mockEnsureCurrentUserGroup).toHaveBeenCalledTimes(2)
      })
    })

    it('navigates to dashboard on successful retry', async () => {
      const user = userEvent.setup()
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-id' } } },
        error: null,
      })
      mockEnsureCurrentUserGroup
        .mockResolvedValueOnce({ success: false, error: 'Failed' })
        .mockResolvedValueOnce({ success: true, data: { groupId: 'group-id', created: false } })

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /tentar novamente/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
      })
    })

    it('shows loading state during retry', async () => {
      const user = userEvent.setup()
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-id' } } },
        error: null,
      })
      
      let resolveRetry: ((value: unknown) => void) | undefined
      mockEnsureCurrentUserGroup
        .mockResolvedValueOnce({ success: false, error: 'Failed' })
        .mockImplementationOnce(() => new Promise((resolve) => { resolveRetry = resolve }))

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /tentar novamente/i }))

      // During retry, the state changes to 'provisioning' which shows the loading spinner
      await waitFor(() => {
        expect(screen.getByText(/configurando sua conta/i)).toBeInTheDocument()
      })

      // Resolve the retry
      resolveRetry?.({ success: true, data: { groupId: 'group-id', created: false } })

      // Ensure async state updates are flushed (prevents act warnings)
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
      })
    })
  })

  describe('sign out functionality', () => {
    it('calls signOut and navigates to login when Sair is clicked', async () => {
      const user = userEvent.setup()
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-id' } } },
        error: null,
      })
      mockEnsureCurrentUserGroup.mockResolvedValue({
        success: false,
        error: 'Provisioning failed',
      })

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^sair$/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /^sair$/i }))

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled()
      })

      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
    })
  })

  describe('help dialog', () => {
    it('opens help dialog when Ajuda is clicked', async () => {
      const user = userEvent.setup()
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-id' } } },
        error: null,
      })
      mockEnsureCurrentUserGroup.mockResolvedValue({
        success: false,
        error: 'Provisioning failed',
      })

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /ajuda/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /ajuda/i }))

      await waitFor(() => {
        expect(screen.getByText(/precisa de ajuda/i)).toBeInTheDocument()
      })
    })

    it('shows troubleshooting steps in help dialog', async () => {
      const user = userEvent.setup()
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-id' } } },
        error: null,
      })
      mockEnsureCurrentUserGroup.mockResolvedValue({
        success: false,
        error: 'Provisioning failed',
      })

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /ajuda/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /ajuda/i }))

      await waitFor(() => {
        expect(screen.getByText(/verifique sua conexão com a internet/i)).toBeInTheDocument()
        expect(screen.getByText(/clique em "tentar novamente"/i)).toBeInTheDocument()
        expect(screen.getByText(/saia e solicite um novo link/i)).toBeInTheDocument()
      })
    })

    it('shows "Copiar Detalhes" button in help dialog', async () => {
      const user = userEvent.setup()
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-id' } } },
        error: null,
      })
      mockEnsureCurrentUserGroup.mockResolvedValue({
        success: false,
        error: 'Provisioning failed',
      })

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /ajuda/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /ajuda/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /copiar detalhes/i })).toBeInTheDocument()
      })
    })

    it('copies diagnostic payload when "Copiar Detalhes" is clicked', async () => {
      const user = userEvent.setup()
      const mockWriteText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true,
      })

      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-id' } } },
        error: null,
      })
      mockEnsureCurrentUserGroup.mockResolvedValue({
        success: false,
        error: 'Provisioning failed',
      })

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /ajuda/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /ajuda/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /copiar detalhes/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /copiar detalhes/i }))

      expect(mockWriteText).toHaveBeenCalledWith(
        expect.stringContaining('Provisioning failed')
      )

      // Should show "Copiado!" feedback
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /copiado/i })).toBeInTheDocument()
      })
    })
  })

  describe('successful authentication', () => {
    it('navigates to dashboard on successful auth and provisioning', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-id' } } },
        error: null,
      })
      mockEnsureCurrentUserGroup.mockResolvedValue({
        success: true,
        data: { groupId: 'group-id', created: false },
      })

      renderWithRouter()

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
      })
    })

    it('shows provisioning state before redirect', async () => {
      let resolveProvisioning: ((value: unknown) => void) | undefined
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-id' } } },
        error: null,
      })
      mockEnsureCurrentUserGroup.mockImplementation(
        () => new Promise((resolve) => { resolveProvisioning = resolve })
      )

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByText(/configurando sua conta/i)).toBeInTheDocument()
      })

      // Resolve provisioning
      resolveProvisioning?.({ success: true, data: { groupId: 'group-id', created: false } })

      // Flush navigation side-effect to avoid act warnings
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
      })
    })
  })

  describe('Supabase not configured', () => {
    it('shows error when Supabase is not configured', async () => {
      mockIsSupabaseConfigured.mockReturnValue(false)

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByText(/aplicação não está configurada/i)).toBeInTheDocument()
      })
    })
  })

  describe('no session', () => {
    it('shows expired link error when no session and no error', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByText(/não foi possível completar o login/i)).toBeInTheDocument()
      })
    })
  })
})

