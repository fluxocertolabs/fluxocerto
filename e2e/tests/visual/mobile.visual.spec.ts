/**
 * Mobile Visual Regression Tests
 * Tests visual appearance on mobile viewport sizes
 *
 * @visual
 */

import { visualTest } from '../../fixtures/visual-test-base';
import { test as unauthTest, expect as unauthExpect, type Page } from '@playwright/test';
import { disableAnimations, setTheme, waitForStableUI } from '../../fixtures/visual-test-base';
import {
  createAccount,
  createExpense,
  createProject,
  createCreditCard,
} from '../../utils/test-data';

function createMockSnapshotData() {
  // Use fixed date for deterministic screenshots
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

async function waitForChartToStabilize(page: Page): Promise<void> {
  const chartContainer = page.locator('[data-testid="cashflow-chart"], .recharts-wrapper').first();
  await chartContainer.waitFor({ state: 'attached', timeout: 10000 }).catch(() => {
    // Chart may not be present if no data
  });
  await page.waitForTimeout(1000);
}

/**
 * Mobile Visual Regression Tests
 *
 * Uses Pixel 5 viewport (393x851) for mobile testing.
 * Tests key pages in both empty and populated states.
 */
visualTest.describe('Mobile Visual Regression @visual', () => {
  visualTest.describe('Dashboard Mobile', () => {
    visualTest('dashboard - mobile light empty', async ({ page, dashboardPage, db, visual }) => {
      await db.clear();
      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-mobile-light-empty.png');
    });

    visualTest('dashboard - mobile dark empty', async ({ page, dashboardPage, db, visual }) => {
      await db.clear();
      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-mobile-dark-empty.png');
    });

    visualTest('dashboard - mobile light populated', async ({ page, dashboardPage, db, visual }) => {
      await db.clear();
      // Seed data for a realistic dashboard view
      await db.seedAccounts([
        createAccount({ name: 'Nubank', type: 'checking', balance: 500000 }),
        createAccount({ name: 'Itaú', type: 'savings', balance: 200000 }),
      ]);
      await db.setAccountsBalanceUpdatedAt('2025-01-15T12:00:00Z');

      await db.seedProjects([
        createProject({ name: 'Salário', amount: 800000, certainty: 'guaranteed' }),
      ]);

      await db.seedExpenses([
        createExpense({ name: 'Aluguel', amount: 200000, due_day: 10 }),
        createExpense({ name: 'Internet', amount: 15000, due_day: 15 }),
      ]);

      await db.seedCreditCards([
        createCreditCard({ name: 'Nubank', statement_balance: 150000, due_day: 15 }),
      ]);
      await db.setCreditCardsBalanceUpdatedAt('2025-01-15T12:00:00Z');

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-mobile-light-populated.png');
    });

    visualTest('dashboard - mobile dark populated', async ({ page, dashboardPage, db, visual }) => {
      await db.clear();
      await db.seedAccounts([
        createAccount({ name: 'Nubank', type: 'checking', balance: 500000 }),
        createAccount({ name: 'Itaú', type: 'savings', balance: 200000 }),
      ]);
      await db.setAccountsBalanceUpdatedAt('2025-01-15T12:00:00Z');

      await db.seedProjects([
        createProject({ name: 'Salário', amount: 800000, certainty: 'guaranteed' }),
      ]);

      await db.seedExpenses([
        createExpense({ name: 'Aluguel', amount: 200000, due_day: 10 }),
        createExpense({ name: 'Internet', amount: 15000, due_day: 15 }),
      ]);

      await db.seedCreditCards([
        createCreditCard({ name: 'Nubank', statement_balance: 150000, due_day: 15 }),
      ]);
      await db.setCreditCardsBalanceUpdatedAt('2025-01-15T12:00:00Z');

      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-mobile-dark-populated.png');
    });

    visualTest('dashboard - mobile light estimated', async ({ page, dashboardPage, db, visual }) => {
      await db.clear();

      await db.seedAccounts([
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 50_000_00 }),
      ]);
      await db.setCheckingAccountsBalanceUpdatedAt('2025-01-05T12:00:00Z');
      await db.seedSingleShotExpenses([
        { name: 'Despesa no intervalo', amount: 25_00, date: '2025-01-10' },
      ]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-mobile-light-estimated.png');
    });

    visualTest('dashboard - mobile dark estimated', async ({ page, dashboardPage, db, visual }) => {
      await db.clear();

      await db.seedAccounts([
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 50_000_00 }),
      ]);
      await db.setCheckingAccountsBalanceUpdatedAt('2025-01-05T12:00:00Z');
      await db.seedSingleShotExpenses([
        { name: 'Despesa no intervalo', amount: 25_00, date: '2025-01-10' },
      ]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-mobile-dark-estimated.png');
    });

    visualTest('dashboard - mobile light no-estimate', async ({ page, dashboardPage, db, visual }) => {
      await db.clear();

      await db.seedAccounts([
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 50_000_00 }),
      ]);
      await db.setCheckingAccountsBalanceUpdatedAt('2025-01-15T12:00:00Z');

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-mobile-light-no-estimate.png');
    });

    visualTest('dashboard - mobile dark no-estimate', async ({ page, dashboardPage, db, visual }) => {
      await db.clear();

      await db.seedAccounts([
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 50_000_00 }),
      ]);
      await db.setCheckingAccountsBalanceUpdatedAt('2025-01-15T12:00:00Z');

      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-mobile-dark-no-estimate.png');
    });

    visualTest('dashboard - mobile light no-base', async ({ page, dashboardPage, db, visual }) => {
      await db.clear();

      await db.seedAccounts([
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 50_000_00 }),
      ]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-mobile-light-no-base.png');
    });

    visualTest('dashboard - mobile dark no-base', async ({ page, dashboardPage, db, visual }) => {
      await db.clear();

      await db.seedAccounts([
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 50_000_00 }),
      ]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'dashboard-mobile-dark-no-base.png');
    });
  });

  visualTest.describe('Manage Lists Mobile', () => {
    // Even though accounts is the default tab, explicitly selecting it ensures
    // the tab content is fully loaded before taking screenshots
    visualTest('accounts list - mobile light', async ({ page, managePage, db, visual }) => {
      await db.clear();
      await db.seedAccounts([
        createAccount({ name: 'Nubank', type: 'checking', balance: 500000 }),
        createAccount({ name: 'Itaú Poupança', type: 'savings', balance: 200000 }),
        createAccount({ name: 'XP', type: 'investment', balance: 1000000 }),
      ]);

      await managePage.goto();
      await managePage.selectAccountsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-accounts-mobile-light.png');
    });

    visualTest('accounts list - mobile dark', async ({ page, managePage, db, visual }) => {
      await db.clear();
      await db.seedAccounts([
        createAccount({ name: 'Nubank', type: 'checking', balance: 500000 }),
        createAccount({ name: 'Itaú Poupança', type: 'savings', balance: 200000 }),
        createAccount({ name: 'XP', type: 'investment', balance: 1000000 }),
      ]);

      await managePage.goto();
      await managePage.selectAccountsTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-accounts-mobile-dark.png');
    });

    visualTest('expenses list - mobile light', async ({ page, managePage, db, visual }) => {
      await db.clear();
      await db.seedExpenses([
        createExpense({ name: 'Aluguel', amount: 200000, due_day: 10 }),
        createExpense({ name: 'Internet', amount: 15000, due_day: 15 }),
        createExpense({ name: 'Energia', amount: 25000, due_day: 20 }),
      ]);

      await managePage.goto();
      await managePage.selectExpensesTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-expenses-mobile-light.png');
    });

    visualTest('expenses list - mobile dark', async ({ page, managePage, db, visual }) => {
      await db.clear();
      await db.seedExpenses([
        createExpense({ name: 'Aluguel', amount: 200000, due_day: 10 }),
        createExpense({ name: 'Internet', amount: 15000, due_day: 15 }),
        createExpense({ name: 'Energia', amount: 25000, due_day: 20 }),
      ]);

      await managePage.goto();
      await managePage.selectExpensesTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-expenses-mobile-dark.png');
    });

    visualTest('projects list - mobile light', async ({ page, managePage, db, visual }) => {
      await db.clear();
      await db.seedProjects([
        createProject({ name: 'Salário', amount: 800000, certainty: 'guaranteed' }),
        createProject({ name: 'Freelance', amount: 200000, certainty: 'probable' }),
      ]);

      await managePage.goto();
      await managePage.selectProjectsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-projects-mobile-light.png');
    });

    visualTest('projects list - mobile dark', async ({ page, managePage, db, visual }) => {
      await db.clear();
      await db.seedProjects([
        createProject({ name: 'Salário', amount: 800000, certainty: 'guaranteed' }),
        createProject({ name: 'Freelance', amount: 200000, certainty: 'probable' }),
      ]);

      await managePage.goto();
      await managePage.selectProjectsTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-projects-mobile-dark.png');
    });

    visualTest('credit cards list - mobile light', async ({ page, managePage, db, visual }) => {
      await db.clear();
      await db.seedCreditCards([
        createCreditCard({ name: 'Nubank Platinum', statement_balance: 300000, due_day: 15 }),
        createCreditCard({ name: 'Itaú Visa', statement_balance: 150000, due_day: 10 }),
      ]);

      await managePage.goto();
      await managePage.selectCreditCardsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      const creditCards = managePage.creditCards();
      await creditCards.waitForLoad();

      await visual.takeScreenshot(page, 'manage-credit-cards-mobile-light.png');
    });

    visualTest('credit cards list - mobile dark', async ({ page, managePage, db, visual }) => {
      await db.clear();
      await db.seedCreditCards([
        createCreditCard({ name: 'Nubank Platinum', statement_balance: 300000, due_day: 15 }),
        createCreditCard({ name: 'Itaú Visa', statement_balance: 150000, due_day: 10 }),
      ]);

      await managePage.goto();
      await managePage.selectCreditCardsTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      const creditCards = managePage.creditCards();
      await creditCards.waitForLoad();

      await visual.takeScreenshot(page, 'manage-credit-cards-mobile-dark.png');
    });

    visualTest('group tab - mobile light', async ({ page, managePage, db, visual }) => {
      await db.clear();

      await managePage.goto();
      await managePage.selectGroupTab();
      // Wait for group section to fully load (names are masked in screenshots but still need to load)
      await page.locator('[data-testid="group-name"]').waitFor({ state: 'visible', timeout: 10000 });
      await page.locator('[data-testid="member-name"]').first().waitFor({ state: 'visible', timeout: 10000 });

      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-group-mobile-light.png');
    });

    visualTest('group tab - mobile dark', async ({ page, managePage, db, visual }) => {
      await db.clear();

      await managePage.goto();
      await managePage.selectGroupTab();
      // Wait for group section to fully load (names are masked in screenshots but still need to load)
      await page.locator('[data-testid="group-name"]').waitFor({ state: 'visible', timeout: 10000 });
      await page.locator('[data-testid="member-name"]').first().waitFor({ state: 'visible', timeout: 10000 });

      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'manage-group-mobile-dark.png');
    });
  });

  visualTest.describe('Quick Update Mobile', () => {
    visualTest('quick update - mobile light', async ({ page, dashboardPage, quickUpdatePage, db, visual }) => {
      await db.clear();
      await db.seedAccounts([
        createAccount({ name: 'Nubank', type: 'checking', balance: 500000 }),
        createAccount({ name: 'Itaú', type: 'savings', balance: 200000 }),
      ]);

      await db.seedCreditCards([
        createCreditCard({ name: 'Nubank', statement_balance: 150000, due_day: 15 }),
      ]);

      // Quick Update is opened from Dashboard
      await dashboardPage.goto();
      await dashboardPage.openQuickUpdate();
      await quickUpdatePage.waitForModal();

      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'quick-update-mobile-light.png');
    });

    visualTest('quick update - mobile dark', async ({ page, dashboardPage, quickUpdatePage, db, visual }) => {
      await db.clear();
      await db.seedAccounts([
        createAccount({ name: 'Nubank', type: 'checking', balance: 500000 }),
        createAccount({ name: 'Itaú', type: 'savings', balance: 200000 }),
      ]);

      await db.seedCreditCards([
        createCreditCard({ name: 'Nubank', statement_balance: 150000, due_day: 15 }),
      ]);

      // Quick Update is opened from Dashboard
      await dashboardPage.goto();
      await dashboardPage.openQuickUpdate();
      await quickUpdatePage.waitForModal();

      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'quick-update-mobile-dark.png');
    });
  });

  visualTest.describe('Mobile Navigation', () => {
    visualTest('mobile menu - open light', async ({ page, dashboardPage, db, visual }) => {
      await db.clear();

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await page.getByRole('button', { name: /abrir menu/i }).click();
      await page.getByRole('dialog', { name: 'Menu' }).waitFor({ state: 'visible', timeout: 5000 });

      await visual.takeScreenshot(page, 'mobile-menu-open-light.png');
    });

    visualTest('mobile menu - open dark', async ({ page, dashboardPage, db, visual }) => {
      await db.clear();

      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await page.getByRole('button', { name: /abrir menu/i }).click();
      await page.getByRole('dialog', { name: 'Menu' }).waitFor({ state: 'visible', timeout: 5000 });

      await visual.takeScreenshot(page, 'mobile-menu-open-dark.png');
    });
  });

  visualTest.describe('History & Snapshot Detail Mobile', () => {
    visualTest('history - mobile light empty', async ({ page, historyPage, db, visual }) => {
      await db.clear();

      await historyPage.goto();
      await unauthExpect(page.getByText(/nenhuma projeção salva/i)).toBeVisible();

      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'history-mobile-light-empty.png');
    });

    visualTest('history - mobile dark empty', async ({ page, historyPage, db, visual }) => {
      await db.clear();

      await historyPage.goto();
      await unauthExpect(page.getByText(/nenhuma projeção salva/i)).toBeVisible();

      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'history-mobile-dark-empty.png');
    });

    visualTest('history - mobile light with snapshots', async ({ page, db, visual }) => {
      await db.clear();
      await db.seedSnapshots([
        { name: 'Snapshot Janeiro 2025', data: createMockSnapshotData() },
        { name: 'Snapshot Fevereiro 2025', data: createMockSnapshotData() },
      ]);

      await page.goto('/history');
      await page.waitForSelector('text=/histórico de projeções/i', { timeout: 10000 });

      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'history-mobile-light-with-snapshots.png');
    });

    visualTest('history - mobile dark with snapshots', async ({ page, db, visual }) => {
      await db.clear();
      await db.seedSnapshots([
        { name: 'Snapshot Janeiro 2025', data: createMockSnapshotData() },
        { name: 'Snapshot Fevereiro 2025', data: createMockSnapshotData() },
      ]);

      await page.goto('/history');
      await page.waitForSelector('text=/histórico de projeções/i', { timeout: 10000 });

      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'history-mobile-dark-with-snapshots.png');
    });

    visualTest('snapshot detail - mobile light', async ({ page, db, visual }) => {
      await db.clear();
      const [seeded] = await db.seedSnapshots([
        { name: 'Visual Mobile Snapshot', data: createMockSnapshotData() },
      ]);

      await page.goto(`/history/${seeded.id}`);
      await page.waitForSelector('text=/projeção histórica/i', { timeout: 10000 });

      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);
      await waitForChartToStabilize(page);

      await visual.takeScreenshot(page, 'snapshot-detail-mobile-light.png');
    });

    visualTest('snapshot detail - mobile dark', async ({ page, db, visual }) => {
      await db.clear();
      const [seeded] = await db.seedSnapshots([
        { name: 'Visual Mobile Snapshot', data: createMockSnapshotData() },
      ]);

      await page.goto(`/history/${seeded.id}`);
      await page.waitForSelector('text=/projeção histórica/i', { timeout: 10000 });

      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);
      await waitForChartToStabilize(page);

      await visual.takeScreenshot(page, 'snapshot-detail-mobile-dark.png');
    });

    visualTest('snapshot detail - mobile light not-found', async ({ page, snapshotDetailPage, visual }) => {
      await snapshotDetailPage.goto('00000000-0000-0000-0000-000000000000');
      await snapshotDetailPage.expectNotFound();

      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'snapshot-detail-mobile-light-not-found.png');
    });

    visualTest('snapshot detail - mobile dark not-found', async ({ page, snapshotDetailPage, visual }) => {
      await snapshotDetailPage.goto('00000000-0000-0000-0000-000000000000');
      await snapshotDetailPage.expectNotFound();

      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'snapshot-detail-mobile-dark-not-found.png');
    });
  });

  // Note: Onboarding wizard mobile tests are in onboarding.visual.spec.ts
  // because they require fresh user authentication via magic link to ensure
  // the wizard auto-shows (existing worker users have completed onboarding).

  visualTest.describe('Floating Help Button Mobile', () => {
    visualTest('floating help - collapsed - mobile light', async ({
      page,
      dashboardPage,
      db,
      visual,
    }) => {
      await db.clear();
      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Floating help button should be visible
      const helpButton = page.getByTestId('floating-help-button');
      await helpButton.waitFor({ state: 'visible', timeout: 5000 });

      await visual.takeScreenshot(page, 'floating-help-collapsed-mobile-light.png');
    });

    visualTest('floating help - collapsed - mobile dark', async ({
      page,
      dashboardPage,
      db,
      visual,
    }) => {
      await db.clear();
      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      const helpButton = page.getByTestId('floating-help-button');
      await helpButton.waitFor({ state: 'visible', timeout: 5000 });

      await visual.takeScreenshot(page, 'floating-help-collapsed-mobile-dark.png');
    });

    visualTest('floating help - expanded - mobile light', async ({
      page,
      dashboardPage,
      db,
      visual,
    }) => {
      await db.clear();
      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Click to expand
      const helpButton = page.getByTestId('floating-help-button');
      await helpButton.click();
      await page.waitForTimeout(500);

      // Wait for expanded menu
      await page.getByRole('button', { name: /iniciar tour guiado/i }).waitFor({ state: 'visible', timeout: 5000 });
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'floating-help-expanded-mobile-light.png');
    });

    visualTest('floating help - expanded - mobile dark', async ({
      page,
      dashboardPage,
      db,
      visual,
    }) => {
      await db.clear();
      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      const helpButton = page.getByTestId('floating-help-button');
      await helpButton.click();
      await page.waitForTimeout(500);

      await page.getByRole('button', { name: /iniciar tour guiado/i }).waitFor({ state: 'visible', timeout: 5000 });
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'floating-help-expanded-mobile-dark.png');
    });
  });

  visualTest.describe('Page Tours Mobile', () => {
    visualTest('dashboard tour - step 1 - mobile light', async ({
      page,
      dashboardPage,
      db,
      visual,
    }) => {
      await db.clear();
      await db.seedAccounts([createAccount({ name: 'Nubank', balance: 500000 })]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Start tour via floating help
      const helpButton = page.getByTestId('floating-help-button');
      await helpButton.click();
      await page.waitForTimeout(300);

      const tourOption = page.getByRole('button', { name: /iniciar tour guiado/i });
      if (await tourOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tourOption.click();
        await page.waitForTimeout(500);

        // Check if tour started
        const tourOverlay = page.locator('[data-tour-active="true"]');
        if (await tourOverlay.isVisible({ timeout: 5000 }).catch(() => false)) {
          await visual.waitForStableUI(page);
          await visual.takeScreenshot(page, 'dashboard-tour-step1-mobile-light.png');
        }
      }
    });

    visualTest('dashboard tour - step 1 - mobile dark', async ({
      page,
      dashboardPage,
      db,
      visual,
    }) => {
      await db.clear();
      await db.seedAccounts([createAccount({ name: 'Nubank', balance: 500000 })]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      const helpButton = page.getByTestId('floating-help-button');
      await helpButton.click();
      await page.waitForTimeout(300);

      const tourOption = page.getByRole('button', { name: /iniciar tour guiado/i });
      if (await tourOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tourOption.click();
        await page.waitForTimeout(500);

        const tourOverlay = page.locator('[data-tour-active="true"]');
        if (await tourOverlay.isVisible({ timeout: 5000 }).catch(() => false)) {
          await visual.waitForStableUI(page);
          await visual.takeScreenshot(page, 'dashboard-tour-step1-mobile-dark.png');
        }
      }
    });

    visualTest('manage tour - step 1 - mobile light', async ({
      page,
      managePage,
      db,
      visual,
    }) => {
      await db.clear();
      await db.seedAccounts([createAccount({ name: 'Nubank', balance: 500000 })]);

      await managePage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      const helpButton = page.getByTestId('floating-help-button');
      await helpButton.click();
      await page.waitForTimeout(300);

      const tourOption = page.getByRole('button', { name: /iniciar tour guiado/i });
      if (await tourOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tourOption.click();
        await page.waitForTimeout(500);

        const tourOverlay = page.locator('[data-tour-active="true"]');
        if (await tourOverlay.isVisible({ timeout: 5000 }).catch(() => false)) {
          await visual.waitForStableUI(page);
          await visual.takeScreenshot(page, 'manage-tour-step1-mobile-light.png');
        }
      }
    });

    visualTest('manage tour - step 1 - mobile dark', async ({
      page,
      managePage,
      db,
      visual,
    }) => {
      await db.clear();
      await db.seedAccounts([createAccount({ name: 'Nubank', balance: 500000 })]);

      await managePage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      const helpButton = page.getByTestId('floating-help-button');
      await helpButton.click();
      await page.waitForTimeout(300);

      const tourOption = page.getByRole('button', { name: /iniciar tour guiado/i });
      if (await tourOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tourOption.click();
        await page.waitForTimeout(500);

        const tourOverlay = page.locator('[data-tour-active="true"]');
        if (await tourOverlay.isVisible({ timeout: 5000 }).catch(() => false)) {
          await visual.waitForStableUI(page);
          await visual.takeScreenshot(page, 'manage-tour-step1-mobile-dark.png');
        }
      }
    });
  });

  visualTest.describe('Notifications Mobile', () => {
    visualTest('notifications - mobile light empty', async ({ page, db, visual }) => {
      await db.clear();

      await page.goto('/notifications');
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'notifications-mobile-light-empty.png');
    });

    visualTest('notifications - mobile dark empty', async ({ page, db, visual }) => {
      await db.clear();

      await page.goto('/notifications');
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'notifications-mobile-dark-empty.png');
    });

    visualTest('notifications - mobile light with notification', async ({
      page,
      dashboardPage,
      visual,
    }) => {
      // Navigate to dashboard first to trigger welcome notification creation
      await dashboardPage.goto();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await page.goto('/notifications');
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'notifications-mobile-light-with-notification.png');
    });

    visualTest('notifications - mobile dark with notification', async ({
      page,
      dashboardPage,
      visual,
    }) => {
      // Navigate to dashboard first to trigger welcome notification creation
      await dashboardPage.goto();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await page.goto('/notifications');
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'notifications-mobile-dark-with-notification.png');
    });

    visualTest('notifications - mobile light read', async ({
      page,
      dashboardPage,
      visual,
    }) => {
      // Navigate to dashboard first to trigger welcome notification creation
      await dashboardPage.goto();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await page.goto('/notifications');
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Mark as read via the button
      const markAsReadButton = page.getByRole('button', { name: /marcar como lida/i });
      if (await markAsReadButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await markAsReadButton.tap();
        await page.waitForTimeout(500);
      }

      await visual.waitForStableUI(page);
      await visual.takeScreenshot(page, 'notifications-mobile-light-read.png');
    });

    visualTest('notifications - mobile dark read', async ({
      page,
      dashboardPage,
      visual,
    }) => {
      // Navigate to dashboard first to trigger welcome notification creation
      await dashboardPage.goto();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await page.goto('/notifications');
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      // Mark as read via the button
      const markAsReadButton = page.getByRole('button', { name: /marcar como lida/i });
      if (await markAsReadButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await markAsReadButton.tap();
        await page.waitForTimeout(500);
      }

      await visual.waitForStableUI(page);
      await visual.takeScreenshot(page, 'notifications-mobile-dark-read.png');
    });
  });

  visualTest.describe('Profile Mobile', () => {
    visualTest('profile - mobile light default', async ({ page, db, visual }) => {
      await db.clear();

      await page.goto('/profile');
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'profile-mobile-light-default.png');
    });

    visualTest('profile - mobile dark default', async ({ page, db, visual }) => {
      await db.clear();

      await page.goto('/profile');
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'profile-mobile-dark-default.png');
    });

    visualTest('profile - mobile light validation error', async ({ page, db, visual }) => {
      await db.clear();

      await page.goto('/profile');
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Clear name field and submit to trigger validation
      const nameInput = page.getByLabel(/^nome$/i);
      await nameInput.clear();
      await page.getByRole('button', { name: /salvar/i }).click();

      await page.waitForTimeout(500);
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'profile-mobile-light-validation-error.png');
    });

    visualTest('profile - mobile dark validation error', async ({ page, db, visual }) => {
      await db.clear();

      await page.goto('/profile');
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      const nameInput = page.getByLabel(/^nome$/i);
      await nameInput.clear();
      await page.getByRole('button', { name: /salvar/i }).click();

      await page.waitForTimeout(500);
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'profile-mobile-dark-validation-error.png');
    });
  });
});

unauthTest.describe('Mobile Visual Regression (Public Routes) @visual', () => {
  // Ensure we can see /login and /auth/confirm (authenticated contexts redirect away)
  unauthTest.use({ storageState: { cookies: [], origins: [] } });

  unauthTest('login - mobile light (initial)', async ({ page }) => {
    await page.goto('/login');
    await disableAnimations(page);
    await setTheme(page, 'light');
    await waitForStableUI(page);

    await unauthExpect(page.locator('#email')).toBeVisible();
    await unauthExpect(page).toHaveScreenshot('login-mobile-light-initial.png');
  });

  unauthTest('login - mobile dark (initial)', async ({ page }) => {
    await page.goto('/login');
    await disableAnimations(page);
    await setTheme(page, 'dark');
    await waitForStableUI(page);

    await unauthExpect(page.locator('#email')).toBeVisible();
    await unauthExpect(page).toHaveScreenshot('login-mobile-dark-initial.png');
  });

  unauthTest('auth confirm - expired link - mobile light', async ({ page }) => {
    await page.goto('/auth/confirm?error=otp_expired&error_description=expired');
    await disableAnimations(page);
    await setTheme(page, 'light');
    await waitForStableUI(page);

    await unauthExpect(page.getByRole('button', { name: /solicitar novo link|voltar para login/i })).toBeVisible();
    await unauthExpect(page).toHaveScreenshot('auth-confirm-mobile-light-expired.png');
  });

  unauthTest('auth confirm - expired link - mobile dark', async ({ page }) => {
    await page.goto('/auth/confirm?error=otp_expired&error_description=expired');
    await disableAnimations(page);
    await setTheme(page, 'dark');
    await waitForStableUI(page);

    await unauthExpect(page.getByRole('button', { name: /solicitar novo link|voltar para login/i })).toBeVisible();
    await unauthExpect(page).toHaveScreenshot('auth-confirm-mobile-dark-expired.png');
  });
});

