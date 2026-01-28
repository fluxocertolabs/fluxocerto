/**
 * Page Object for the login/authentication flow
 * Implements ILoginPage contract from specs/019-e2e-testing/contracts/page-objects.ts
 */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    // The input has id="email" and label "Endereço de e-mail"
    this.emailInput = page.locator('#email');
    // Button text is "Enviar Link de Acesso"
    this.submitButton = page.getByRole('button', { name: /enviar link|entrar|sign in/i });
    // Success message shows "Verifique seu e-mail" as an h3 heading
    this.successMessage = page.getByRole('heading', { name: /verifique seu e-?mail/i });
    this.errorMessage = page.getByRole('alert');
  }

  /**
   * Navigate to login page
   */
  async goto(options?: { disableDevAuthBypass?: boolean }): Promise<void> {
    const url = options?.disableDevAuthBypass ? '/login?disableDevAuth=1' : '/login';
    await this.page.goto(url);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.emailInput).toBeVisible({ timeout: 15000 });
  }

  /**
   * Enter email and submit magic link request
   */
  async requestMagicLink(email: string): Promise<void> {
    await this.emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.emailInput.fill(email);

    // Ensure the submit button is actually interactable before clicking.
    await expect(this.submitButton).toBeEnabled({ timeout: 15000 });

    // Best-effort: wait for the Supabase auth OTP request to complete. This makes the
    // flow much more deterministic under local/CI load.
    const otpRequestPromise = this.page.waitForRequest(
      (req) => req.method() === 'POST' && /\/auth\/v1\/otp\/?(\?|$)/.test(req.url()),
      { timeout: 60000 },
    );

    // Prefer Enter key submit over clicking to avoid rare focus/overlay click flakiness.
    await this.emailInput.press('Enter');

    // If the network request doesn't happen for any reason, this will timeout and
    // fail with a clearer error than "success message not visible".
    await otpRequestPromise;
  }

  /**
   * Verify success message is displayed after magic link request
   */
  async expectMagicLinkSent(): Promise<void> {
    // Wait for either success or an error. Under load, auth/email can be slow, so we
    // use a longer timeout and fail fast if an explicit error is shown.
    const timeoutMs = 60000;

    const result = await Promise.race([
      this.successMessage.waitFor({ state: 'visible', timeout: timeoutMs }).then(() => ({ ok: true as const })),
      this.errorMessage.waitFor({ state: 'visible', timeout: timeoutMs }).then(() => ({ ok: false as const })),
    ]);

    if (!result.ok) {
      const text = (await this.errorMessage.textContent())?.trim() ?? 'Unknown error';
      throw new Error(`Magic link request failed: ${text}`);
    }
  }

  /**
   * Verify user is on the login page
   */
  async expectToBeOnLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login/);
    await expect(this.emailInput).toBeVisible();
  }
}

