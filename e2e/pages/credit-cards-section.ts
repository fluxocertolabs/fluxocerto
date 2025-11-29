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

  /**
   * Get the add button - uses the one in the header
   */
  private get addButton(): Locator {
    return this.page.getByRole('button', { name: /adicionar cartão/i }).first();
  }

  /**
   * Click add new credit card button
   */
  async clickAdd(): Promise<void> {
    await this.addButton.click();
  }

  /**
   * Create a new credit card entry
   */
  async createCreditCard(data: {
    name: string;
    balance: string;
    dueDay: string;
  }): Promise<void> {
    await this.clickAdd();

    // Wait for dialog to open
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill form fields within dialog
    await dialog.getByLabel(/nome/i).fill(data.name);
    await dialog.getByLabel(/saldo.*fatura/i).fill(data.balance);
    await dialog.getByLabel(/dia.*vencimento/i).fill(data.dueDay);

    // Submit
    await dialog.getByRole('button', { name: /salvar|adicionar/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Edit credit card by clicking edit button in dropdown menu
   */
  private async editCreditCard(name: string): Promise<void> {
    // Find the card containing the name
    const cardElement = this.page.locator('.group').filter({ hasText: name }).first();
    
    // Hover to reveal actions
    await cardElement.hover();
    
    // Click more options button
    await cardElement.getByRole('button', { name: /mais opções|more/i }).click();
    
    // Click "Editar"
    await this.page.getByRole('button', { name: /editar/i }).click();
    
    // Wait for dialog
    await expect(this.page.getByRole('dialog')).toBeVisible();
  }

  /**
   * Edit credit card due day
   */
  async updateDueDay(name: string, newDueDay: string): Promise<void> {
    await this.editCreditCard(name);
    const dialog = this.page.getByRole('dialog');
    const dueDayInput = dialog.getByLabel(/dia.*vencimento/i);
    await dueDayInput.clear();
    await dueDayInput.fill(newDueDay);
    await dialog.getByRole('button', { name: /salvar|atualizar/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Update credit card statement balance
   */
  async updateBalance(name: string, newBalance: string): Promise<void> {
    await this.editCreditCard(name);
    const dialog = this.page.getByRole('dialog');
    const balanceInput = dialog.getByLabel(/saldo.*fatura/i);
    await balanceInput.clear();
    await balanceInput.fill(newBalance);
    await dialog.getByRole('button', { name: /salvar|atualizar/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Delete credit card with confirmation dialog
   */
  async deleteCreditCard(name: string): Promise<void> {
    // Find the card containing the name
    const cardElement = this.page.locator('.group').filter({ hasText: name }).first();
    
    // Hover to reveal actions
    await cardElement.hover();
    
    // Click more options button
    await cardElement.getByRole('button', { name: /mais opções|more/i }).click();
    
    // Click "Excluir"
    await this.page.getByRole('button', { name: /excluir/i }).click();
    
    // Wait for confirmation and confirm
    const confirmDialog = this.page.getByRole('alertdialog').or(this.page.getByRole('dialog'));
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: /confirmar|sim|yes|excluir/i }).click();
    await expect(confirmDialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Verify credit card is visible in list
   */
  async expectCardVisible(name: string): Promise<void> {
    const card = this.page.getByText(name).first();
    await expect(card).toBeVisible();
  }

  /**
   * Verify credit card is not visible in list
   */
  async expectCardNotVisible(name: string): Promise<void> {
    const card = this.page.locator('.group').filter({ hasText: name });
    await expect(card).not.toBeVisible();
  }
}

