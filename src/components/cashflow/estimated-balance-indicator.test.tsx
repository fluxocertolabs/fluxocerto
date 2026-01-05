import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EstimatedBalanceIndicator } from './estimated-balance-indicator'
import type { BalanceUpdateBase } from '@/lib/cashflow'

describe('EstimatedBalanceIndicator', () => {
  it('renders "Saldo estimado" with a single base date', () => {
    const base: BalanceUpdateBase = {
      kind: 'single',
      date: new Date(2025, 0, 5),
    }

    render(
      <EstimatedBalanceIndicator
        base={base}
        onUpdateBalances={() => {}}
      />
    )

    expect(screen.getByText(/saldo estimado/i)).toBeInTheDocument()
    expect(screen.getByTestId('estimated-balance-base')).toHaveTextContent(
      'Baseado na última atualização em 05/01'
    )
  })

  it('renders a date range base when applicable', () => {
    const base: BalanceUpdateBase = {
      kind: 'range',
      from: new Date(2025, 0, 5),
      to: new Date(2025, 0, 10),
    }

    render(
      <EstimatedBalanceIndicator
        base={base}
        onUpdateBalances={() => {}}
      />
    )

    expect(screen.getByTestId('estimated-balance-base')).toHaveTextContent(
      'Baseado nas últimas atualizações entre 05/01 e 10/01'
    )
  })

  it('calls onUpdateBalances when CTA is clicked', async () => {
    const onUpdateBalances = vi.fn()
    const user = userEvent.setup()

    const base: BalanceUpdateBase = {
      kind: 'single',
      date: new Date(2025, 0, 5),
    }

    render(
      <EstimatedBalanceIndicator
        base={base}
        onUpdateBalances={onUpdateBalances}
      />
    )

    await user.click(screen.getByRole('button', { name: /atualizar saldos/i }))
    expect(onUpdateBalances).toHaveBeenCalledTimes(1)
  })
})







