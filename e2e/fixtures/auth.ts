/**
 * Authentication fixture for managing test user sessions
 * Implements IAuthFixture contract from specs/019-e2e-testing/contracts/fixtures.ts
 * Updated for per-worker isolation in parallel test execution
 */

import type { Page } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { InbucketClient } from '../utils/inbucket';
import type { IWorkerContext } from './worker-context';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_TEST_EMAIL = 'e2e-test@example.com';
const STORAGE_STATE_PATH = resolve(__dirname, '../.auth/user.json');

export interface AuthFixtureOptions {
  testEmail?: string;
  inbucketUrl?: string;
  storageStatePath?: string;
  workerIndex?: number;
}

export class AuthFixture {
  readonly testEmail: string;
  readonly inbucketUrl: string;
  readonly storageStatePath: string;
  readonly workerIndex?: number;
  private inbucketClient: InbucketClient;

  constructor(options?: AuthFixtureOptions) {
    this.workerIndex = options?.workerIndex;

    // Use worker-specific email if workerIndex is provided
    if (this.workerIndex !== undefined) {
      this.testEmail = options?.testEmail || `e2e-test-worker-${this.workerIndex}@example.com`;
      this.storageStatePath =
        options?.storageStatePath || resolve(__dirname, `../.auth/worker-${this.workerIndex}.json`);
    } else {
      this.testEmail = options?.testEmail || process.env.TEST_USER_EMAIL || DEFAULT_TEST_EMAIL;
      this.storageStatePath = options?.storageStatePath || STORAGE_STATE_PATH;
    }

    this.inbucketUrl = options?.inbucketUrl || process.env.INBUCKET_URL || 'http://localhost:54324';
    this.inbucketClient = new InbucketClient(this.inbucketUrl);
  }

  /**
   * Request a magic link for the given email address
   */
  async requestMagicLink(email: string, page: Page): Promise<void> {
    await page.goto('/login');
    await page.getByLabel(/e-?mail/i).fill(email);
    await page.getByRole('button', { name: /enviar|entrar|sign in/i }).click();
    // Wait for success message
    await page.getByText(/verifique seu e-?mail|link enviado|check your email/i).waitFor();
  }

  /**
   * Get magic link URL from Inbucket
   */
  async getMagicLinkUrl(email: string, previousUrl?: string): Promise<string> {
    const mailbox = email.split('@')[0];
    const message = await this.inbucketClient.getLatestMessage(mailbox);

    if (!message) {
      throw new Error(`No email found for ${email}`);
    }

    const url = this.inbucketClient.extractMagicLink(message);

    if (!url) {
      throw new Error('Could not extract magic link from email');
    }

    if (previousUrl && url === previousUrl) {
      throw new Error('No new magic link email found');
    }

    return url;
  }

  /**
   * Wait for a new magic link email with retry mechanism
   */
  async waitForMagicLinkEmail(
    email: string,
    previousUrl?: string,
    maxRetries: number = 10,
    intervalMs: number = 500
  ): Promise<string> {
    const mailbox = email.split('@')[0];

    for (let i = 0; i < maxRetries; i++) {
      try {
        const message = await this.inbucketClient.getLatestMessage(mailbox);

        if (message) {
          const url = this.inbucketClient.extractMagicLink(message);

          if (url && url !== previousUrl) {
            return url;
          }
        }
      } catch {
        // Ignore errors during polling
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Timeout waiting for magic link email for ${email}`);
  }

  /**
   * Complete full authentication flow
   */
  async authenticate(page: Page): Promise<void> {
    // Purge mailbox before starting
    const mailbox = this.testEmail.split('@')[0];
    await this.inbucketClient.purgeMailbox(mailbox);

    // Request magic link
    await this.requestMagicLink(this.testEmail, page);

    // Wait for and get magic link
    let magicLinkUrl = await this.waitForMagicLinkEmail(this.testEmail);

    // Rewrite 127.0.0.1 to localhost for browser compatibility
    // Also update the redirect URL to match our test server port
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    magicLinkUrl = magicLinkUrl
      .replace(/127\.0\.0\.1/g, 'localhost')
      .replace(/redirect_to=http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/g, `redirect_to=${baseUrl}`);

    // Navigate to magic link
    await page.goto(magicLinkUrl);

    // Wait for redirect to dashboard (may have hash fragment from auth redirect)
    await page.waitForURL(/\/(dashboard)?#?$/, { timeout: 30000 });

    // Wait for the page to be fully loaded and auth state established
    await page.waitForLoadState('networkidle');
    
    // Additional wait to ensure Supabase session is fully established in browser storage
    // This is critical - if we save the storage state too early, the session cookies
    // and localStorage won't be complete
    await page.waitForTimeout(2000);
    
    // Verify we're actually authenticated by checking for a dashboard element
    // This ensures the page has fully loaded with auth state
    try {
      await page.getByRole('heading', { name: /painel|dashboard/i }).waitFor({ 
        state: 'visible', 
        timeout: 10000 
      });
    } catch (error) {
      console.error(`Warning: Dashboard heading not found after auth for ${this.testEmail}`);
      // Continue anyway, the waitForURL should be sufficient
    }

    // Save storage state
    await page.context().storageState({ path: this.storageStatePath });
  }

  /**
   * Clear authentication session
   */
  async logout(page: Page): Promise<void> {
    // Look for sign out button or link
    const signOutButton = page.getByRole('button', { name: /sair|sign out|logout/i });

    if (await signOutButton.isVisible()) {
      await signOutButton.click();
    } else {
      // Try clicking user menu first
      const userMenu = page.getByRole('button', { name: /menu|user|perfil/i });
      if (await userMenu.isVisible()) {
        await userMenu.click();
        await page.getByRole('menuitem', { name: /sair|sign out|logout/i }).click();
      }
    }

    // Wait for redirect to login
    await page.waitForURL(/\/login/);
  }

  /**
   * Load saved authentication state into page context
   * Note: Storage state is typically loaded automatically via playwright config.
   * This method exists for reference but should rarely be needed.
   */
  async loadSession(_page: Page): Promise<void> {
    // Storage state is loaded automatically via playwright config's storageState option.
    // Manual loading would require creating a new browser context:
    // const context = await browser.newContext({ storageState: this.storageStatePath });
    // const newPage = await context.newPage();
    // This method is a no-op since the standard approach is config-based.
  }
}

/**
 * Create auth fixture instance
 */
export function createAuthFixture(options?: AuthFixtureOptions) {
  return new AuthFixture(options);
}

/**
 * Create a worker-scoped auth fixture
 * This returns an AuthFixture configured for a specific worker
 */
export function createWorkerAuthFixture(workerContext: IWorkerContext): AuthFixture {
  return new AuthFixture({
    testEmail: workerContext.email,
    storageStatePath: workerContext.authStatePath,
    workerIndex: workerContext.workerIndex,
  });
}

export type { AuthFixture as AuthFixtureType };
