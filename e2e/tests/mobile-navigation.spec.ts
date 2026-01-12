/**
 * E2E Tests: Mobile Navigation & Layout
 * Ensures the app is navigable on mobile viewports and avoids horizontal overflow.
 */

import { test, expect } from '../fixtures/test-base';
import { createAccount, createCreditCard } from '../utils/test-data';

const VISIBILITY_TIMEOUT = 10_000;
const HEADING_TIMEOUT = 20_000;
const NAVIGATION_TIMEOUT = 30_000;

function createMockSnapshotData() {
  const fixedDate = new Date('2025-01-15T12:00:00');
  return {
    inputs: {
      accounts: [{ id: 'acc-1', name: 'Test Account', type: 'checking', balance: 100000 }],
      projects: [],
      singleShotIncome: [],
      fixedExpenses: [],
      singleShotExpenses: [],
      creditCards: [],
      futureStatements: [],
      projectionDays: 30,
    },
    projection: {
      startDate: fixedDate.toISOString(),
      endDate: new Date(fixedDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      startingBalance: 100000,
      days: [
        {
          date: fixedDate.toISOString(),
          dayOffset: 0,
          optimisticBalance: 100000,
          pessimisticBalance: 90000,
          incomeEvents: [],
          expenseEvents: [],
          isOptimisticDanger: false,
          isPessimisticDanger: false,
        },
        {
          date: new Date(fixedDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          dayOffset: 1,
          optimisticBalance: 95000,
          pessimisticBalance: 85000,
          incomeEvents: [],
          expenseEvents: [],
          isOptimisticDanger: false,
          isPessimisticDanger: false,
        },
      ],
      optimistic: {
        totalIncome: 50000,
        totalExpenses: 30000,
        endBalance: 120000,
        dangerDays: [],
        dangerDayCount: 0,
      },
      pessimistic: {
        totalIncome: 40000,
        totalExpenses: 30000,
        endBalance: 110000,
        dangerDays: [],
        dangerDayCount: 0,
      },
    },
    summaryMetrics: {
      startingBalance: 100000,
      endBalanceOptimistic: 120000,
      dangerDayCount: 0,
    },
  };
}

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page): Promise<void> {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const clientWidth = root.clientWidth;
    const scrollWidth = root.scrollWidth;
    const delta = Math.max(0, scrollWidth - clientWidth);

    if (delta <= 1) {
      return { delta, clientWidth, scrollWidth, offenders: [] as unknown[] };
    }

    const offenders = Array.from(document.body.querySelectorAll<HTMLElement>('*'))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        if (rect.right <= clientWidth + 1) return null;

        const testId = el.getAttribute('data-testid');
        const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          className: el.className || null,
          testId,
          right: rect.right,
          left: rect.left,
          width: rect.width,
          text,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b!.right as number) - (a!.right as number))
      .slice(0, 8);

    return { delta, clientWidth, scrollWidth, offenders };
  });

  if (result.delta > 1) {
    // Provide actionable debug output in CI logs if this ever regresses.
    console.log('[MobileOverflow]', {
      url: page.url(),
      delta: result.delta,
      clientWidth: result.clientWidth,
      scrollWidth: result.scrollWidth,
      offenders: result.offenders,
    });
  }

  // Allow a 1px tolerance for rounding differences.
  expect(result.delta).toBeLessThanOrEqual(1);
}

test.describe('Mobile Navigation & Layout', () => {
  test('T203: public routes avoid horizontal overflow (320px)', async ({ browser }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();

    try {
      await page.setViewportSize({ width: 320, height: 568 });

      await page.goto(`${baseUrl}/login`);
      await expect(page.locator('#email')).toBeVisible();
      await expectNoHorizontalOverflow(page);

      // Force AuthCallback error UI (expired link)
      await page.goto(`${baseUrl}/auth/confirm?error=otp_expired&error_description=expired`);
      await expect(page.getByRole('button', { name: /solicitar novo link|voltar para login/i })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    } finally {
      await context.close();
    }
  });

  test('T201: mobile menu navigates without horizontal overflow (390px)', async ({ page, db }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Ensure there is at least one snapshot for history/detail routes
    const [seeded] = await db.seedSnapshots([
      { name: 'Snapshot Mobile', data: createMockSnapshotData() },
    ]);

    // Dashboard - wait for network idle to ensure page is fully loaded
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /painel de fluxo de caixa/i })).toBeVisible({ timeout: HEADING_TIMEOUT });
    await expectNoHorizontalOverflow(page);

    // Navigate via mobile menu to History
    const menuButton = page.getByRole('button', { name: /abrir menu/i });
    await expect(menuButton).toBeVisible({ timeout: VISIBILITY_TIMEOUT });
    await menuButton.click();
    
    // Wait for menu to fully open - check for the navigation container to be visible
    const historyLink = page.getByRole('link', { name: 'Histórico' });
    await expect(historyLink).toBeVisible({ timeout: VISIBILITY_TIMEOUT });
    
    // Click and wait for navigation in sequence (more reliable than Promise.all)
    await historyLink.click();
    await expect(page).toHaveURL(/\/history$/, { timeout: NAVIGATION_TIMEOUT });
    await expect(page.getByRole('heading', { name: /histórico de projeções/i })).toBeVisible({ timeout: HEADING_TIMEOUT });
    await expectNoHorizontalOverflow(page);

    // Navigate via mobile menu to Manage
    // Re-query menu button since page has changed
    const menuButtonManage = page.getByRole('button', { name: /abrir menu/i });
    await expect(menuButtonManage).toBeVisible({ timeout: VISIBILITY_TIMEOUT });
    await menuButtonManage.click();
    
    // Wait for menu to fully open
    const manageLink = page.getByRole('link', { name: 'Gerenciar' });
    await expect(manageLink).toBeVisible({ timeout: VISIBILITY_TIMEOUT });
    
    // Click and wait for navigation
    await manageLink.click();
    await expect(page).toHaveURL(/\/manage$/, { timeout: NAVIGATION_TIMEOUT });
    await expect(page.getByRole('heading', { name: /gerenciar dados financeiros/i })).toBeVisible({ timeout: HEADING_TIMEOUT });
    await expectNoHorizontalOverflow(page);

    // Navigate to snapshot detail
    await page.goto(`/history/${seeded.id}`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('historical-banner')).toBeVisible({ timeout: HEADING_TIMEOUT });
    await expectNoHorizontalOverflow(page);
  });

  test('T202: very small mobile viewport avoids horizontal overflow (320px)', async ({ page, db }) => {
    await page.setViewportSize({ width: 320, height: 568 });

    const [seeded] = await db.seedSnapshots([
      { name: 'Snapshot Mobile Small', data: createMockSnapshotData() },
    ]);

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /painel de fluxo de caixa/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto('/history');
    await expect(page.getByRole('heading', { name: /histórico de projeções/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto('/manage');
    await expect(page.getByRole('heading', { name: /gerenciar dados financeiros/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto(`/history/${seeded.id}`);
    await expect(page.getByTestId('historical-banner')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('T204: manage tabs + dialogs remain usable without horizontal overflow (320px)', async ({
    page,
    managePage,
    db,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });

    await db.clear();
    const [seededAccount] = await db.seedAccounts([createAccount({ name: 'Conta Mobile' })]);
    const [seededCard] = await db.seedCreditCards([createCreditCard({ name: 'Cartão Mobile' })]);

    await managePage.goto();
    await expectNoHorizontalOverflow(page);

    // Accounts: actions button must be visible on mobile (no hover) + menu fits
    await managePage.selectAccountsTab();
    const accountCard = page
      .locator('div.group.relative')
      .filter({ has: page.getByRole('heading', { name: seededAccount.name, level: 3 }) })
      .first();
    await expect(accountCard).toBeVisible();
    const accountActions = accountCard.getByRole('button', { name: /mais opções/i });
    await expect(accountActions).toBeVisible();
    await accountActions.click();
    await expect(page.getByRole('button', { name: /editar/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.locator('div.fixed.inset-0.z-10').first().click({ force: true });

    // Credit cards: actions + future statement dialog
    await managePage.selectCreditCardsTab();
    const cardCard = page
      .locator('div.group.relative')
      .filter({ has: page.getByRole('heading', { name: seededCard.name, level: 3 }) })
      .first();
    await expect(cardCard).toBeVisible();
    const cardActions = cardCard.getByRole('button', { name: /mais opções/i });
    await expect(cardActions).toBeVisible();
    await cardActions.click();
    await expect(page.getByRole('button', { name: /editar/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.locator('div.fixed.inset-0.z-10').first().click({ force: true });

    // Expand future statements and open the "Adicionar Fatura Futura" dialog
    await cardCard.getByRole('button', { name: /próximas faturas/i }).click();
    await cardCard.getByRole('button', { name: /adicionar próxima fatura|adicionar/i }).click();
    const futureDialog = page.getByRole('dialog');
    await expect(futureDialog.getByRole('heading', { name: /adicionar fatura futura/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.keyboard.press('Escape');
    await expect(futureDialog).not.toBeVisible();

    // Expenses + Projects tabs should not overflow even when the add dialogs are open
    await managePage.selectExpensesTab();
    const addExpense =
      (await page.getByRole('button', { name: /adicionar despesa fixa/i }).isVisible().catch(() => false))
        ? page.getByRole('button', { name: /adicionar despesa fixa/i })
        : page.getByRole('button', { name: /^adicionar despesa$/i });
    await addExpense.click();
    const expenseDialog = page.getByRole('dialog');
    await expect(expenseDialog).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.keyboard.press('Escape');
    await expect(expenseDialog).not.toBeVisible();

    await managePage.selectProjectsTab();
    const addProject =
      (await page.getByRole('button', { name: /adicionar receita recorrente/i }).isVisible().catch(() => false))
        ? page.getByRole('button', { name: /adicionar receita recorrente/i })
        : page.getByRole('button', { name: /adicionar projeto/i });
    await addProject.click();
    const projectDialog = page.getByRole('dialog');
    await expect(projectDialog).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.keyboard.press('Escape');
    await expect(projectDialog).not.toBeVisible();

    // Group tab
    await managePage.selectGroupTab();
    await expect(page.getByText(/membros do grupo/i).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('T205: Quick Update full-screen view avoids horizontal overflow (320px)', async ({
    page,
    dashboardPage,
    quickUpdatePage,
    db,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });

    await db.clear();
    await db.seedAccounts([createAccount({ name: 'Conta Atualizar' })]);
    await db.seedCreditCards([createCreditCard({ name: 'Cartão Atualizar' })]);

    await dashboardPage.goto();
    await expectNoHorizontalOverflow(page);

    await dashboardPage.openQuickUpdate();
    await quickUpdatePage.waitForModal();
    await expectNoHorizontalOverflow(page);

    await quickUpdatePage.cancel();
    await expectNoHorizontalOverflow(page);
  });

  test('T206: History empty + delete confirm avoids horizontal overflow (320px)', async ({
    page,
    historyPage,
    db,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });

    await db.clear();
    await historyPage.goto();
    await expect(historyPage.emptyState).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const [seeded] = await db.seedSnapshots([{ name: 'Snapshot Delete Mobile', data: createMockSnapshotData() }]);
    await page.reload();
    await expect(page.getByText(seeded.name).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const card = page.getByTestId('snapshot-card').filter({ hasText: seeded.name }).first();
    await card.getByRole('button', { name: /excluir/i }).click();
    const confirm = page.getByRole('alertdialog');
    await expect(confirm).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await confirm.getByRole('button', { name: /cancelar/i }).click();
    await expect(confirm).not.toBeVisible();
  });

  test('T207: Snapshot detail not-found state avoids horizontal overflow (320px)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });

    await page.goto('/history/00000000-0000-0000-0000-000000000000');
    await expect(page.getByText(/projeção não encontrada/i)).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});


