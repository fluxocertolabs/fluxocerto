/**
 * Page Object for the Quick Update view
 * Note: QuickUpdate is a full-screen view, not a dialog/modal
 * Implements IQuickUpdatePage contract from specs/019-e2e-testing/contracts/page-objects.ts
 */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class QuickUpdatePage {
  readonly page: Page;
  readonly completeButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // QuickUpdateView uses a header with "Concluir" and "Cancelar" buttons
    this.completeButton = page.getByRole('button', { name: /concluir|complete/i });
    this.cancelButton = page.getByRole('button', { name: /cancelar|cancel/i });
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
   * Wait for Quick Update view to be visible
   */
  async waitForModal(): Promise<void> {
    // Wait for the "Concluir" button which indicates the view is loaded
    await expect(this.completeButton).toBeVisible({ timeout: 10000 });
    // Also wait for the content to load (either balance items or empty state)
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Update balance for an account inline
   * The balance inputs have aria-label like "Saldo de {name}"
   */
  async updateAccountBalance(name: string, newBalance: string): Promise<void> {
    // Find the input with exact aria-label match to avoid matching similar names
    // e.g., "Nubank" should not match "Nubank Platinum"
    const balanceInput = this.page.getByLabel(`Saldo de ${name}`, { exact: true });
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
    const balanceInput = this.page.getByLabel(`Saldo de ${name}`, { exact: true });
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
    // Wait for view to close
    await expect(this.completeButton).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Click cancel button to close without marking as updated
   */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
    // Wait for view to close
    await expect(this.cancelButton).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Verify view is closed (we're back on dashboard)
   */
  async expectModalClosed(): Promise<void> {
    await expect(this.completeButton).not.toBeVisible();
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
}

