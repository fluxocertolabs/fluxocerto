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
const mockPreloadTawkWidget = vi.fn()
const mockPreloadTawkStyles = vi.fn()
let mockIsTawkConfigured = false
let mockVisibilityListener: ((visible: boolean) => void) | null = null
const mockSubscribeTawkVisibility = vi.fn((listener: (visible: boolean) => void) => {
  mockVisibilityListener = listener
  listener(false)
  return () => {
    if (mockVisibilityListener === listener) {
      mockVisibilityListener = null
    }
  }
})

vi.mock('@/lib/support-chat/tawk', () => ({
  isTawkConfigured: () => mockIsTawkConfigured,
  openSupportChat: (...args: unknown[]) => mockOpenSupportChat(...args),
  preloadTawkStyles: () => mockPreloadTawkStyles(),
  preloadTawkWidget: () => mockPreloadTawkWidget(),
  subscribeTawkVisibility: (listener: (visible: boolean) => void) => mockSubscribeTawkVisibility(listener),
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
    mockVisibilityListener = null
  })

  describe('route-based rendering', () => {
    // Button always renders because Canny feedback is always available
    it('renders on /dashboard (has tour + feedback)', () => {
      renderWithRouter('/dashboard')
      expect(screen.getByTestId('floating-help-button')).toBeInTheDocument()
    })

    it('renders on / (root/dashboard, has tour + feedback)', () => {
      renderWithRouter('/')
      expect(screen.getByTestId('floating-help-button')).toBeInTheDocument()
    })

    it('renders on /manage (has tour + feedback)', () => {
      renderWithRouter('/manage')
      expect(screen.getByTestId('floating-help-button')).toBeInTheDocument()
    })

    it('renders on /history (has tour + feedback)', () => {
      renderWithRouter('/history')
      expect(screen.getByTestId('floating-help-button')).toBeInTheDocument()
    })

    it('renders on /login (no tour, but has feedback)', () => {
      renderWithRouter('/login')
      expect(screen.getByTestId('floating-help-button')).toBeInTheDocument()
    })

    it('renders on /auth-callback (no tour, but has feedback)', () => {
      renderWithRouter('/auth-callback')
      expect(screen.getByTestId('floating-help-button')).toBeInTheDocument()
    })

    it('renders on unknown routes (no tour, but has feedback)', () => {
      renderWithRouter('/unknown-route')
      expect(screen.getByTestId('floating-help-button')).toBeInTheDocument()
    })
  })

  describe('menu options visibility', () => {
    it('always shows feedback option (Canny)', async () => {
      const user = userEvent.setup()
      renderWithRouter('/login') // No tour, no Tawk

      const fab = screen.getByRole('button', { name: /abrir ajuda/i })
      await user.click(fab)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sugerir melhorias/i })).toBeVisible()
      })
    })

    it('shows tour + feedback on tour route when Tawk is not configured', async () => {
      const user = userEvent.setup()
      renderWithRouter('/dashboard')

      const fab = screen.getByRole('button', { name: /abrir ajuda/i })
      await user.click(fab)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /iniciar tour guiado/i })).toBeVisible()
        expect(screen.getByRole('button', { name: /sugerir melhorias/i })).toBeVisible()
      })
      expect(screen.queryByRole('button', { name: /abrir chat de suporte/i })).not.toBeInTheDocument()
    })

    it('shows chat + feedback on non-tour route when Tawk is configured', async () => {
      mockIsTawkConfigured = true
      const user = userEvent.setup()
      renderWithRouter('/profile')

      const fab = screen.getByRole('button', { name: /abrir ajuda/i })
      await user.click(fab)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /abrir chat de suporte/i })).toBeVisible()
        expect(screen.getByRole('button', { name: /sugerir melhorias/i })).toBeVisible()
      })
      expect(screen.queryByRole('button', { name: /iniciar tour guiado/i })).not.toBeInTheDocument()
    })

    it('shows all three options on tour route when Tawk is configured', async () => {
      mockIsTawkConfigured = true
      const user = userEvent.setup()
      renderWithRouter('/dashboard')

      const fab = screen.getByRole('button', { name: /abrir ajuda/i })
      await user.click(fab)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /iniciar tour guiado/i })).toBeVisible()
        expect(screen.getByRole('button', { name: /abrir chat de suporte/i })).toBeVisible()
        expect(screen.getByRole('button', { name: /sugerir melhorias/i })).toBeVisible()
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

    it('hides the FAB when chat is visible', async () => {
      renderWithRouter('/dashboard')

      expect(screen.getByTestId('floating-help-button')).toBeInTheDocument()

      mockVisibilityListener?.(true)

      await waitFor(() => {
        expect(screen.queryByTestId('floating-help-button')).not.toBeInTheDocument()
      })
    })
  })

  describe('feedback interaction', () => {
    it('opens Canny portal in new tab when feedback button is clicked', async () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
      const user = userEvent.setup()
      renderWithRouter('/dashboard')

      // Open menu
      const fab = screen.getByRole('button', { name: /abrir ajuda/i })
      await user.click(fab)

      // Click feedback button
      const feedbackButton = screen.getByRole('button', { name: /sugerir melhorias/i })
      await user.click(feedbackButton)

      await waitFor(() => {
        expect(windowOpenSpy).toHaveBeenCalledWith(
          'https://fluxo-certo.canny.io',
          '_blank',
          'noopener,noreferrer'
        )
      })

      windowOpenSpy.mockRestore()
    })

    it('closes menu after clicking feedback button', async () => {
      vi.spyOn(window, 'open').mockImplementation(() => null)
      const user = userEvent.setup()
      renderWithRouter('/dashboard')

      // Open menu
      const fab = screen.getByRole('button', { name: /abrir ajuda/i })
      await user.click(fab)

      // Click feedback button
      const feedbackButton = screen.getByRole('button', { name: /sugerir melhorias/i })
      await user.click(feedbackButton)

      // Menu should close - check aria-expanded on FAB
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /abrir ajuda/i })).toHaveAttribute('aria-expanded', 'false')
      })
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

    it('feedback button has descriptive aria-label', async () => {
      const user = userEvent.setup()
      renderWithRouter('/dashboard')

      const fab = screen.getByRole('button', { name: /abrir ajuda/i })
      await user.click(fab)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sugerir melhorias/i })).toBeInTheDocument()
      })
    })
  })
})
