import { test, expect } from '../fixtures/smoke-test-base';
import { getUserIdFromEmail } from '../utils/supabase-admin';

test('billing gate blocks the app when no subscription exists', async ({ page, db, groupId: _groupId }) => {
  await db.clearBillingSubscription();
  await db.seedAccounts([{ name: 'Conta Teste', balance: 10000 }]);
  await db.seedProjects([{ name: 'Renda Teste', amount: 10000 }]);
  await db.seedExpenses([{ name: 'Despesa Teste', amount: 5000 }]);

  const userId = await getUserIdFromEmail('dev@local');
  await db.completeOnboarding(userId);

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Ative seu teste grátis' })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole('button', { name: 'Começar teste grátis' })).toBeVisible({
    timeout: 15000,
  });

  // Regression guard: the page tour should never render over the billing gate.
  await expect(page.getByLabel('Fechar tour')).toHaveCount(0);
});

