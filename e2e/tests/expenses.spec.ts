/**
 * E2E Tests: User Story 3 - Expense Management
 * Tests fixed recurring and single-shot expense management
 */

import { test, expect } from '../fixtures/test-base';
import { createExpense, createSingleShotExpense } from '../utils/test-data';
import { formatBRL } from '../utils/format';

test.describe('Expense Management', () => {
  // Run tests serially to avoid database race conditions
  test.describe.configure({ mode: 'serial' });

  test.describe('Fixed Expenses', () => {
    test('T036: create fixed expense "Aluguel" R$ 2.000,00 due day 10 → appears in fixed expenses list', async ({
      managePage,
      db,
    }) => {
      await db.resetDatabase();
      await db.ensureTestUser(process.env.TEST_USER_EMAIL || 'e2e-test@example.com');
      await managePage.goto();
      await managePage.selectExpensesTab();

      const expenses = managePage.expenses();
      await expenses.selectFixedExpenses();
      await expenses.createFixedExpense({
        name: 'Aluguel',
        amount: '2.000,00',
        dueDay: '10',
      });

      await expenses.expectExpenseVisible('Aluguel');
    });

    test('T037: toggle fixed expense inactive → shows as inactive in list', async ({
      managePage,
      db,
    }) => {
      await db.resetDatabase();
      await db.ensureTestUser(process.env.TEST_USER_EMAIL || 'e2e-test@example.com');
      await db.seedExpenses([
        createExpense({ name: 'Despesa Ativa', amount: 100000, is_active: true }),
      ]);

      await managePage.goto();
      await managePage.selectExpensesTab();

      const expenses = managePage.expenses();
      await expenses.selectFixedExpenses();
      
      // Wait for the expense to be visible before toggling
      await expenses.expectExpenseVisible('Despesa Ativa');
      
      await expenses.toggleExpense('Despesa Ativa');

      await expenses.expectExpenseInactive('Despesa Ativa');
    });

    test('T038: edit fixed expense amount to R$ 2.200,00 → updated amount displayed', async ({
      page,
      managePage,
      db,
    }) => {
      await db.resetDatabase();
      await db.ensureTestUser(process.env.TEST_USER_EMAIL || 'e2e-test@example.com');
      await db.seedExpenses([createExpense({ name: 'Aluguel', amount: 200000 })]);

      await managePage.goto();
      await managePage.selectExpensesTab();

      const expenses = managePage.expenses();
      await expenses.selectFixedExpenses();
      await expenses.updateExpenseAmount('Aluguel', '2.200,00');

      await expect(page.getByText(formatBRL(220000))).toBeVisible();
    });

    test('T039: delete fixed expense with confirmation → removed from list', async ({
      managePage,
      db,
    }) => {
      await db.resetDatabase();
      await db.ensureTestUser(process.env.TEST_USER_EMAIL || 'e2e-test@example.com');
      await db.seedExpenses([createExpense({ name: 'Despesa para Excluir', amount: 50000 })]);

      await managePage.goto();
      await managePage.selectExpensesTab();

      const expenses = managePage.expenses();
      await expenses.selectFixedExpenses();
      await expenses.expectExpenseVisible('Despesa para Excluir');

      await expenses.deleteExpense('Despesa para Excluir');

      await expenses.expectExpenseNotVisible('Despesa para Excluir');
    });
  });

  test.describe('Single-Shot Expenses', () => {
    test('T040: create single-shot expense "Compra de Móveis" R$ 5.000,00 date 2025-12-15 → appears in single-shot list', async ({
      managePage,
      db,
    }) => {
      await db.resetDatabase();
      await db.ensureTestUser(process.env.TEST_USER_EMAIL || 'e2e-test@example.com');
      await managePage.goto();
      await managePage.selectExpensesTab();

      const expenses = managePage.expenses();
      await expenses.selectSingleShot();
      await expenses.createSingleShotExpense({
        name: 'Compra de Móveis',
        amount: '5.000,00',
        date: '2025-12-15',
      });

      await expenses.expectExpenseVisible('Compra de Móveis');
    });

    test('T041: edit single-shot expense date to 2025-12-20 → updated date displayed', async ({
      page,
      managePage,
      db,
    }) => {
      await db.resetDatabase();
      await db.ensureTestUser(process.env.TEST_USER_EMAIL || 'e2e-test@example.com');
      await db.seedSingleShotExpenses([
        createSingleShotExpense({ name: 'Despesa Avulsa', amount: 100000, date: '2025-12-15' }),
      ]);

      await managePage.goto();
      await managePage.selectExpensesTab();

      const expenses = managePage.expenses();
      await expenses.selectSingleShot();
      
      // Wait for the expense to be visible
      await expenses.expectExpenseVisible('Despesa Avulsa');

      // Use the page object method to update the date
      await expenses.updateSingleShotDate('Despesa Avulsa', '2025-12-20');

      // Verify updated date is displayed (format: "20 de dezembro de 2025")
      await expect(page.getByText(/20.*dezembro|dezembro.*20|20\/12\/2025|2025-12-20/i)).toBeVisible();
    });

    test('T042: delete single-shot expense → removed from list', async ({
      managePage,
      db,
    }) => {
      await db.resetDatabase();
      await db.ensureTestUser(process.env.TEST_USER_EMAIL || 'e2e-test@example.com');
      await db.seedSingleShotExpenses([
        createSingleShotExpense({ name: 'Despesa Avulsa Excluir', amount: 50000 }),
      ]);

      await managePage.goto();
      await managePage.selectExpensesTab();

      const expenses = managePage.expenses();
      await expenses.selectSingleShot();
      await expenses.expectExpenseVisible('Despesa Avulsa Excluir');

      await expenses.deleteExpense('Despesa Avulsa Excluir');

      await expenses.expectExpenseNotVisible('Despesa Avulsa Excluir');
    });
  });
});

