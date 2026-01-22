import { test, expect } from '../fixtures/smoke-test-base';
import { executeSQL, getUserIdFromEmail } from '../utils/supabase-admin';

test('billing gate blocks the app when no subscription exists', async ({ page, db, groupId }) => {
  await db.clearBillingSubscription();
  await db.seedAccounts([{ name: 'Conta Teste', balance: 10000 }]);
  await db.seedProjects([{ name: 'Renda Teste', amount: 10000 }]);
  await db.seedExpenses([{ name: 'Despesa Teste', amount: 5000 }]);

  const userId = await getUserIdFromEmail('dev@local');
  const completedAt = new Date().toISOString();

  await executeSQL(
    `INSERT INTO public.onboarding_states (user_id, group_id, status, current_step, completed_at)
     VALUES ($1, $2, 'completed', 'done', $3)
     ON CONFLICT (user_id, group_id)
     DO UPDATE SET status = EXCLUDED.status, current_step = EXCLUDED.current_step, completed_at = EXCLUDED.completed_at`,
    [userId, groupId, completedAt]
  );

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Assinatura necessária' })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole('button', { name: 'Começar teste grátis' })).toBeVisible({
    timeout: 15000,
  });
});

