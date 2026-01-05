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

    // Request magic link
    await loginPage.goto();
    await loginPage.requestMagicLink(TEST_EMAIL);
    await loginPage.expectMagicLinkSent();

    // Get magic link from Inbucket
    const mailbox = TEST_EMAIL.split('@')[0];
    
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
    const loginPage = new LoginPage(page);
    const mailbox = TEST_EMAIL.split('@')[0];

    // Purge mailbox to ensure we get a fresh magic link
    await inbucket.purgeMailbox(mailbox);

    // Authenticate first
    await loginPage.goto();
    await loginPage.requestMagicLink(TEST_EMAIL);
    await loginPage.expectMagicLinkSent();
    
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
    await page.goto(magicLink!);
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });

    // Refresh the page
    await page.reload();

    // Should still be on dashboard (not redirected to login)
    await expect(page).toHaveURL(/\/(dashboard)?$/);
    await expect(page.getByText(/login|entrar/i)).not.toBeVisible();
  });

  test('T026: authenticated user clicks sign out → logged out, redirected to login', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    const mailbox = TEST_EMAIL.split('@')[0];

    // Purge mailbox to ensure we get a fresh magic link
    await inbucket.purgeMailbox(mailbox);

    // Authenticate first
    await loginPage.goto();
    await loginPage.requestMagicLink(TEST_EMAIL);
    await loginPage.expectMagicLinkSent();
    
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
    await page.goto(magicLink!);
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });

    // Wait for the page to fully load and sign out button to appear
    await Promise.race([page.waitForLoadState('networkidle'), page.waitForTimeout(5000)]);
    
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

