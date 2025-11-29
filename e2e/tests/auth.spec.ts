/**
 * E2E Tests: User Story 1 - Authentication Flow
 * Tests magic link authentication, session persistence, logout, and access control
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import { InbucketClient } from '../utils/inbucket';
import { resetDatabase, ensureTestUser, removeTestUser } from '../fixtures/db';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'e2e-test@example.com';
const NON_ALLOWED_EMAIL = 'not-allowed@example.com';

test.describe('Authentication Flow', () => {
  // Run auth tests serially to avoid rate limiting and mailbox conflicts
  test.describe.configure({ mode: 'serial' });
  
  let inbucket: InbucketClient;

  test.beforeAll(async () => {
    inbucket = new InbucketClient();
    await resetDatabase();
    await ensureTestUser(TEST_EMAIL);
    // Purge all mailboxes at the start
    await inbucket.purgeMailbox(TEST_EMAIL.split('@')[0]);
    await inbucket.purgeMailbox(NON_ALLOWED_EMAIL.split('@')[0]);
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
    expect(message?.subject).toMatch(/magic link|login|sign in/i);
  });

  test('T023: non-allowed email requests magic link → same success message (no enumeration)', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.requestMagicLink(NON_ALLOWED_EMAIL);
    
    // Should show same success message (no enumeration)
    // Note: Current implementation sends magic links to all emails
    // The invite validation happens at a different layer
    await loginPage.expectMagicLinkSent();
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

    // Authenticate first
    await loginPage.goto();
    await loginPage.requestMagicLink(TEST_EMAIL);
    
    const mailbox = TEST_EMAIL.split('@')[0];
    let magicLink: string | null = null;
    for (let i = 0; i < 10; i++) {
      const message = await inbucket.getLatestMessage(mailbox);
      if (message) {
        magicLink = inbucket.extractMagicLink(message);
        if (magicLink) break;
      }
      await page.waitForTimeout(500);
    }

    await page.goto(magicLink!);
    await expect(page).toHaveURL(/\/(dashboard)?$/);

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

    // Authenticate first
    await loginPage.goto();
    await loginPage.requestMagicLink(TEST_EMAIL);
    
    const mailbox = TEST_EMAIL.split('@')[0];
    let magicLink: string | null = null;
    for (let i = 0; i < 10; i++) {
      const message = await inbucket.getLatestMessage(mailbox);
      if (message) {
        magicLink = inbucket.extractMagicLink(message);
        if (magicLink) break;
      }
      await page.waitForTimeout(500);
    }

    await page.goto(magicLink!);
    await expect(page).toHaveURL(/\/(dashboard)?$/);

    // Click sign out
    const signOutButton = page.getByRole('button', { name: /sair|sign out|logout/i });
    if (await signOutButton.isVisible()) {
      await signOutButton.click();
    } else {
      // Try user menu
      const userMenu = page.getByRole('button', { name: /menu|user|perfil/i });
      if (await userMenu.isVisible()) {
        await userMenu.click();
        await page.getByRole('menuitem', { name: /sair|sign out|logout/i }).click();
      }
    }

    // Verify redirected to login
    await expect(page).toHaveURL(/\/login/);
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

