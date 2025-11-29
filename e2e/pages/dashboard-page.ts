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

  constructor(page: Page) {
    this.page = page;
    // Try multiple selectors for chart
    this.cashflowChart = page.locator('[data-testid="cashflow-chart"], .recharts-wrapper').first();
    this.summaryPanel = page.locator('[data-testid="summary-panel"], .summary-panel').first();
    this.healthIndicator = page.locator('[data-testid="health-indicator"]');
    this.quickUpdateButton = page.getByRole('button', { name: /atualizar saldos/i });
    // Empty state shows guidance text
    this.emptyState = page.getByText(/adicione suas contas|nenhum dado|começar/i);
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
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if dashboard displays empty state
   */
  async hasEmptyState(): Promise<boolean> {
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
    await this.quickUpdateButton.click();
  }

  /**
   * Verify cashflow chart is rendered with data points
   */
  async expectChartRendered(): Promise<void> {
    await expect(this.cashflowChart).toBeVisible();
    // Check for chart elements (lines, areas, etc.)
    const chartElement = this.page.locator('.recharts-line, .recharts-area, .recharts-bar').first();
    await expect(chartElement).toBeVisible();
  }

  /**
   * Get the displayed income total from summary panel
   */
  async getIncomeTotal(): Promise<string> {
    const incomeElement = this.page.locator('[data-testid="income-total"], .income-total').first();
    const text = await incomeElement.textContent();
    return text?.trim() ?? '';
  }

  /**
   * Get the displayed expense total from summary panel
   */
  async getExpenseTotal(): Promise<string> {
    const expenseElement = this.page.locator('[data-testid="expense-total"], .expense-total').first();
    const text = await expenseElement.textContent();
    return text?.trim() ?? '';
  }

  /**
   * Check if stale data warning indicator is visible
   */
  async hasStaleWarning(): Promise<boolean> {
    const staleWarning = this.page.getByText(/desatualizado|stale|outdated/i);
    return staleWarning.isVisible();
  }
}

