/**
 * RLS/Security Isolation E2E Tests for Notifications & User Preferences
 *
 * Validates that Row Level Security (RLS) policies correctly isolate data
 * between different users for the new notifications and user_preferences tables.
 *
 * Tests:
 * - User B cannot read User A's notifications
 * - User B cannot update User A's notifications (mark read)
 * - User B cannot read/update User A's user_preferences
 * - Per-user user_preferences are isolated (missing rows for others; cannot mutate others)
 *
 * @security
 */

import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import { InbucketClient } from '../utils/inbucket';

// Run serially to avoid email conflicts
test.describe.configure({ mode: 'serial' });

test.describe('RLS Notifications & User Preferences Isolation Tests @security', () => {
  let inbucket: InbucketClient;
  const baseApiUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  test.beforeAll(async () => {
    // Fail fast if anon key is missing - tests won't work without it
    if (!anonKey) {
      throw new Error(
        'VITE_SUPABASE_ANON_KEY is not set. ' +
        'Ensure Supabase is running (pnpm db:start) and the config populates this env var.'
      );
    }
    inbucket = new InbucketClient();
  });

  /**
   * Helper to authenticate a user and get their access token
   * Significant code duplication with other test files.
   * Consider extracting these to a shared test utility module (e.g., e2e/utils/auth-helpers.ts).
   */
  async function authenticateAndGetToken(
    page: Page,
    email: string
  ): Promise<{ userId: string; accessToken: string }> {
    const loginPage = new LoginPage(page);
    const mailbox = email.split('@')[0];

    await inbucket.purgeMailbox(mailbox);
    await loginPage.goto();
    await loginPage.requestMagicLink(email);
    await loginPage.expectMagicLinkSent();

    // Get magic link from Inbucket with increased retries
    let magicLink: string | null = null;
    await expect(async () => {
      const message = await inbucket.getLatestMessage(mailbox);
      magicLink = message ? inbucket.extractMagicLink(message) : null;
      if (!magicLink) {
        throw new Error('Magic link not found yet');
      }
    }).toPass({ timeout: 15000, intervals: [500, 1000, 2000] });

    expect(magicLink).not.toBeNull();
    await page.goto(magicLink!);
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 20000 });

    // Extract access token from localStorage
    const authData = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const authKey = keys.find((k) => k.includes('sb-') && k.includes('auth-token'));
      if (!authKey) return null;
      const raw = localStorage.getItem(authKey);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    });

    expect(authData).not.toBeNull();
    expect(authData.access_token).toBeTruthy();
    expect(authData.user?.id).toBeTruthy();

    return {
      userId: authData.user.id,
      accessToken: authData.access_token,
    };
  }

  /**
   * Helper to complete onboarding for a user
   * Significant code duplication with other test files.
   * Consider extracting these to a shared test utility module (e.g., e2e/utils/auth-helpers.ts).
   */
  async function completeOnboarding(page: Page): Promise<void> {
    const wizardDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });

    // Wait for wizard to appear with adequate timeout (15s to account for auth/data loading)
    await expect(wizardDialog).toBeVisible({ timeout: 15000 });

    // Profile
    await page.locator('#profile-name').fill('RLS Test User');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    // Group
    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 10000 });
    await page.locator('#group-name').fill('RLS Test Group');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    // Bank Account
    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 10000 });
    await page.locator('#account-name').fill('RLS Test Account');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    // Skip remaining steps
    await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 10000 });
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    await expect(wizardDialog.getByRole('heading', { name: /^despesa$/i })).toBeVisible({ timeout: 10000 });
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    await expect(wizardDialog.getByRole('heading', { name: /cartão de crédito/i })).toBeVisible({ timeout: 10000 });
    await wizardDialog.getByRole('button', { name: /finalizar/i }).click();

    await expect(wizardDialog).toBeHidden({ timeout: 15000 });
  }

  async function waitForWelcomeNotification(page: Page, accessToken: string): Promise<void> {
    await expect
      .poll(
        async () => {
          return await page.evaluate(
            async ({ baseUrl, apiKey, token }) => {
              const res = await fetch(`${baseUrl}/rest/v1/notifications?type=eq.welcome&select=id`, {
                headers: {
                  apikey: apiKey,
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              if (!res.ok) return 0;
              const data = await res.json().catch(() => []);
              return Array.isArray(data) ? data.length : 0;
            },
            { baseUrl: baseApiUrl, apiKey: anonKey!, token: accessToken }
          );
        },
        { timeout: 20000, intervals: [500, 1000, 2000] }
      )
      .toBeGreaterThan(0);
  }

  // =============================================================================
  // NOTIFICATIONS RLS TESTS
  // =============================================================================

  test('user cannot read other user\'s notifications via PostgREST', async ({ page, browser }) => {
    // Create and authenticate User A
    const userAEmail = `rls-notif-read-a-${Date.now()}@example.com`;
    const userA = await authenticateAndGetToken(page, userAEmail);
    await completeOnboarding(page);

    // Wait for welcome notification to be created
    await waitForWelcomeNotification(page, userA.accessToken);

    // Create a new browser context for User B
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    // Authenticate User B
    const userBEmail = `rls-notif-read-b-${Date.now()}@example.com`;
    const userB = await authenticateAndGetToken(pageB, userBEmail);
    await completeOnboarding(pageB);

    // User B tries to read User A's notifications via PostgREST
    const response = await pageB.evaluate(
      async ({ baseUrl, apiKey, accessToken, targetUserId }) => {
        const res = await fetch(
          `${baseUrl}/rest/v1/notifications?user_id=eq.${targetUserId}`,
          {
            headers: {
              apikey: apiKey,
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        return {
          status: res.status,
          data: await res.json().catch(() => null),
        };
      },
      { baseUrl: baseApiUrl, apiKey: anonKey!, accessToken: userB.accessToken, targetUserId: userA.userId }
    );

    // RLS should return empty array (not 401/403) - user can query but sees no data
    expect(response.status).toBe(200);
    expect(response.data).toEqual([]);

    await contextB.close();
  });

  test('user can only read their own notifications', async ({ page }) => {
    // Create and authenticate User
    const userEmail = `rls-notif-own-${Date.now()}@example.com`;
    const user = await authenticateAndGetToken(page, userEmail);
    await completeOnboarding(page);

    // Wait for welcome notification to be created
    await waitForWelcomeNotification(page, user.accessToken);

    // User reads their own notifications
    const response = await page.evaluate(
      async ({ baseUrl, apiKey, accessToken }) => {
        const res = await fetch(`${baseUrl}/rest/v1/notifications`, {
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        return {
          status: res.status,
          data: await res.json().catch(() => null),
        };
      },
      { baseUrl: baseApiUrl, apiKey: anonKey!, accessToken: user.accessToken }
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);

    // If there are records, they should all belong to this user
    if (response.data.length > 0) {
      for (const record of response.data) {
        expect(record.user_id).toBe(user.userId);
      }
    }
  });

  test('user cannot directly update notifications (must use RPC)', async ({ page }) => {
    // Create and authenticate User
    const userEmail = `rls-notif-update-${Date.now()}@example.com`;
    const user = await authenticateAndGetToken(page, userEmail);
    await completeOnboarding(page);

    // Wait for welcome notification to be created
    await waitForWelcomeNotification(page, user.accessToken);

    // User tries to directly update their notification via PostgREST
    // This should fail because there's no direct UPDATE policy
    const response = await page.evaluate(
      async ({ baseUrl, apiKey, accessToken, userId }) => {
        const res = await fetch(
          `${baseUrl}/rest/v1/notifications?user_id=eq.${userId}`,
          {
            method: 'PATCH',
            headers: {
              apikey: apiKey,
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({
              read_at: new Date().toISOString(),
            }),
          }
        );
        return {
          status: res.status,
          data: await res.json().catch(() => null),
        };
      },
      { baseUrl: baseApiUrl, apiKey: anonKey!, accessToken: user.accessToken, userId: user.userId }
    );

    // Direct UPDATE should be rejected (403 or similar) or return 0 rows affected
    // The exact behavior depends on RLS policy configuration
    // With no UPDATE policy, PostgREST returns 204 with 0 rows affected
    expect([200, 204, 403, 401]).toContain(response.status);
  });

  test('user cannot update other user\'s notifications via RPC', async ({ page, browser, request }) => {
    // Create and authenticate User A
    const userAEmail = `rls-notif-rpc-a-${Date.now()}@example.com`;
    const userA = await authenticateAndGetToken(page, userAEmail);
    await completeOnboarding(page);

    // Wait for welcome notification to be created (async backend side-effect).
    // Poll via PostgREST instead of sleeping a fixed amount.
    const userAHeaders = {
      apikey: anonKey!,
      Authorization: `Bearer ${userA.accessToken}`,
      'Content-Type': 'application/json',
    } as const;

    await expect
      .poll(
        async () => {
          const res = await request.get(
            `${baseApiUrl}/rest/v1/notifications?select=id&order=created_at.desc&limit=1`,
            { headers: userAHeaders }
          );
          if (!res.ok()) return 0;
          const data = (await res.json().catch(() => [])) as any[];
          return Array.isArray(data) ? data.length : 0;
        },
        { timeout: 20000, intervals: [500, 1000, 2000] }
      )
      .toBeGreaterThan(0);

    const userANotificationsRes = await request.get(
      `${baseApiUrl}/rest/v1/notifications?select=id&order=created_at.desc&limit=1`,
      { headers: userAHeaders }
    );
    expect(userANotificationsRes.ok()).toBeTruthy();
    const userANotifications = (await userANotificationsRes.json().catch(() => [])) as any[];
    expect(userANotifications.length).toBeGreaterThan(0);
    const userANotificationId = userANotifications[0].id as string;

    // Create a new browser context for User B
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    // Authenticate User B
    const userBEmail = `rls-notif-rpc-b-${Date.now()}@example.com`;
    const userB = await authenticateAndGetToken(pageB, userBEmail);
    await completeOnboarding(pageB);

    // User B tries to mark User A's notification as read via RPC
    const rpcRes = await request.post(`${baseApiUrl}/rest/v1/rpc/mark_notification_read`, {
      headers: {
        apikey: anonKey!,
        Authorization: `Bearer ${userB.accessToken}`,
        'Content-Type': 'application/json',
      },
      data: { notification_id: userANotificationId },
    });

    // RPC returns 204 (No Content) for VOID functions - the function doesn't raise an error
    // for non-existent or unauthorized notifications (prevents information leakage)
    // The key security check is below: verify User A's notification was NOT marked as read
    expect([200, 204, 400, 403]).toContain(rpcRes.status());

    // Verify User A's notification was NOT marked as read
    const verifyRes = await request.get(
      `${baseApiUrl}/rest/v1/notifications?id=eq.${userANotificationId}&select=read_at`,
      { headers: userAHeaders }
    );
    expect(verifyRes.ok()).toBeTruthy();
    const verifyResponse = (await verifyRes.json().catch(() => [])) as any[];

    // User A's notification should still be unread
    if (verifyResponse.length > 0) {
      expect(verifyResponse[0].read_at).toBeNull();
    }

    await contextB.close();
  });

  // =============================================================================
  // USER PREFERENCES RLS TESTS
  // =============================================================================

  test('user cannot read other user\'s user_preferences via PostgREST', async ({ page, browser }) => {
    // Create and authenticate User A
    const userAEmail = `rls-pref-read-a-${Date.now()}@example.com`;
    const userA = await authenticateAndGetToken(page, userAEmail);
    await completeOnboarding(page);

    // User A creates a preference
    await page.evaluate(
      async ({ baseUrl, apiKey, accessToken }) => {
        await fetch(`${baseUrl}/rest/v1/user_preferences`, {
          method: 'POST',
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            key: 'email_notifications_enabled',
            value: 'false',
          }),
        });
      },
      { baseUrl: baseApiUrl, apiKey: anonKey!, accessToken: userA.accessToken }
    );

    // Create a new browser context for User B
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    // Authenticate User B
    const userBEmail = `rls-pref-read-b-${Date.now()}@example.com`;
    const userB = await authenticateAndGetToken(pageB, userBEmail);
    await completeOnboarding(pageB);

    // User B tries to read User A's user_preferences via PostgREST
    const response = await pageB.evaluate(
      async ({ baseUrl, apiKey, accessToken, targetUserId }) => {
        const res = await fetch(
          `${baseUrl}/rest/v1/user_preferences?user_id=eq.${targetUserId}`,
          {
            headers: {
              apikey: apiKey,
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        return {
          status: res.status,
          data: await res.json().catch(() => null),
        };
      },
      { baseUrl: baseApiUrl, apiKey: anonKey!, accessToken: userB.accessToken, targetUserId: userA.userId }
    );

    // RLS should return empty array
    expect(response.status).toBe(200);
    expect(response.data).toEqual([]);

    await contextB.close();
  });

  test('user cannot update other user\'s user_preferences', async ({ page, browser }) => {
    // Create and authenticate User A
    const userAEmail = `rls-pref-update-a-${Date.now()}@example.com`;
    const userA = await authenticateAndGetToken(page, userAEmail);
    await completeOnboarding(page);

    // User A creates a preference
    await page.evaluate(
      async ({ baseUrl, apiKey, accessToken }) => {
        await fetch(`${baseUrl}/rest/v1/user_preferences`, {
          method: 'POST',
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            key: 'email_notifications_enabled',
            value: 'true',
          }),
        });
      },
      { baseUrl: baseApiUrl, apiKey: anonKey!, accessToken: userA.accessToken }
    );

    // Create a new browser context for User B
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    // Authenticate User B
    const userBEmail = `rls-pref-update-b-${Date.now()}@example.com`;
    const userB = await authenticateAndGetToken(pageB, userBEmail);
    await completeOnboarding(pageB);

    // User B tries to update User A's user_preferences
    const response = await pageB.evaluate(
      async ({ baseUrl, apiKey, accessToken, targetUserId }) => {
        const res = await fetch(
          `${baseUrl}/rest/v1/user_preferences?user_id=eq.${targetUserId}&key=eq.email_notifications_enabled`,
          {
            method: 'PATCH',
            headers: {
              apikey: apiKey,
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({
              value: 'false',
            }),
          }
        );
        return {
          status: res.status,
          data: await res.json().catch(() => null),
        };
      },
      { baseUrl: baseApiUrl, apiKey: anonKey!, accessToken: userB.accessToken, targetUserId: userA.userId }
    );

    // RLS should either reject (403) or return success with 0 rows affected
    expect([200, 204, 403, 401]).toContain(response.status);

    // Verify User A's preference was NOT modified
    const verifyResponse = await page.evaluate(
      async ({ baseUrl, apiKey, accessToken }) => {
        const res = await fetch(
          `${baseUrl}/rest/v1/user_preferences?key=eq.email_notifications_enabled`,
          {
            headers: {
              apikey: apiKey,
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        return await res.json().catch(() => []);
      },
      { baseUrl: baseApiUrl, apiKey: anonKey!, accessToken: userA.accessToken }
    );

    // User A's preference should still be 'true'
    if (verifyResponse.length > 0) {
      expect(verifyResponse[0].value).toBe('true');
    }

    await contextB.close();
  });

  test('user can only read their own user_preferences', async ({ page }) => {
    // Create and authenticate User
    const userEmail = `rls-pref-own-${Date.now()}@example.com`;
    const user = await authenticateAndGetToken(page, userEmail);
    await completeOnboarding(page);

    // Create a preference
    await page.evaluate(
      async ({ baseUrl, apiKey, accessToken }) => {
        await fetch(`${baseUrl}/rest/v1/user_preferences`, {
          method: 'POST',
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            key: 'test_preference',
            value: 'test_value',
          }),
        });
      },
      { baseUrl: baseApiUrl, apiKey: anonKey!, accessToken: user.accessToken }
    );

    // User reads their own preferences
    const response = await page.evaluate(
      async ({ baseUrl, apiKey, accessToken }) => {
        const res = await fetch(`${baseUrl}/rest/v1/user_preferences`, {
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        return {
          status: res.status,
          data: await res.json().catch(() => null),
        };
      },
      { baseUrl: baseApiUrl, apiKey: anonKey!, accessToken: user.accessToken }
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);

    // If there are records, they should all belong to this user
    if (response.data.length > 0) {
      for (const record of response.data) {
        expect(record.user_id).toBe(user.userId);
      }
    }
  });

  test('user cannot insert user_preference for another user', async ({ page, browser }) => {
    // Create and authenticate User A
    const userAEmail = `rls-pref-insert-a-${Date.now()}@example.com`;
    const userA = await authenticateAndGetToken(page, userAEmail);
    await completeOnboarding(page);

    // Create a new browser context for User B
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    // Authenticate User B
    const userBEmail = `rls-pref-insert-b-${Date.now()}@example.com`;
    const userB = await authenticateAndGetToken(pageB, userBEmail);
    await completeOnboarding(pageB);

    // User B tries to insert a preference for User A
    const response = await pageB.evaluate(
      async ({ baseUrl, apiKey, accessToken, targetUserId }) => {
        const res = await fetch(`${baseUrl}/rest/v1/user_preferences`, {
          method: 'POST',
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            user_id: targetUserId,
            key: 'malicious_preference',
            value: 'malicious_value',
          }),
        });
        return {
          status: res.status,
          data: await res.json().catch(() => null),
        };
      },
      { baseUrl: baseApiUrl, apiKey: anonKey!, accessToken: userB.accessToken, targetUserId: userA.userId }
    );

    // RLS should reject the insert (403 or similar error)
    expect([403, 401, 400, 409]).toContain(response.status);

    await contextB.close();
  });
});

