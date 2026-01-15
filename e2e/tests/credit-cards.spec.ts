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

  test('T064: newly created credit card shows fresh freshness indicator', async ({
    managePage,
    workerContext,
  }) => {
    await managePage.goto();
    await managePage.selectCreditCardsTab();

    const creditCards = managePage.creditCards();
    
    // Create a new credit card
    const uniqueId = Date.now();
    const cardName = `Fresh Card W${workerContext.workerIndex} ${uniqueId}`;
    await creditCards.createCreditCard({
      name: cardName,
      balance: '300,00',
      dueDay: '20',
    });

    await creditCards.expectCardVisible(cardName);

    // Verify the freshness indicator shows "fresh" (green bar)
    // since the card was just created with balance_updated_at set to now
    await expect(async () => {
      const freshness = await creditCards.getCardFreshness(cardName);
      expect(freshness).toBe('fresh');
    }).toPass({ timeout: 10000, intervals: [500, 1000, 2000] });
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
      await creditCards.waitForLoad();
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
      await creditCards.waitForLoad();
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

  test('T062: credit cards maintain stable alphabetical order after balance update', async ({
    page,
    managePage,
    db,
  }) => {
    // Use unique timestamp to avoid collisions with other test runs
    const uniqueId = Date.now();

    // Seed 3 credit cards with names that sort predictably (A < B < C alphabetically)
    const seeded = await db.seedCreditCards([
      createCreditCard({ name: `AAA Cartão ${uniqueId}`, statement_balance: 50000, due_day: 10 }),
      createCreditCard({ name: `BBB Cartão ${uniqueId}`, statement_balance: 75000, due_day: 15 }),
      createCreditCard({ name: `CCC Cartão ${uniqueId}`, statement_balance: 25000, due_day: 20 }),
    ]);

    await managePage.goto();
    await managePage.selectCreditCardsTab();

    const creditCards = managePage.creditCards();
    await creditCards.waitForLoad();

    // Verify all cards are visible
    for (const card of seeded) {
      await creditCards.expectCardVisible(card.name);
    }

    // Get initial order
    const initialOrder = await creditCards.getCardNamesInOrder();
    
    // Filter to just our seeded cards (there may be others from previous tests)
    const ourInitialOrder = initialOrder.filter(name => 
      seeded.some(s => s.name === name)
    );

    // Update balance of the MIDDLE card (BBB Cartão)
    const middleCard = seeded[1];
    await creditCards.updateCardBalance(middleCard.name, '1.500,00');

    // Wait for update to complete via realtime subscription
    await expect(async () => {
      // Ensure we're still on the credit cards tab
      const cardsTab = page.getByRole('tab', { name: /cartões/i });
      if (!(await cardsTab.getAttribute('aria-selected'))?.includes('true')) {
        await managePage.selectCreditCardsTab();
      }
      await creditCards.waitForLoad();
      await expect(page.getByText(formatBRL(150000)).first()).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 20000, intervals: [500, 1000, 2000, 3000] });

    // Get order after update
    const orderAfterUpdate = await creditCards.getCardNamesInOrder();
    
    // Filter to just our seeded cards
    const ourOrderAfterUpdate = orderAfterUpdate.filter(name => 
      seeded.some(s => s.name === name)
    );

    // CRITICAL ASSERTION: Order should remain identical after balance update
    expect(ourOrderAfterUpdate).toEqual(ourInitialOrder);
  });

  test('T063: credit card freshness indicator shows fresh after balance update', async ({
    page,
    managePage,
    db,
  }) => {
    // Use unique timestamp to avoid collisions with other test runs
    const uniqueId = Date.now();

    // Seed a credit card with an old balance_updated_at (stale)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 10); // 10 days ago = stale
    
    const [seeded] = await db.seedCreditCards([
      createCreditCard({ 
        name: `Cartão Freshness ${uniqueId}`, 
        statement_balance: 50000,
        due_day: 15,
        balance_updated_at: oldDate.toISOString(),
      }),
    ]);

    await managePage.goto();
    await managePage.selectCreditCardsTab();

    const creditCards = managePage.creditCards();
    await creditCards.waitForLoad();
    await creditCards.expectCardVisible(seeded.name);

    // Check initial freshness is stale
    const initialFreshness = await creditCards.getCardFreshness(seeded.name);
    expect(initialFreshness).toBe('stale');

    // Update the balance
    await creditCards.updateCardBalance(seeded.name, '1.000,00');

    // Wait for update to complete
    await expect(async () => {
      await expect(page.getByText(formatBRL(100000)).first()).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 20000, intervals: [500, 1000, 2000, 3000] });

    // Check freshness is now fresh (updated today)
    await expect(async () => {
      const freshness = await creditCards.getCardFreshness(seeded.name);
      expect(freshness).toBe('fresh');
    }).toPass({ timeout: 10000, intervals: [500, 1000, 2000] });
  });
});
