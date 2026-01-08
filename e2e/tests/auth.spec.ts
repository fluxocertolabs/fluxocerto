/**
 * E2E Tests: User Story 1 - Authentication Flow
 * Tests magic link authentication, session persistence, logout, and access control
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import { InbucketClient } from '../utils/inbucket';
import { ensureTestUser } from '../fixtures/db';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'e2e-test@example.com';
// For self-serve signup testing: generate unique email per test run
const SELF_SERVE_EMAIL = `self-serve-${Date.now()}@example.com`;

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

    // Request magic link for a never-before-seen email
    await loginPage.goto();
    await loginPage.requestMagicLink(SELF_SERVE_EMAIL);
    await loginPage.expectMagicLinkSent();

    // Get magic link from Inbucket
    let magicLink: string | null = null;
    for (let i = 0; i < 10; i++) {
      const message = await inbucket.getLatestMessage(mailbox);
      if (message) {
        magicLink = inbucket.extractMagicLink(message);
        if (magicLink) break;
      }
      await page.waitForTimeout(500);
    }

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

    // Request magic link
    await loginPage.goto();
    await loginPage.requestMagicLink(TEST_EMAIL);
    await loginPage.expectMagicLinkSent();
    
    // Wait for email with retry
    let magicLink: string | null = null;
    for (let i = 0; i < 10; i++) {
      const message = await inbucket.getLatestMessage(mailbox);
      if (message) {
        magicLink = inbucket.extractMagicLink(message);
        if (magicLink) break;
      }
      await page.waitForTimeout(500);
    }

    expect(magicLink).not.toBeNull();

    // Click magic link
    await page.goto(magicLink!);

    // Verify redirected to dashboard
    await expect(page).toHaveURL(/\/(dashboard)?$/);
  });

  test('T025: authenticated user refreshes page → session persists, remains logged in', async ({
    page,
  }) => {
    // This test can be a bit slower in Option B mode (PW_PER_TEST_CONTEXT=1) because
    // the app runs behind `vite preview` (prod build) and cold-start hydration can take longer.
    const isPerTestContext = process.env.PW_PER_TEST_CONTEXT === '1';
    if (isPerTestContext) {
      test.setTimeout(120000);
    }

    const loginPage = new LoginPage(page);
    const mailbox = TEST_EMAIL.split('@')[0];

    // Purge mailbox to ensure we get a fresh magic link
    await inbucket.purgeMailbox(mailbox);

    // Authenticate first
    await loginPage.goto();
    await loginPage.requestMagicLink(TEST_EMAIL);
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
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 15000 });

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
    await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(5000)]);

    // Should still be on dashboard (not redirected to login)
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: isPerTestContext ? 20000 : 10000 });
    await expect(page.getByText(/login|entrar/i)).not.toBeVisible();
  });

  test('T026: authenticated user clicks sign out → logged out, redirected to login', async ({
    page,
  }) => {
    // Increase timeout for this complex test
    test.setTimeout(60000);

    const loginPage = new LoginPage(page);
    const mailbox = TEST_EMAIL.split('@')[0];

    // Purge mailbox to ensure we get a fresh magic link
    await inbucket.purgeMailbox(mailbox);

    // Authenticate first
    await loginPage.goto();
    await loginPage.requestMagicLink(TEST_EMAIL);
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

    // Wait for the page to fully load
    await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(5000)]);
    
    // Dismiss onboarding wizard if present (for new users)
    const wizardDialog = page.locator('[role="dialog"]').filter({ hasText: /passo\s+\d+\s+de\s+\d+/i });
    if (await wizardDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Complete minimal onboarding to dismiss the wizard
      const profileInput = page.locator('#profile-name');
      if (await profileInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await profileInput.fill('Test User');
      }
      const groupInput = page.locator('#group-name');
      if (await groupInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await groupInput.fill('Test Group');
      }
      const accountInput = page.locator('#account-name');
      if (await accountInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await accountInput.fill('Test Account');
      }
      
      // Click through the wizard steps
      for (let i = 0; i < 10; i++) {
        if (!(await wizardDialog.isVisible().catch(() => false))) break;
        
        const finalizeBtn = wizardDialog.getByRole('button', { name: /finalizar/i });
        if (await finalizeBtn.isVisible().catch(() => false)) {
          await finalizeBtn.click();
          break;
        }
        
        const nextBtn = wizardDialog.getByRole('button', { name: /próximo/i });
        if (await nextBtn.isVisible().catch(() => false)) {
          await nextBtn.click();
          await page.waitForTimeout(500);
        }
      }
      
      // Wait for wizard to close
      await expect(wizardDialog).toBeHidden({ timeout: 10000 });
    }
    
    // Dismiss any tour that might be showing
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

