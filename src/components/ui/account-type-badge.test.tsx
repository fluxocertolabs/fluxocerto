/**
 * AccountTypeBadge Component Tests
 *
 * Tests for the account type badge component.
 * Covers rendering, styling, and accessibility for all account types.
 */

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AccountTypeBadge, type AccountType } from './account-type-badge'

// =============================================================================
// RENDERING TESTS
// =============================================================================

describe('AccountTypeBadge - Rendering', () => {
  it('renders nothing when type is null', () => {
    const { container } = render(<AccountTypeBadge type={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders checking badge with correct label and icon', () => {
    render(<AccountTypeBadge type="checking" />)

    expect(screen.getByText('Corrente')).toBeInTheDocument()
    expect(screen.getByText('🏦')).toBeInTheDocument()
  })

  it('renders savings badge with correct label and icon', () => {
    render(<AccountTypeBadge type="savings" />)

    expect(screen.getByText('Poupança')).toBeInTheDocument()
    expect(screen.getByText('💰')).toBeInTheDocument()
  })

  it('renders investment badge with correct label and icon', () => {
    render(<AccountTypeBadge type="investment" />)

    expect(screen.getByText('Investimento')).toBeInTheDocument()
    expect(screen.getByText('📈')).toBeInTheDocument()
  })
})

// =============================================================================
// STYLING TESTS
// =============================================================================

describe('AccountTypeBadge - Styling', () => {
  it('applies blue colors for checking type', () => {
    const { container } = render(<AccountTypeBadge type="checking" />)
    const badge = container.firstChild as HTMLElement

    expect(badge).toHaveClass('bg-blue-500/10')
    expect(badge).toHaveClass('text-blue-600')
  })

  it('applies green colors for savings type', () => {
    const { container } = render(<AccountTypeBadge type="savings" />)
    const badge = container.firstChild as HTMLElement

    expect(badge).toHaveClass('bg-emerald-500/10')
    expect(badge).toHaveClass('text-emerald-600')
  })

  it('applies violet colors for investment type', () => {
    const { container } = render(<AccountTypeBadge type="investment" />)
    const badge = container.firstChild as HTMLElement

    expect(badge).toHaveClass('bg-violet-500/10')
    expect(badge).toHaveClass('text-violet-600')
  })

  it('applies custom className when provided', () => {
    const { container } = render(
      <AccountTypeBadge type="checking" className="custom-class" />
    )
    const badge = container.firstChild as HTMLElement

    expect(badge).toHaveClass('custom-class')
  })

  it('has base styling classes', () => {
    const { container } = render(<AccountTypeBadge type="checking" />)
    const badge = container.firstChild as HTMLElement

    expect(badge).toHaveClass('inline-flex')
    expect(badge).toHaveClass('items-center')
    expect(badge).toHaveClass('gap-1')
    expect(badge).toHaveClass('text-xs')
    expect(badge).toHaveClass('px-2')
    expect(badge).toHaveClass('py-0.5')
    expect(badge).toHaveClass('rounded')
    expect(badge).toHaveClass('font-medium')
  })
})

// =============================================================================
// ALL TYPES COVERAGE
// =============================================================================

describe('AccountTypeBadge - All Types', () => {
  const testCases: Array<{ type: AccountType; label: string; icon: string }> = [
    { type: 'checking', label: 'Corrente', icon: '🏦' },
    { type: 'savings', label: 'Poupança', icon: '💰' },
    { type: 'investment', label: 'Investimento', icon: '📈' },
  ]

  testCases.forEach(({ type, label, icon }) => {
    it(`renders ${type} type correctly`, () => {
      render(<AccountTypeBadge type={type} />)

      expect(screen.getByText(label)).toBeInTheDocument()
      expect(screen.getByText(icon)).toBeInTheDocument()
    })
  })
})


