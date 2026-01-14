/**
 * E2E Tests: User Story 1 - Authentication Flow
 * Tests magic link authentication, session persistence, logout, and access control
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import { InbucketClient } from '../utils/inbucket';
import { ensureTestUser } from '../fixtures/db';
import { executeSQL, executeSQLWithResult, getUserIdFromEmail } from '../utils/supabase-admin';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'e2e-test@example.com';
// For self-serve signup testing: generate unique email per test run
const SELF_SERVE_EMAIL = `self-serve-${Date.now()}@example.com`;

/**
 * Supabase magic links often route through the Auth service with a `redirect_to` query param.
 * In local environments, that redirect host can differ (e.g. `127.0.0.1` vs `localhost`),
 * which can break session persistence assertions when the app navigates/reloads on another host.
 *
 * We normalize the `redirect_to` host to match Playwright's `BASE_URL` for deterministic behavior.
 */
function normalizeSupabaseMagicLink(magicLink: string): string {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) return magicLink;

  try {
    const url = new URL(magicLink);
    const key = url.searchParams.has('redirect_to')
      ? 'redirect_to'
      : url.searchParams.has('redirectTo')
        ? 'redirectTo'
        : null;

    if (!key) return magicLink;

    const redirectTo = url.searchParams.get(key);
    if (!redirectTo) return magicLink;

    const base = new URL(baseUrl);
    const redirect = new URL(redirectTo);
    redirect.protocol = base.protocol;
    redirect.host = base.host;

    url.searchParams.set(key, redirect.toString());
    return url.toString();
  } catch {
    return magicLink;
  }
}

test.describe('Authentication Flow', () => {
  // Run auth tests serially to avoid rate limiting and mailbox conflicts
  test.describe.configure({ mode: 'serial' });
  
  let inbucket: InbucketClient;

  test.beforeAll(async () => {
    inbucket = new InbucketClient();
    await ensureTestUser(TEST_EMAIL);
    // Purge all mailboxes at the start
    await inbucket.purgeMailbox(TEST_EMAIL.split('@')[0]);
    await inbucket.purgeMailbox(SELF_SERVE_EMAIL.split('@')[0]);
  });

  test.beforeEach(async () => {
    // Small delay between tests to avoid rate limiting
    await new Promise(r => setTimeout(r, 1000));
  });

  test('T022: allowed email requests magic link → success message displayed, email captured in Inbucket', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.requestMagicLink(TEST_EMAIL);
    await loginPage.expectMagicLinkSent();

    // Verify email was received in Inbucket
    const mailbox = TEST_EMAIL.split('@')[0];
    const message = await inbucket.getLatestMessage(mailbox);
    expect(message).not.toBeNull();
    // Supabase templates are localized (pt-BR) in this repo; assert we got the expected
    // "magic link" email without relying on English-only copy.
    expect(message?.subject).toMatch(/fluxo certo/i);
    expect(message?.subject).toMatch(/link de acesso|magic link|login|sign in/i);
  });

  test('T023: self-serve email requests magic link → same success message (no enumeration)', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.requestMagicLink(SELF_SERVE_EMAIL);
    
    // Should show same success message (no enumeration)
    // Self-serve signups are now allowed for any email
    await loginPage.expectMagicLinkSent();
  });

  test('T040: self-serve signup - never-before-seen email completes Magic Link flow end-to-end', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    const mailbox = SELF_SERVE_EMAIL.split('@')[0];

    // Purge mailbox to ensure clean state
    await inbucket.purgeMailbox(mailbox);
    const previousMessageId = (await inbucket.getLatestMessage(mailbox))?.id ?? null;

    // Request magic link for a never-before-seen email
    await loginPage.goto();
    await loginPage.requestMagicLink(SELF_SERVE_EMAIL);
    await loginPage.expectMagicLinkSent();

    // Get magic link from Inbucket using poll-based wait
    let magicLink: string | null = null;
    await expect.poll(async () => {
      const message = await inbucket.getLatestMessage(mailbox);
      if (message && message.id !== previousMessageId) {
        magicLink = inbucket.extractMagicLink(message);
      }
      return magicLink;
    }, { timeout: 10000, intervals: [500, 500, 1000, 1000, 1000] }).not.toBeNull();

    expect(magicLink).not.toBeNull();

    // Click magic link - should complete auth and redirect to dashboard
    await page.goto(magicLink!);

    // Verify redirected to dashboard (self-serve user is provisioned automatically)
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 15000 });
    
    // Verify the app loads without "missing group/profile" errors
    await expect(page.getByText(/desassociada|orphan|missing/i)).not.toBeVisible();
  });

  test('T024: click magic link from Inbucket → user authenticated, redirected to dashboard', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    const mailbox = TEST_EMAIL.split('@')[0];

    // Purge mailbox to ensure we get a fresh magic link
    await inbucket.purgeMailbox(mailbox);
    const previousMessageId = (await inbucket.getLatestMessage(mailbox))?.id ?? null;

    // Request magic link
    await loginPage.goto();
    await loginPage.requestMagicLink(TEST_EMAIL);
    await loginPage.expectMagicLinkSent();
    
    // Wait for email with poll-based wait
    let magicLink: string | null = null;
    await expect.poll(async () => {
      const message = await inbucket.getLatestMessage(mailbox);
      if (message && message.id !== previousMessageId) {
        magicLink = inbucket.extractMagicLink(message);
      }
      return magicLink;
    }, { timeout: 10000, intervals: [500, 500, 1000, 1000, 1000] }).not.toBeNull();

    expect(magicLink).not.toBeNull();

    // Click magic link
    await page.goto(normalizeSupabaseMagicLink(magicLink!));

    // Verify redirected to dashboard
    await expect(page).toHaveURL(/\/(dashboard)?$/);
  });

  test('T025: authenticated user refreshes page → session persists, remains logged in', async ({
    page,
  }) => {
    // This test can be a bit slower in Option B mode (PW_PER_TEST_CONTEXT=1) because
    // the app runs behind `vite preview` (prod build) and cold-start hydration can take longer.
    const isPerTestContext = process.env.PW_PER_TEST_CONTEXT === '1';
    // In the full suite, auth-tests run alongside heavy parallel projects (chromium + mobile).
    // Give this test extra headroom to avoid timeouts under load, while keeping assertions strict.
    test.setTimeout(isPerTestContext ? 120000 : 90000);

    const loginPage = new LoginPage(page);
    const mailbox = TEST_EMAIL.split('@')[0];

    // Purge mailbox to ensure we get a fresh magic link
    await inbucket.purgeMailbox(mailbox);
    const previousMessageId = (await inbucket.getLatestMessage(mailbox))?.id ?? null;

    // Authenticate first
    await loginPage.goto();
    await loginPage.requestMagicLink(TEST_EMAIL);
    await loginPage.expectMagicLinkSent();
    
    let magicLink: string | null = null;
    await expect.poll(async () => {
      const message = await inbucket.getLatestMessage(mailbox);
      if (message && message.id !== previousMessageId) {
        magicLink = inbucket.extractMagicLink(message);
      }
      return magicLink;
    }, { timeout: 15000, intervals: [500, 500, 1000, 1000, 1000, 1000, 1000] }).not.toBeNull();

    await page.goto(normalizeSupabaseMagicLink(magicLink!));
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 15000 });

    // Ensure Supabase session is fully persisted before attempting a hard reload.
    // Under heavy suite load, the UI can render while auth tokens are still being written.
    await page.waitForFunction(() => {
      const keys = Object.keys(localStorage);
      const hasAuthToken = keys.some((key) => key.includes('sb-') && key.includes('-auth-token'));

      const sessionKeys = Object.keys(sessionStorage);
      const hasSessionAuth = sessionKeys.some((key) => key.includes('sb-') || key.includes('supabase'));

      return hasAuthToken || hasSessionAuth;
    }, null, { timeout: isPerTestContext ? 30000 : 20000 });

    // Ensure the app is fully mounted before attempting a hard reload.
    // Reloads can be aborted if a redirect/hydration navigation is still in-flight.
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('header, main, [data-testid="app-shell"]').first()).toBeVisible({
      timeout: isPerTestContext ? 20000 : 10000,
    });

    // Refresh the page
    try {
      // Use a lighter waitUntil to avoid flaking on long-lived realtime connections.
      await page.reload({ waitUntil: 'domcontentloaded', timeout: isPerTestContext ? 20000 : 15000 });
    } catch (err) {
      // In rare cases reload can be aborted if a navigation is in-flight; fall back to a
      // regular navigation which still validates session persistence.
      console.warn('page.reload failed, falling back to page.goto:', err);
      try {
        await page.goto('/', { waitUntil: 'domcontentloaded', timeout: isPerTestContext ? 20000 : 15000 });
      } catch (gotoErr) {
        // If navigation was interrupted but we still ended up on the dashboard, treat as success.
        if (/\/(dashboard)?$/.test(page.url())) {
          console.warn('page.goto after reload fallback failed but URL is dashboard; continuing:', gotoErr);
        } else {
          throw gotoErr;
        }
      }
    }
    // Wait for network to settle or continue after timeout (long-lived connections may prevent full idle)
    await page.waitForLoadState('networkidle').catch(() => {});

    // Should still be on dashboard (not redirected to login)
    const dashboardUrl = /\/(dashboard)?$/;
    const loginUrl = /\/login(?:\/|$)/;
    const outcome = await Promise.race([
      page.waitForURL(dashboardUrl, { timeout: isPerTestContext ? 30000 : 30000 }).then(() => 'dashboard' as const),
      page.waitForURL(loginUrl, { timeout: isPerTestContext ? 30000 : 30000 }).then(() => 'login' as const),
    ]);
    if (outcome === 'login') {
      throw new Error(`Expected session to persist after reload, but was redirected to login. url=${page.url()}`);
    }
    // Prefer asserting the absence of the actual login form (more deterministic than generic text).
    await expect(page.locator('#email')).toBeHidden({ timeout: isPerTestContext ? 30000 : 20000 });
  });

  test('T026: authenticated user clicks sign out → logged out, redirected to login', async ({
    page,
  }) => {
    // Increase timeout for this complex test
    test.setTimeout(90000);

    const loginPage = new LoginPage(page);
    const mailbox = TEST_EMAIL.split('@')[0];

    // Purge mailbox to ensure we get a fresh magic link
    await inbucket.purgeMailbox(mailbox);
    const previousMessageId = (await inbucket.getLatestMessage(mailbox))?.id ?? null;

    // Authenticate first
    await loginPage.goto();
    await loginPage.requestMagicLink(TEST_EMAIL);
    await loginPage.expectMagicLinkSent();
    
    let magicLink: string | null = null;
    await expect.poll(async () => {
      const message = await inbucket.getLatestMessage(mailbox);
      if (message && message.id !== previousMessageId) {
        magicLink = inbucket.extractMagicLink(message);
      }
      return magicLink;
    }, { timeout: 15000, intervals: [500, 500, 1000, 1000, 1000, 1000, 1000] }).not.toBeNull();

    await page.goto(normalizeSupabaseMagicLink(magicLink!));
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 20000 });

    // Ensure Supabase session is fully persisted before interacting with authenticated UI.
    await page.waitForFunction(() => {
      const keys = Object.keys(localStorage);
      const hasAuthToken = keys.some((key) => key.includes('sb-') && key.includes('-auth-token'));

      const sessionKeys = Object.keys(sessionStorage);
      const hasSessionAuth = sessionKeys.some((key) => key.includes('sb-') || key.includes('supabase'));

      return hasAuthToken || hasSessionAuth;
    }, null, { timeout: 20000 });

    // Wait for the page to fully load (long-lived connections may prevent full idle)
    await page.waitForLoadState('networkidle').catch(() => {});
    
    // Ensure onboarding/tour overlays never block the sign-out flow in this auth-only spec.
    // We mark onboarding as completed + dismiss tours via admin SQL and then reload.
    const userId = await getUserIdFromEmail(TEST_EMAIL);
    const groupRows = await executeSQLWithResult<{ group_id: string | null }>(
      `SELECT group_id FROM public.profiles WHERE email = $1 LIMIT 1`,
      [TEST_EMAIL]
    );
    const groupId = groupRows[0]?.group_id ?? null;
    if (!groupId) {
      throw new Error(`Expected profiles.group_id for ${TEST_EMAIL} but none found`);
    }

    await executeSQL(
      `
        INSERT INTO public.onboarding_states (user_id, group_id, status, current_step, auto_shown_at, completed_at)
        VALUES ($1, $2, 'completed', 'done', now(), now())
        ON CONFLICT (user_id, group_id) DO UPDATE
        SET status = EXCLUDED.status,
            current_step = EXCLUDED.current_step,
            auto_shown_at = EXCLUDED.auto_shown_at,
            completed_at = EXCLUDED.completed_at
      `,
      [userId, groupId]
    );

    await executeSQL(
      `
        INSERT INTO public.tour_states (user_id, tour_key, status, version, dismissed_at, completed_at)
        VALUES
          ($1, 'dashboard', 'dismissed', 1, now(), NULL),
          ($1, 'manage', 'dismissed', 1, now(), NULL),
          ($1, 'history', 'dismissed', 1, now(), NULL)
        ON CONFLICT (user_id, tour_key) DO UPDATE
        SET status = EXCLUDED.status,
            version = EXCLUDED.version,
            dismissed_at = EXCLUDED.dismissed_at,
            completed_at = NULL
      `,
      [userId]
    );

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
    // Wait for network to settle or continue after timeout (long-lived connections may prevent full idle)
    await page.waitForLoadState('networkidle').catch(() => {});

    const wizardDialog = page.locator('[role="dialog"]').filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    await expect(wizardDialog).toBeHidden({ timeout: 20000 });

    // Dismiss any tour that might still be showing (best-effort)
    const closeTourButton = page.getByRole('button', { name: /fechar tour/i });
    if (await closeTourButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeTourButton.click();
      await expect(closeTourButton).toBeHidden({ timeout: 5000 });
    }
    
    // Click sign out - the button text is "Sair" in Portuguese
    const signOutButton = page.getByRole('button', { name: /sair/i });
    await expect(signOutButton).toBeVisible({ timeout: 10000 });
    await signOutButton.click();

    // Verify redirected to login (with longer timeout for auth state to update)
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('T027: unauthenticated user accesses dashboard directly → redirected to login', async ({
    page,
  }) => {
    // Clear any existing session by going to a fresh context
    await page.context().clearCookies();
    
    // Try to access dashboard directly
    await page.goto('/');

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });
});

