/**
 * E2E Tests: User Story 7 - Credit Card Management
 * Tests CRUD operations for credit cards
 */

import { test, expect } from '../fixtures/test-base';
import { createCreditCard } from '../utils/test-data';
import { formatBRL } from '../utils/format';

test.describe('Credit Card Management', () => {
  // Run tests serially to avoid database race conditions
  test.describe.configure({ mode: 'serial' });
  test('T064: create credit card "Nubank Platinum" R$ 3.000,00 due day 15 → appears in list', async ({
    managePage,
    db,
  }) => {
    await db.resetDatabase();
    await db.ensureTestUser(process.env.TEST_USER_EMAIL || 'e2e-test@example.com');
    await managePage.goto();
    await managePage.selectCreditCardsTab();

    const creditCards = managePage.creditCards();
    await creditCards.createCreditCard({
      name: 'Nubank Platinum',
      balance: '3.000,00',
      dueDay: '15',
    });

    await creditCards.expectCardVisible('Nubank Platinum');
  });

  test('T065: edit due day to 20 → updated due day displayed', async ({
    page,
    managePage,
    db,
  }) => {
    await db.resetDatabase();
    await db.ensureTestUser(process.env.TEST_USER_EMAIL || 'e2e-test@example.com');
    await db.seedCreditCards([
      createCreditCard({ name: 'Cartão Teste', due_day: 15 }),
    ]);

    await managePage.goto();
    await managePage.selectCreditCardsTab();

    const creditCards = managePage.creditCards();
    await creditCards.updateDueDay('Cartão Teste', '20');

    // Verify due day is updated
    await expect(page.getByText(/dia 20|20/)).toBeVisible();
  });

  test('T066: update statement balance → new balance reflected', async ({
    page,
    managePage,
    db,
  }) => {
    await db.resetDatabase();
    await db.ensureTestUser(process.env.TEST_USER_EMAIL || 'e2e-test@example.com');
    await db.seedCreditCards([
      createCreditCard({ name: 'Cartão Atualizar', statement_balance: 150000 }),
    ]);

    await managePage.goto();
    await managePage.selectCreditCardsTab();

    const creditCards = managePage.creditCards();
    await creditCards.updateBalance('Cartão Atualizar', '2.500,00');

    // Verify new balance is displayed
    await expect(page.getByText(formatBRL(250000))).toBeVisible();
  });

  test('T067: delete credit card with confirmation → removed from list', async ({
    managePage,
    db,
  }) => {
    await db.resetDatabase();
    await db.ensureTestUser(process.env.TEST_USER_EMAIL || 'e2e-test@example.com');
    await db.seedCreditCards([
      createCreditCard({ name: 'Cartão Excluir', statement_balance: 50000 }),
    ]);

    await managePage.goto();
    await managePage.selectCreditCardsTab();

    const creditCards = managePage.creditCards();
    await creditCards.expectCardVisible('Cartão Excluir');

    await creditCards.deleteCreditCard('Cartão Excluir');

    await creditCards.expectCardNotVisible('Cartão Excluir');
  });
});

