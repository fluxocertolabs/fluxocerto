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

  // TODO: This test conflicts with the onboarding wizard behavior.
  // When a user is orphaned, the onboarding wizard auto-shows because the app treats
  // them as a new user. This blocks the Group tab error UI from being visible.
  // Options to fix:
  // 1. Modify the app to not auto-show onboarding when there's a group error
  // 2. Test this scenario on a different page that doesn't trigger onboarding
  // 3. Complete the onboarding wizard in the test before checking the error UI
  test.skip('when auto-heal fails, manage group tab shows recovery UI and retry recovers', async ({
    page,
    managePage,
    workerContext,
  }) => {
    // Increase timeout for this complex test
    test.setTimeout(90000);

    const originalProfile = await getWorkerProfile(workerContext.email);
    expect(originalProfile).not.toBeNull();


    // Set up route interception FIRST, before any navigation
    // Use a flag to control when to allow requests through (after retry button is clicked)
    let allowRequests = false;
    let interceptCount = 0;
    await page.route('**/rest/v1/rpc/ensure_current_user_group*', async (route) => {
      // Only intercept POST requests (actual RPC calls), not OPTIONS preflight
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      
      interceptCount++;
      
      if (!allowRequests) {
        // Fail ALL requests until allowRequests is set to true
        // Use PostgREST error format so Supabase client recognizes it as an error
        await route.fulfill({
          status: 500,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            code: 'PGRST500',
            message: 'forced failure for deterministic recovery UI',
            details: 'Test-induced failure',
            hint: null,
          }),
        });
        return;
      }
      // Allow requests after retry button is clicked
      await route.continue();
    });

    // Now orphan the user
    await orphanUser(workerContext.email);
    

    try {
      // Navigate to manage page - the useGroup hook will detect PGRST116 and call ensure_current_user_group
      await managePage.goto();
      await page.waitForTimeout(2000);
      

      // Dismiss any dialogs that might be blocking (onboarding wizard, etc.)
      // The onboarding wizard uses a Dialog component with a close button
      const closeButton = page.locator('[role="dialog"] button:has-text("×"), [role="dialog"] button[aria-label*="close" i], [role="dialog"] button[aria-label*="fechar" i]');
      if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeButton.click();
        await page.waitForTimeout(500);
      } else {
        // Try pressing Escape multiple times to close any open dialogs
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }

      // Switch to Group tab - wait for it to be visible first
      const groupTab = page.getByRole('tab', { name: /grupo|group/i });
      await expect(groupTab).toBeVisible({ timeout: 10000 });
      await groupTab.click();
      await page.waitForTimeout(1500);
      

      // Should see recovery UI - look for the specific error message
      const errorElement = page.getByText(/sua conta está desassociada/i);
      const recoveryButton = page.getByRole('button', { name: /tentar novamente/i });
      await expect(errorElement).toBeVisible({ timeout: 20000 });
      await expect(recoveryButton).toBeVisible({ timeout: 10000 });

      // "Ajuda" dialog should include troubleshooting steps
      const helpButton = page.getByRole('button', { name: /^ajuda$/i });
      await expect(helpButton).toBeVisible({ timeout: 5000 });
      await helpButton.click();
      await expect(page.getByText(/verifique sua conexão com a internet/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/clique em "tentar novamente"/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/saia e faça login novamente/i)).toBeVisible({ timeout: 5000 });
      await page.keyboard.press('Escape');

      // Now allow requests to succeed
      allowRequests = true;
      
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
      // Safely unroute - page might be closed on timeout
      try {
        await page.unroute('**/rest/v1/rpc/ensure_current_user_group*');
      } catch {
        // Page may be closed, ignore
      }
      // Restore the user's group association
      if (originalProfile) {
        await restoreUserProfile(workerContext.email, originalProfile);
      }
    }
  });
});

