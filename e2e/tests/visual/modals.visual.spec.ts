/**
 * Modal Visual Regression Tests
 * Tests visual appearance of Add/Edit dialogs for all entity types
 *
 * @visual
 */

import { expect } from '@playwright/test';
import { visualTest } from '../../fixtures/visual-test-base';
import {
  createAccount,
  createCreditCard,
} from '../../utils/test-data';

/**
 * Modal Visual Regression Tests
 *
 * Captures screenshots of Add and Edit dialogs for each entity type.
 * Tests both light and dark themes.
 */
visualTest.describe('Modal Visual Regression @visual', () => {
  visualTest.describe('Account Modals', () => {
    visualTest('add account modal - light', async ({ page, managePage, db, visual }) => {
      await db.clear();
      await managePage.goto();
      await managePage.selectAccountsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Open the add account dialog
      await page.getByRole('button', { name: /adicionar conta|add account|nova conta/i }).first().click();

      // Wait for dialog to be visible
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'modal-add-account-light.png');

      // Close dialog
      await page.keyboard.press('Escape');
    });

    visualTest('add account modal - dark', async ({ page, managePage, db, visual }) => {
      await db.clear();
      await managePage.goto();
      await managePage.selectAccountsTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await page.getByRole('button', { name: /adicionar conta|add account|nova conta/i }).first().click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'modal-add-account-dark.png');

      await page.keyboard.press('Escape');
    });

    visualTest('edit account modal - light', async ({ page, managePage, db, visual }) => {
      const [seeded] = await db.seedAccounts([
        createAccount({ name: 'Nubank', type: 'checking', balance: 500000 }),
      ]);

      await managePage.goto();
      await managePage.selectAccountsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      const accounts = managePage.accounts();
      await accounts.waitForLoad();

      // Open edit dialog
      await accounts.editAccount(seeded.name);

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'modal-edit-account-light.png');

      await page.keyboard.press('Escape');
    });

    visualTest('edit account modal - dark', async ({ page, managePage, db, visual }) => {
      const [seeded] = await db.seedAccounts([
        createAccount({ name: 'Nubank', type: 'checking', balance: 500000 }),
      ]);

      await managePage.goto();
      await managePage.selectAccountsTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      const accounts = managePage.accounts();
      await accounts.waitForLoad();

      await accounts.editAccount(seeded.name);

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'modal-edit-account-dark.png');

      await page.keyboard.press('Escape');
    });
  });

  visualTest.describe('Expense Modals', () => {
    visualTest('add expense modal - light', async ({ page, managePage, db, visual }) => {
      await db.clear();
      await managePage.goto();
      await managePage.selectExpensesTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Open the add expense dialog
      await page.getByRole('button', { name: /adicionar despesa|add expense|nova despesa/i }).first().click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'modal-add-expense-light.png');

      await page.keyboard.press('Escape');
    });

    visualTest('add expense modal - dark', async ({ page, managePage, db, visual }) => {
      await db.clear();
      await managePage.goto();
      await managePage.selectExpensesTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await page.getByRole('button', { name: /adicionar despesa|add expense|nova despesa/i }).first().click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'modal-add-expense-dark.png');

      await page.keyboard.press('Escape');
    });

    // Note: Edit expense modal tests are skipped because the edit modal uses the same
    // component as the add modal (ExpenseForm). The add modal tests above provide
    // sufficient visual coverage. Edit-specific behavior is tested in functional E2E tests.
  });

  visualTest.describe('Project Modals', () => {
    visualTest('add project modal - light', async ({ page, managePage, db, visual }) => {
      await db.clear();
      await managePage.goto();
      await managePage.selectProjectsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Open the add project dialog
      await page.getByRole('button', { name: /adicionar (projeto|receita)|add (project|income)|nov(o|a)/i }).first().click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'modal-add-project-light.png');

      await page.keyboard.press('Escape');
    });

    visualTest('add project modal - dark', async ({ page, managePage, db, visual }) => {
      await db.clear();
      await managePage.goto();
      await managePage.selectProjectsTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await page.getByRole('button', { name: /adicionar (projeto|receita)|add (project|income)|nov(o|a)/i }).first().click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'modal-add-project-dark.png');

      await page.keyboard.press('Escape');
    });

    // Note: Edit project modal tests are skipped because the edit modal uses the same
    // component as the add modal (ProjectForm). The add modal tests above provide
    // sufficient visual coverage. Edit-specific behavior is tested in functional E2E tests.
  });

  visualTest.describe('Credit Card Modals', () => {
    visualTest('add credit card modal - light', async ({ page, managePage, db, visual }) => {
      await db.clear();
      await managePage.goto();
      await managePage.selectCreditCardsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Open the add credit card dialog
      await page.getByRole('button', { name: /adicionar cartão|add card|novo cartão/i }).first().click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'modal-add-credit-card-light.png');

      await page.keyboard.press('Escape');
    });

    visualTest('add credit card modal - dark', async ({ page, managePage, db, visual }) => {
      await db.clear();
      await managePage.goto();
      await managePage.selectCreditCardsTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      await page.getByRole('button', { name: /adicionar cartão|add card|novo cartão/i }).first().click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'modal-add-credit-card-dark.png');

      await page.keyboard.press('Escape');
    });

    visualTest('edit credit card modal - light', async ({ page, managePage, db, visual }) => {
      const [seeded] = await db.seedCreditCards([
        createCreditCard({ name: 'Nubank Platinum', statement_balance: 300000, due_day: 15 }),
      ]);

      await managePage.goto();
      await managePage.selectCreditCardsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      const creditCards = managePage.creditCards();
      await creditCards.waitForLoad();

      // Find and click edit on the credit card
      const cardElement = page.locator('div.group.relative').filter({
        has: page.getByRole('heading', { name: seeded.name, level: 3 }),
      }).first();
      await cardElement.hover();
      const moreOptionsButton = cardElement.getByRole('button', { name: /mais opções|more/i });
      await expect(moreOptionsButton).toBeVisible();
      await moreOptionsButton.click();
      await page.getByRole('button', { name: /editar/i }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'modal-edit-credit-card-light.png');

      await page.keyboard.press('Escape');
    });

    visualTest('edit credit card modal - dark', async ({ page, managePage, db, visual }) => {
      const [seeded] = await db.seedCreditCards([
        createCreditCard({ name: 'Nubank Platinum', statement_balance: 300000, due_day: 15 }),
      ]);

      await managePage.goto();
      await managePage.selectCreditCardsTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      const creditCards = managePage.creditCards();
      await creditCards.waitForLoad();

      const cardElement = page.locator('div.group.relative').filter({
        has: page.getByRole('heading', { name: seeded.name, level: 3 }),
      }).first();
      await cardElement.hover();
      const moreOptionsButton = cardElement.getByRole('button', { name: /mais opções|more/i });
      await expect(moreOptionsButton).toBeVisible();
      await moreOptionsButton.click();
      await page.getByRole('button', { name: /editar/i }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'modal-edit-credit-card-dark.png');

      await page.keyboard.press('Escape');
    });
  });

  visualTest.describe('Delete Confirmation Modal', () => {
    visualTest('delete confirmation modal - light', async ({ page, managePage, db, visual }) => {
      const [seeded] = await db.seedAccounts([
        createAccount({ name: 'Test Account', type: 'checking', balance: 100000 }),
      ]);

      await managePage.goto();
      await managePage.selectAccountsTab();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      const accounts = managePage.accounts();
      await accounts.waitForLoad();

      // Open delete confirmation
      const accountCard = page.locator('div.group.relative').filter({
        has: page.getByRole('heading', { name: seeded.name, level: 3 }),
      }).first();
      await accountCard.hover();
      const moreOptionsButton = accountCard.getByRole('button', { name: /mais opções|more/i });
      await expect(moreOptionsButton).toBeVisible();
      await moreOptionsButton.click();
      await page.getByRole('button', { name: /excluir/i }).click();

      // Wait for confirmation dialog
      const confirmDialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
      await expect(confirmDialog).toBeVisible();
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'modal-delete-confirmation-light.png');

      // Cancel to avoid actually deleting
      await page.keyboard.press('Escape');
    });

    visualTest('delete confirmation modal - dark', async ({ page, managePage, db, visual }) => {
      const [seeded] = await db.seedAccounts([
        createAccount({ name: 'Test Account', type: 'checking', balance: 100000 }),
      ]);

      await managePage.goto();
      await managePage.selectAccountsTab();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      const accounts = managePage.accounts();
      await accounts.waitForLoad();

      const accountCard = page.locator('div.group.relative').filter({
        has: page.getByRole('heading', { name: seeded.name, level: 3 }),
      }).first();
      await accountCard.hover();
      const moreOptionsButton = accountCard.getByRole('button', { name: /mais opções|more/i });
      await expect(moreOptionsButton).toBeVisible();
      await moreOptionsButton.click();
      await page.getByRole('button', { name: /excluir/i }).click();

      const confirmDialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
      await expect(confirmDialog).toBeVisible();
      await visual.waitForStableUI(page);

      await visual.takeScreenshot(page, 'modal-delete-confirmation-dark.png');

      await page.keyboard.press('Escape');
    });
  });
});

