/**
 * BalanceListItem Component Tests
 *
 * Integration tests for the balance list item component.
 * Covers rendering with account types, owner badges, and balance editing.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BalanceListItem } from './balance-list-item'
import type { BalanceItem } from './types'
import type { BankAccount, CreditCard } from '@/types'

// =============================================================================
// TEST SETUP
// =============================================================================

function createMockBankAccount(overrides: Partial<BankAccount> = {}): BankAccount {
  return {
    id: 'account-123',
    name: 'Test Account',
    type: 'checking',
    balance: 100000, // R$ 1.000,00
    owner: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockCreditCard(overrides: Partial<CreditCard> = {}): CreditCard {
  return {
    id: 'card-456',
    name: 'Test Card',
    statementBalance: 50000, // R$ 500,00
    dueDay: 15,
    owner: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

const defaultOnSave = vi.fn().mockResolvedValue({ success: true })

function renderBalanceListItem(
  item: BalanceItem,
  previousBalance: number = 100000,
  onSave = defaultOnSave
) {
  return render(
    <BalanceListItem
      item={item}
      previousBalance={previousBalance}
      onSave={onSave}
    />
  )
}

// =============================================================================
// ACCOUNT TYPE BADGE TESTS
// =============================================================================

describe('BalanceListItem - Account Type Badge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders checking type badge for checking accounts', () => {
    const item: BalanceItem = {
      type: 'account',
      entity: createMockBankAccount({ type: 'checking' }),
    }
    renderBalanceListItem(item)

    expect(screen.getByText('Corrente')).toBeInTheDocument()
    // Verify badge has correct aria-label for accessibility
    expect(screen.getByLabelText('Tipo: Corrente')).toBeInTheDocument()
  })

  it('renders savings type badge for savings accounts', () => {
    const item: BalanceItem = {
      type: 'account',
      entity: createMockBankAccount({ type: 'savings' }),
    }
    renderBalanceListItem(item)

    expect(screen.getByText('Poupança')).toBeInTheDocument()
    // Verify badge has correct aria-label for accessibility
    expect(screen.getByLabelText('Tipo: Poupança')).toBeInTheDocument()
  })

  it('renders investment type badge for investment accounts', () => {
    const item: BalanceItem = {
      type: 'account',
      entity: createMockBankAccount({ type: 'investment' }),
    }
    renderBalanceListItem(item)

    expect(screen.getByText('Investimento')).toBeInTheDocument()
    // Verify badge has correct aria-label for accessibility
    expect(screen.getByLabelText('Tipo: Investimento')).toBeInTheDocument()
  })

  it('does not render type badge for credit cards', () => {
    const item: BalanceItem = {
      type: 'card',
      entity: createMockCreditCard(),
    }
    renderBalanceListItem(item)

    expect(screen.queryByText('Corrente')).not.toBeInTheDocument()
    expect(screen.queryByText('Poupança')).not.toBeInTheDocument()
    expect(screen.queryByText('Investimento')).not.toBeInTheDocument()
  })
})

// =============================================================================
// OWNER BADGE TESTS
// =============================================================================

describe('BalanceListItem - Owner Badge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders owner badge when account has owner', () => {
    const item: BalanceItem = {
      type: 'account',
      entity: createMockBankAccount({
        owner: { id: 'owner-1', name: 'João' },
      }),
    }
    renderBalanceListItem(item)

    expect(screen.getByText('João')).toBeInTheDocument()
  })

  it('renders owner badge when credit card has owner', () => {
    const item: BalanceItem = {
      type: 'card',
      entity: createMockCreditCard({
        owner: { id: 'owner-2', name: 'Maria' },
      }),
    }
    renderBalanceListItem(item)

    expect(screen.getByText('Maria')).toBeInTheDocument()
  })

  it('does not render owner badge when owner is null', () => {
    const item: BalanceItem = {
      type: 'account',
      entity: createMockBankAccount({ owner: null }),
    }
    renderBalanceListItem(item)

    expect(screen.queryByText('Não atribuído')).not.toBeInTheDocument()
  })
})

// =============================================================================
// COMBINED BADGE DISPLAY TESTS
// =============================================================================

describe('BalanceListItem - Combined Badge Display', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders both owner and type badges for account with owner', () => {
    const item: BalanceItem = {
      type: 'account',
      entity: createMockBankAccount({
        type: 'investment',
        owner: { id: 'owner-1', name: 'Daniel' },
      }),
    }
    renderBalanceListItem(item)

    // Owner badge
    expect(screen.getByText('Daniel')).toBeInTheDocument()
    // Type badge
    expect(screen.getByText('Investimento')).toBeInTheDocument()
    expect(screen.getByLabelText('Tipo: Investimento')).toBeInTheDocument()
  })

  it('renders only owner badge for credit card with owner', () => {
    const item: BalanceItem = {
      type: 'card',
      entity: createMockCreditCard({
        owner: { id: 'owner-2', name: 'Aryane' },
      }),
    }
    renderBalanceListItem(item)

    // Owner badge
    expect(screen.getByText('Aryane')).toBeInTheDocument()
    // No type badge for cards
    expect(screen.queryByText('Corrente')).not.toBeInTheDocument()
    expect(screen.queryByText('Poupança')).not.toBeInTheDocument()
    expect(screen.queryByText('Investimento')).not.toBeInTheDocument()
  })

  it('renders only type badge for account without owner', () => {
    const item: BalanceItem = {
      type: 'account',
      entity: createMockBankAccount({
        type: 'savings',
        owner: null,
      }),
    }
    renderBalanceListItem(item)

    // Type badge
    expect(screen.getByText('Poupança')).toBeInTheDocument()
    expect(screen.getByLabelText('Tipo: Poupança')).toBeInTheDocument()
  })
})

// =============================================================================
// BASIC RENDERING TESTS
// =============================================================================

describe('BalanceListItem - Basic Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders account name', () => {
    const item: BalanceItem = {
      type: 'account',
      entity: createMockBankAccount({ name: 'Nubank' }),
    }
    renderBalanceListItem(item)

    expect(screen.getByText('Nubank')).toBeInTheDocument()
  })

  it('renders credit card name', () => {
    const item: BalanceItem = {
      type: 'card',
      entity: createMockCreditCard({ name: 'Itaú Platinum' }),
    }
    renderBalanceListItem(item)

    expect(screen.getByText('Itaú Platinum')).toBeInTheDocument()
  })

  it('renders previous balance', () => {
    const item: BalanceItem = {
      type: 'account',
      entity: createMockBankAccount({ balance: 250000 }),
    }
    renderBalanceListItem(item, 150000) // Previous: R$ 1.500,00

    expect(screen.getByText(/Anterior:/)).toBeInTheDocument()
    expect(screen.getByText(/1\.5K|1,5K|1\.500/)).toBeInTheDocument()
  })

  it('renders balance input with current value', () => {
    const item: BalanceItem = {
      type: 'account',
      entity: createMockBankAccount({ balance: 250000 }), // R$ 2.500,00
    }
    renderBalanceListItem(item)

    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('2500,00')
  })

  it('renders R$ prefix', () => {
    const item: BalanceItem = {
      type: 'account',
      entity: createMockBankAccount(),
    }
    renderBalanceListItem(item)

    expect(screen.getByText('R$')).toBeInTheDocument()
  })
})

// =============================================================================
// BALANCE EDITING TESTS
// =============================================================================

describe('BalanceListItem - Balance Editing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls onSave when balance is changed and input loses focus', async () => {
    const onSave = vi.fn().mockResolvedValue({ success: true })
    const item: BalanceItem = {
      type: 'account',
      entity: createMockBankAccount({ balance: 100000 }),
    }
    renderBalanceListItem(item, 100000, onSave)

    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.type(input, '1500,50')
    fireEvent.blur(input)

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(150050) // R$ 1.500,50 in cents
    })
  })

  it('does not call onSave when value is unchanged', async () => {
    const onSave = vi.fn().mockResolvedValue({ success: true })
    const item: BalanceItem = {
      type: 'account',
      entity: createMockBankAccount({ balance: 100000 }),
    }
    renderBalanceListItem(item, 100000, onSave)

    const input = screen.getByRole('textbox')
    fireEvent.blur(input)

    // Wait a small delay to ensure any async behavior has time to run
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('shows saving indicator while saving', async () => {
    const onSave = vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100)))
    const item: BalanceItem = {
      type: 'account',
      entity: createMockBankAccount({ balance: 100000 }),
    }
    renderBalanceListItem(item, 100000, onSave)

    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.type(input, '2000,00')
    fireEvent.blur(input)

    expect(screen.getByText(/Salvando/)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText(/Salvando/)).not.toBeInTheDocument()
    })
  })

  it('shows error message when save fails', async () => {
    const onSave = vi.fn().mockResolvedValue({ success: false, error: 'Erro de conexão' })
    const item: BalanceItem = {
      type: 'account',
      entity: createMockBankAccount({ balance: 100000 }),
    }
    renderBalanceListItem(item, 100000, onSave)

    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.type(input, '2000,00')
    fireEvent.blur(input)

    await waitFor(() => {
      expect(screen.getByText('Erro de conexão')).toBeInTheDocument()
    })
  })

  it('has retry button when save fails', async () => {
    const onSave = vi.fn().mockResolvedValue({ success: false, error: 'Erro' })
    const item: BalanceItem = {
      type: 'account',
      entity: createMockBankAccount({ balance: 100000 }),
    }
    renderBalanceListItem(item, 100000, onSave)

    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.type(input, '2000,00')
    fireEvent.blur(input)

    await waitFor(() => {
      expect(screen.getByText(/Tentar novamente/)).toBeInTheDocument()
    })
  })

  it('resets value on Escape key', async () => {
    const item: BalanceItem = {
      type: 'account',
      entity: createMockBankAccount({ balance: 100000 }), // R$ 1.000,00
    }
    renderBalanceListItem(item)

    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.type(input, '9999,99')
    
    // Press Escape
    await userEvent.keyboard('{Escape}')

    // Should reset to original value
    await waitFor(() => {
      expect(input).toHaveValue('1000,00')
    })
  })
})

// =============================================================================
// ACCESSIBILITY TESTS
// =============================================================================

describe('BalanceListItem - Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('has accessible label for balance input', () => {
    const item: BalanceItem = {
      type: 'account',
      entity: createMockBankAccount({ name: 'Nubank' }),
    }
    renderBalanceListItem(item)

    const input = screen.getByLabelText('Saldo de Nubank')
    expect(input).toBeInTheDocument()
  })

  it('has accessible label for credit card balance input', () => {
    const item: BalanceItem = {
      type: 'card',
      entity: createMockCreditCard({ name: 'Itaú Visa' }),
    }
    renderBalanceListItem(item)

    const input = screen.getByLabelText('Saldo de Itaú Visa')
    expect(input).toBeInTheDocument()
  })
})

