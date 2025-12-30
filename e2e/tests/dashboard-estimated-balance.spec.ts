/**
 * E2E Tests: Today's estimated balance (026-estimate-today-balance)
 *
 * Covers:
 * - "Saldo estimado" indicator + base text + CTA to Atualizar Saldos (US1)
 * - Scenario-specific marker behavior (optimistic vs pessimistic) (US1)
 * - "No reliable base" state when balance_updated_at is missing (FR-009)
 */

import { test, expect } from '../fixtures/test-base'

const FIXED_NOW = new Date('2025-01-15T12:00:00')

test.describe('Dashboard - Estimated today balance', () => {
  test.beforeEach(async ({ db }) => {
    // DB is reset once per worker; these tests require deterministic state.
    await db.resetDatabase()
  })

  test.afterEach(async ({ db }) => {
    // Clean up to avoid impacting other tests running later in the same worker.
    await db.clear()
  })

  test.afterEach(async ({ page }) => {
    // Reset any fixed clock so date-dependent tests (e.g. future-statements month options)
    // are not impacted by this suite.
    await page.clock.setFixedTime(new Date())
  })

  test('shows "Saldo estimado" indicator with base text and CTA opens QuickUpdate; marker is scenario-specific', async ({
    page,
    dashboardPage,
    quickUpdatePage,
    db,
  }) => {
    // Freeze time so "today" is deterministic
    await page.clock.setFixedTime(FIXED_NOW)

    // Seed a minimal base: one checking account and a backdated balance update
    await db.seedAccounts([
      { name: 'Conta Corrente', type: 'checking', balance: 10_000 },
    ])
    await db.setCheckingAccountsBalanceUpdatedAt('2025-01-05T12:00:00Z')

    // Only a probable income exists since base -> optimistic is estimated, pessimistic is not
    await db.seedSingleShotIncome([
      {
        name: 'Receita Provável',
        amount: 2_000,
        date: '2025-01-10',
        certainty: 'probable',
      },
    ])

    await dashboardPage.goto()

    // Indicator visible in default (optimistic) scenario
    await expect(dashboardPage.estimatedBalanceIndicator).toBeVisible({ timeout: 20000 })

    const baseText = await dashboardPage.getEstimatedBalanceBaseText()
    expect(baseText).toMatch(/baseado/i)
    expect(baseText).toMatch(/05\/01/i)

    // CTA opens QuickUpdate
    await dashboardPage.openQuickUpdateFromEstimatedIndicator()
    await quickUpdatePage.waitForModal()
    await quickUpdatePage.cancel()

    // Switch to "Pessimista" by hiding the optimistic line in the legend
    await page.getByRole('button', { name: /otimista/i }).click()

    // In pessimistic scenario there were no included movements (only provável/incerta income),
    // so the estimate marker should not be shown.
    await expect(dashboardPage.estimatedBalanceIndicator).not.toBeVisible({ timeout: 20000 })
  })

  test('no reliable base (balance_updated_at missing) -> shows guidance + CTA and does not show "Saldo estimado"', async ({
    page,
    dashboardPage,
    db,
  }) => {
    await page.clock.setFixedTime(FIXED_NOW)

    // Seed accounts WITHOUT setting balance_updated_at (null in DB)
    await db.seedAccounts([
      { name: 'Conta Corrente', type: 'checking', balance: 10_000 },
    ])

    await dashboardPage.goto()

    // Guidance state (FR-009)
    await expect(page.getByRole('heading', { name: /atualize seus saldos/i })).toBeVisible()
    await expect(page.getByText(/para calcular o saldo de hoje/i)).toBeVisible()
    const noBaseBanner = page.getByRole('heading', { name: /atualize seus saldos/i }).locator('..').locator('..')
    await expect(noBaseBanner.getByRole('button', { name: /atualizar saldos/i })).toBeVisible()

    // No estimated indicator
    await expect(dashboardPage.estimatedBalanceIndicator).not.toBeVisible()
  })

  test('does not show the estimate indicator when no movements exist since the last update', async ({
    page,
    dashboardPage,
    db,
  }) => {
    await page.clock.setFixedTime(FIXED_NOW)

    await db.seedAccounts([
      { name: 'Conta Corrente', type: 'checking', balance: 10_000 },
    ])
    await db.setCheckingAccountsBalanceUpdatedAt('2025-01-05T12:00:00Z')

    await dashboardPage.goto()

    await expect(dashboardPage.estimatedBalanceIndicator).not.toBeVisible({ timeout: 20000 })
  })

  test('from estimated state -> QuickUpdate "Concluir" clears the estimate indicator', async ({
    page,
    dashboardPage,
    quickUpdatePage,
    db,
  }) => {
    await page.clock.setFixedTime(FIXED_NOW)

    await db.seedAccounts([
      { name: 'Conta Corrente', type: 'checking', balance: 10_000 },
    ])
    await db.setCheckingAccountsBalanceUpdatedAt('2025-01-05T12:00:00Z')

    // Force an estimated state via an expense within (baseDate, today]
    await db.seedSingleShotExpenses([
      { name: 'Despesa no intervalo', amount: 2_000, date: '2025-01-10' },
    ])

    await dashboardPage.goto()

    await expect(dashboardPage.estimatedBalanceIndicator).toBeVisible({ timeout: 20000 })

    // Complete QuickUpdate (which marks all balances as updated)
    await dashboardPage.openQuickUpdateFromEstimatedIndicator()
    await quickUpdatePage.waitForModal()
    await quickUpdatePage.complete()

    // Indicator should disappear once balance_updated_at is set to today
    await expect(dashboardPage.estimatedBalanceIndicator).not.toBeVisible({ timeout: 20000 })
  })

  test('inserting a past single-shot expense within (baseDate, today] recomputes today estimate automatically', async ({
    page,
    dashboardPage,
    db,
  }) => {
    await page.clock.setFixedTime(FIXED_NOW)

    await db.seedAccounts([
      { name: 'Conta Corrente', type: 'checking', balance: 10_000 },
    ])
    await db.setCheckingAccountsBalanceUpdatedAt('2025-01-05T12:00:00Z')

    await dashboardPage.goto()

    // Initially no movements: no estimate indicator
    await expect(dashboardPage.estimatedBalanceIndicator).not.toBeVisible({ timeout: 20000 })

    // Capture current "Saldo Inicial" (should be R$ 100)
    const startingLabel = page.getByText(/saldo inicial/i)
    const startingCard = startingLabel.locator('..')
    await expect(startingCard.getByText(/R\$\s*100/i)).toBeVisible({ timeout: 20000 })

    // Insert a retroactive expense within the interval
    await db.seedSingleShotExpenses([
      { name: 'Despesa Retroativa', amount: 2_000, date: '2025-01-10' },
    ])

    // Wait for recompute: starting balance should update to R$ 80 and indicator should appear
    await expect(startingCard.getByText(/R\$\s*80/i)).toBeVisible({ timeout: 20000 })
    await expect(dashboardPage.estimatedBalanceIndicator).toBeVisible({ timeout: 20000 })
  })
})


