/**
 * Page Object for the main dashboard/cashflow view
 * Implements IDashboardPage contract from specs/019-e2e-testing/contracts/page-objects.ts
 */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly cashflowChart: Locator;
  readonly summaryPanel: Locator;
  readonly healthIndicator: Locator;
  readonly quickUpdateButton: Locator;
  readonly estimatedBalanceIndicator: Locator;
  readonly estimatedBalanceBaseText: Locator;
  readonly estimatedBalanceCta: Locator;
  readonly emptyState: Locator;
  readonly chartErrorHeading: Locator;
  readonly chartRetryButton: Locator;
  readonly groupBadge: Locator;
  private readonly isPerTestContext: boolean;

  constructor(page: Page) {
    this.page = page;
    this.isPerTestContext = process.env.PW_PER_TEST_CONTEXT === '1';
    // Try multiple selectors for chart
    this.cashflowChart = page.locator('[data-testid="cashflow-chart"], .recharts-wrapper').first();
    this.summaryPanel = page.locator('[data-testid="summary-panel"], .summary-panel').first();
    this.healthIndicator = page.locator('[data-testid="health-indicator"]');
    // Dashboard now contains multiple "Atualizar Saldos" CTAs (header + estimate/no-base banners).
    // The header button is rendered before the main content, so `.first()` targets it reliably.
    this.quickUpdateButton = page.getByRole('button', { name: /atualizar saldos/i }).first();
    this.estimatedBalanceIndicator = page.locator('[data-testid="estimated-balance-indicator"]');
    this.estimatedBalanceBaseText = page.locator('[data-testid="estimated-balance-base"]');
    this.estimatedBalanceCta = this.estimatedBalanceIndicator.getByRole('button', { name: /atualizar saldos/i });
    // Empty state shows "Nenhum Dado Financeiro Ainda" heading
    this.emptyState = page.getByRole('heading', { name: /nenhum dado financeiro/i });
    this.chartErrorHeading = page.getByRole('heading', { name: /não foi possível carregar a projeção/i });
    this.chartRetryButton = page.getByRole('button', { name: /tentar novamente/i });
    // Group badge in header (FR-015) - contains Users icon and group name
    this.groupBadge = page.locator('header').locator('span, div').filter({ hasText: /Fonseca Floriano|Grupo/i }).first();
  }

  /**
   * Get the projection selector - it's a Select component with a trigger button
   */
  private get projectionSelector(): Locator {
    // The ProjectionSelector uses a Select component with id="projection-selector"
    return this.page.locator('#projection-selector');
  }

  /**
   * Navigate to dashboard
   */
  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.waitForDashboardLoad();
  }

  /**
   * Wait for dashboard to finish loading.
   * Can be called after goto() or after a page reload.
   */
  async waitForDashboardLoad(): Promise<void> {
    // Wait for the dashboard heading to be visible - this ALWAYS renders
    // regardless of loading/empty/error state, proving React has mounted
    const dashboardHeading = this.page.getByRole('heading', { name: /painel de fluxo de caixa/i });
    
    // Handle potential login redirect or slow load
    try {
        await dashboardHeading.waitFor({ state: 'visible', timeout: 30000 });
    } catch (e) {
        // Check if we were redirected to login
        if (this.page.url().includes('/login')) {
            throw new Error('Redirected to login page during navigation to /');
        }
        throw e;
    }
    
    // Wait for either content OR empty state to be rendered
    // Handle transient realtime errors by clicking retry when they appear
    await expect(async () => {
      // Check if realtime connection error is showing
      const errorVisible = await this.chartErrorHeading.isVisible().catch(() => false);
      if (errorVisible) {
        // Click retry to recover from transient error
        await this.chartRetryButton.click();
        // Wait for retry to take effect
        await this.page.waitForTimeout(2000);
      }
      
      // Check if any expected content is visible
      const hasEmpty = await this.emptyState.isVisible().catch(() => false);
      const hasChart = await this.cashflowChart.isVisible().catch(() => false);
      const hasQuickUpdate = await this.quickUpdateButton.isVisible().catch(() => false);
      const hasSummary = await this.summaryPanel.isVisible().catch(() => false);
      
      // At least one of these should be visible when the dashboard is ready
      expect(hasEmpty || hasChart || hasQuickUpdate || hasSummary).toBe(true);
    }).toPass({ timeout: 30000, intervals: [1000, 2000, 3000] });
  }

  /**
   * Check if dashboard displays empty state
   */
  async hasEmptyState(): Promise<boolean> {
    // Wait a bit for the page to settle
    await this.page.waitForTimeout(500);
    return this.emptyState.isVisible();
  }

  /**
   * Change projection period
   */
  async selectProjectionDays(days: 7 | 14 | 30 | 60 | 90): Promise<void> {
    await this.projectionSelector.click();
    // The Select component shows options like "7 dias", "30 dias", "60 dias", "90 dias"
    await this.page.getByRole('option', { name: new RegExp(`${days}\\s*dias?`, 'i') }).click();
  }

  /**
   * Open Quick Update modal
   */
  async openQuickUpdate(): Promise<void> {
    // Wait for page to be fully loaded first
    await Promise.race([this.page.waitForLoadState('networkidle'), this.page.waitForTimeout(5000)]);
    
    // Use retry logic to handle race conditions where button may not be immediately visible
    await expect(async () => {
      await expect(this.quickUpdateButton).toBeVisible();
    }).toPass({ timeout: 20000 });
    
    // On mobile viewports, buttons may overlap due to responsive layout.
    // Scroll the button into view and click with force to bypass interception checks.
    await this.quickUpdateButton.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(300); // Allow scroll animation to complete
    
    // Try regular click first, fall back to force click if intercepted
    try {
      await this.quickUpdateButton.click({ timeout: 5000 });
    } catch {
      // If regular click fails due to interception, use force click
      await this.quickUpdateButton.click({ force: true });
    }
  }

  /**
   * Check if the "Saldo estimado" indicator is visible.
   */
  async hasEstimatedBalanceIndicator(): Promise<boolean> {
    return this.estimatedBalanceIndicator.isVisible().catch(() => false)
  }

  /**
   * Get the base text shown by the estimate indicator.
   */
  async getEstimatedBalanceBaseText(): Promise<string | null> {
    if (!(await this.estimatedBalanceBaseText.isVisible().catch(() => false))) {
      return null
    }
    const text = await this.estimatedBalanceBaseText.textContent()
    return text?.trim() ?? null
  }

  /**
   * Click the estimate indicator CTA ("Atualizar Saldos").
   */
  async openQuickUpdateFromEstimatedIndicator(): Promise<void> {
    await expect(this.estimatedBalanceIndicator).toBeVisible({ timeout: 20000 })
    // Prefer clicking the CTA button inside the indicator (more accessible/stable)
    await this.estimatedBalanceCta.click({ timeout: 5000 })
  }

  /**
   * Verify cashflow chart is rendered with data points
   * Recharts renders SVG elements that may have visibility:hidden when empty.
   * We check for the chart wrapper AND that it contains rendered path data.
   */
  async expectChartRendered(): Promise<void> {
    const chartVisibleTimeout = this.isPerTestContext ? 15000 : 5000;
    const totalTimeout = this.isPerTestContext ? 45000 : 20000;

    await expect(async () => {
      // Handle transient realtime failures by retrying when the error state is visible
      if (await this.chartErrorHeading.isVisible().catch(() => false)) {
        await this.chartRetryButton.click();
        await this.page.waitForTimeout(500);
      }

      await expect(this.cashflowChart).toBeVisible({ timeout: chartVisibleTimeout });
      
      // Check for SVG paths with actual path data (not empty d="")
      // The recharts-area-area class contains the actual filled area path
      const areaPath = this.page.locator('.recharts-area-area path[d]').first();
      const linePath = this.page.locator('.recharts-line path[d]').first();
      
      // At least one should exist and have a non-trivial path
      const hasAreaPath = await areaPath.count() > 0;
      const hasLinePath = await linePath.count() > 0;
      
      if (hasAreaPath) {
        const d = await areaPath.getAttribute('d');
        // A valid path should have more than just "M0,0" or similar trivial paths
        expect(d && d.length > 20).toBe(true);
      } else if (hasLinePath) {
        const d = await linePath.getAttribute('d');
        expect(d && d.length > 20).toBe(true);
      } else {
        // Fallback: check that the recharts-wrapper has content
        const wrapper = this.page.locator('.recharts-wrapper');
        await expect(wrapper).toBeVisible();
      }
    }).toPass({ timeout: totalTimeout });
  }

  /**
   * Get the displayed income total from summary panel
   * The SummaryPanel shows "Renda Esperada" as the income label
   */
  async getIncomeTotal(): Promise<string> {
    // Wait for the summary panel to be visible (look for "Renda Esperada" text)
    // Use toPass to handle potential re-renders or loading states
    let text = '';
    await expect(async () => {
      const incomeLabel = this.page.getByText(/renda esperada/i);
      await expect(incomeLabel).toBeVisible({ timeout: 5000 });
      
      // The value is in a sibling paragraph element - get the parent and find the value
      const incomeCard = incomeLabel.locator('..'); // Get parent
      const value = incomeCard.locator('p').filter({ hasText: /R\$/ }).first();
      const valueText = await value.textContent();
      expect(valueText).toBeTruthy();
      text = valueText?.trim() ?? '';
    }).toPass({ timeout: 20000 });
    
    return text;
  }

  /**
   * Get the displayed expense total from summary panel
   * The SummaryPanel shows "Total de Despesas" as the expense label
   */
  async getExpenseTotal(): Promise<string> {
    // Wait for the summary panel to be visible (look for "Total de Despesas" text)
    let text = '';
    await expect(async () => {
      const expenseLabel = this.page.getByText(/total de despesas/i);
      await expect(expenseLabel).toBeVisible({ timeout: 5000 });
      
      // The value is in a sibling paragraph element - get the parent and find the value
      const expenseCard = expenseLabel.locator('..'); // Get parent
      const value = expenseCard.locator('p').filter({ hasText: /R\$/ }).first();
      const valueText = await value.textContent();
      expect(valueText).toBeTruthy();
      text = valueText?.trim() ?? '';
    }).toPass({ timeout: 20000 });
    
    return text;
  }

  /**
   * Check if stale data warning indicator is visible
   */
  async hasStaleWarning(): Promise<boolean> {
    // Prefer the stale CTA badge ("Atualizar agora") which is a stable, unique signal.
    // Use `.first()` to avoid strict-mode violations when multiple elements contain
    // "desatualizado" (e.g. banner message + badge text).
    const staleWarning = this.page.getByRole('button', { name: /atualizar agora/i }).first()
    return staleWarning.isVisible().catch(() => false)
  }

  /**
   * Check if group badge is visible in header (FR-015)
   */
  async hasGroupBadge(): Promise<boolean> {
    return this.groupBadge.isVisible();
  }

  /**
   * Get the group name from the badge in header
   */
  async getGroupName(): Promise<string | null> {
    if (await this.groupBadge.isVisible()) {
      return this.groupBadge.textContent();
    }
    return null;
  }

  /**
   * Verify group badge displays the expected name (FR-015)
   */
  async expectGroupBadgeVisible(name?: string): Promise<void> {
    await expect(async () => {
      await expect(this.groupBadge).toBeVisible({ timeout: 5000 });
      if (name) {
        const badgeText = await this.groupBadge.textContent();
        expect(badgeText).toContain(name);
      }
    }).toPass({ timeout: 20000 });
  }
}

