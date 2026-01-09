/**
 * Tests for FloatingHelpButton component.
 *
 * Covers:
 * - Renders only on routes with tours (/dashboard, /manage, /history)
 * - Pinned open via click, click "Iniciar tour guiado…" calls useTourStore.startTour(correctKey)
 * - Click outside closes menu
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
  })

  describe('route-based rendering', () => {
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

    it('does not render on /login', () => {
      renderWithRouter('/login')
      expect(screen.queryByTestId('floating-help-button')).not.toBeInTheDocument()
    })

    it('does not render on /auth-callback', () => {
      renderWithRouter('/auth-callback')
      expect(screen.queryByTestId('floating-help-button')).not.toBeInTheDocument()
    })

    it('does not render on unknown routes', () => {
      renderWithRouter('/unknown-route')
      expect(screen.queryByTestId('floating-help-button')).not.toBeInTheDocument()
    })
  })

  describe('interaction', () => {
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
  })
})

