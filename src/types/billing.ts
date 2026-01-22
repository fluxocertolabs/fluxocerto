export type BillingSubscriptionStatus =
  | 'pending'
  | 'checkout_completed'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'
  | 'unknown'

export interface BillingSubscriptionRow {
  group_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: BillingSubscriptionStatus | string
  trial_end: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface BillingSubscription {
  groupId: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  status: BillingSubscriptionStatus | string
  trialEnd: Date | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  createdAt: Date
  updatedAt: Date
}

export function transformBillingSubscriptionRow(
  row: BillingSubscriptionRow
): BillingSubscription {
  return {
    groupId: row.group_id,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    status: row.status,
    trialEnd: row.trial_end ? new Date(row.trial_end) : null,
    currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end) : null,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

