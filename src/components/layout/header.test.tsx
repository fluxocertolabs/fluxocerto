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

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockAuth,
}))

vi.mock('@/hooks/use-group', () => ({
  useGroup: () => mockGroup,
}))

vi.mock('@/lib/supabase', () => ({
  signOut: vi.fn(async () => ({ error: null })),
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





