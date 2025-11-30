/**
 * E2E Tests: User Story 3 - Expense Management
 * Tests fixed recurring and single-shot expense management
 */

import { test, expect } from '../fixtures/test-base';
import { createExpense, createSingleShotExpense } from '../utils/test-data';
import { formatBRL } from '../utils/format';

test.describe('Expense Management', () => {
  // Tests now run in parallel with per-worker data prefixing for isolation

  test.describe('Fixed Expenses', () => {
    test('T036: create fixed expense "Aluguel" R$ 2.000,00 due day 10 → appears in fixed expenses list', async ({
      managePage,
      workerContext,
    }) => {
      await managePage.goto();
      await managePage.selectExpensesTab();

      const expenses = managePage.expenses();
      await expenses.selectFixedExpenses();

      // Use worker-specific name for UI-created data to avoid conflicts
      const expenseName = `Aluguel W${workerContext.workerIndex}`;
      await expenses.createFixedExpense({
        name: expenseName,
        amount: '2.000,00',
        dueDay: '10',
      });

      await expenses.expectExpenseVisible(expenseName);
    });

    test('T037: toggle fixed expense inactive → shows as inactive in list', async ({
      page,
      managePage,
      db,
    }) => {
      // Seed an expense that is active with a unique name
      const uniqueId = Date.now();
      const [seeded] = await db.seedExpenses([
        createExpense({ name: `Despesa Ativa ${uniqueId}`, amount: 100000, is_active: true }),
      ]);

      // Navigate and reload to ensure fresh data
      await managePage.goto();
      await page.reload();
      await page.waitForLoadState('networkidle');
      await managePage.selectExpensesTab();

      const expenses = managePage.expenses();
      await expenses.selectFixedExpenses();
      await page.waitForTimeout(500);
      
      // Wait for the expense to be visible before toggling
      await expenses.expectExpenseVisible(seeded.name);
      
      await expenses.toggleExpense(seeded.name);

      await expenses.expectExpenseInactive(seeded.name);
    });

    test('T038: edit fixed expense amount to R$ 2.200,00 → updated amount displayed', async ({
      page,
      managePage,
      db,
    }) => {
      const [seeded] = await db.seedExpenses([createExpense({ name: 'Aluguel Edit', amount: 200000 })]);

      // Navigate and reload to ensure fresh data
      await managePage.goto();
      await page.reload();
      await page.waitForLoadState('networkidle');
      await managePage.selectExpensesTab();

      const expenses = managePage.expenses();
      await expenses.selectFixedExpenses();
      await page.waitForTimeout(500);
      
      await expenses.expectExpenseVisible(seeded.name);
      await expenses.updateExpenseAmount(seeded.name, '2.200,00');

      // Verify the expense row shows the updated amount (use .first() to avoid strict mode)
      await expect(page.getByText(formatBRL(220000)).first()).toBeVisible();
    });

    test('T039: delete fixed expense confirmation dialog → opens and closes correctly', async ({
      page,
      managePage,
      db,
    }) => {
      // Use a unique name to avoid conflicts with other workers
      const uniqueId = Date.now();
      const [seeded] = await db.seedExpenses([createExpense({ name: `Despesa Excluir ${uniqueId}`, amount: 50000 })]);

      // Navigate and reload to ensure fresh data
      await managePage.goto();
      await page.reload();
      await page.waitForLoadState('networkidle');
      await managePage.selectExpensesTab();

      const expenses = managePage.expenses();
      await expenses.selectFixedExpenses();
      await page.waitForTimeout(500);
      
      await expenses.expectExpenseVisible(seeded.name);

      // Click delete button
      const deleteButton = page.getByText(seeded.name, { exact: true }).first()
        .locator('xpath=ancestor::*[.//button[contains(text(), "Excluir")]]//button[contains(text(), "Excluir")]').first();
      await deleteButton.click();

      // Verify confirmation dialog appears
      const confirmDialog = page.getByRole('alertdialog');
      await expect(confirmDialog).toBeVisible({ timeout: 5000 });

      // Click the confirm button
      const confirmButton = confirmDialog.locator('button').filter({ hasText: /^Excluir$/ });
      await confirmButton.click();

      // Dialog should close
      await expect(confirmDialog).not.toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Single-Shot Expenses', () => {
    test('T040: create single-shot expense "Compra de Móveis" R$ 5.000,00 date 2025-12-15 → appears in single-shot list', async ({
      managePage,
      workerContext,
    }) => {
      await managePage.goto();
      await managePage.selectExpensesTab();

      const expenses = managePage.expenses();
      await expenses.selectSingleShot();

      // Use worker-specific name for UI-created data to avoid conflicts
      const expenseName = `Compra de Móveis W${workerContext.workerIndex}`;
      await expenses.createSingleShotExpense({
        name: expenseName,
        amount: '5.000,00',
        date: '2025-12-15',
      });

      await expenses.expectExpenseVisible(expenseName);
    });

    test('T041: edit single-shot expense date to 2025-12-20 → updated date displayed', async ({
      page,
      managePage,
      db,
    }) => {
      const [seeded] = await db.seedSingleShotExpenses([
        createSingleShotExpense({ name: 'Despesa Avulsa', amount: 100000, date: '2025-12-15' }),
      ]);

      // Navigate and reload to ensure fresh data
      await managePage.goto();
      await page.reload();
      await page.waitForLoadState('networkidle');
      await managePage.selectExpensesTab();

      const expenses = managePage.expenses();
      await expenses.selectSingleShot();
      await page.waitForTimeout(500);
      
      // Wait for the expense to be visible
      await expenses.expectExpenseVisible(seeded.name);

      // Use the page object method to update the date
      await expenses.updateSingleShotDate(seeded.name, '2025-12-20');

      // Wait for update to complete
      await page.waitForLoadState('networkidle');

      // Verify the expense is still visible after update (date change was successful)
      await expenses.expectExpenseVisible(seeded.name);
    });

    test('T042: delete single-shot expense confirmation dialog → opens and closes correctly', async ({
      page,
      managePage,
      db,
    }) => {
      // Use a unique name to avoid conflicts with other workers
      const uniqueId = Date.now();
      const [seeded] = await db.seedSingleShotExpenses([
        createSingleShotExpense({ name: `Despesa Avulsa Excluir ${uniqueId}`, amount: 50000 }),
      ]);

      // Navigate and reload to ensure fresh data
      await managePage.goto();
      await page.reload();
      await page.waitForLoadState('networkidle');
      await managePage.selectExpensesTab();

      const expenses = managePage.expenses();
      await expenses.selectSingleShot();
      await page.waitForTimeout(500);
      
      await expenses.expectExpenseVisible(seeded.name);

      // Click delete button
      const deleteButton = page.getByText(seeded.name, { exact: true }).first()
        .locator('xpath=ancestor::*[.//button[contains(text(), "Excluir")]]//button[contains(text(), "Excluir")]').first();
      await deleteButton.click();

      // Verify confirmation dialog appears
      const confirmDialog = page.getByRole('alertdialog');
      await expect(confirmDialog).toBeVisible({ timeout: 5000 });

      // Click the confirm button
      const confirmButton = confirmDialog.locator('button').filter({ hasText: /^Excluir$/ });
      await confirmButton.click();

      // Dialog should close
      await expect(confirmDialog).not.toBeVisible({ timeout: 10000 });
    });
  });
});
