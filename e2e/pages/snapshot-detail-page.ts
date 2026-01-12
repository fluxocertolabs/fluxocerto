/**
 * Page Object for the Snapshot Detail page
 */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class SnapshotDetailPage {
  readonly page: Page;
  readonly historicalBanner: Locator;
  readonly historicalBannerTitle: Locator;
  readonly backButton: Locator;
  readonly deleteButton: Locator;
  readonly cashflowChart: Locator;
  readonly summaryPanel: Locator;
  readonly notFoundMessage: Locator;
  readonly errorMessage: Locator;
  readonly loadingSkeleton: Locator;

  private get isPerTestContext(): boolean {
    return process.env.PW_PER_TEST_CONTEXT === '1';
  }

  constructor(page: Page) {
    this.page = page;
    // The banner is a Card with bg-muted/50 containing the snapshot info
    this.historicalBanner = page.locator('[data-testid="historical-banner"]');
    // The title h1 contains "Projeção Histórica: {name}"
    this.historicalBannerTitle = this.historicalBanner.locator('h1');
    this.backButton = page.getByRole('button', { name: /voltar/i });
    this.deleteButton = page.getByRole('button', { name: /excluir/i }).first();
    this.cashflowChart = page.locator('[data-testid="cashflow-chart"], .recharts-wrapper').first();
    this.summaryPanel = page.locator('[data-testid="summary-panel"], .summary-panel').first();
    this.notFoundMessage = page.getByText(/projeção não encontrada/i);
    this.errorMessage = page.locator('.text-destructive').first();

    // Loading skeleton uses animate-pulse class
    this.loadingSkeleton = page.locator('.animate-pulse').first();
  }

  /**
   * Navigate to snapshot detail page by ID
   */
  async goto(snapshotId: string): Promise<void> {
    // Use networkidle for more reliable page load detection in per-test context mode
    await this.page.goto(`/history/${snapshotId}`, { 
      waitUntil: this.isPerTestContext ? 'networkidle' : 'load' 
    });
    
    // Wait for final state to be visible - either banner (success) or not found (error)
    // Use a single polling assertion for efficiency
    await expect(async () => {
      const hasBanner = await this.historicalBanner.isVisible().catch(() => false);
      const hasNotFound = await this.notFoundMessage.isVisible().catch(() => false);
      
      // We should see either banner or not found
      expect(hasBanner || hasNotFound, 'Page should show either historical banner or not found message').toBe(true);
    }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });
  }

  /**
   * Check if the historical banner is displayed
   * Waits for UI to stabilize (navigation to /history/:id can render the URL before data finishes loading)
   */
  async hasHistoricalBanner(timeout: number = 10000): Promise<boolean> {
    try {
      await this.historicalBanner.waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the snapshot name from the historical banner
   */
  async getSnapshotName(): Promise<string | null> {
    const text = await this.historicalBannerTitle.textContent();
    if (!text) return null;

    // Extract name from "Projeção Histórica: <name>" in a case-insensitive way
    const match = text.match(/projeção histórica:\s*(.+)/i);
    return match ? match[1].trim() : null;
  }

  /**
   * Click the back button to return to history
   */
  async goBack(): Promise<void> {
    await this.backButton.click();
    await this.page.waitForURL('/history');
  }

  /**
   * Delete the current snapshot
   */
  async deleteSnapshot(): Promise<void> {
    // Ensure delete button is visible and clickable before clicking
    await expect(this.deleteButton).toBeVisible({ timeout: 15000 });
    await this.deleteButton.click();
    
    // Confirm the deletion in the dialog (scoped to the alert dialog)
    const dialog = this.page.getByRole('alertdialog');
    const confirmButton = dialog.getByRole('button', { name: /excluir/i });
    await expect(dialog).toBeVisible({ timeout: 15000 });
    await expect(confirmButton).toBeVisible({ timeout: 10000 });
    await expect(confirmButton).toBeEnabled({ timeout: 10000 });

    // Click confirm and wait for redirect using polling assertion
    // This is more robust than Promise.all with waitForURL
    await confirmButton.click();
    
    // Use polling assertion to wait for URL change - more robust than waitForURL
    const redirectTimeout = this.isPerTestContext ? 45000 : 20000;
    await expect(this.page).toHaveURL(/\/history$/, { timeout: redirectTimeout });
  }

  /**
   * Verify chart is rendered
   * Recharts renders SVG elements that may have visibility:hidden when empty.
   * We check for the chart wrapper AND that it contains rendered path data.
   */
  async expectChartRendered(): Promise<void> {
    await expect(this.cashflowChart).toBeVisible({ timeout: 10000 });
    
    // Wait for the chart to render with actual data
    // Recharts creates <path> elements with 'd' attribute containing the actual line/area data
    // When there's no data or only 1 point, the path may be empty or have visibility:hidden
    await expect(async () => {
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
        // Check for any SVG content
        const svg = wrapper.locator('svg');
        await expect(svg).toBeVisible();
      }
    }).toPass({ timeout: 15000, intervals: [500, 1000, 2000] });
  }

  /**
   * Verify summary panel is rendered
   */
  async expectSummaryRendered(): Promise<void> {
    await expect(this.summaryPanel).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verify not found state
   */
  async expectNotFound(): Promise<void> {
    await expect(this.notFoundMessage).toBeVisible({ timeout: 10000 });
  }
}

