import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BillingManagementCard } from './billing-management-card'
import type { BillingSubscription } from '@/types'

const mockUseBillingStatus = vi.fn()
const mockCreatePortalSession = vi.fn()
const mockCreateCheckoutSession = vi.fn()

vi.mock('@/hooks/use-billing-status', () => ({
  useBillingStatus: () => mockUseBillingStatus(),
}))

vi.mock('@/lib/supabase', () => ({
  createStripeCustomerPortalSession: () => mockCreatePortalSession(),
  createStripeCheckoutSession: () => mockCreateCheckoutSession(),
}))

const baseSubscription: BillingSubscription = {
  groupId: 'group-123',
  stripeCustomerId: 'cus_123',
  stripeSubscriptionId: 'sub_123',
  status: 'active',
  trialEnd: null,
  currentPeriodEnd: new Date('2026-02-01T00:00:00.000Z'),
  cancelAtPeriodEnd: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-10T00:00:00.000Z'),
}

let originalLocation: Location

describe('BillingManagementCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseBillingStatus.mockReturnValue({
      subscription: baseSubscription,
      isLoading: false,
      error: null,
      hasAccess: true,
      refetch: vi.fn(),
    })

    originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '' },
    })
    window.sessionStorage.clear()
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    })
  })

  it('renders subscription status and manage button', () => {
    render(<BillingManagementCard />)

    expect(screen.getByText('Assinatura')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /gerenciar assinatura/i })).toBeInTheDocument()
  })

  it('redirects to Stripe portal on manage click', async () => {
    const user = userEvent.setup()
    mockCreatePortalSession.mockResolvedValue({ success: true, data: { url: 'https://stripe.test/portal' } })

    render(<BillingManagementCard />)
    await user.click(screen.getByRole('button', { name: /gerenciar assinatura/i }))

    expect(mockCreatePortalSession).toHaveBeenCalled()
    expect(window.location.href).toBe('https://stripe.test/portal')
    expect(window.sessionStorage.getItem('manage-active-tab')).toBe('group')
  })

  it('shows checkout CTA when subscription is missing', async () => {
    const user = userEvent.setup()
    mockUseBillingStatus.mockReturnValue({
      subscription: null,
      isLoading: false,
      error: null,
      hasAccess: false,
      refetch: vi.fn(),
    })
    mockCreateCheckoutSession.mockResolvedValue({ success: true, data: { url: 'https://stripe.test/checkout' } })

    render(<BillingManagementCard />)
    await user.click(screen.getByRole('button', { name: /ativar teste grátis/i }))

    expect(mockCreateCheckoutSession).toHaveBeenCalled()
    expect(window.location.href).toBe('https://stripe.test/checkout')
  })
})
