/**
 * E2E Tests: Dashboard Health Indicator
 *
 * Covers:
 * - "good" status is hidden (no banner noise)
 * - "caution" status when projection gets close to zero but doesn't cross it
 * - "warning" status when only pessimistic crosses zero
 * - "danger" status when even optimistic crosses zero
 * - stale data badge CTA opens Quick Update
 */

import { test, expect } from '../fixtures/test-base'

const FIXED_NOW = new Date('2025-01-15T12:00:00')

test.describe('Dashboard - Health indicator', () => {
  test.beforeEach(async ({ db, page }) => {
    // Deterministic time for staleness + projection windows
    await page.clock.setFixedTime(FIXED_NOW)
    await db.resetDatabase()
  })

  test.afterEach(async ({ page, db }) => {
    // Avoid time leaks into other suites (future-statements month options, etc.)
    await page.clock.setFixedTime(new Date())
    await db.clear()
  })

  test('hides health banner when status is good', async ({ dashboardPage, db }) => {
    await db.seedAccounts([{ name: 'Conta Corrente', type: 'checking', balance: 50_000_00 }])
    await db.setCheckingAccountsBalanceUpdatedAt('2025-01-15T12:00:00Z')

    await dashboardPage.goto()

    await expect(dashboardPage.healthIndicator).not.toBeVisible({ timeout: 20000 })
  })

  test('shows caution banner when pessimistic stays >= 0 but gets close to zero', async ({
    dashboardPage,
    db,
  }) => {
    // Starting balance R$ 1.500, expense brings it down to R$ 500 (>= 0, near threshold)
    await db.seedAccounts([{ name: 'Conta Corrente', type: 'checking', balance: 1_500_00 }])
    await db.setCheckingAccountsBalanceUpdatedAt('2025-01-15T12:00:00Z')
    await db.seedSingleShotExpenses([
      { name: 'Despesa grande', amount: 1_000_00, date: '2025-01-16' },
    ])

    await dashboardPage.goto()

    await expect(dashboardPage.healthIndicator).toBeVisible({ timeout: 20000 })
    await expect(dashboardPage.healthIndicator).toContainText(/atenção/i)
    await expect(dashboardPage.healthIndicator).toContainText(/saldo projetado próximo de zero/i)
    await expect(dashboardPage.healthIndicator).toContainText(/R\$\s*500/i)
    await expect(dashboardPage.healthIndicator).toContainText(/16\/01/i)
  })

  test('shows warning banner when only pessimistic crosses zero (probable income offsets in optimistic)', async ({
    dashboardPage,
    db,
  }) => {
    // Expense would make balance negative, but probable income on the same day offsets it for optimistic only.
    await db.seedAccounts([{ name: 'Conta Corrente', type: 'checking', balance: 1_000_00 }])
    await db.setCheckingAccountsBalanceUpdatedAt('2025-01-15T12:00:00Z')

    await db.seedSingleShotExpenses([
      { name: 'Despesa no dia', amount: 2_000_00, date: '2025-01-16' },
    ])

    await db.seedSingleShotIncome([
      {
        name: 'Receita provável no dia',
        amount: 2_000_00,
        date: '2025-01-16',
        certainty: 'probable',
      },
    ])

    await dashboardPage.goto()

    await expect(dashboardPage.healthIndicator).toBeVisible({ timeout: 20000 })
    await expect(dashboardPage.healthIndicator).toContainText(/risco/i)
    await expect(dashboardPage.healthIndicator).toContainText(/no pior cenário/i)
  })

  test('shows danger banner when even optimistic crosses zero', async ({ dashboardPage, db }) => {
    await db.seedAccounts([{ name: 'Conta Corrente', type: 'checking', balance: 1_000_00 }])
    await db.setCheckingAccountsBalanceUpdatedAt('2025-01-15T12:00:00Z')

    await db.seedSingleShotExpenses([
      { name: 'Despesa no dia', amount: 2_000_00, date: '2025-01-16' },
    ])

    await dashboardPage.goto()

    await expect(dashboardPage.healthIndicator).toBeVisible({ timeout: 20000 })
    await expect(dashboardPage.healthIndicator).toContainText(/perigo/i)
    await expect(dashboardPage.healthIndicator).toContainText(/mesmo no melhor cenário/i)
  })

  test('shows stale badge and clicking it opens Quick Update', async ({
    dashboardPage,
    quickUpdatePage,
    db,
    page,
  }) => {
    await db.seedAccounts([{ name: 'Conta Corrente', type: 'checking', balance: 50_000_00 }])
    // Older than 30 days relative to FIXED_NOW => stale
    await db.setCheckingAccountsBalanceUpdatedAt('2024-11-01T12:00:00Z')

    await dashboardPage.goto()

    await expect(dashboardPage.healthIndicator).toBeVisible({ timeout: 20000 })
    await expect(dashboardPage.healthIndicator).toContainText(/desatualizado/i)

    const staleCta = page.getByRole('button', { name: /atualizar agora/i })
    await expect(staleCta).toBeVisible()
    await staleCta.click()

    await quickUpdatePage.waitForModal()
    await quickUpdatePage.cancel()
  })
})


