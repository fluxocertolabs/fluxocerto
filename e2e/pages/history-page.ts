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
    
    // Wait for loading to complete
    await expect(async () => {
      const isLoading = await this.loadingIndicator.isVisible().catch(() => false);
      expect(isLoading).toBe(false);
    }).toPass({ timeout: 15000, intervals: [500, 1000, 2000] });
  }

  /**
   * Check if empty state is displayed
   */
  async hasEmptyState(): Promise<boolean> {
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
    
    // Confirm the deletion in the dialog
    const confirmButton = this.page.getByRole('button', { name: /excluir/i }).last();
    await confirmButton.click();
  }

  /**
   * Verify snapshot card is visible
   */
  async expectSnapshotVisible(name: string): Promise<void> {
    const snapshotLink = this.page.locator('a', { hasText: name });
    await expect(snapshotLink).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verify snapshot card is NOT visible
   */
  async expectSnapshotNotVisible(name: string): Promise<void> {
    const snapshotLink = this.page.locator('a', { hasText: name });
    await expect(snapshotLink).not.toBeVisible({ timeout: 10000 });
  }
}

