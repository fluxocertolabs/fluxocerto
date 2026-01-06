/**
 * E2E Tests: Provisioning Recovery
 * Tests the self-heal logic for orphaned users (users without a group association).
 * 
 * The app should automatically recover via ensure_current_user_group() RPC,
 * or show a recovery UI ("Tentar Novamente") that allows manual recovery.
 */

import { test, expect } from '../fixtures/test-base';
import { executeSQL, executeSQLWithResult } from '../utils/supabase-admin';

test.describe('Provisioning Recovery', () => {
  // Run recovery tests serially to avoid state conflicts
  test.describe.configure({ mode: 'serial' });

  function escapeSqlLiteral(value: string): string {
    return value.replace(/'/g, "''");
  }

  /**
   * Helper to get the worker's group ID from the database
   */
  async function getWorkerGroupId(workerEmail: string): Promise<string | null> {
    const rows = await executeSQLWithResult<{ group_id: string }>(
      `SELECT p.group_id FROM public.profiles p WHERE p.email = '${escapeSqlLiteral(
        workerEmail.toLowerCase()
      )}'`
    );
    return rows.length > 0 ? rows[0].group_id : null;
  }

  async function getWorkerProfile(workerEmail: string): Promise<{ id: string; group_id: string; name: string } | null> {
    const rows = await executeSQLWithResult<{ id: string; group_id: string; name: string }>(
      `SELECT p.id, p.group_id, p.name FROM public.profiles p WHERE p.email = '${escapeSqlLiteral(
        workerEmail.toLowerCase()
      )}' LIMIT 1`
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Helper to orphan a user by removing their group association
   * This simulates a provisioning failure scenario
   */
  async function orphanUser(userEmail: string): Promise<void> {
    // Orphan by removing the user's profile row.
    // This matches the real-world failure mode: new auth user exists, but provisioning did not
    // create the `profiles` row yet, so RLS `get_user_group_id()` returns NULL.
    await executeSQL(`
      DELETE FROM public.profiles
      WHERE email = '${escapeSqlLiteral(userEmail.toLowerCase())}'
    `);
  }

  /**
   * Helper to restore a user's group association
   */
  async function restoreUserProfile(userEmail: string, profile: { id: string; group_id: string; name: string }): Promise<void> {
    // Remove any profile row that may have been recreated by `ensure_current_user_group()`
    // with a different `id`, then restore the original row exactly.
    await executeSQL(`
      DELETE FROM public.profiles
      WHERE email = '${escapeSqlLiteral(userEmail.toLowerCase())}'
    `);

    await executeSQL(`
      INSERT INTO public.profiles (id, email, group_id, name, created_at)
      VALUES (
        '${profile.id}',
        '${escapeSqlLiteral(userEmail.toLowerCase())}',
        '${profile.group_id}',
        '${escapeSqlLiteral(profile.name)}',
        now()
      )
    `);
  }

  test('orphaned user auto-heals via ensure_current_user_group on dashboard', async ({
    dashboardPage,
    workerContext,
  }) => {
    const originalProfile = await getWorkerProfile(workerContext.email);
    expect(originalProfile).not.toBeNull();

    try {
      // Orphan the user (remove group association)
      await orphanUser(workerContext.email);

      // Navigate to dashboard - `useGroup()` should self-heal automatically.
      await dashboardPage.goto();

      // Assert group_id becomes non-null again (self-heal succeeded).
      await expect
        .poll(() => getWorkerGroupId(workerContext.email), { timeout: 20000 })
        .not.toBeNull();
    } finally {
      // Restore the user's group association for subsequent tests
      if (originalProfile) {
        await restoreUserProfile(workerContext.email, originalProfile);
      }
    }
  });

  test('when auto-heal fails, manage group tab shows recovery UI and retry recovers', async ({
    page,
    managePage,
    workerContext,
  }) => {
    const originalProfile = await getWorkerProfile(workerContext.email);
    expect(originalProfile).not.toBeNull();

    // Force the FIRST provisioning attempt to fail so the recoverable UI is deterministic.
    // Subsequent calls will be allowed to proceed.
    let failFirstProvisioningCall = true;
    await page.route('**/rest/v1/rpc/ensure_current_user_group*', async (route) => {
      if (failFirstProvisioningCall) {
        failFirstProvisioningCall = false;
        await route.fulfill({
          status: 500,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ message: 'forced failure for deterministic recovery UI' }),
        });
        return;
      }
      await route.continue();
    });

    try {
      // Orphan the user
      await orphanUser(workerContext.email);

      // Navigate to manage page
      await managePage.goto();
      await page.waitForTimeout(1000);

      // Switch to Group tab
      const groupTab = page.getByRole('tab', { name: /grupo|group/i });
      await groupTab.click();
      await page.waitForTimeout(1500);

      // Should see recovery UI
      const errorElement = page.getByText(/desassociada|erro/i);
      const recoveryButton = page.getByRole('button', { name: /tentar novamente/i });
      await expect(errorElement).toBeVisible({ timeout: 15000 });
      await expect(recoveryButton).toBeVisible({ timeout: 15000 });

      // "Ajuda" dialog should include troubleshooting steps
      const helpButton = page.getByRole('button', { name: /^ajuda$/i });
      await expect(helpButton).toBeVisible({ timeout: 5000 });
      await helpButton.click();
      await expect(page.getByText(/verifique sua conexão com a internet/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/clique em "tentar novamente"/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/saia e faça login novamente/i)).toBeVisible({ timeout: 5000 });
      await page.keyboard.press('Escape');

      // Click recovery button
      await recoveryButton.click();

      // After recovery, the group name should load and the recoverable error should go away.
      const groupNameElement = page.locator('[data-testid="group-name"]');
      await expect(groupNameElement).toBeVisible({ timeout: 20000 });
      await expect(errorElement).toBeHidden({ timeout: 20000 });

      // DB should reflect re-associated group_id.
      await expect
        .poll(() => getWorkerGroupId(workerContext.email), { timeout: 20000 })
        .not.toBeNull();
    } finally {
      await page.unroute('**/rest/v1/rpc/ensure_current_user_group*');
      // Restore the user's group association
      if (originalProfile) {
        await restoreUserProfile(workerContext.email, originalProfile);
      }
    }
  });
});

