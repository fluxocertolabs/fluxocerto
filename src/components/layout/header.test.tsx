import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Header } from './header'
import { signOut } from '@/lib/supabase'

const mockAuth = {
  isAuthenticated: true,
  user: { email: 'test@example.com' },
}

const mockGroup = {
  group: { id: 'group-1', name: 'Dev Household' },
  isLoading: false,
}

const mockOnboarding = {
  isMinimumSetupComplete: true,
  openWizard: vi.fn(),
  isLoading: false,
}

const mockTourStore = {
  activeTourKey: null,
  isManuallyTriggered: false,
  startTour: vi.fn(),
  stopTour: vi.fn(),
  reset: vi.fn(),
}

const mockNotificationsStore = {
  items: [],
  unreadCount: 0,
  isLoading: false,
  isInitialized: false,
  error: null,
  initialize: vi.fn(),
  refresh: vi.fn(),
  markAsRead: vi.fn(),
  reset: vi.fn(),
}

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockAuth,
}))

vi.mock('@/hooks/use-group', () => ({
  useGroup: () => mockGroup,
}))

vi.mock('@/hooks/use-onboarding-state', () => ({
  useOnboardingState: () => mockOnboarding,
}))

vi.mock('@/stores/tour-store', () => ({
  useTourStore: () => mockTourStore,
}))

vi.mock('@/stores/notifications-store', () => ({
  useNotificationsStore: (selector?: (state: typeof mockNotificationsStore) => unknown) => {
    if (selector) {
      return selector(mockNotificationsStore)
    }
    return mockNotificationsStore
  },
}))

vi.mock('@/lib/supabase', () => ({
  signOut: vi.fn(async () => ({ error: null })),
  isSupabaseConfigured: vi.fn(() => true),
}))

vi.mock('@/components/theme', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}))

function renderHeader() {
  return render(<Header />, {
    wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
  })
}

describe('Header - Mobile Navigation', () => {
  it('opens the mobile menu with navigation links', async () => {
    const user = userEvent.setup()
    renderHeader()

    await user.click(screen.getByRole('button', { name: /abrir menu/i }))

    expect(screen.getByRole('dialog', { name: /menu/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Painel' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Histórico' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Gerenciar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Perfil' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })

  it('closes the mobile menu when a navigation link is clicked', async () => {
    const user = userEvent.setup()
    renderHeader()

    await user.click(screen.getByRole('button', { name: /abrir menu/i }))
    expect(screen.getByRole('dialog', { name: /menu/i })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Histórico' }))
    expect(screen.queryByRole('dialog', { name: /menu/i })).not.toBeInTheDocument()
  })

  it('calls signOut when clicking Sair in the mobile menu', async () => {
    const user = userEvent.setup()
    renderHeader()

    await user.click(screen.getByRole('button', { name: /abrir menu/i }))
    await user.click(screen.getByRole('button', { name: 'Sair' }))

    expect(vi.mocked(signOut)).toHaveBeenCalledTimes(1)
  })
})

describe('Header - Notifications Navigation', () => {
  it('displays Notificações icon link in header', () => {
    renderHeader()

    // Notifications icon link should be visible in the header (not in hamburger menu)
    const notificationLinks = screen.getAllByRole('link', { name: /notificações/i })
    expect(notificationLinks.length).toBeGreaterThanOrEqual(1)
  })

  it('displays unread badge when unreadCount > 0', () => {
    mockNotificationsStore.unreadCount = 5
    renderHeader()

    // Badge should be visible with count (appears in both mobile and desktop nav icons)
    const badges = screen.getAllByText('5')
    expect(badges.length).toBeGreaterThanOrEqual(1)

    // Reset
    mockNotificationsStore.unreadCount = 0
  })

  it('does not display unread badge when unreadCount is 0', () => {
    mockNotificationsStore.unreadCount = 0
    renderHeader()

    // Link should be present but no badge
    const notificationLinks = screen.getAllByRole('link', { name: /notificações/i })
    expect(notificationLinks.length).toBeGreaterThanOrEqual(1)
    // No badge element with "0" should be visible
    expect(screen.queryByText(/^0$/)).not.toBeInTheDocument()
  })
})

describe('Header - Profile Navigation', () => {
  it('displays Perfil as a text link in desktop navigation', () => {
    renderHeader()

    // Profile should be a text link in the navigation (like Painel, Histórico, Gerenciar)
    const profileLinks = screen.getAllByRole('link', { name: /perfil/i })
    expect(profileLinks.length).toBeGreaterThanOrEqual(1)
  })

  it('displays Perfil link in mobile menu', async () => {
    const user = userEvent.setup()
    renderHeader()

    await user.click(screen.getByRole('button', { name: /abrir menu/i }))

    // Profile should be in the mobile hamburger menu
    expect(screen.getByRole('link', { name: 'Perfil' })).toBeInTheDocument()
  })

  it('navigates to /profile when Perfil link is clicked', () => {
    renderHeader()

    // Profile links should point to /profile
    const profileLinks = screen.getAllByRole('link', { name: /perfil/i })
    expect(profileLinks[0]).toHaveAttribute('href', '/profile')
  })
})





