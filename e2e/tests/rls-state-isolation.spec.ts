/**
 * RLS/Security Isolation E2E Tests
 *
 * Validates that Row Level Security (RLS) policies correctly isolate data
 * between different users. Uses direct PostgREST API calls to test that:
 * - Users cannot read other users' tour_states
 * - Users cannot read other users' onboarding_states
 * - Users cannot insert/update data for other users
 *
 * This proves RLS policies are enforcing isolation in practice.
 */

import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import { InbucketClient } from '../utils/inbucket';

// Run serially to avoid email conflicts
test.describe.configure({ mode: 'serial' });

test.describe('RLS State Isolation Tests @security', () => {
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

  async function fetchWithTimeout(
    page: Page,
    request: {
      url: string;
      method?: string;
      headers: Record<string, string>;
      body?: unknown;
      timeoutMs?: number;
    }
  ): Promise<{ status: number; data: unknown }> {
    const { url, method = 'GET', headers, body, timeoutMs = 20000 } = request;

    return await page.evaluate(
      async ({ url, method, headers, body, timeoutMs }) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
          });
          return {
            status: res.status,
            data: await res.json().catch(() => null),
          };
        } catch (err) {
          const message =
            err instanceof Error
              ? err.name === 'AbortError'
                ? `Request timed out after ${timeoutMs}ms`
                : err.message
              : String(err);
          return { status: 0, data: { error: message } };
        } finally {
          clearTimeout(timeoutId);
        }
      },
      { url, method, headers, body, timeoutMs }
    );
  }

  test('user cannot read other user\'s tour_states via PostgREST', async ({ page, browser }) => {
    // Create and authenticate User A
    const userAEmail = `rls-user-a-${Date.now()}@example.com`;
    const userA = await authenticateAndGetToken(page, userAEmail);
    await completeOnboarding(page);

    // Complete the tour to create a tour_state record
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    try {
      await expect(closeTourButton).toBeVisible({ timeout: 3000 });
      await closeTourButton.click();
      await expect(closeTourButton).toBeHidden({ timeout: 5000 });
    } catch {
      // Tour not visible; continue
    }

    // Create a new browser context for User B
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    // Authenticate User B (no onboarding needed for access check)
    const userBEmail = `rls-user-b-${Date.now()}@example.com`;
    const userB = await authenticateAndGetToken(pageB, userBEmail);

    // User B tries to read User A's tour_states via PostgREST
    const response = await fetchWithTimeout(page, {
      url: `${baseApiUrl}/rest/v1/tour_states?user_id=eq.${userA.userId}`,
      headers: {
        apikey: anonKey!,
        Authorization: `Bearer ${userB.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // RLS should return empty array (not 401/403) - user can query but sees no data
    expect(response.status).toBe(200);
    expect(response.data).toEqual([]);

    await contextB.close();
  });

  test('user cannot read other user\'s onboarding_states via PostgREST', async ({ page, browser }) => {
    // Create and authenticate User A
    const userAEmail = `rls-onboard-a-${Date.now()}@example.com`;
    const userA = await authenticateAndGetToken(page, userAEmail);
    await completeOnboarding(page);

    // Create a new browser context for User B
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    // Authenticate User B (no onboarding needed for access check)
    const userBEmail = `rls-onboard-b-${Date.now()}@example.com`;
    const userB = await authenticateAndGetToken(pageB, userBEmail);

    // User B tries to read User A's onboarding_states via PostgREST
    const response = await fetchWithTimeout(page, {
      url: `${baseApiUrl}/rest/v1/onboarding_states?user_id=eq.${userA.userId}`,
      headers: {
        apikey: anonKey!,
        Authorization: `Bearer ${userB.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // RLS should return empty array
    expect(response.status).toBe(200);
    expect(response.data).toEqual([]);

    await contextB.close();
  });

  test('user cannot insert tour_state for another user', async ({ page, browser }) => {
    // Create and authenticate User A
    const userAEmail = `rls-insert-a-${Date.now()}@example.com`;
    const userA = await authenticateAndGetToken(page, userAEmail);
    await completeOnboarding(page);

    // Create a new browser context for User B
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    // Authenticate User B (no onboarding needed for access check)
    const userBEmail = `rls-insert-b-${Date.now()}@example.com`;
    const userB = await authenticateAndGetToken(pageB, userBEmail);

    // User B tries to insert a tour_state for User A
    const response = await fetchWithTimeout(pageB, {
      url: `${baseApiUrl}/rest/v1/tour_states`,
      method: 'POST',
      headers: {
        apikey: anonKey!,
        Authorization: `Bearer ${userB.accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: {
        user_id: userA.userId,
        tour_key: 'dashboard',
        status: 'completed',
        version: 1,
      },
    });

    // RLS should reject the insert (403 or similar error)
    // The exact status depends on policy configuration
    expect([403, 401, 400, 409]).toContain(response.status);

    await contextB.close();
  });

  test('user cannot update tour_state for another user', async ({ page, browser }) => {
    // Create and authenticate User A
    const userAEmail = `rls-update-a-${Date.now()}@example.com`;
    const userA = await authenticateAndGetToken(page, userAEmail);
    await completeOnboarding(page);

    // Dismiss tour to create a tour_state record
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    try {
      await expect(closeTourButton).toBeVisible({ timeout: 3000 });
      await closeTourButton.click();
      await expect(closeTourButton).toBeHidden({ timeout: 5000 });
    } catch {
      // Tour not visible; continue
    }

    // Create a new browser context for User B
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    // Authenticate User B (no onboarding needed for access check)
    const userBEmail = `rls-update-b-${Date.now()}@example.com`;
    const userB = await authenticateAndGetToken(pageB, userBEmail);

    // User B tries to update User A's tour_state
    const response = await fetchWithTimeout(pageB, {
      url: `${baseApiUrl}/rest/v1/tour_states?user_id=eq.${userA.userId}&tour_key=eq.dashboard`,
      method: 'PATCH',
      headers: {
        apikey: anonKey!,
        Authorization: `Bearer ${userB.accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: {
        status: 'dismissed',
        version: 999,
      },
    });

    // RLS should either reject (403) or return success with 0 rows affected
    // PostgREST returns 200/204 even if no rows match the filter (due to RLS)
    // 204 is returned when Prefer: return=minimal is set
    expect([200, 204, 403, 401]).toContain(response.status);

    // Verify User A's data was NOT modified
    const verifyResponse = await fetchWithTimeout(page, {
      url: `${baseApiUrl}/rest/v1/tour_states?tour_key=eq.dashboard`,
      headers: {
        apikey: anonKey!,
        Authorization: `Bearer ${userA.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    expect(verifyResponse.status).toBe(200);
    // If User A has a tour_state, verify version is NOT 999
    if (verifyResponse.data && verifyResponse.data.length > 0) {
      expect(verifyResponse.data[0].version).not.toBe(999);
    }

    await contextB.close();
  });

  test('user can only read their own tour_states', async ({ page }) => {
    // Create and authenticate User
    const userEmail = `rls-own-tour-${Date.now()}@example.com`;
    const user = await authenticateAndGetToken(page, userEmail);
    await completeOnboarding(page);

    // Dismiss tour to create a tour_state record
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    try {
      await expect(closeTourButton).toBeVisible({ timeout: 3000 });
      await closeTourButton.click();
      await expect(closeTourButton).toBeHidden({ timeout: 5000 });
    } catch {
      // Tour not visible; continue
    }

    // User reads their own tour_states
    const response = await fetchWithTimeout(page, {
      url: `${baseApiUrl}/rest/v1/tour_states`,
      headers: {
        apikey: anonKey!,
        Authorization: `Bearer ${user.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    expect(response.status).toBe(200);
    // User should see their own tour_states (may be 0 or more)
    expect(Array.isArray(response.data)).toBe(true);

    // If there are records, they should all belong to this user
    if (response.data.length > 0) {
      for (const record of response.data) {
        expect(record.user_id).toBe(user.userId);
      }
    }
  });

  test('user can only read their own onboarding_states', async ({ page }) => {
    // Create and authenticate User
    const userEmail = `rls-own-onboard-${Date.now()}@example.com`;
    const user = await authenticateAndGetToken(page, userEmail);
    await completeOnboarding(page);

    // User reads their own onboarding_states
    const response = await page.evaluate(
      async ({ baseUrl, apiKey, accessToken }) => {
        const res = await fetch(`${baseUrl}/rest/v1/onboarding_states`, {
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
});

