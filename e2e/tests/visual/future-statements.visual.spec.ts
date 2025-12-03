/**
 * Visual Regression Tests: Future Statements
 * Tests visual appearance of future statements section in various states
 *
 * @visual
 */

import { visualTest, expect } from '../../fixtures/visual-test-base';
import { createCreditCard, createFutureStatement } from '../../utils/test-data';

/**
 * Future Statements Visual Regression Tests
 *
 * IMPORTANT: Each test explicitly resets the database to ensure isolation.
 */
visualTest.describe('Future Statements Visual Regression @visual', () => {
  visualTest.describe('Credit Card with Future Statements', () => {
    visualTest('future statements - light empty', async ({ page, managePage, db, visual }) => {
      // Seed a credit card without future statements
      await db.seedCreditCards([
        createCreditCard({ name: 'Nubank Visual', statement_balance: 300000, due_day: 15 }),
      ]);

      await managePage.goto();
      await managePage.selectCreditCardsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Expand the future statements section
      const cardElement = page.locator('div.group.relative').filter({
        has: page.getByRole('heading', { name: 'Nubank Visual', level: 3 }),
      }).first();

      await expect(cardElement).toBeVisible({ timeout: 10000 });

      const collapsibleTrigger = cardElement.getByRole('button', { name: /próximas faturas/i });
      await collapsibleTrigger.click();
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'future-statements-light-empty.png');
    });

    visualTest('future statements - dark empty', async ({ page, managePage, db, visual }) => {
      // Seed a credit card without future statements
      await db.seedCreditCards([
        createCreditCard({ name: 'Nubank Visual', statement_balance: 300000, due_day: 15 }),
      ]);

      await managePage.goto();
      await managePage.selectCreditCardsTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      // Expand the future statements section
      const cardElement = page.locator('div.group.relative').filter({
        has: page.getByRole('heading', { name: 'Nubank Visual', level: 3 }),
      }).first();

      await expect(cardElement).toBeVisible({ timeout: 10000 });

      const collapsibleTrigger = cardElement.getByRole('button', { name: /próximas faturas/i });
      await collapsibleTrigger.click();
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'future-statements-dark-empty.png');
    });

    visualTest('future statements - light populated', async ({ page, managePage, db, visual }) => {
      // Seed a credit card with future statements
      const [seededCard] = await db.seedCreditCards([
        createCreditCard({ name: 'Nubank Visual', statement_balance: 300000, due_day: 15 }),
      ]);

      // Add future statements for the next 3 months
      // Using fixed dates for visual test consistency (based on VISUAL_TEST_FIXED_DATE 2025-01-15)
      await db.seedFutureStatements([
        createFutureStatement({
          credit_card_id: seededCard.id!,
          target_month: 2, // February
          target_year: 2025,
          amount: 150000,
        }),
        createFutureStatement({
          credit_card_id: seededCard.id!,
          target_month: 3, // March
          target_year: 2025,
          amount: 200000,
        }),
        createFutureStatement({
          credit_card_id: seededCard.id!,
          target_month: 4, // April
          target_year: 2025,
          amount: 175000,
        }),
      ]);

      await managePage.goto();
      await managePage.selectCreditCardsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Expand the future statements section
      const cardElement = page.locator('div.group.relative').filter({
        has: page.getByRole('heading', { name: 'Nubank Visual', level: 3 }),
      }).first();

      await expect(cardElement).toBeVisible({ timeout: 10000 });

      const collapsibleTrigger = cardElement.getByRole('button', { name: /próximas faturas/i });
      await collapsibleTrigger.click();
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'future-statements-light-populated.png');
    });

    visualTest('future statements - dark populated', async ({ page, managePage, db, visual }) => {
      // Seed a credit card with future statements
      const [seededCard] = await db.seedCreditCards([
        createCreditCard({ name: 'Nubank Visual', statement_balance: 300000, due_day: 15 }),
      ]);

      // Add future statements for the next 3 months
      await db.seedFutureStatements([
        createFutureStatement({
          credit_card_id: seededCard.id!,
          target_month: 2, // February
          target_year: 2025,
          amount: 150000,
        }),
        createFutureStatement({
          credit_card_id: seededCard.id!,
          target_month: 3, // March
          target_year: 2025,
          amount: 200000,
        }),
        createFutureStatement({
          credit_card_id: seededCard.id!,
          target_month: 4, // April
          target_year: 2025,
          amount: 175000,
        }),
      ]);

      await managePage.goto();
      await managePage.selectCreditCardsTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      // Expand the future statements section
      const cardElement = page.locator('div.group.relative').filter({
        has: page.getByRole('heading', { name: 'Nubank Visual', level: 3 }),
      }).first();

      await expect(cardElement).toBeVisible({ timeout: 10000 });

      const collapsibleTrigger = cardElement.getByRole('button', { name: /próximas faturas/i });
      await collapsibleTrigger.click();
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'future-statements-dark-populated.png');
    });
  });

  visualTest.describe('Future Statement Form', () => {
    visualTest('add form - light', async ({ page, managePage, db, visual }) => {
      // Seed a credit card
      await db.seedCreditCards([
        createCreditCard({ name: 'Nubank Form', statement_balance: 300000, due_day: 15 }),
      ]);

      await managePage.goto();
      await managePage.selectCreditCardsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Find card and open add form
      const cardElement = page.locator('div.group.relative').filter({
        has: page.getByRole('heading', { name: 'Nubank Form', level: 3 }),
      }).first();

      await expect(cardElement).toBeVisible({ timeout: 10000 });

      const collapsibleTrigger = cardElement.getByRole('button', { name: /próximas faturas/i });
      await collapsibleTrigger.click();
      await visual.waitForStableUI(page);

      const addButton = cardElement.getByRole('button', { name: /adicionar fatura/i });
      await addButton.click();

      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'future-statement-form-add-light.png');
    });

    visualTest('add form - dark', async ({ page, managePage, db, visual }) => {
      // Seed a credit card
      await db.seedCreditCards([
        createCreditCard({ name: 'Nubank Form', statement_balance: 300000, due_day: 15 }),
      ]);

      await managePage.goto();
      await managePage.selectCreditCardsTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      // Find card and open add form
      const cardElement = page.locator('div.group.relative').filter({
        has: page.getByRole('heading', { name: 'Nubank Form', level: 3 }),
      }).first();

      await expect(cardElement).toBeVisible({ timeout: 10000 });

      const collapsibleTrigger = cardElement.getByRole('button', { name: /próximas faturas/i });
      await collapsibleTrigger.click();
      await visual.waitForStableUI(page);

      const addButton = cardElement.getByRole('button', { name: /adicionar fatura/i });
      await addButton.click();

      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'future-statement-form-add-dark.png');
    });

    visualTest('edit form - light', async ({ page, managePage, db, visual }) => {
      // Seed a credit card with a future statement
      const [seededCard] = await db.seedCreditCards([
        createCreditCard({ name: 'Nubank Edit', statement_balance: 300000, due_day: 15 }),
      ]);

      await db.seedFutureStatements([
        createFutureStatement({
          credit_card_id: seededCard.id!,
          target_month: 2,
          target_year: 2025,
          amount: 150000,
        }),
      ]);

      await managePage.goto();
      await managePage.selectCreditCardsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Find card and open edit form
      const cardElement = page.locator('div.group.relative').filter({
        has: page.getByRole('heading', { name: 'Nubank Edit', level: 3 }),
      }).first();

      await expect(cardElement).toBeVisible({ timeout: 10000 });

      const collapsibleTrigger = cardElement.getByRole('button', { name: /próximas faturas/i });
      await collapsibleTrigger.click();
      await visual.waitForStableUI(page);

      const editButton = cardElement.getByRole('button', { name: /editar/i }).first();
      await editButton.click();

      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'future-statement-form-edit-light.png');
    });

    visualTest('edit form - dark', async ({ page, managePage, db, visual }) => {
      // Seed a credit card with a future statement
      const [seededCard] = await db.seedCreditCards([
        createCreditCard({ name: 'Nubank Edit', statement_balance: 300000, due_day: 15 }),
      ]);

      await db.seedFutureStatements([
        createFutureStatement({
          credit_card_id: seededCard.id!,
          target_month: 2,
          target_year: 2025,
          amount: 150000,
        }),
      ]);

      await managePage.goto();
      await managePage.selectCreditCardsTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      // Find card and open edit form
      const cardElement = page.locator('div.group.relative').filter({
        has: page.getByRole('heading', { name: 'Nubank Edit', level: 3 }),
      }).first();

      await expect(cardElement).toBeVisible({ timeout: 10000 });

      const collapsibleTrigger = cardElement.getByRole('button', { name: /próximas faturas/i });
      await collapsibleTrigger.click();
      await visual.waitForStableUI(page);

      const editButton = cardElement.getByRole('button', { name: /editar/i }).first();
      await editButton.click();

      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'future-statement-form-edit-dark.png');
    });
  });

  visualTest.describe('Delete Confirmation Dialog', () => {
    visualTest('delete confirmation - light', async ({ page, managePage, db, visual }) => {
      // Seed a credit card with a future statement
      const [seededCard] = await db.seedCreditCards([
        createCreditCard({ name: 'Nubank Delete', statement_balance: 300000, due_day: 15 }),
      ]);

      await db.seedFutureStatements([
        createFutureStatement({
          credit_card_id: seededCard.id!,
          target_month: 2,
          target_year: 2025,
          amount: 150000,
        }),
      ]);

      await managePage.goto();
      await managePage.selectCreditCardsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Find card and click delete
      const cardElement = page.locator('div.group.relative').filter({
        has: page.getByRole('heading', { name: 'Nubank Delete', level: 3 }),
      }).first();

      await expect(cardElement).toBeVisible({ timeout: 10000 });

      const collapsibleTrigger = cardElement.getByRole('button', { name: /próximas faturas/i });
      await collapsibleTrigger.click();
      await visual.waitForStableUI(page);

      const deleteButton = cardElement.getByRole('button', { name: /excluir/i }).first();
      await deleteButton.click();

      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'future-statement-delete-confirm-light.png');
    });

    visualTest('delete confirmation - dark', async ({ page, managePage, db, visual }) => {
      // Seed a credit card with a future statement
      const [seededCard] = await db.seedCreditCards([
        createCreditCard({ name: 'Nubank Delete', statement_balance: 300000, due_day: 15 }),
      ]);

      await db.seedFutureStatements([
        createFutureStatement({
          credit_card_id: seededCard.id!,
          target_month: 2,
          target_year: 2025,
          amount: 150000,
        }),
      ]);

      await managePage.goto();
      await managePage.selectCreditCardsTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      // Find card and click delete
      const cardElement = page.locator('div.group.relative').filter({
        has: page.getByRole('heading', { name: 'Nubank Delete', level: 3 }),
      }).first();

      await expect(cardElement).toBeVisible({ timeout: 10000 });

      const collapsibleTrigger = cardElement.getByRole('button', { name: /próximas faturas/i });
      await collapsibleTrigger.click();
      await visual.waitForStableUI(page);

      const deleteButton = cardElement.getByRole('button', { name: /excluir/i }).first();
      await deleteButton.click();

      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'future-statement-delete-confirm-dark.png');
    });
  });

  visualTest.describe('Multiple Cards with Future Statements', () => {
    visualTest('multiple cards - light', async ({ page, managePage, db, visual }) => {
      // Seed multiple credit cards with future statements
      const cards = await db.seedCreditCards([
        createCreditCard({ name: 'Nubank Multi', statement_balance: 300000, due_day: 15 }),
        createCreditCard({ name: 'Itaú Multi', statement_balance: 150000, due_day: 10 }),
      ]);

      await db.seedFutureStatements([
        createFutureStatement({
          credit_card_id: cards[0].id!,
          target_month: 2,
          target_year: 2025,
          amount: 200000,
        }),
        createFutureStatement({
          credit_card_id: cards[1].id!,
          target_month: 2,
          target_year: 2025,
          amount: 100000,
        }),
      ]);

      await managePage.goto();
      await managePage.selectCreditCardsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Expand both cards' future statements sections
      for (const card of cards) {
        const cardElement = page.locator('div.group.relative').filter({
          has: page.getByRole('heading', { name: card.name, level: 3 }),
        }).first();

        await expect(cardElement).toBeVisible({ timeout: 10000 });

        const collapsibleTrigger = cardElement.getByRole('button', { name: /próximas faturas/i });
        await collapsibleTrigger.click();
      }

      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'future-statements-multiple-cards-light.png');
    });

    visualTest('multiple cards - dark', async ({ page, managePage, db, visual }) => {
      // Seed multiple credit cards with future statements
      const cards = await db.seedCreditCards([
        createCreditCard({ name: 'Nubank Multi', statement_balance: 300000, due_day: 15 }),
        createCreditCard({ name: 'Itaú Multi', statement_balance: 150000, due_day: 10 }),
      ]);

      await db.seedFutureStatements([
        createFutureStatement({
          credit_card_id: cards[0].id!,
          target_month: 2,
          target_year: 2025,
          amount: 200000,
        }),
        createFutureStatement({
          credit_card_id: cards[1].id!,
          target_month: 2,
          target_year: 2025,
          amount: 100000,
        }),
      ]);

      await managePage.goto();
      await managePage.selectCreditCardsTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      // Expand both cards' future statements sections
      for (const card of cards) {
        const cardElement = page.locator('div.group.relative').filter({
          has: page.getByRole('heading', { name: card.name, level: 3 }),
        }).first();

        await expect(cardElement).toBeVisible({ timeout: 10000 });

        const collapsibleTrigger = cardElement.getByRole('button', { name: /próximas faturas/i });
        await collapsibleTrigger.click();
      }

      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'future-statements-multiple-cards-dark.png');
    });
  });
});

