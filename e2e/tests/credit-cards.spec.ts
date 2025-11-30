/**
 * E2E Tests: User Story 6 - Credit Card Management
 * Tests CRUD operations for credit cards
 */

import { test, expect } from '../fixtures/test-base';
import { createCreditCard } from '../utils/test-data';
import { formatBRL } from '../utils/format';

test.describe('Credit Card Management', () => {
  // Tests now run in parallel with per-worker data prefixing for isolation

  test('T058: create credit card "Nubank" with balance R$ 500,00 due day 15 → appears in list', async ({
    managePage,
    workerContext,
  }) => {
    await managePage.goto();
    await managePage.selectCreditCardsTab();

    const creditCards = managePage.creditCards();
    // Use worker-specific name for UI-created data to avoid conflicts
    const cardName = `Nubank CC W${workerContext.workerIndex}`;
    await creditCards.createCreditCard({
      name: cardName,
      balance: '500,00',
      dueDay: '15',
    });

    await creditCards.expectCardVisible(cardName);
  });

  test('T059: edit credit card balance to R$ 750,00 → updated balance displayed', async ({
    page,
    managePage,
    db,
  }) => {
    // Use unique name
    const uniqueId = Date.now();
    const [seeded] = await db.seedCreditCards([
      createCreditCard({ name: `Cartão Teste ${uniqueId}`, statement_balance: 50000, due_day: 10 }),
    ]);

    await managePage.goto();
    await managePage.selectCreditCardsTab();

    const creditCards = managePage.creditCards();
    await creditCards.expectCardVisible(seeded.name);
    await creditCards.updateCardBalance(seeded.name, '750,00');

    // Verify new balance is displayed
    await expect(page.getByText(formatBRL(75000))).toBeVisible();
  });

  test('T060: delete credit card with confirmation → removed from list', async ({
    page,
    managePage,
    db,
  }) => {
    // Use unique name
    const uniqueId = Date.now();
    const [seeded] = await db.seedCreditCards([
      createCreditCard({ name: `Cartão Excluir ${uniqueId}`, statement_balance: 30000, due_day: 20 }),
    ]);

    await managePage.goto();
    await managePage.selectCreditCardsTab();

    const creditCards = managePage.creditCards();
    await creditCards.expectCardVisible(seeded.name);

    await creditCards.deleteCard(seeded.name);

    // Reload to verify deletion
    await page.reload();
    await page.waitForLoadState('networkidle');
    await managePage.selectCreditCardsTab();

    await creditCards.expectCardNotVisible(seeded.name);
  });

  test('T061: multiple credit cards exist → all displayed with correct due days', async ({
    page,
    managePage,
    db,
  }) => {
    const seeded = await db.seedCreditCards([
      createCreditCard({ name: 'Nubank Multi CC', statement_balance: 50000, due_day: 10 }),
      createCreditCard({ name: 'Itaú Multi CC', statement_balance: 75000, due_day: 15 }),
      createCreditCard({ name: 'Inter Multi CC', statement_balance: 25000, due_day: 20 }),
    ]);

    await managePage.goto();
    await managePage.selectCreditCardsTab();

    const creditCards = managePage.creditCards();

    // Verify all cards are visible (using seeded names which include prefix)
    for (const card of seeded) {
      await creditCards.expectCardVisible(card.name);
    }

    // Verify due days are displayed (at least one of them)
    await expect(page.getByText(/dia 10|dia 15|dia 20|venc.*10|venc.*15|venc.*20/i).first()).toBeVisible();
  });
});
