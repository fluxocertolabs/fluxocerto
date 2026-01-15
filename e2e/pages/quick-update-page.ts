/**
 * Page Object for the Quick Update view
 * Note: QuickUpdate is a full-screen view, not a dialog/modal
 * Implements IQuickUpdatePage contract from specs/019-e2e-testing/contracts/page-objects.ts
 */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class QuickUpdatePage {
  readonly page: Page;
  readonly dialog: Locator;
  readonly completeButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // QuickUpdateView root container
    // Use accessible name ("Atualizar Saldos") to avoid matching unrelated dialogs.
    this.dialog = page.getByRole('dialog', { name: /atualizar saldos/i });
    // QuickUpdateView uses a header with "Concluir" and "Cancelar" buttons
    this.completeButton = this.dialog.getByRole('button', { name: /concluir|complete/i });
    this.cancelButton = this.dialog.getByRole('button', { name: /cancelar|cancel/i });
  }

  /**
   * Get the Quick Update view container
   * The view has a fixed inset-0 div that takes over the screen
   */
  private get view(): Locator {
    // The QuickUpdateView has a specific structure with header containing "Atualização Rápida"
    return this.page.locator('div.fixed.inset-0').filter({ hasText: /atualização rápida/i });
  }

  /**
   * Wait for Quick Update view to be visible and loaded
   */
  async waitForModal(): Promise<void> {
    // Wait for the view container and the "Concluir" button which indicate the view is loaded
    await expect(this.dialog).toBeVisible({ timeout: 20000 });
    await expect(this.completeButton).toBeVisible({ timeout: 20000 });
    // Also wait for the content to load (either balance items or empty state).
    // IMPORTANT: Scope to the QuickUpdate dialog to avoid matching dashboard status wrappers.
    const loadingStatus = this.dialog.locator('[role="status"][aria-live="polite"]').first();

    // Give the app a moment to render the status region inside the dialog.
    await Promise.race([this.page.waitForLoadState('domcontentloaded'), this.page.waitForTimeout(5000)]);

    if (await loadingStatus.count()) {
      // Wait for loading state to complete (aria-busy becomes "false")
      await expect(loadingStatus).toHaveAttribute('aria-busy', 'false', { timeout: 20000 });
    }

    // Ensure we have either:
    // - at least one balance input (accounts/cards), OR
    // - the empty state heading
    await expect(async () => {
      const hasAnyBalanceInput = (await this.dialog.locator('input[aria-label^="Saldo de"]').count()) > 0;
      const hasEmptyState = (await this.dialog.getByRole('heading', { name: /nenhuma conta ou cartão de crédito/i }).count()) > 0;
      expect(hasAnyBalanceInput || hasEmptyState).toBe(true);
    }).toPass({ timeout: 20000, intervals: [500, 1000, 2000] });
    
    // Small delay to ensure animations complete
    await this.page.waitForTimeout(500);
  }

  /**
   * Update balance for an account inline
   * The balance inputs have aria-label like "Saldo de {name}"
   */
  async updateAccountBalance(name: string, newBalance: string): Promise<void> {
    // Find the input with exact aria-label match to avoid matching similar names
    // e.g., "Nubank" should not match "Nubank Platinum"
    // Use .last() to get the actual input (not skeleton) if there are duplicates
    const balanceInput = this.page.getByLabel(`Saldo de ${name}`, { exact: true }).last();
    await balanceInput.clear();
    await balanceInput.fill(newBalance);
    // Trigger blur to save
    await balanceInput.blur();
    // Wait a moment for auto-save
    await this.page.waitForTimeout(300);
  }

  /**
   * Update balance for a credit card inline
   */
  async updateCreditCardBalance(name: string, newBalance: string): Promise<void> {
    // Same as account - the input has aria-label "Saldo de {name}"
    // Use .last() to get the actual input (not skeleton) if there are duplicates
    const balanceInput = this.page.getByLabel(`Saldo de ${name}`, { exact: true }).last();
    await balanceInput.clear();
    await balanceInput.fill(newBalance);
    // Trigger blur to save
    await balanceInput.blur();
    // Wait a moment for auto-save
    await this.page.waitForTimeout(300);
  }

  /**
   * Click complete/done button
   * Note: QuickUpdate auto-saves on blur, so "Concluir" just closes the view
   */
  async complete(): Promise<void> {
    await this.completeButton.click();
    // Wait for view to close (button text may change to "Salvando..." while still open)
    await expect(this.dialog).not.toBeVisible({ timeout: 25000 });
  }

  /**
   * Click cancel button to close without marking as updated
   */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.dialog).not.toBeVisible({ timeout: 25000 });
  }

  /**
   * Verify view is closed (we're back on dashboard)
   */
  async expectModalClosed(): Promise<void> {
    await expect(this.dialog).not.toBeVisible();
  }

  /**
   * Verify all listed accounts are present
   */
  async expectAccountsListed(accountNames: string[]): Promise<void> {
    for (const name of accountNames) {
      // Look for the account name text in the view
      await expect(this.page.getByText(name).first()).toBeVisible();
    }
  }

  /**
   * Verify all listed credit cards are present
   */
  async expectCardsListed(cardNames: string[]): Promise<void> {
    for (const name of cardNames) {
      // Look for the card name text in the view
      await expect(this.page.getByText(name).first()).toBeVisible();
    }
  }

  /**
   * Wait for a specific item name to be visible within the Quick Update dialog.
   */
  async waitForItem(name: string): Promise<void> {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const item = this.dialog.getByText(new RegExp(escaped, 'i')).first();
    await expect(item).toBeVisible({ timeout: 20000 });
  }

  /**
   * Update balance for any item (account or credit card) by name
   */
  async updateBalance(name: string, newBalance: string): Promise<void> {
    // Find the input with aria-label like "Saldo de {name}"
    // Use partial match since the name might include a prefix
    const balanceInput = this.page.getByLabel(new RegExp(`Saldo de.*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')).last();
    await balanceInput.clear();
    await balanceInput.fill(newBalance);
    // Trigger blur to save
    await balanceInput.blur();
    // Wait a moment for auto-save
    await this.page.waitForTimeout(300);
  }

  /**
   * Save changes (same as complete)
   */
  async save(): Promise<void> {
    await this.complete();
  }

  /**
   * Check if modal is currently visible
   */
  async isModalVisible(): Promise<boolean> {
    return await this.dialog.isVisible().catch(() => false);
  }
}

