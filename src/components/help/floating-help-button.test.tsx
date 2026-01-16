/**
 * Tests for FloatingHelpButton component.
 *
 * Covers:
 * - Renders on tour routes (/dashboard, /manage, /history) with tour option
 * - Renders on non-tour routes when Tawk.to is configured (chat option only)
 * - Does not render when neither tour nor chat is available
 * - Pinned open via click, click "Iniciar tour guiado…" calls useTourStore.startTour(correctKey)
 * - Click outside closes menu
 * - Chat option calls openSupportChat and closes menu
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { FloatingHelpButton } from './floating-help-button'

// Mock tour store
const mockStartTour = vi.fn()

vi.mock('@/stores/tour-store', () => ({
  useTourStore: vi.fn(() => ({
    startTour: mockStartTour,
    activeTourKey: null,
    stopTour: vi.fn(),
  })),
}))

// Mock auth hook
const mockUser = { email: 'test@example.com', user_metadata: { name: 'Test User' } }

vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
  })),
}))

// Mock Tawk.to wrapper
const mockOpenSupportChat = vi.fn().mockResolvedValue(undefined)
const mockOnLoadingChange = vi.fn()
let mockIsTawkConfigured = false

vi.mock('@/lib/support-chat/tawk', () => ({
  isTawkConfigured: () => mockIsTawkConfigured,
  openSupportChat: (...args: unknown[]) => mockOpenSupportChat(...args),
  onLoadingChange: (callback: (loading: boolean) => void) => {
    mockOnLoadingChange(callback)
    // Immediately call with false (not loading)
    callback(false)
  },
}))

// Helper to render with router
function renderWithRouter(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <FloatingHelpButton />
    </MemoryRouter>
  )
}

describe('FloatingHelpButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsTawkConfigured = false
  })

  describe('route-based rendering (tours only, no Tawk)', () => {
    it('renders on /dashboard', () => {
      renderWithRouter('/dashboard')
      expect(screen.getByTestId('floating-help-button')).toBeInTheDocument()
    })

    it('renders on / (root/dashboard)', () => {
      renderWithRouter('/')
      expect(screen.getByTestId('floating-help-button')).toBeInTheDocument()
    })

    it('renders on /manage', () => {
      renderWithRouter('/manage')
      expect(screen.getByTestId('floating-help-button')).toBeInTheDocument()
    })

    it('renders on /history', () => {
      renderWithRouter('/history')
      expect(screen.getByTestId('floating-help-button')).toBeInTheDocument()
    })

    it('does not render on /login (no tour, no Tawk)', () => {
      renderWithRouter('/login')
      expect(screen.queryByTestId('floating-help-button')).not.toBeInTheDocument()
    })

    it('does not render on /auth-callback (no tour, no Tawk)', () => {
      renderWithRouter('/auth-callback')
      expect(screen.queryByTestId('floating-help-button')).not.toBeInTheDocument()
    })

    it('does not render on unknown routes (no tour, no Tawk)', () => {
      renderWithRouter('/unknown-route')
      expect(screen.queryByTestId('floating-help-button')).not.toBeInTheDocument()
    })
  })

  describe('route-based rendering (Tawk configured)', () => {
    beforeEach(() => {
      mockIsTawkConfigured = true
    })

    it('renders on /profile (no tour, but has chat)', () => {
      renderWithRouter('/profile')
      expect(screen.getByTestId('floating-help-button')).toBeInTheDocument()
    })

    it('renders on /notifications (no tour, but has chat)', () => {
      renderWithRouter('/notifications')
      expect(screen.getByTestId('floating-help-button')).toBeInTheDocument()
    })

    it('renders on /login when Tawk is configured', () => {
      renderWithRouter('/login')
      expect(screen.getByTestId('floating-help-button')).toBeInTheDocument()
    })
  })

  describe('menu options visibility', () => {
    it('shows only tour option on tour route when Tawk is not configured', async () => {
      const user = userEvent.setup()
      renderWithRouter('/dashboard')

      const fab = screen.getByRole('button', { name: /abrir ajuda/i })
      await user.click(fab)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /iniciar tour guiado/i })).toBeVisible()
      })
      expect(screen.queryByRole('button', { name: /abrir chat de suporte/i })).not.toBeInTheDocument()
    })

    it('shows only chat option on non-tour route when Tawk is configured', async () => {
      mockIsTawkConfigured = true
      const user = userEvent.setup()
      renderWithRouter('/profile')

      const fab = screen.getByRole('button', { name: /abrir ajuda/i })
      await user.click(fab)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /abrir chat de suporte/i })).toBeVisible()
      })
      expect(screen.queryByRole('button', { name: /iniciar tour guiado/i })).not.toBeInTheDocument()
    })

    it('shows both options on tour route when Tawk is configured', async () => {
      mockIsTawkConfigured = true
      const user = userEvent.setup()
      renderWithRouter('/dashboard')

      const fab = screen.getByRole('button', { name: /abrir ajuda/i })
      await user.click(fab)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /iniciar tour guiado/i })).toBeVisible()
        expect(screen.getByRole('button', { name: /abrir chat de suporte/i })).toBeVisible()
      })
    })
  })

  describe('tour interaction', () => {
    it('opens menu on click', async () => {
      const user = userEvent.setup()
      renderWithRouter('/dashboard')

      const fab = screen.getByRole('button', { name: /abrir ajuda/i })
      await user.click(fab)

      // Menu should be visible
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /iniciar tour guiado/i })).toBeVisible()
      })
    })

    it('calls startTour with correct key when "Conhecer a página" is clicked', async () => {
      const user = userEvent.setup()
      renderWithRouter('/dashboard')

      // Open menu
      const fab = screen.getByRole('button', { name: /abrir ajuda/i })
      await user.click(fab)

      // Click tour button
      const tourButton = screen.getByRole('button', { name: /iniciar tour guiado/i })
      await user.click(tourButton)

      expect(mockStartTour).toHaveBeenCalledWith('dashboard')
    })

    it('calls startTour with manage key on /manage', async () => {
      const user = userEvent.setup()
      renderWithRouter('/manage')

      // Open menu
      const fab = screen.getByRole('button', { name: /abrir ajuda/i })
      await user.click(fab)

      // Click tour button
      const tourButton = screen.getByRole('button', { name: /iniciar tour guiado/i })
      await user.click(tourButton)

      expect(mockStartTour).toHaveBeenCalledWith('manage')
    })

    it('calls startTour with history key on /history', async () => {
      const user = userEvent.setup()
      renderWithRouter('/history')

      // Open menu
      const fab = screen.getByRole('button', { name: /abrir ajuda/i })
      await user.click(fab)

      // Click tour button
      const tourButton = screen.getByRole('button', { name: /iniciar tour guiado/i })
      await user.click(tourButton)

      expect(mockStartTour).toHaveBeenCalledWith('history')
    })

    it('closes menu after starting tour', async () => {
      const user = userEvent.setup()
      renderWithRouter('/dashboard')

      // Open menu
      const fab = screen.getByRole('button', { name: /abrir ajuda/i })
      await user.click(fab)

      // Click tour button
      const tourButton = screen.getByRole('button', { name: /iniciar tour guiado/i })
      await user.click(tourButton)

      // Menu should close - check aria-expanded on FAB
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /abrir ajuda/i })).toHaveAttribute('aria-expanded', 'false')
      })
    })

    it('closes menu on click outside', async () => {
      const user = userEvent.setup()
      renderWithRouter('/dashboard')

      // Open menu
      const fab = screen.getByRole('button', { name: /abrir ajuda/i })
      await user.click(fab)

      // Wait for menu to be visible (FAB aria-expanded = true)
      await waitFor(() => {
        expect(fab).toHaveAttribute('aria-expanded', 'true')
      })

      // Click outside (on document body)
      fireEvent.mouseDown(document.body)

      // Menu should close - check aria-expanded on FAB
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /abrir ajuda/i })).toHaveAttribute('aria-expanded', 'false')
      })
    })
  })

  describe('chat interaction', () => {
    beforeEach(() => {
      mockIsTawkConfigured = true
    })

    it('calls openSupportChat with user info when chat button is clicked', async () => {
      const user = userEvent.setup()
      renderWithRouter('/dashboard')

      // Open menu
      const fab = screen.getByRole('button', { name: /abrir ajuda/i })
      await user.click(fab)

      // Click chat button
      const chatButton = screen.getByRole('button', { name: /abrir chat de suporte/i })
      await user.click(chatButton)

      await waitFor(() => {
        expect(mockOpenSupportChat).toHaveBeenCalledWith({
          email: 'test@example.com',
          name: 'Test User',
        })
      })
    })

    it('closes menu after clicking chat button', async () => {
      const user = userEvent.setup()
      renderWithRouter('/dashboard')

      // Open menu
      const fab = screen.getByRole('button', { name: /abrir ajuda/i })
      await user.click(fab)

      // Click chat button
      const chatButton = screen.getByRole('button', { name: /abrir chat de suporte/i })
      await user.click(chatButton)

      // Menu should close - check aria-expanded on FAB
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /abrir ajuda/i })).toHaveAttribute('aria-expanded', 'false')
      })
    })

    it('handles openSupportChat error gracefully', async () => {
      mockOpenSupportChat.mockRejectedValueOnce(new Error('Network error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const user = userEvent.setup()
      renderWithRouter('/dashboard')

      // Open menu
      const fab = screen.getByRole('button', { name: /abrir ajuda/i })
      await user.click(fab)

      // Click chat button
      const chatButton = screen.getByRole('button', { name: /abrir chat de suporte/i })
      await user.click(chatButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '[FloatingHelpButton] Failed to open support chat:',
          expect.any(Error)
        )
      })

      consoleSpy.mockRestore()
    })

  })

  describe('accessibility', () => {
    it('has correct aria-label on FAB', () => {
      renderWithRouter('/dashboard')
      expect(screen.getByRole('button', { name: /abrir ajuda/i })).toBeInTheDocument()
    })

    it('has aria-expanded attribute', async () => {
      const user = userEvent.setup()
      renderWithRouter('/dashboard')

      const fab = screen.getByRole('button', { name: /abrir ajuda/i })
      expect(fab).toHaveAttribute('aria-expanded', 'false')

      await user.click(fab)

      await waitFor(() => {
        expect(fab).toHaveAttribute('aria-expanded', 'true')
      })
    })

    it('tour button has descriptive aria-label', async () => {
      const user = userEvent.setup()
      renderWithRouter('/dashboard')

      const fab = screen.getByRole('button', { name: /abrir ajuda/i })
      await user.click(fab)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /iniciar tour guiado/i })).toBeInTheDocument()
      })
    })

    it('chat button has descriptive aria-label', async () => {
      mockIsTawkConfigured = true
      const user = userEvent.setup()
      renderWithRouter('/dashboard')

      const fab = screen.getByRole('button', { name: /abrir ajuda/i })
      await user.click(fab)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /abrir chat de suporte/i })).toBeInTheDocument()
      })
    })
  })
})
