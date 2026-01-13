/**
 * Visual Regression Tests: Quick Update Modal
 * Tests visual appearance of quick update view in various states
 *
 * @visual
 */

import { visualTest } from '../../fixtures/visual-test-base';
import { createAccount, createCreditCard } from '../../utils/test-data';

/**
 * Quick Update Visual Regression Tests
 * 
 * Note: Empty state tests are skipped because the "Atualizar Saldos" button
 * is not always visible in the empty dashboard state due to loading conditions.
 * The populated tests provide sufficient coverage for the quick update modal.
 */
visualTest.describe('Quick Update Visual Regression @visual', () => {
  visualTest.beforeEach(async ({ db }) => {
    // Visual tests run in parallel and DB is worker-scoped; reset before each test
    // to avoid cross-test contamination.
    await db.resetDatabase();
    await db.ensureTestUser();
  });

  visualTest(
    'quick update - light populated',
    async ({ page, dashboardPage, quickUpdatePage, db, visual }) => {
      // Create profiles to use as owners - use workerIndex to avoid email conflicts across parallel workers
      const groupId = await db.getWorkerGroupId();
      const uniqueId = `${db.workerIndex}-${Date.now()}`;
      const email1 = `visual-owner1-light-${uniqueId}@test.local`;
      const email2 = `visual-owner2-light-${uniqueId}@test.local`;
      
      const owner1 = await db.createProfileInGroup(
        email1,
        'João',
        groupId
      );
      const owner2 = await db.createProfileInGroup(
        email2,
        'Maria',
        groupId
      );

      // Seed accounts with ALL THREE types to test type badges
      await db.seedAccounts([
        createAccount({ name: 'Nubank', type: 'checking', balance: 500000, owner_id: owner1.id }),
        createAccount({ name: 'Itaú Poupança', type: 'savings', balance: 200000, owner_id: owner2.id }),
        createAccount({ name: 'XP Investimentos', type: 'investment', balance: 1000000, owner_id: owner1.id }),
      ]);

      await db.seedCreditCards([
        createCreditCard({ name: 'Nubank Platinum', statement_balance: 300000, due_day: 15, owner_id: owner1.id }),
        createCreditCard({ name: 'Itaú Visa', statement_balance: 150000, due_day: 10 }), // No owner
      ]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Open quick update
      await dashboardPage.openQuickUpdate();
      await quickUpdatePage.waitForModal();

      await visual.takeScreenshot(page, 'quick-update-light-populated.png');

      // Clean up profiles
      await db.deleteProfileByEmail(email1);
      await db.deleteProfileByEmail(email2);
    }
  );

  visualTest(
    'quick update - dark populated',
    async ({ page, dashboardPage, quickUpdatePage, db, visual }) => {
      // Create profiles to use as owners - use workerIndex to avoid email conflicts across parallel workers
      const groupId = await db.getWorkerGroupId();
      const uniqueId = `${db.workerIndex}-${Date.now()}`;
      const email1 = `visual-owner1-dark-${uniqueId}@test.local`;
      const email2 = `visual-owner2-dark-${uniqueId}@test.local`;
      
      const owner1 = await db.createProfileInGroup(
        email1,
        'João',
        groupId
      );
      const owner2 = await db.createProfileInGroup(
        email2,
        'Maria',
        groupId
      );

      // Seed accounts with ALL THREE types to test type badges
      await db.seedAccounts([
        createAccount({ name: 'Nubank', type: 'checking', balance: 500000, owner_id: owner1.id }),
        createAccount({ name: 'Itaú Poupança', type: 'savings', balance: 200000, owner_id: owner2.id }),
        createAccount({ name: 'XP Investimentos', type: 'investment', balance: 1000000, owner_id: owner1.id }),
      ]);

      await db.seedCreditCards([
        createCreditCard({ name: 'Nubank Platinum', statement_balance: 300000, due_day: 15, owner_id: owner1.id }),
        createCreditCard({ name: 'Itaú Visa', statement_balance: 150000, due_day: 10 }), // No owner
      ]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      // Open quick update
      await dashboardPage.openQuickUpdate();
      await quickUpdatePage.waitForModal();

      await visual.takeScreenshot(page, 'quick-update-dark-populated.png');

      // Clean up profiles
      await db.deleteProfileByEmail(email1);
      await db.deleteProfileByEmail(email2);
    }
  );

  visualTest(
    'quick update - light all account types',
    async ({ page, dashboardPage, quickUpdatePage, db, visual }) => {
      // Test all account types without owners to focus on type badges
      await db.seedAccounts([
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 150000 }),
        createAccount({ name: 'Poupança Reserva', type: 'savings', balance: 250000 }),
        createAccount({ name: 'Investimentos XP', type: 'investment', balance: 500000 }),
      ]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'light');
      await visual.waitForStableUI(page);

      // Open quick update
      await dashboardPage.openQuickUpdate();
      await quickUpdatePage.waitForModal();

      await visual.takeScreenshot(page, 'quick-update-light-all-types.png');
    }
  );

  visualTest(
    'quick update - dark all account types',
    async ({ page, dashboardPage, quickUpdatePage, db, visual }) => {
      // Test all account types without owners to focus on type badges
      await db.seedAccounts([
        createAccount({ name: 'Conta Corrente', type: 'checking', balance: 150000 }),
        createAccount({ name: 'Poupança Reserva', type: 'savings', balance: 250000 }),
        createAccount({ name: 'Investimentos XP', type: 'investment', balance: 500000 }),
      ]);

      await dashboardPage.goto();
      await visual.setTheme(page, 'dark');
      await visual.waitForStableUI(page);

      // Open quick update
      await dashboardPage.openQuickUpdate();
      await quickUpdatePage.waitForModal();

      await visual.takeScreenshot(page, 'quick-update-dark-all-types.png');
    }
  );
});

