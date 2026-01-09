/**
 * E2E Tests: Auth Callback Recovery
 * Tests the provisioning recovery flow when landing on /auth/confirm
 * with a missing profile/group association.
 *
 * This covers the edge case where ensureCurrentUserGroup() is called
 * in the auth-callback page's retry flow.
 */

import { test, expect } from '../fixtures/test-base';
import { executeSQL, executeSQLWithResult } from '../utils/supabase-admin';

test.describe('Auth Callback Recovery', () => {
  // Run recovery tests serially to avoid state conflicts
  test.describe.configure({ mode: 'serial' });

  function escapeSqlLiteral(value: string): string {
    return value.replace(/'/g, "''");
  }

  /**
   * Get worker's profile from the database
   */
  async function getWorkerProfile(
    workerEmail: string
  ): Promise<{ id: string; group_id: string; name: string } | null> {
    const rows = await executeSQLWithResult<{ id: string; group_id: string; name: string }>(
      `SELECT p.id, p.group_id, p.name FROM public.profiles p WHERE p.email = '${escapeSqlLiteral(
        workerEmail.toLowerCase()
      )}' LIMIT 1`
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Get worker's group ID from the database
   */
  async function getWorkerGroupId(workerEmail: string): Promise<string | null> {
    const rows = await executeSQLWithResult<{ group_id: string }>(
      `SELECT p.group_id FROM public.profiles p WHERE p.email = '${escapeSqlLiteral(
        workerEmail.toLowerCase()
      )}'`
    );
    return rows.length > 0 ? rows[0].group_id : null;
  }

  /**
   * Orphan a user by removing their profile row.
   * This simulates a provisioning failure scenario where the auth user exists
   * but the profile was not created.
   */
  async function orphanUser(userEmail: string): Promise<void> {
    await executeSQL(`
      DELETE FROM public.profiles
      WHERE email = '${escapeSqlLiteral(userEmail.toLowerCase())}'
    `);
  }

  /**
   * Restore a user's profile row
   */
  async function restoreUserProfile(
    userEmail: string,
    profile: { id: string; group_id: string; name: string }
  ): Promise<void> {
    // Remove any profile row that may have been recreated by ensure_current_user_group()
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

  test('auth-callback recovers orphaned user and redirects to dashboard', async ({
    page,
    workerContext,
  }) => {
    const originalProfile = await getWorkerProfile(workerContext.email);
    expect(originalProfile).not.toBeNull();

    try {
      // Orphan the user (remove profile row)
      await orphanUser(workerContext.email);

      // Verify user is orphaned
      const orphanedGroupId = await getWorkerGroupId(workerContext.email);
      expect(orphanedGroupId).toBeNull();

      // Navigate to /auth/confirm with authenticated context
      // The page should detect the missing profile and attempt recovery
      await page.goto('/auth/confirm');

      // Should either:
      // 1. Auto-recover and redirect to dashboard, OR
      // 2. Show provisioning state briefly then redirect
      // Wait for either dashboard redirect or recovery UI
      await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 20000 });

      // Verify user was recovered (group_id is now non-null)
      await expect
        .poll(() => getWorkerGroupId(workerContext.email), { timeout: 15000 })
        .not.toBeNull();
    } finally {
      // Restore the user's profile for subsequent tests
      if (originalProfile) {
        await restoreUserProfile(workerContext.email, originalProfile);
      }
    }
  });

  test('auth-callback shows retry UI on provisioning failure and retry succeeds', async ({
    page,
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
    
    // Verify the user is actually orphaned
    const orphanedProfile = await getWorkerProfile(workerContext.email);
    expect(orphanedProfile).toBeNull();

    try {
      // Navigate to /auth/confirm - the page will call ensureCurrentUserGroup
      await page.goto('/auth/confirm');
      
      // Wait for at least one RPC call to be intercepted
      await expect.poll(() => interceptCount, { timeout: 10000 }).toBeGreaterThan(0);
      
      
      // Wait a bit for the page to process the error response
      await page.waitForTimeout(1000);

      // Wait for provisioning error UI to appear
      // Note: CardTitle renders as a div, not a heading, so we use getByText
      const errorTitle = page.getByText(/erro ao configurar conta/i);
      
      
      await expect(errorTitle).toBeVisible({ timeout: 15000 });

      // Recovery button should be visible
      const retryButton = page.getByRole('button', { name: /tentar novamente/i });
      await expect(retryButton).toBeVisible({ timeout: 5000 });

      // Now allow requests to succeed
      allowRequests = true;
      
      // Click retry - this time it should succeed (route continues)
      await retryButton.click();

      // Should redirect to dashboard after successful recovery
      await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 20000 });

      // Verify user was recovered
      await expect
        .poll(() => getWorkerGroupId(workerContext.email), { timeout: 15000 })
        .not.toBeNull();
    } finally {
      await page.unroute('**/rest/v1/rpc/ensure_current_user_group*');
      // Restore the user's profile
      if (originalProfile) {
        await restoreUserProfile(workerContext.email, originalProfile);
      }
    }
  });

  test('auth-callback help dialog shows troubleshooting steps', async ({
    page,
    workerContext,
  }) => {
    const originalProfile = await getWorkerProfile(workerContext.email);
    expect(originalProfile).not.toBeNull();

    // Force provisioning to fail so we see the error UI
    // Only intercept POST requests (not OPTIONS preflight)
    let interceptCount = 0;
    await page.route('**/rest/v1/rpc/ensure_current_user_group*', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      interceptCount++;
      // Use PostgREST error format so Supabase client recognizes it as an error
      await route.fulfill({
        status: 500,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code: 'PGRST500',
          message: 'forced failure',
          details: 'Test-induced failure',
          hint: null,
        }),
      });
    });

    try {
      // Orphan the user
      await orphanUser(workerContext.email);
      
      // Verify the user is actually orphaned
      const orphanedProfile = await getWorkerProfile(workerContext.email);
      expect(orphanedProfile).toBeNull();

      // Navigate to /auth/confirm
      await page.goto('/auth/confirm');
      
      // Wait for at least one RPC call to be intercepted
      await expect.poll(() => interceptCount, { timeout: 10000 }).toBeGreaterThan(0);
      
      // Wait a bit for the page to process the error response
      await page.waitForTimeout(1000);

      // Wait for error UI
      // Note: CardTitle renders as a div, not a heading, so we use getByText
      const errorTitle = page.getByText(/erro ao configurar conta/i);
      await expect(errorTitle).toBeVisible({ timeout: 15000 });

      // Click the help button
      const helpButton = page.getByRole('button', { name: /^ajuda$/i });
      await expect(helpButton).toBeVisible({ timeout: 5000 });
      await helpButton.click();

      // Verify troubleshooting steps are shown
      await expect(page.getByText(/verifique sua conexão com a internet/i)).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByText(/clique em "tentar novamente"/i)).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByText(/saia e solicite um novo link de acesso/i)).toBeVisible({
        timeout: 5000,
      });

      // Copy diagnostics button should be present
      const copyButton = page.getByRole('button', { name: /copiar detalhes/i });
      await expect(copyButton).toBeVisible({ timeout: 5000 });
    } finally {
      await page.unroute('**/rest/v1/rpc/ensure_current_user_group*');
      // Restore the user's profile
      if (originalProfile) {
        await restoreUserProfile(workerContext.email, originalProfile);
      }
    }
  });
});

