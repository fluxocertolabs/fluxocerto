/**
 * Page Object for the History (Projection Snapshots) page
 */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class HistoryPage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly emptyState: Locator;
  readonly snapshotCards: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageHeading = page.getByRole('heading', { name: /histórico de snapshots/i });
    this.emptyState = page.getByText(/nenhum snapshot salvo/i);
    this.snapshotCards = page.locator('[data-testid="snapshot-card"]');
    this.loadingIndicator = page.getByText(/carregando/i);
  }

  /**
   * Navigate to history page
   */
  async goto(): Promise<void> {
    await this.page.goto('/history');
    await this.pageHeading.waitFor({ state: 'visible', timeout: 20000 });
    
    // Wait for loading to complete - either we see snapshots, empty state, or loading finishes
    await expect(async () => {
      const isLoading = await this.loadingIndicator.isVisible().catch(() => false);
      const hasSnapshots = await this.snapshotCards.count() > 0;
      const hasEmptyState = await this.emptyState.isVisible().catch(() => false);
      // Content is loaded when not loading AND (has snapshots OR has empty state)
      expect(isLoading).toBe(false);
      expect(hasSnapshots || hasEmptyState).toBe(true);
    }).toPass({ timeout: 15000, intervals: [500, 1000, 2000] });
  }

  /**
   * Check if empty state is displayed
   * Waits briefly for the state to stabilize
   */
  async hasEmptyState(): Promise<boolean> {
    // Give UI a moment to settle after navigation
    await this.page.waitForTimeout(500);
    return this.emptyState.isVisible();
  }

  /**
   * Get the number of snapshot cards displayed
   */
  async getSnapshotCount(): Promise<number> {
    return this.snapshotCards.count();
  }

  /**
   * Click on a snapshot card by name
   */
  async clickSnapshot(name: string): Promise<void> {
    const card = this.page.locator('a', { hasText: name }).first();
    await card.click();
  }

  /**
   * Delete a snapshot by name
   */
  async deleteSnapshot(name: string): Promise<void> {
    // Find the card containing the snapshot name
    const card = this.page.locator('[data-testid="snapshot-card"]', { hasText: name }).first();
    
    // Click the delete button within that card
    const deleteButton = card.getByRole('button', { name: /excluir|delete/i });
    await deleteButton.click();
    
    // Confirm the deletion in the dialog (scoped to the alert dialog)
    const dialog = this.page.getByRole('alertdialog');
    const confirmButton = dialog.getByRole('button', { name: /excluir/i });
    await confirmButton.click();

    // Wait until the card is removed from the DOM
    await expect(
      this.page.locator('[data-testid="snapshot-card"]', { hasText: name })
    ).toHaveCount(0, { timeout: 10000 });
  }

  /**
   * Verify snapshot card is visible
   */
  async expectSnapshotVisible(name: string): Promise<void> {
    const snapshotLink = this.page.locator('a', { hasText: name });
    await expect(snapshotLink).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verify snapshot card is NOT visible (checks DOM count for reliability)
   */
  async expectSnapshotNotVisible(name: string): Promise<void> {
    const snapshotCard = this.page.locator('[data-testid="snapshot-card"]', { hasText: name });
    await expect(snapshotCard).toHaveCount(0, { timeout: 10000 });
  }
}

