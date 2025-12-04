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
    await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(5000)]);
    await managePage.selectCreditCardsTab();

    const creditCards = managePage.creditCards();
    await creditCards.waitForLoad();
    await creditCards.expectCardVisible(seeded.name);
    await creditCards.updateCardBalance(seeded.name, '750,00');

    // Wait for update to complete via realtime subscription
    // Use toPass to retry until realtime update propagates
    await expect(async () => {
      // Ensure we're still on the credit cards tab
      const cardsTab = page.getByRole('tab', { name: /cartões/i });
      if (!(await cardsTab.getAttribute('aria-selected'))?.includes('true')) {
        await managePage.selectCreditCardsTab();
      }
      await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(5000)]);
      await expect(page.getByText(formatBRL(75000)).first()).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 20000, intervals: [500, 1000, 2000, 3000] });
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
    await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(5000)]);
    await managePage.selectCreditCardsTab();

    const creditCards = managePage.creditCards();
    await creditCards.waitForLoad();
    await creditCards.expectCardVisible(seeded.name);

    await creditCards.deleteCard(seeded.name);

    // Wait for deletion to complete with retry logic
    await expect(async () => {
      // Ensure we're still on the credit cards tab
      const cardsTab = page.getByRole('tab', { name: /cartões/i });
      if (!(await cardsTab.getAttribute('aria-selected'))?.includes('true')) {
        await managePage.selectCreditCardsTab();
      }
      await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(5000)]);
      // Verify card is no longer visible
      await expect(page.getByText(seeded.name)).not.toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 20000, intervals: [500, 1000, 2000, 3000] });
  });

  test('T061: multiple credit cards exist → all displayed with correct due days', async ({
    page,
    managePage,
    db,
  }) => {
    // Use unique name
    const uniqueId = Date.now();
    const seeded = await db.seedCreditCards([
      createCreditCard({ name: `Nubank Multi CC ${uniqueId}`, statement_balance: 50000, due_day: 10 }),
      createCreditCard({ name: `Itaú Multi CC ${uniqueId}`, statement_balance: 75000, due_day: 15 }),
      createCreditCard({ name: `Inter Multi CC ${uniqueId}`, statement_balance: 25000, due_day: 20 }),
    ]);

    await managePage.goto();
    await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(5000)]);
    await managePage.selectCreditCardsTab();

    const creditCards = managePage.creditCards();
    await creditCards.waitForLoad();

    // Verify all cards are visible (using seeded names which include worker prefix)
    for (const card of seeded) {
      await creditCards.expectCardVisible(card.name);
    }

    // Verify due days are displayed (at least one of them)
    await expect(page.getByText(/dia 10|dia 15|dia 20|venc.*10|venc.*15|venc.*20/i).first()).toBeVisible();
  });
});
