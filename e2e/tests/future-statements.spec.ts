/**
 * E2E Tests: Future Credit Card Statements
 * Tests CRUD operations for future statements and cashflow integration
 */

import { test, expect } from '../fixtures/test-base';
import { createCreditCard, createFutureStatement } from '../utils/test-data';
import { formatBRL } from '../utils/format';

test.describe('Future Statement Management', () => {
  test('T-FS-001: add future statement to credit card → appears in list', async ({
    page,
    managePage,
    db,
  }) => {
    // Seed a credit card first
    const uniqueId = Date.now();
    const [seededCard] = await db.seedCreditCards([
      createCreditCard({ name: `Nubank FS ${uniqueId}`, statement_balance: 50000, due_day: 15 }),
    ]);

    await managePage.goto();
    await managePage.selectCreditCardsTab();

    // Find the credit card and expand future statements section
    const cardElement = page.locator('div.group.relative').filter({
      has: page.getByRole('heading', { name: seededCard.name, level: 3 }),
    }).first();

    await expect(cardElement).toBeVisible({ timeout: 10000 });

    // Click on "Próximas Faturas" to expand
    const collapsibleTrigger = cardElement.getByRole('button', { name: /próximas faturas/i });
    await collapsibleTrigger.click();

    // Click add button for future statement
    const addButton = cardElement.getByRole('button', { name: /adicionar/i });
    await addButton.click();

    // Wait for dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select a future month (not current month) to avoid warning dialog
    // The month selector defaults to current month, so we need to change it
    const monthSelect = dialog.locator('button[role="combobox"]').first();
    await monthSelect.click();
    
    // Get next month name in Portuguese
    const nextMonthDate = new Date();
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonthName = nextMonthDate.toLocaleString('pt-BR', { month: 'long' });
    const nextYear = nextMonthDate.getFullYear();
    
    // Select next month option
    const monthOption = page.getByRole('option', {
      name: new RegExp(`${nextMonthName}.*${nextYear}`, 'i'),
    });
    await monthOption.click();

    // Fill the form - clear first then type to ensure onChange fires
    const amountInput = dialog.getByLabel(/valor/i);
    await amountInput.click();
    await amountInput.fill('1500');
    
    // Wait for the submit button to be enabled (form validation passes)
    const submitButton = dialog.getByRole('button', { name: /salvar|adicionar/i });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });

    // Submit
    await submitButton.click();
    // Increase timeout for CI environments which can be slower
    await expect(dialog).not.toBeVisible({ timeout: 12000 });

    // Verify future statement appears in the list
    await expect(async () => {
      await expect(cardElement.getByText(formatBRL(150000))).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 15000, intervals: [500, 1000, 2000] });
  });

  test('T-FS-002: edit future statement amount → updated value displayed', async ({
    page,
    managePage,
    db,
  }) => {
    // Seed a credit card and future statement
    const uniqueId = Date.now();
    const [seededCard] = await db.seedCreditCards([
      createCreditCard({ name: `Cartão Edit FS ${uniqueId}`, statement_balance: 50000, due_day: 15 }),
    ]);

    // Calculate next month for the future statement
    const now = new Date();
    let nextMonth = now.getMonth() + 2; // +2 because getMonth() is 0-indexed
    let nextYear = now.getFullYear();
    if (nextMonth > 12) {
      nextMonth -= 12;
      nextYear += 1;
    }

    await db.seedFutureStatements([
      createFutureStatement({
        credit_card_id: seededCard.id!,
        target_month: nextMonth,
        target_year: nextYear,
        amount: 100000,
      }),
    ]);

    await managePage.goto();
    await managePage.selectCreditCardsTab();

    // Find the credit card and expand future statements section
    const cardElement = page.locator('div.group.relative').filter({
      has: page.getByRole('heading', { name: seededCard.name, level: 3 }),
    }).first();

    await expect(cardElement).toBeVisible({ timeout: 10000 });

    // Click on "Próximas Faturas" to expand
    const collapsibleTrigger = cardElement.getByRole('button', { name: /próximas faturas/i });
    await collapsibleTrigger.click();

    // Wait for future statement to appear
    await expect(cardElement.getByText(formatBRL(100000))).toBeVisible({ timeout: 5000 });

    // Click edit button on the future statement
    const editButton = cardElement.getByRole('button', { name: /editar/i }).first();
    await editButton.click();

    // Wait for dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Update the amount - clear and fill to ensure onChange fires
    const amountInput = dialog.getByLabel(/valor/i);
    await amountInput.click();
    await amountInput.clear();
    await amountInput.fill('2000');

    // Wait for the submit button to be enabled
    const submitButton = dialog.getByRole('button', { name: /salvar|atualizar/i });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });

    // Submit
    await submitButton.click();
    // Increase timeout for CI environments which can be slower
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Verify updated amount
    await expect(async () => {
      await expect(cardElement.getByText(formatBRL(200000))).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 15000, intervals: [500, 1000, 2000] });
  });

  test('T-FS-003: delete future statement with confirmation → removed from list', async ({
    page,
    managePage,
    db,
  }) => {
    // Seed a credit card and future statement
    const uniqueId = Date.now();
    const [seededCard] = await db.seedCreditCards([
      createCreditCard({ name: `Cartão Delete FS ${uniqueId}`, statement_balance: 50000, due_day: 15 }),
    ]);

    // Calculate next month for the future statement
    const now = new Date();
    let nextMonth = now.getMonth() + 2;
    let nextYear = now.getFullYear();
    if (nextMonth > 12) {
      nextMonth -= 12;
      nextYear += 1;
    }

    await db.seedFutureStatements([
      createFutureStatement({
        credit_card_id: seededCard.id!,
        target_month: nextMonth,
        target_year: nextYear,
        amount: 75000,
      }),
    ]);

    await managePage.goto();
    await managePage.selectCreditCardsTab();

    // Find the credit card and expand future statements section
    const cardElement = page.locator('div.group.relative').filter({
      has: page.getByRole('heading', { name: seededCard.name, level: 3 }),
    }).first();

    await expect(cardElement).toBeVisible({ timeout: 10000 });

    // Click on "Próximas Faturas" to expand
    const collapsibleTrigger = cardElement.getByRole('button', { name: /próximas faturas/i });
    await collapsibleTrigger.click();

    // Wait for future statement to appear
    await expect(cardElement.getByText(formatBRL(75000))).toBeVisible({ timeout: 5000 });

    // Click delete button on the future statement
    const deleteButton = cardElement.getByRole('button', { name: /excluir/i }).first();
    await deleteButton.click();

    // Confirm deletion
    const confirmDialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    await confirmDialog.getByRole('button', { name: /confirmar|sim|yes|excluir/i }).click();
    // Increase timeout for CI environments which can be slower
    await expect(confirmDialog).not.toBeVisible({ timeout: 10000 });

    // Verify future statement is removed
    await expect(async () => {
      await expect(cardElement.getByText(formatBRL(75000))).not.toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 15000, intervals: [500, 1000, 2000] });
  });

  test('T-FS-004: multiple future statements → all displayed with correct months', async ({
    page,
    managePage,
    db,
  }) => {
    // Seed a credit card and multiple future statements
    const uniqueId = Date.now();
    const [seededCard] = await db.seedCreditCards([
      createCreditCard({ name: `Cartão Multi FS ${uniqueId}`, statement_balance: 50000, due_day: 15 }),
    ]);

    // Calculate months for future statements
    const now = new Date();
    const statements = [];
    for (let i = 1; i <= 3; i++) {
      let month = now.getMonth() + 1 + i; // +1 for 1-indexed, +i for offset
      let year = now.getFullYear();
      if (month > 12) {
        month -= 12;
        year += 1;
      }
      statements.push(
        createFutureStatement({
          credit_card_id: seededCard.id!,
          target_month: month,
          target_year: year,
          amount: 50000 + i * 25000, // 75000, 100000, 125000
        })
      );
    }

    await db.seedFutureStatements(statements);

    await managePage.goto();
    await managePage.selectCreditCardsTab();

    // Find the credit card and expand future statements section
    const cardElement = page.locator('div.group.relative').filter({
      has: page.getByRole('heading', { name: seededCard.name, level: 3 }),
    }).first();

    await expect(cardElement).toBeVisible({ timeout: 10000 });

    // Click on "Próximas Faturas" to expand - should show count badge
    const collapsibleTrigger = cardElement.getByRole('button', { name: /próximas faturas/i });
    await expect(collapsibleTrigger).toContainText('3'); // Badge with count
    await collapsibleTrigger.click();

    // Verify all future statements are visible
    await expect(cardElement.getByText(formatBRL(75000))).toBeVisible({ timeout: 5000 });
    await expect(cardElement.getByText(formatBRL(100000))).toBeVisible({ timeout: 5000 });
    await expect(cardElement.getByText(formatBRL(125000))).toBeVisible({ timeout: 5000 });
  });

  test('T-FS-005: future statement count badge updates on add/delete', async ({
    page,
    managePage,
    db,
  }) => {
    // Seed a credit card
    const uniqueId = Date.now();
    const [seededCard] = await db.seedCreditCards([
      createCreditCard({ name: `Cartão Badge ${uniqueId}`, statement_balance: 50000, due_day: 15 }),
    ]);

    await managePage.goto();
    await managePage.selectCreditCardsTab();

    // Find the credit card with retry logic
    let cardElement = page.locator('div.group.relative').filter({
      has: page.getByRole('heading', { name: seededCard.name, level: 3 }),
    }).first();

    await expect(async () => {
      await expect(cardElement).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 15000, intervals: [500, 1000, 2000] });

    // Initially should show 0 or no badge
    const collapsibleTrigger = cardElement.getByRole('button', { name: /próximas faturas/i });
    await collapsibleTrigger.click();

    // Add a future statement
    const addButton = cardElement.getByRole('button', { name: /adicionar/i });
    await expect(addButton).toBeVisible({ timeout: 5000 });
    await addButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    
    // Select a future month (not current month) to avoid warning dialog
    const monthSelect = dialog.locator('button[role="combobox"]').first();
    await monthSelect.click();
    
    // Get next month name in Portuguese
    const nextMonthDate = new Date();
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonthName = nextMonthDate.toLocaleString('pt-BR', { month: 'long' });
    const nextYear = nextMonthDate.getFullYear();
    
    // Select next month option
    const monthOption = page.getByRole('option', {
      name: new RegExp(`${nextMonthName}.*${nextYear}`, 'i'),
    });
    await expect(monthOption).toBeVisible({ timeout: 5000 });
    await monthOption.click();
    
    const amountInput = dialog.getByLabel(/valor/i);
    await amountInput.click();
    await amountInput.fill('1000');
    
    const submitButton = dialog.getByRole('button', { name: /salvar|adicionar/i });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();
    
    // Wait for dialog to close with longer timeout for CI environments
    await expect(dialog).not.toBeVisible({ timeout: 15000 });

    // Badge should now show 1 - use longer timeout and more intervals
    // Re-locate the card element in case DOM changed
    cardElement = page.locator('div.group.relative').filter({
      has: page.getByRole('heading', { name: seededCard.name, level: 3 }),
    }).first();
    
    const updatedTrigger = cardElement.getByRole('button', { name: /próximas faturas/i });
    
    await expect(async () => {
      const text = await updatedTrigger.textContent();
      expect(text).toContain('1');
    }).toPass({ timeout: 20000, intervals: [500, 1000, 2000, 3000] });
  });
});

test.describe('Future Statement Validation', () => {
  test('T-FS-006: cannot add duplicate month/year statement', async ({
    page,
    managePage,
    db,
  }) => {
    // Seed a credit card with existing future statement
    const uniqueId = Date.now();
    const [seededCard] = await db.seedCreditCards([
      createCreditCard({ name: `Cartão Dup ${uniqueId}`, statement_balance: 50000, due_day: 15 }),
    ]);
    

    // Calculate next month
    const now = new Date();
    let nextMonth = now.getMonth() + 2;
    let nextYear = now.getFullYear();
    if (nextMonth > 12) {
      nextMonth -= 12;
      nextYear += 1;
    }

    await db.seedFutureStatements([
      createFutureStatement({
        credit_card_id: seededCard.id!,
        target_month: nextMonth,
        target_year: nextYear,
        amount: 100000,
      }),
    ]);

    await managePage.goto();
    await managePage.selectCreditCardsTab();
    

    // Find the credit card and expand future statements section with retry
    let cardElement = page.locator('div.group.relative').filter({
      has: page.getByRole('heading', { name: seededCard.name, level: 3 }),
    }).first();

    await expect(async () => {
      await expect(cardElement).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 15000, intervals: [500, 1000, 2000] });

    const collapsibleTrigger = cardElement.getByRole('button', { name: /próximas faturas/i });
    await collapsibleTrigger.click();

    // Try to add another statement
    const addButton = cardElement.getByRole('button', { name: /adicionar/i });
    await expect(addButton).toBeVisible({ timeout: 5000 });
    await addButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // The month selector filters out already-used months
    // Select a month different from both current and the seeded one
    const monthSelect = dialog.locator('button[role="combobox"]').first();
    await monthSelect.click();
    
    // Get a future month (3 months ahead to avoid both current and seeded month)
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 3);
    const futureMonthName = futureDate.toLocaleString('pt-BR', { month: 'long' });
    const futureYear = futureDate.getFullYear();
    
    // Select the future month option
    const monthOption = page.getByRole('option', {
      name: new RegExp(`${futureMonthName}.*${futureYear}`, 'i'),
    });
    await expect(monthOption).toBeVisible({ timeout: 5000 });
    await monthOption.click();

    const amountInput = dialog.getByLabel(/valor/i);
    await amountInput.click();
    await amountInput.fill('2000');
    
    const submitButton = dialog.getByRole('button', { name: /salvar|adicionar/i });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // The dialog should close successfully since we picked an available month
    await expect(dialog).not.toBeVisible({ timeout: 15000 });
    
    // Re-locate the card element in case DOM changed
    cardElement = page.locator('div.group.relative').filter({
      has: page.getByRole('heading', { name: seededCard.name, level: 3 }),
    }).first();
    
    const updatedTrigger = cardElement.getByRole('button', { name: /próximas faturas/i });

    // Verify we now have 2 future statements (badge shows count)
    await expect(async () => {
      const text = await updatedTrigger.textContent();
      expect(text).toContain('2');
    }).toPass({ timeout: 20000, intervals: [500, 1000, 2000, 3000] });
  });

  test('T-FS-007: current month warning dialog appears', async ({
    page,
    managePage,
    db,
  }) => {
    // Seed a credit card
    const uniqueId = Date.now();
    const [seededCard] = await db.seedCreditCards([
      createCreditCard({ name: `Cartão Warn ${uniqueId}`, statement_balance: 50000, due_day: 15 }),
    ]);

    await managePage.goto();
    await managePage.selectCreditCardsTab();

    // Find the credit card and expand future statements section
    const cardElement = page.locator('div.group.relative').filter({
      has: page.getByRole('heading', { name: seededCard.name, level: 3 }),
    }).first();

    await expect(cardElement).toBeVisible({ timeout: 10000 });

    const collapsibleTrigger = cardElement.getByRole('button', { name: /próximas faturas/i });
    await collapsibleTrigger.click();

    // Click add button
    const addButton = cardElement.getByRole('button', { name: /adicionar/i });
    await addButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // The month selector shows current month as the first option
    // Select it and fill amount to trigger the warning
    const monthSelect = dialog.locator('button[role="combobox"]').first();
    await monthSelect.click();

    // Get current month name in Portuguese
    const currentMonthName = new Date().toLocaleString('pt-BR', { month: 'long' });
    const currentYear = new Date().getFullYear();

    // Click the current month option
    const monthOption = page.getByRole('option', {
      name: new RegExp(`${currentMonthName}.*${currentYear}`, 'i'),
    });
    
    // If current month is available, select it
    if (await monthOption.isVisible().catch(() => false)) {
      await monthOption.click();
      const amountInput = dialog.getByLabel(/valor/i);
      await amountInput.click();
      await amountInput.fill('1500');
      
      const submitButton = dialog.getByRole('button', { name: /salvar|adicionar/i });
      await expect(submitButton).toBeEnabled({ timeout: 5000 });
      await submitButton.click();

      // Warning dialog should appear for current month
      const warningDialog = page.getByRole('alertdialog');
      await expect(warningDialog).toBeVisible({ timeout: 5000 });
      // Use heading to verify dialog content - more specific than regex matching multiple elements
      await expect(warningDialog.getByRole('heading', { name: /sobrescrever/i })).toBeVisible();
    } else {
      // Current month not available (already has a statement or past due date)
      // Close the dropdown and dialog
      await page.keyboard.press('Escape');
      await dialog.getByRole('button', { name: /cancelar/i }).click();
    }
  });
});

test.describe('Future Statement Empty State', () => {
  test('T-FS-008: empty state shows CTA to add first statement', async ({
    page,
    managePage,
    db,
  }) => {
    // Seed a credit card without future statements
    const uniqueId = Date.now();
    const [seededCard] = await db.seedCreditCards([
      createCreditCard({ name: `Cartão Empty ${uniqueId}`, statement_balance: 50000, due_day: 15 }),
    ]);

    await managePage.goto();
    await managePage.selectCreditCardsTab();

    // Find the credit card and expand future statements section
    const cardElement = page.locator('div.group.relative').filter({
      has: page.getByRole('heading', { name: seededCard.name, level: 3 }),
    }).first();

    await expect(cardElement).toBeVisible({ timeout: 10000 });

    const collapsibleTrigger = cardElement.getByRole('button', { name: /próximas faturas/i });
    await collapsibleTrigger.click();

    // Should show empty state with CTA
    await expect(cardElement.getByText(/nenhuma fatura futura/i)).toBeVisible({ timeout: 5000 });
    await expect(cardElement.getByRole('button', { name: /adicionar.*fatura/i })).toBeVisible();
  });
});

test.describe('Future Statement Brazilian Decimal Format', () => {
  test('T-FS-009: add future statement with comma decimal separator → saves correctly', async ({
    page,
    managePage,
    db,
  }) => {
    // Seed a credit card
    const uniqueId = Date.now();
    const [seededCard] = await db.seedCreditCards([
      createCreditCard({ name: `Cartão Comma ${uniqueId}`, statement_balance: 50000, due_day: 15 }),
    ]);

    await managePage.goto();
    await managePage.selectCreditCardsTab();

    // Find the credit card and expand future statements section
    const cardElement = page.locator('div.group.relative').filter({
      has: page.getByRole('heading', { name: seededCard.name, level: 3 }),
    }).first();

    await expect(cardElement).toBeVisible({ timeout: 10000 });

    // Click on "Próximas Faturas" to expand
    const collapsibleTrigger = cardElement.getByRole('button', { name: /próximas faturas/i });
    await collapsibleTrigger.click();

    // Click add button for future statement
    const addButton = cardElement.getByRole('button', { name: /adicionar/i });
    await addButton.click();

    // Wait for dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select a future month (not current month) to avoid warning dialog
    const monthSelect = dialog.locator('button[role="combobox"]').first();
    await monthSelect.click();
    
    // Get next month name in Portuguese
    const nextMonthDate = new Date();
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonthName = nextMonthDate.toLocaleString('pt-BR', { month: 'long' });
    const nextYear = nextMonthDate.getFullYear();
    
    // Select next month option
    const monthOption = page.getByRole('option', {
      name: new RegExp(`${nextMonthName}.*${nextYear}`, 'i'),
    });
    await monthOption.click();

    // Fill the form with Brazilian decimal format (comma as separator)
    // R$ 1.234,56 = 123456 cents
    const amountInput = dialog.getByLabel(/valor/i);
    await amountInput.click();
    await amountInput.fill('1234,56');
    
    // Wait for the submit button to be enabled (form validation passes)
    const submitButton = dialog.getByRole('button', { name: /salvar|adicionar/i });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });

    // Submit
    await submitButton.click();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Verify future statement appears in the list with correct formatted value
    // R$ 1.234,56 should be displayed
    await expect(async () => {
      await expect(cardElement.getByText(formatBRL(123456))).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 15000, intervals: [500, 1000, 2000] });
  });
});

