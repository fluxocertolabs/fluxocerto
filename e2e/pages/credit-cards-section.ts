/**
 * Section object for credit card management
 * Implements ICreditCardsSection contract from specs/019-e2e-testing/contracts/page-objects.ts
 */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class CreditCardsSection {
  readonly page: Page;
  readonly cardList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cardList = page.locator('[data-testid="credit-cards-list"], .credit-cards-list').first();
  }

  private get creditCardDialog(): Locator {
    // Be specific: multiple dialogs can exist in the DOM (e.g. onboarding wizard).
    // This dialog is uniquely identified by the credit card form fields.
    return this.page
      .getByRole('dialog')
      .filter({ has: this.page.locator('input#name') })
      .filter({ has: this.page.locator('#statementBalance') })
      .filter({ has: this.page.locator('input#dueDay') });
  }

  /**
   * Get the add button - uses the one in the header
   */
  private get addButton(): Locator {
    // IMPORTANT:
    // Prefer the header action ("Adicionar Cartão de Crédito") instead of the
    // empty-state CTA ("Adicionar Cartão"). When tabs are not active, Radix can
    // keep off-screen content in the DOM, which makes `.first()` sometimes pick
    // a hidden button and wait ~30s for it to become actionable under CI load.
    return this.page.getByRole('button', { name: /adicionar cartão de crédito/i }).first();
  }

  /**
   * Click add new credit card button
   */
  async clickAdd(): Promise<void> {
    await expect(this.addButton).toBeVisible({ timeout: 15000 });
    // This button opens a dialog (SPA state) and should not trigger a navigation.
    // Under CI load, Playwright can sometimes detect a "scheduled navigation" from
    // unrelated router work and hang here. Avoid waiting for navigation.
    await this.addButton.click({ timeout: 15000, noWaitAfter: true });
  }

  /**
   * Create a new credit card entry
   */
  async createCreditCard(data: {
    name: string;
    balance: string;
    dueDay: string;
  }): Promise<void> {
    // Ensure the tab content + header actions have rendered before trying to click.
    // Under high parallel load, this avoids the default 30s action timeout on click().
    await this.waitForLoad();
    await this.clickAdd();

    // Wait for dialog to open
    const dialog = this.creditCardDialog;
    await expect(dialog).toBeVisible({ timeout: 15000 });

    // Fill form fields within dialog
    const nameInput = dialog.locator('input#name');
    const balanceInput = dialog.locator('#statementBalance');
    const dueDayInput = dialog.locator('input#dueDay');

    await expect(async () => {
      await expect(nameInput).toBeVisible({ timeout: 2000 });
      await nameInput.fill(data.name, { timeout: 2000 });
      await expect(nameInput).toHaveValue(data.name, { timeout: 2000 });
    }).toPass({ timeout: 15000, intervals: [250, 500, 1000] });

    await expect(async () => {
      await expect(balanceInput).toBeVisible({ timeout: 2000 });
      await balanceInput.fill(data.balance, { timeout: 2000 });
      await expect(balanceInput).toHaveValue(/\d/, { timeout: 2000 });
    }).toPass({ timeout: 15000, intervals: [250, 500, 1000] });

    await expect(async () => {
      await expect(dueDayInput).toBeVisible({ timeout: 2000 });
      await dueDayInput.fill(data.dueDay, { timeout: 2000 });
      await expect(dueDayInput).toHaveValue(data.dueDay, { timeout: 2000 });
    }).toPass({ timeout: 15000, intervals: [250, 500, 1000] });
    await dueDayInput.blur().catch(() => {});

    // Submit
    const submitButton = dialog.locator('button[type="submit"]').first();
    await expect(submitButton).toBeEnabled({ timeout: 10000 });
    await submitButton.click({ noWaitAfter: true });

    // Wait for dialog close; fail fast if the page surfaces an error message.
    const pageError = this.page.locator('div.bg-destructive\\/10.border-destructive\\/20').first();
    await expect(async () => {
      if (await pageError.isVisible().catch(() => false)) {
        const message = (await pageError.textContent().catch(() => null))?.trim() || 'Unknown error';
        throw new Error(`Credit card submit failed: ${message}`);
      }
      if (await dialog.isVisible().catch(() => false)) {
        throw new Error('Dialog still visible');
      }
    }).toPass({ timeout: 30000, intervals: [250, 500, 1000, 2000] });
  }

  /**
   * Edit credit card by clicking edit button in dropdown menu
   */
  private async editCreditCard(name: string): Promise<void> {
    // Find the card containing the name - use more specific selector
    const cardElement = this.page.locator('div.group.relative').filter({ 
      has: this.page.getByRole('heading', { name, level: 3 }) 
    }).first();
    
    // Wait for the card to be visible
    await expect(cardElement).toBeVisible({ timeout: 10000 });
    
    // Hover to reveal actions
    await cardElement.hover();
    
    // Wait a moment for hover effects
    await this.page.waitForTimeout(200);
    
    // Click more options button
    await cardElement.getByRole('button', { name: /mais opções|more/i }).click();
    
    // Click "Editar"
    await this.page.getByRole('button', { name: /editar/i }).click();
    
    // Wait for dialog
    await expect(this.page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  }

  /**
   * Edit credit card due day
   */
  async updateDueDay(name: string, newDueDay: string): Promise<void> {
    await this.editCreditCard(name);
    const dialog = this.creditCardDialog;
    const dueDayInput = dialog.getByLabel(/dia.*vencimento/i);
    await dueDayInput.clear();
    await dueDayInput.fill(newDueDay);
    await dialog.getByRole('button', { name: /salvar|atualizar/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Update credit card statement balance
   */
  async updateCardBalance(name: string, newBalance: string): Promise<void> {
    await this.editCreditCard(name);
    const dialog = this.creditCardDialog;
    const balanceInput = dialog.getByLabel(/saldo.*fatura/i);
    await balanceInput.clear();
    await balanceInput.fill(newBalance);
    await dialog.getByRole('button', { name: /salvar|atualizar/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Delete credit card with confirmation dialog
   */
  async deleteCard(name: string): Promise<void> {
    // Find the card containing the name - use more specific selector
    const cardElement = this.page.locator('div.group.relative').filter({ 
      has: this.page.getByRole('heading', { name, level: 3 }) 
    }).first();
    
    // Wait for the card to be visible
    await expect(cardElement).toBeVisible({ timeout: 10000 });
    
    // Hover to reveal actions
    await cardElement.hover();
    
    // Wait a moment for hover effects
    await this.page.waitForTimeout(200);
    
    // Click more options button
    await cardElement.getByRole('button', { name: /mais opções|more/i }).click();
    
    // Click "Excluir"
    await this.page.getByRole('button', { name: /excluir/i }).click();
    
    // Wait for confirmation and confirm
    const confirmDialog = this.page.getByRole('alertdialog').or(this.page.getByRole('dialog'));
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    await confirmDialog.getByRole('button', { name: /confirmar|sim|yes|excluir/i }).click();
    await expect(confirmDialog).not.toBeVisible({ timeout: 5000 });
    
    // Wait for UI to update
    await this.page.waitForTimeout(500);
    await Promise.race([this.page.waitForLoadState('networkidle'), this.page.waitForTimeout(5000)]);
  }

  /**
   * Wait for credit cards to load
   */
  async waitForLoad(): Promise<void> {
    // Wait for content to appear
    await Promise.race([
      // Wait for card items
      this.page.locator('div.group.relative').filter({
        has: this.page.getByRole('heading', { level: 3 })
      }).first().waitFor({ state: 'visible', timeout: 30000 }),
      // Or empty state / add button
      this.page.getByText(/nenhum cartão/i).waitFor({ state: 'visible', timeout: 30000 }),
      this.addButton.waitFor({ state: 'visible', timeout: 30000 }),
    ]).catch(() => {
      // Content might already be visible
    });
  }

  /**
   * Verify credit card is visible in list
   */
  async expectCardVisible(name: string): Promise<void> {
    await this.waitForLoad();
    const card = this.page.getByText(name, { exact: true }).first();
    await expect(card).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verify credit card is not visible in list
   */
  async expectCardNotVisible(name: string): Promise<void> {
    // Use toPass to handle realtime deletion delays
    await expect(async () => {
      const card = this.page.locator('div.group.relative').filter({ 
        has: this.page.getByRole('heading', { name, level: 3, exact: true }) 
      });
      await expect(card).not.toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 10000, intervals: [500, 1000, 2000] });
  }
}

