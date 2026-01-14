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

  private get manageTabs(): Locator {
    return this.page.locator('[data-tour="manage-tabs"]');
  }

  private get expensesTab(): Locator {
    return this.manageTabs.getByRole('tab', { name: /despesas|expenses/i });
  }

  private async ensureManageTabsVisible(): Promise<void> {
    const errorAlertWithRetry = this.page.getByRole('alert').filter({
      has: this.page.getByRole('button', { name: /tentar novamente/i }),
    });
    const retryButton = errorAlertWithRetry.getByRole('button', { name: /tentar novamente/i });

    await expect(async () => {
      if (this.page.url().includes('/login')) {
        throw new Error('Redirected to /login while waiting for Manage tabs');
      }

      const tabsVisible = await this.manageTabs.isVisible().catch(() => false);
      if (tabsVisible) return;

      const canRetry = await retryButton.isVisible().catch(() => false);
      if (canRetry) {
        console.warn('[ExpensesSection] Manage error state detected; clicking retry');
        await retryButton.click({ timeout: 5000 }).catch(() => {});
        await this.page.waitForTimeout(1000);
      }

      throw new Error('Manage tabs not visible yet');
    }).toPass({ timeout: 50000, intervals: [500, 1000, 2000] });
  }

  /**
   * Wait for expenses tab content to be ready.
   */
  async waitForLoad(): Promise<void> {
    await this.ensureManageTabsVisible();

    const tabState = await this.expensesTab.getAttribute('data-state').catch(() => null);
    if (tabState !== 'active') {
      await this.expensesTab.click({ timeout: 15000 }).catch(() => this.expensesTab.click({ force: true, timeout: 15000 }));
      await expect(this.expensesTab).toHaveAttribute('data-state', 'active', { timeout: 10000 });
    }

    await expect(async () => {
      const hasAddFixed = await this.page
        .getByRole('button', { name: /adicionar despesa fixa/i })
        .isVisible()
        .catch(() => false);
      const hasAddSingle = await this.page
        .getByRole('button', { name: /adicionar despesa pontual/i })
        .isVisible()
        .catch(() => false);
      const hasEmpty = await this.page
        .getByText(/nenhuma despesa/i)
        .isVisible()
        .catch(() => false);
      const hasAnyCard =
        (await this.page.locator('div.p-4.rounded-lg.border.bg-card').count().catch(() => 0)) > 0;

      if (!hasAddFixed && !hasAddSingle && !hasEmpty && !hasAnyCard) {
        throw new Error('Expenses content not visible yet.');
      }
    }).toPass({ timeout: 30000, intervals: [250, 500, 1000, 2000] });
  }

  /**
   * Switch to fixed expenses sub-tab
   */
  async selectFixedExpenses(): Promise<void> {
    await this.ensureManageTabsVisible();
    await this.fixedExpensesTab.click();
    // Wait for tab panel to be ready
    await this.page.waitForTimeout(300);
    // Wait for fixed expenses content to be visible (either list, empty state, or items)
    await Promise.race([
      this.page.getByRole('button', { name: /adicionar despesa fixa/i }).waitFor({ state: 'visible', timeout: 30000 }),
      this.page.getByRole('button', { name: /adicionar despesa$/i }).waitFor({ state: 'visible', timeout: 30000 }), // Empty state button
      this.page.getByText(/nenhuma despesa ainda/i).waitFor({ state: 'visible', timeout: 30000 }),
      // Also check for expense items
      this.page.locator('div.p-4.rounded-lg.border.bg-card').first().waitFor({ state: 'visible', timeout: 30000 }),
    ]).catch(() => {
      // Content might already be visible
    });
  }

  /**
   * Switch to single-shot expenses sub-tab
   */
  async selectSingleShot(): Promise<void> {
    await this.ensureManageTabsVisible();
    await this.singleShotTab.click();
    // Wait for tab panel to be ready
    await this.page.waitForTimeout(300);
    // Wait for single-shot content to be visible (either list, empty state, or items)
    await Promise.race([
      this.page.getByRole('button', { name: /adicionar despesa pontual/i }).waitFor({ state: 'visible', timeout: 30000 }),
      this.page.getByRole('button', { name: /adicionar despesa$/i }).waitFor({ state: 'visible', timeout: 30000 }), // Empty state button
      this.page.getByText(/nenhuma despesa/i).waitFor({ state: 'visible', timeout: 30000 }),
      // Also check for expense items
      this.page.locator('div.p-4.rounded-lg.border.bg-card').first().waitFor({ state: 'visible', timeout: 30000 }),
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
    
    // Wait for the page to be stable before clicking
    await Promise.race([this.page.waitForLoadState('networkidle'), this.page.waitForTimeout(5000)]);
    
    // Click the add button - could be "Adicionar Despesa Fixa" or "Adicionar Despesa" (empty state)
    const addButtonFull = this.page.getByRole('button', { name: /adicionar despesa fixa/i });
    const addButtonEmpty = this.page.getByRole('button', { name: /^adicionar despesa$/i });
    
    // Wait for whichever "add" button is visible (list state vs empty state), then click it.
    const addButton = addButtonFull.or(addButtonEmpty);
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();

    // Wait for dialog
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Fill form - wait for each field to be ready
    const nameInput = dialog.getByLabel(/nome/i);
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(data.name);
    
    const amountInput = dialog.getByLabel(/valor/i);
    await amountInput.fill(data.amount);
    
    const dueDayInput = dialog.getByLabel(/dia.*vencimento/i);
    await dueDayInput.fill(data.dueDay);

    // Submit and wait for dialog to close
    const submitButton = dialog.getByRole('button', { name: /salvar|adicionar/i });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();
    
    // Wait for dialog to close with longer timeout for CI
    await expect(dialog).not.toBeVisible({ timeout: 15000 });
    
    // Wait for the list to refresh after creation
    await Promise.race([this.page.waitForLoadState('networkidle'), this.page.waitForTimeout(5000)]);
    await this.page.waitForTimeout(500);
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
    
    // Wait for the page to be stable before clicking
    await Promise.race([this.page.waitForLoadState('networkidle'), this.page.waitForTimeout(5000)]);
    
    // Click the add button - could be "Adicionar Despesa Pontual" or "Adicionar Despesa" (empty state)
    const addButtonFull = this.page.getByRole('button', { name: /adicionar despesa pontual/i });
    const addButtonEmpty = this.page.getByRole('button', { name: /^adicionar despesa$/i });
    
    // Wait for whichever "add" button is visible (list state vs empty state), then click it.
    const addButton = addButtonFull.or(addButtonEmpty);
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();

    // Wait for dialog
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Fill form - wait for each field to be ready
    const nameInput = dialog.getByLabel(/nome/i);
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(data.name);
    
    const amountInput = dialog.getByLabel(/valor/i);
    await amountInput.fill(data.amount);
    
    // Handle date input - look for the date picker button or input
    const dateInput = dialog.locator('input[type="date"]').or(dialog.getByLabel(/data/i));
    await dateInput.fill(data.date);

    // Submit and wait for dialog to close
    const submitButton = dialog.getByRole('button', { name: /salvar|adicionar/i });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();
    
    // Wait for dialog to close with longer timeout for CI
    await expect(dialog).not.toBeVisible({ timeout: 15000 });
    
    // Wait for the list to refresh after creation
    await Promise.race([this.page.waitForLoadState('networkidle'), this.page.waitForTimeout(5000)]);
    await this.page.waitForTimeout(500);
  }

  /**
   * Toggle expense active/inactive status
   * The ExpenseListItem has a Switch component
   */
  async toggleExpense(name: string): Promise<void> {
    // First ensure the name is visible
    await expect(this.page.getByText(name, { exact: true })).toBeVisible({ timeout: 10000 });
    
    // Find the expense row that contains this specific name
    // The structure is: row > (name info) + (actions with switch)
    // Use a more specific locator that finds the immediate parent row
    const expenseName = this.page.getByText(name, { exact: true }).first();
    
    // Navigate to the parent div that contains both the name and the switch
    // This is the div with class "flex items-center justify-between gap-4"
    const row = expenseName.locator('xpath=ancestor::div[contains(@class, "flex") and contains(@class, "items-center") and contains(@class, "justify-between")][1]');
    const toggle = row.getByRole('switch').first();
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
    // Wait for any pending updates to settle
    await Promise.race([this.page.waitForLoadState('networkidle'), this.page.waitForTimeout(5000)]);
    await this.page.waitForTimeout(300);
    
    // First ensure the name is visible
    await expect(this.page.getByText(name, { exact: true })).toBeVisible({ timeout: 10000 });
    
    // Find the delete button in the same row as the expense name
    // Use a fresh locator each time to avoid stale element references
    const deleteButton = this.page.getByText(name, { exact: true }).first()
      .locator('xpath=ancestor::*[.//button[contains(text(), "Excluir")]]//button[contains(text(), "Excluir")]').first();
    
    // Wait for button to be stable before clicking
    await deleteButton.waitFor({ state: 'visible', timeout: 5000 });
    await this.page.waitForTimeout(200);
    await deleteButton.click();
    
    // Wait for confirmation dialog
    const confirmDialog = this.page.getByRole('alertdialog');
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    
    // The AlertDialogAction button has text "Excluir" or "Excluindo..."
    // It's the destructive action button (red background)
    const confirmButton = confirmDialog.locator('button').filter({ hasText: /^Excluir$/ });
    await expect(confirmButton).toBeVisible({ timeout: 5000 });
    await confirmButton.click();
    
    // Wait for the "Excluindo..." state and then dialog to close
    await expect(confirmDialog).not.toBeVisible({ timeout: 10000 });
    
    // Wait for UI to update after deletion
    await this.page.waitForTimeout(2000);
    await Promise.race([this.page.waitForLoadState('networkidle'), this.page.waitForTimeout(5000)]);
  }

  /**
   * Verify expense is visible in list
   */
  async expectExpenseVisible(name: string): Promise<void> {
    await expect(async () => {
      const expense = this.page.getByText(name, { exact: true }).first();
      await expect(expense).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 20000 });
  }

  /**
   * Verify expense is not visible in list
   * Uses count() check to handle multiple workers' data being visible
   */
  async expectExpenseNotVisible(name: string): Promise<void> {
    // Wait for any pending updates
    await this.page.waitForTimeout(500);
    
    // Get all matching elements - in parallel execution, other workers' data may be visible
    const expenses = this.page.getByText(name, { exact: true });
    
    // The specific expense should not be visible
    await expect(expenses).toHaveCount(0, { timeout: 5000 });
  }

  /**
   * Verify expense shows as inactive
   * The inactive items have opacity-60 class and show "Inativo" badge
   */
  async expectExpenseInactive(name: string): Promise<void> {
    // First ensure the name is visible
    await expect(this.page.getByText(name, { exact: true })).toBeVisible({ timeout: 10000 });
    
    // Check for "Inativo" badge text near the expense name
    // Use a more specific selector to avoid matching other expenses in parallel tests
    const expenseName = this.page.getByText(name, { exact: true }).first();
    // Find the parent flex container (closest ancestor div with flex classes)
    const row = expenseName.locator('xpath=ancestor::div[contains(@class, "flex") and contains(@class, "rounded-lg")][1]');
    const inactiveBadge = row.getByText(/inativo/i, { exact: false }).first();
    await expect(inactiveBadge).toBeVisible({ timeout: 5000 });
  }
}

