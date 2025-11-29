/**
 * Section object for expense management (fixed and single-shot)
 * Implements IExpensesSection contract from specs/019-e2e-testing/contracts/page-objects.ts
 */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class ExpensesSection {
  readonly page: Page;
  readonly fixedExpensesTab: Locator;
  readonly singleShotTab: Locator;
  readonly expenseList: Locator;

  constructor(page: Page) {
    this.page = page;
    // The ExpenseSection uses tabs "Fixas" and "Pontuais"
    this.fixedExpensesTab = page.getByRole('tab', { name: /fixas/i });
    this.singleShotTab = page.getByRole('tab', { name: /pontuais/i });
    this.expenseList = page.locator('[data-testid="expenses-list"], .expenses-list').first();
  }


  /**
   * Switch to fixed expenses sub-tab
   */
  async selectFixedExpenses(): Promise<void> {
    await this.fixedExpensesTab.click();
    // Wait for tab panel to be ready
    await this.page.waitForTimeout(300);
    // Wait for fixed expenses content to be visible (either list, empty state, or items)
    await Promise.race([
      this.page.getByRole('button', { name: /adicionar despesa fixa/i }).waitFor({ state: 'visible', timeout: 10000 }),
      this.page.getByRole('button', { name: /adicionar despesa$/i }).waitFor({ state: 'visible', timeout: 10000 }), // Empty state button
      this.page.getByText(/nenhuma despesa ainda/i).waitFor({ state: 'visible', timeout: 10000 }),
      // Also check for expense items
      this.page.locator('div.p-4.rounded-lg.border.bg-card').first().waitFor({ state: 'visible', timeout: 10000 }),
    ]).catch(() => {
      // Content might already be visible
    });
  }

  /**
   * Switch to single-shot expenses sub-tab
   */
  async selectSingleShot(): Promise<void> {
    await this.singleShotTab.click();
    // Wait for tab panel to be ready
    await this.page.waitForTimeout(300);
    // Wait for single-shot content to be visible (either list, empty state, or items)
    await Promise.race([
      this.page.getByRole('button', { name: /adicionar despesa pontual/i }).waitFor({ state: 'visible', timeout: 10000 }),
      this.page.getByRole('button', { name: /adicionar despesa$/i }).waitFor({ state: 'visible', timeout: 10000 }), // Empty state button
      this.page.getByText(/nenhuma despesa/i).waitFor({ state: 'visible', timeout: 10000 }),
      // Also check for expense items
      this.page.locator('div.p-4.rounded-lg.border.bg-card').first().waitFor({ state: 'visible', timeout: 10000 }),
    ]).catch(() => {
      // Content might already be visible
    });
  }

  /**
   * Create a fixed recurring expense
   * The add button is at the bottom of the list: "Adicionar Despesa Fixa"
   * Or in empty state: "Adicionar Despesa"
   */
  async createFixedExpense(data: {
    name: string;
    amount: string;
    dueDay: string;
  }): Promise<void> {
    await this.selectFixedExpenses();
    
    // Click the add button - could be "Adicionar Despesa Fixa" or "Adicionar Despesa" (empty state)
    const addButtonFull = this.page.getByRole('button', { name: /adicionar despesa fixa/i });
    const addButtonEmpty = this.page.getByRole('button', { name: /^adicionar despesa$/i });
    
    // Try the full button first, then the empty state button
    if (await addButtonFull.isVisible()) {
      await addButtonFull.click();
    } else {
      await addButtonEmpty.click();
    }

    // Wait for dialog
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Fill form
    await dialog.getByLabel(/nome/i).fill(data.name);
    await dialog.getByLabel(/valor/i).fill(data.amount);
    await dialog.getByLabel(/dia.*vencimento/i).fill(data.dueDay);

    // Submit
    await dialog.getByRole('button', { name: /salvar|adicionar/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Create a one-time expense
   */
  async createSingleShotExpense(data: {
    name: string;
    amount: string;
    date: string;
  }): Promise<void> {
    await this.selectSingleShot();
    
    // Click the add button - could be "Adicionar Despesa Pontual" or "Adicionar Despesa" (empty state)
    const addButtonFull = this.page.getByRole('button', { name: /adicionar despesa pontual/i });
    const addButtonEmpty = this.page.getByRole('button', { name: /^adicionar despesa$/i });
    
    // Try the full button first, then the empty state button
    if (await addButtonFull.isVisible()) {
      await addButtonFull.click();
    } else {
      await addButtonEmpty.click();
    }

    // Wait for dialog
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Fill form
    await dialog.getByLabel(/nome/i).fill(data.name);
    await dialog.getByLabel(/valor/i).fill(data.amount);
    
    // Handle date input - look for the date picker button or input
    const dateInput = dialog.locator('input[type="date"]').or(dialog.getByLabel(/data/i));
    await dateInput.fill(data.date);

    // Submit
    await dialog.getByRole('button', { name: /salvar|adicionar/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Toggle expense active/inactive status
   * The ExpenseListItem has a Switch component
   */
  async toggleExpense(name: string): Promise<void> {
    // First ensure the name is visible
    await expect(this.page.getByText(name, { exact: true })).toBeVisible({ timeout: 10000 });
    
    // Find the switch in the same container as the expense name
    const expenseName = this.page.getByText(name, { exact: true }).first();
    const container = expenseName.locator('xpath=ancestor::*[.//button[@role="switch"]]').first();
    const toggle = container.getByRole('switch');
    await toggle.click();
    // Wait a bit for the state change to process
    await this.page.waitForTimeout(500);
  }

  /**
   * Edit expense by clicking edit button
   * The ExpenseListItem has an "Editar" button directly visible
   */
  private async editExpense(name: string): Promise<void> {
    // First ensure the name is visible
    await expect(this.page.getByText(name, { exact: true })).toBeVisible({ timeout: 10000 });
    
    // Find the edit button in the same row as the expense name
    const expenseName = this.page.getByText(name, { exact: true }).first();
    const editButton = expenseName.locator('xpath=ancestor::*[.//button[contains(text(), "Editar")]]//button[contains(text(), "Editar")]').first();
    await editButton.click();
    
    // Wait for dialog
    await expect(this.page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  }

  /**
   * Edit expense amount
   */
  async updateExpenseAmount(name: string, newAmount: string): Promise<void> {
    await this.editExpense(name);
    const dialog = this.page.getByRole('dialog');
    const amountInput = dialog.getByLabel(/valor/i);
    await amountInput.clear();
    await amountInput.fill(newAmount);
    await dialog.getByRole('button', { name: /salvar|atualizar/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Edit single-shot expense date
   */
  async updateSingleShotDate(name: string, newDate: string): Promise<void> {
    await this.editExpense(name);
    const dialog = this.page.getByRole('dialog');
    const dateInput = dialog.locator('input[type="date"]').or(dialog.getByLabel(/data/i));
    await dateInput.fill(newDate);
    await dialog.getByRole('button', { name: /salvar|atualizar/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Delete expense - directly click the "Excluir" button on the row
   */
  async deleteExpense(name: string): Promise<void> {
    // First ensure the name is visible
    await expect(this.page.getByText(name, { exact: true })).toBeVisible({ timeout: 10000 });
    
    // Find the delete button in the same row as the expense name
    const expenseName = this.page.getByText(name, { exact: true }).first();
    const deleteButton = expenseName.locator('xpath=ancestor::*[.//button[contains(text(), "Excluir")]]//button[contains(text(), "Excluir")]').first();
    await deleteButton.click();
    
    // Wait for confirmation dialog and confirm
    const confirmDialog = this.page.getByRole('alertdialog').or(this.page.getByRole('dialog'));
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    await confirmDialog.getByRole('button', { name: /confirmar|sim|yes|excluir/i }).click();
    await expect(confirmDialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Verify expense is visible in list
   */
  async expectExpenseVisible(name: string): Promise<void> {
    const expense = this.page.getByText(name, { exact: true }).first();
    await expect(expense).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verify expense is not visible in list
   */
  async expectExpenseNotVisible(name: string): Promise<void> {
    const expense = this.page.getByText(name, { exact: true });
    await expect(expense).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Verify expense shows as inactive
   * The inactive items have opacity-60 class and show "Inativo" badge
   */
  async expectExpenseInactive(name: string): Promise<void> {
    // First ensure the name is visible
    await expect(this.page.getByText(name, { exact: true })).toBeVisible({ timeout: 10000 });
    
    // Check for "Inativo" badge text near the expense name
    const expenseName = this.page.getByText(name, { exact: true }).first();
    const container = expenseName.locator('xpath=ancestor::*[.//button[@role="switch"]]').first();
    const inactiveBadge = container.getByText(/inativo/i);
    await expect(inactiveBadge).toBeVisible({ timeout: 5000 });
  }
}

