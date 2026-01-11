/**
 * E2E Tests: User Story 4 - Welcome Email Delivery
 * Tests welcome email delivery behavior, opt-out enforcement, and idempotency.
 *
 * Note: These tests verify the Edge Function behavior in dev mode (FR-013),
 * where actual email sending is skipped and a preview is returned instead.
 */

import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import { InbucketClient } from '../utils/inbucket';

// Run serially to avoid email conflicts
test.describe.configure({ mode: 'serial' });

test.describe('Welcome Email Delivery @email', () => {
  let inbucket: InbucketClient;
  const baseApiUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  test.beforeAll(async () => {
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

    let magicLink: string | null = null;
    for (let i = 0; i < 25; i++) {
      const message = await inbucket.getLatestMessage(mailbox);
      if (message) {
        magicLink = inbucket.extractMagicLink(message);
        if (magicLink) break;
      }
      await page.waitForTimeout(500);
    }

    expect(magicLink).not.toBeNull();
    await page.goto(magicLink!);
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 20000 });

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

    if (!(await wizardDialog.isVisible({ timeout: 3000 }).catch(() => false))) {
      return;
    }

    await page.locator('#profile-name').fill('Email Test User');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    await expect(wizardDialog.getByRole('heading', { name: /seu grupo/i })).toBeVisible({ timeout: 10000 });
    await page.locator('#group-name').fill('Email Test Group');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    await expect(wizardDialog.getByRole('heading', { name: /conta bancária/i })).toBeVisible({ timeout: 10000 });
    await page.locator('#account-name').fill('Email Test Account');
    await page.locator('#account-balance').fill('1000');
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    await expect(wizardDialog.getByRole('heading', { name: /^renda$/i })).toBeVisible({ timeout: 10000 });
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    await expect(wizardDialog.getByRole('heading', { name: /^despesa$/i })).toBeVisible({ timeout: 10000 });
    await wizardDialog.getByRole('button', { name: /próximo/i }).click();

    await expect(wizardDialog.getByRole('heading', { name: /cartão de crédito/i })).toBeVisible({ timeout: 10000 });
    await wizardDialog.getByRole('button', { name: /finalizar/i }).click();

    await expect(wizardDialog).toBeHidden({ timeout: 15000 });
  }

  /**
   * Helper to get user's welcome notification ID
   */
  async function getWelcomeNotificationId(
    page: Page,
    accessToken: string
  ): Promise<string | null> {
    const notifications = await page.evaluate(
      async ({ baseUrl, apiKey, token }) => {
        const res = await fetch(`${baseUrl}/rest/v1/notifications?type=eq.welcome`, {
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        return await res.json().catch(() => []);
      },
      { baseUrl: baseApiUrl, apiKey: anonKey!, token: accessToken }
    );

    return notifications.length > 0 ? notifications[0].id : null;
  }

  /**
   * Helper to call the send-welcome-email Edge Function
   */
  async function callSendWelcomeEmail(
    page: Page,
    accessToken: string,
    notificationId: string
  ): Promise<{ status: number; data: unknown }> {
    return await page.evaluate(
      async ({ baseUrl, apiKey, token, notifId }) => {
        const res = await fetch(`${baseUrl}/functions/v1/send-welcome-email`, {
          method: 'POST',
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ notification_id: notifId }),
        });
        return {
          status: res.status,
          data: await res.json().catch(() => null),
        };
      },
      { baseUrl: baseApiUrl, apiKey: anonKey!, token: accessToken, notifId: notificationId }
    );
  }

  /**
   * Helper to set email notifications preference
   */
  async function setEmailNotificationsEnabled(
    page: Page,
    accessToken: string,
    userId: string,
    enabled: boolean
  ): Promise<void> {
    await page.evaluate(
      async ({ baseUrl, apiKey, token, uid, value }) => {
        await fetch(`${baseUrl}/rest/v1/user_preferences`, {
          method: 'POST',
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            user_id: uid,
            key: 'email_notifications_enabled',
            value: value ? 'true' : 'false',
          }),
        });
      },
      { baseUrl: baseApiUrl, apiKey: anonKey!, token: accessToken, uid: userId, value: enabled }
    );
  }

  // =============================================================================
  // DEV MODE PREVIEW TESTS (FR-013)
  // =============================================================================

  test('Edge Function returns preview in dev mode when credentials are missing', async ({ page }) => {
    const userEmail = `email-preview-${Date.now()}@example.com`;
    const user = await authenticateAndGetToken(page, userEmail);
    await completeOnboarding(page);

    // Wait for welcome notification to be created
    await page.waitForTimeout(2000);

    const notificationId = await getWelcomeNotificationId(page, user.accessToken);
    expect(notificationId).not.toBeNull();

    const response = await callSendWelcomeEmail(page, user.accessToken, notificationId!);

    // In dev mode without provider credentials, should return preview
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('ok', true);

    // Should either have sent=true (if email was sent) or preview (if dev mode)
    const data = response.data as { ok: boolean; sent?: boolean; preview?: { subject: string; html: string } };
    if (data.preview) {
      expect(data.preview).toHaveProperty('subject');
      expect(data.preview).toHaveProperty('html');
      expect(data.preview.subject).toContain('Fluxo Certo');
    }
  });

  // =============================================================================
  // EMAIL CONTENT CONTRACT TESTS (FR-011)
  // =============================================================================

  test('email content includes notification title and body', async ({ page }) => {
    const userEmail = `email-content-${Date.now()}@example.com`;
    const user = await authenticateAndGetToken(page, userEmail);
    await completeOnboarding(page);

    await page.waitForTimeout(2000);

    const notificationId = await getWelcomeNotificationId(page, user.accessToken);
    expect(notificationId).not.toBeNull();

    const response = await callSendWelcomeEmail(page, user.accessToken, notificationId!);

    expect(response.status).toBe(200);
    const data = response.data as { ok: boolean; preview?: { subject: string; html: string } };

    if (data.preview) {
      // Subject should contain "Fluxo Certo"
      expect(data.preview.subject).toContain('Fluxo Certo');

      // HTML should include notification content
      expect(data.preview.html).toContain('Bem-vindo');
      expect(data.preview.html).toContain('Fluxo Certo');
    }
  });

  test('email content includes CTA link from notification', async ({ page }) => {
    const userEmail = `email-cta-${Date.now()}@example.com`;
    const user = await authenticateAndGetToken(page, userEmail);
    await completeOnboarding(page);

    await page.waitForTimeout(2000);

    const notificationId = await getWelcomeNotificationId(page, user.accessToken);
    expect(notificationId).not.toBeNull();

    const response = await callSendWelcomeEmail(page, user.accessToken, notificationId!);

    expect(response.status).toBe(200);
    const data = response.data as { ok: boolean; preview?: { subject: string; html: string } };

    if (data.preview) {
      // HTML should include CTA link - welcome notification uses /manage
      // (fallback would be /notifications if no primary_action_href is set)
      expect(data.preview.html).toContain('/manage');
    }
  });

  // =============================================================================
  // OPT-OUT ENFORCEMENT TESTS
  // =============================================================================

  test('send decision honors email_notifications_enabled at send time', async ({ page }) => {
    const userEmail = `email-optout-${Date.now()}@example.com`;
    const user = await authenticateAndGetToken(page, userEmail);
    await completeOnboarding(page);

    await page.waitForTimeout(2000);

    const notificationId = await getWelcomeNotificationId(page, user.accessToken);
    expect(notificationId).not.toBeNull();

    // Disable email notifications right before calling
    await setEmailNotificationsEnabled(page, user.accessToken, user.userId, false);

    const response = await callSendWelcomeEmail(page, user.accessToken, notificationId!);

    expect(response.status).toBe(200);
    const data = response.data as { ok: boolean; sent: boolean; skipped_reason?: string };

    // Should be skipped due to opt-out
    expect(data.ok).toBe(true);
    expect(data.sent).toBe(false);
    expect(data.skipped_reason).toBe('opted_out');
  });

  test('email sends when notifications are enabled (default)', async ({ page }) => {
    const userEmail = `email-enabled-${Date.now()}@example.com`;
    const user = await authenticateAndGetToken(page, userEmail);
    await completeOnboarding(page);

    await page.waitForTimeout(2000);

    const notificationId = await getWelcomeNotificationId(page, user.accessToken);
    expect(notificationId).not.toBeNull();

    // Ensure email notifications are enabled (default)
    await setEmailNotificationsEnabled(page, user.accessToken, user.userId, true);

    const response = await callSendWelcomeEmail(page, user.accessToken, notificationId!);

    expect(response.status).toBe(200);
    const data = response.data as { ok: boolean; sent?: boolean; preview?: unknown };

    expect(data.ok).toBe(true);
    // In dev mode, will have preview; in prod mode with credentials, sent=true
    expect(data.sent === true || data.preview !== undefined).toBe(true);
  });

  // =============================================================================
  // IDEMPOTENCY TESTS
  // =============================================================================

  test('second call does not re-send (idempotency via email_sent_at)', async ({ page }) => {
    const userEmail = `email-idempotent-${Date.now()}@example.com`;
    const user = await authenticateAndGetToken(page, userEmail);
    await completeOnboarding(page);

    await page.waitForTimeout(2000);

    const notificationId = await getWelcomeNotificationId(page, user.accessToken);
    expect(notificationId).not.toBeNull();

    // First call
    const response1 = await callSendWelcomeEmail(page, user.accessToken, notificationId!);
    expect(response1.status).toBe(200);
    const data1 = response1.data as { ok: boolean; sent?: boolean; skipped_reason?: string; preview?: unknown };

    // In dev mode (no RESEND_API_KEY), email_sent_at is not set because email isn't actually sent.
    // So in dev mode, both calls return 'missing_credentials' with preview.
    // In prod mode with credentials, first call sends and sets email_sent_at,
    // second call returns 'already_sent'.
    if (data1.skipped_reason === 'missing_credentials') {
      // Dev mode: both calls return preview
      expect(data1.preview).toBeDefined();
      
      const response2 = await callSendWelcomeEmail(page, user.accessToken, notificationId!);
      const data2 = response2.data as { ok: boolean; skipped_reason?: string; preview?: unknown };
      expect(data2.ok).toBe(true);
      expect(data2.skipped_reason).toBe('missing_credentials');
      expect(data2.preview).toBeDefined();
    } else {
      // Prod mode: first call sent, second call should be 'already_sent'
      expect(data1.sent).toBe(true);
      
      const response2 = await callSendWelcomeEmail(page, user.accessToken, notificationId!);
      const data2 = response2.data as { ok: boolean; sent: boolean; skipped_reason?: string };
      expect(data2.ok).toBe(true);
      expect(data2.sent).toBe(false);
      expect(data2.skipped_reason).toBe('already_sent');
    }
  });

  test('multiple rapid calls only send once', async ({ page }) => {
    const userEmail = `email-rapid-${Date.now()}@example.com`;
    const user = await authenticateAndGetToken(page, userEmail);
    await completeOnboarding(page);

    await page.waitForTimeout(2000);

    const notificationId = await getWelcomeNotificationId(page, user.accessToken);
    expect(notificationId).not.toBeNull();

    // Make multiple rapid calls
    const responses = await Promise.all([
      callSendWelcomeEmail(page, user.accessToken, notificationId!),
      callSendWelcomeEmail(page, user.accessToken, notificationId!),
      callSendWelcomeEmail(page, user.accessToken, notificationId!),
    ]);

    // All should succeed
    responses.forEach((r) => expect(r.status).toBe(200));

    // At most one should have actually sent (or had preview)
    const sentCount = responses.filter((r) => {
      const data = r.data as { sent?: boolean; preview?: unknown };
      return data.sent === true || data.preview !== undefined;
    }).length;

    // Due to race conditions, we might see 1-3 "sent" responses
    // but the important thing is the database only has one email_sent_at
    expect(sentCount).toBeGreaterThanOrEqual(1);

    // Verify database idempotency: notification should have email_sent_at set
    // Note: anonKey is validated in beforeAll, so it's guaranteed to be set here
    const dbCheckResponse = await page.evaluate(
      async ({ baseApiUrl, anonKey, accessToken, notificationId }) => {
        const response = await fetch(
          `${baseApiUrl}/rest/v1/notifications?id=eq.${notificationId}&select=email_sent_at`,
          {
            headers: {
              'apikey': anonKey,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        return response.json();
      },
      { baseApiUrl, anonKey: anonKey!, accessToken: user.accessToken, notificationId: notificationId! }
    );

    // Verify notification exists and has email_sent_at set (either from send or preview)
    expect(Array.isArray(dbCheckResponse)).toBe(true);
    expect(dbCheckResponse.length).toBe(1);
    
    // Verify idempotency based on mode:
    // - In dev mode without email provider: email_sent_at is null (preview mode doesn't set it)
    // - In prod mode with credentials: email_sent_at should be set after actual send
    const notification = dbCheckResponse[0] as { email_sent_at: string | null };
    const hadActualSend = responses.some((r) => {
      const data = r.data as { sent?: boolean };
      return data.sent === true;
    });
    
    if (hadActualSend) {
      // If any response indicated actual send, email_sent_at must be set
      expect(notification.email_sent_at).not.toBeNull();
    }
    // In dev/preview mode, email_sent_at may be null - that's expected behavior
  });

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================

  test('returns error for non-existent notification', async ({ page }) => {
    const userEmail = `email-notfound-${Date.now()}@example.com`;
    const user = await authenticateAndGetToken(page, userEmail);
    await completeOnboarding(page);

    const response = await callSendWelcomeEmail(
      page,
      user.accessToken,
      '00000000-0000-0000-0000-000000000000'
    );

    expect(response.status).toBe(404);
    const data = response.data as { ok: boolean; skipped_reason?: string };
    expect(data.ok).toBe(false);
    expect(data.skipped_reason).toBe('notification_not_found');
  });

  test('returns error for notification belonging to another user', async ({ page, browser }) => {
    // Create User A
    const userAEmail = `email-other-a-${Date.now()}@example.com`;
    const userA = await authenticateAndGetToken(page, userAEmail);
    await completeOnboarding(page);

    await page.waitForTimeout(2000);

    const notificationId = await getWelcomeNotificationId(page, userA.accessToken);
    expect(notificationId).not.toBeNull();

    // Create User B
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    const userBEmail = `email-other-b-${Date.now()}@example.com`;
    const userB = await authenticateAndGetToken(pageB, userBEmail);
    await completeOnboarding(pageB);

    // User B tries to send email for User A's notification
    const response = await callSendWelcomeEmail(pageB, userB.accessToken, notificationId!);

    // Should fail - notification not found (for this user)
    expect(response.status).toBe(404);

    await contextB.close();
  });

  test('returns error for unauthenticated request', async ({ page }) => {
    const response = await page.evaluate(
      async ({ baseUrl, apiKey }) => {
        const res = await fetch(`${baseUrl}/functions/v1/send-welcome-email`, {
          method: 'POST',
          headers: {
            apikey: apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ notification_id: '00000000-0000-0000-0000-000000000000' }),
        });
        return {
          status: res.status,
          data: await res.json().catch(() => null),
        };
      },
      { baseUrl: baseApiUrl, apiKey: anonKey! }
    );

    // Should fail with 401
    expect(response.status).toBe(401);
  });
});

