/**
 * Section object for account management within ManagePage
 * Implements IAccountsSection contract from specs/019-e2e-testing/contracts/page-objects.ts
 */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class AccountsSection {
  readonly page: Page;
  readonly accountList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.accountList = page.locator('[data-testid="accounts-list"], .accounts-list').first();
  }

  /**
   * Get the add button - uses the one in the header (first one), not the empty state
   */
  private get addButton(): Locator {
    // Target the button in the header area, not the one in the empty state
    // The header button is outside the TabsContent area
    return this.page.getByRole('button', { name: /adicionar conta|add account|nova conta/i }).first();
  }

  /**
   * Click add new account button to open form
   */
  async clickAdd(): Promise<void> {
    await this.addButton.click();
  }

  /**
   * Fill account form and submit
   */
  async createAccount(data: {
    name: string;
    type: 'checking' | 'savings' | 'investment';
    balance: string;
  }): Promise<void> {
    await this.clickAdd();

    // Wait for dialog to open
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill form fields - target inputs within the dialog
    await dialog.getByLabel(/nome/i).fill(data.name);
    
    // Select account type - click the trigger, then select option
    await dialog.getByRole('combobox').first().click();
    
    const typeLabels: Record<string, RegExp> = {
      checking: /corrente|checking/i,
      savings: /poupança|savings/i,
      investment: /investimento|investment/i,
    };
    await this.page.getByRole('option', { name: typeLabels[data.type] }).click();

    // Fill balance - use the currency input
    const balanceInput = dialog.getByLabel(/saldo/i);
    await balanceInput.fill(data.balance);
    // Trigger validation/masks that run on blur
    await balanceInput.blur().catch(() => {});

    // Submit form
    const submitButton = dialog.getByRole('button', { name: /salvar|save|adicionar|criar|create/i });
    await expect(submitButton).toBeEnabled({ timeout: 10000 });
    // Avoid hanging on implicit navigation waits for SPA submit handlers
    await submitButton.click({ noWaitAfter: true });

    // Wait for dialog to close
    await expect(dialog).not.toBeVisible({ timeout: 15000 });
  }

  /**
   * Edit an existing account by clicking its edit button
   * The account cards have a "More options" button that opens a dropdown with Edit option
   */
  async editAccount(name: string): Promise<void> {
    // Find the card containing the account name - look for the heading with account name
    const accountCard = this.page.locator('div.group.relative').filter({ 
      has: this.page.getByRole('heading', { name, level: 3 }) 
    }).first();
    
    // Wait for the card to be visible
    await expect(accountCard).toBeVisible({ timeout: 10000 });
    
    // Hover to reveal the actions button
    await accountCard.hover();
    
    // Click the "More options" button (three dots) - Playwright auto-waits for actionability
    await accountCard.getByRole('button', { name: /mais opções|more/i }).click();
    
    // Click "Editar" in the dropdown
    await this.page.getByRole('button', { name: /editar/i }).click();
    
    // Wait for dialog to open
    await expect(this.page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  }

  /**
   * Update account name
   */
  async updateAccountName(currentName: string, newName: string): Promise<void> {
    await this.editAccount(currentName);
    const dialog = this.page.getByRole('dialog');
    const nameInput = dialog.getByLabel(/nome/i);
    await nameInput.clear();
    await nameInput.fill(newName);
    await dialog.getByRole('button', { name: /salvar|save|atualizar/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Update account balance
   */
  async updateAccountBalance(name: string, newBalance: string): Promise<void> {
    await this.editAccount(name);
    const dialog = this.page.getByRole('dialog');
    const balanceInput = dialog.getByLabel(/saldo/i);
    await balanceInput.clear();
    await balanceInput.fill(newBalance);
    await dialog.getByRole('button', { name: /salvar|save|atualizar/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Delete an account by name (with confirmation dialog)
   * Opens edit dialog first, then clicks delete, then confirms
   */
  async deleteAccount(name: string): Promise<void> {
    // Find the card containing the account name - look for the heading with account name
    const accountCard = this.page.locator('div.group.relative').filter({ 
      has: this.page.getByRole('heading', { name, level: 3, exact: true }) 
    }).first();
    
    // Wait for the card to be visible
    await expect(accountCard).toBeVisible({ timeout: 10000 });
    
    // Hover to reveal the actions button
    await accountCard.hover();
    
    // Click the "More options" button (three dots) - Playwright auto-waits for actionability
    await accountCard.getByRole('button', { name: /mais opções|more/i }).click();
    
    // Click "Excluir" in the dropdown
    await this.page.getByRole('button', { name: /excluir/i }).click();
    
    // Wait for confirmation dialog and confirm
    const confirmDialog = this.page.getByRole('alertdialog').or(this.page.getByRole('dialog'));
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    await confirmDialog.getByRole('button', { name: /confirmar|confirm|sim|yes|excluir/i }).click();
    
    // Wait for dialog to close
    await expect(confirmDialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Wait for accounts to load (either accounts appear or empty state)
   * Uses Playwright's built-in retry mechanism for stability in parallel execution
   */
  async waitForLoad(): Promise<void> {
    const accountCard = this.page.locator('div.group.relative').filter({
      has: this.page.getByRole('heading', { level: 3 })
    }).first();
    const addButton = this.page.getByRole('button', { name: /adicionar conta/i });
    
    // Use Playwright's built-in retry with toPass for parallel execution stability
    await expect(async () => {
      const cardCount = await accountCard.count();
      const buttonCount = await addButton.count();
      if (cardCount > 0) {
        console.log(`[waitForLoad] Account card found`);
        return;
      }
      if (buttonCount > 0) {
        console.log(`[waitForLoad] Add button found`);
        return;
      }
      throw new Error('Neither account cards nor add button visible');
    }).toPass({ timeout: 15000, intervals: [100, 200, 500] });
  }

  /**
   * Verify account appears in the list
   */
  async expectAccountVisible(name: string): Promise<void> {
    // Wait for the accounts section to be ready
    await this.waitForLoad();
    
    // Use Playwright's built-in expect with visibility check
    const account = this.page.getByText(name).first();
    await expect(account).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verify account does not appear in the list
   */
  async expectAccountNotVisible(name: string): Promise<void> {
    // Use toPass to handle realtime deletion delays
    await expect(async () => {
      const account = this.page.locator('div.group.relative').filter({ 
        has: this.page.getByRole('heading', { name, level: 3, exact: true }) 
      });
      await expect(account).not.toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 10000, intervals: [500, 1000, 2000] });
  }

  /**
   * Get count of accounts in list
   */
  async getAccountCount(): Promise<number> {
    const accounts = this.page.locator('div.group.relative').filter({
      has: this.page.getByRole('heading', { level: 3 })
    });
    return accounts.count();
  }
}

