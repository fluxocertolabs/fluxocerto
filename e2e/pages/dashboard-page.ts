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
  readonly emptyState: Locator;
  readonly chartErrorHeading: Locator;
  readonly chartRetryButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Try multiple selectors for chart
    this.cashflowChart = page.locator('[data-testid="cashflow-chart"], .recharts-wrapper').first();
    this.summaryPanel = page.locator('[data-testid="summary-panel"], .summary-panel').first();
    this.healthIndicator = page.locator('[data-testid="health-indicator"]');
    this.quickUpdateButton = page.getByRole('button', { name: /atualizar saldos/i });
    // Empty state shows "Nenhum Dado Financeiro Ainda" heading
    this.emptyState = page.getByRole('heading', { name: /nenhum dado financeiro/i });
    this.chartErrorHeading = page.getByRole('heading', { name: /não foi possível carregar a projeção/i });
    this.chartRetryButton = page.getByRole('button', { name: /tentar novamente/i });
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
    
    // Wait for the dashboard heading to be visible - this ALWAYS renders
    // regardless of loading/empty/error state, proving React has mounted
    const dashboardHeading = this.page.getByRole('heading', { name: /painel de fluxo de caixa/i });
    await dashboardHeading.waitFor({ state: 'visible', timeout: 20000 });
    
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
    await this.page.waitForLoadState('networkidle');
    
    // Use retry logic to handle race conditions where button may not be immediately visible
    await expect(async () => {
      await expect(this.quickUpdateButton).toBeVisible();
    }).toPass({ timeout: 20000 });
    
    await this.quickUpdateButton.click();
  }

  /**
   * Verify cashflow chart is rendered with data points
   */
  async expectChartRendered(): Promise<void> {
    await expect(async () => {
      // Handle transient realtime failures by retrying when the error state is visible
      if (await this.chartErrorHeading.isVisible().catch(() => false)) {
        await this.chartRetryButton.click();
        await this.page.waitForTimeout(500);
      }

      await expect(this.cashflowChart).toBeVisible({ timeout: 5000 });
      // Check for chart elements (lines, areas, etc.)
      const chartElement = this.page.locator('.recharts-line, .recharts-area, .recharts-bar').first();
      await expect(chartElement).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 20000 });
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
    const staleWarning = this.page.getByText(/desatualizado|stale|outdated/i);
    return staleWarning.isVisible();
  }
}

