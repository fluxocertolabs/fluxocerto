/**
 * Section object for account management within ManagePage
 * Implements IAccountsSection contract from specs/019-e2e-testing/contracts/page-objects.ts
 */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class AccountsSection {
  readonly page: Page;
  readonly accountList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.accountList = page.locator('[data-testid="accounts-list"], .accounts-list').first();
  }

  private get manageTabs(): Locator {
    return this.page.locator('[data-tour="manage-tabs"]');
  }

  /**
   * Ensure the Manage tabs UI is rendered and interactive.
   *
   * Under high CI parallelism, the Manage page can transiently fall back to a loading/error
   * wrapper where the tabs are not present. We recover deterministically by clicking the
   * built-in "Tentar Novamente" button when available, and as a last resort performing a
   * soft reload of the page.
   */
  private async ensureManageTabsVisible(): Promise<void> {
    const errorAlertWithRetry = this.page.getByRole('alert').filter({
      has: this.page.getByRole('button', { name: /tentar novamente/i }),
    });
    const retryButton = errorAlertWithRetry.getByRole('button', { name: /tentar novamente/i });

    const start = Date.now();
    let reloadAttempts = 0;

    await expect(async () => {
      // Detect auth/session issues early (prevents long hangs that end in test timeout).
      if (this.page.url().includes('/login')) {
        throw new Error('Redirected to /login while waiting for Manage tabs');
      }

      const tabsVisible = await this.manageTabs.isVisible().catch(() => false);
      if (tabsVisible) return;

      const canRetry = await retryButton.isVisible().catch(() => false);
      if (canRetry) {
        console.warn('[AccountsSection] Manage error state detected; clicking retry');
        await retryButton.click({ timeout: 5000 }).catch(() => {});
        await this.page.waitForTimeout(1000);
      }

      const elapsed = Date.now() - start;
      if (elapsed > 25000 && reloadAttempts < 1) {
        reloadAttempts += 1;
        console.warn('[AccountsSection] Manage tabs still missing; reloading /manage (once)');
        try {
          await this.page.reload({ waitUntil: 'domcontentloaded' });
        } catch {
          await this.page.goto('/manage', { waitUntil: 'domcontentloaded' });
        }
        await this.page.waitForTimeout(1000);
      }

      throw new Error('Manage tabs not visible yet');
    }).toPass({ timeout: 50000, intervals: [500, 1000, 2000] });
  }

  private get accountsTab(): Locator {
    // Scope to the Manage tabs list to avoid matching unrelated/hidden role=tab elements.
    return this.manageTabs.getByRole('tab', { name: /contas|accounts/i });
  }

  private get headerAddButton(): Locator {
    // On /manage, the "Adicionar Conta" header button is rendered alongside the tabs list.
    // We scope to the header container to avoid picking up similarly named buttons elsewhere.
    const header = this.manageTabs.locator('..').locator('..');
    return header.getByRole('button', { name: /adicionar conta/i });
  }

  /**
   * Get the add button - uses the one in the header (first one), not the empty state
   */
  private get addButtons(): Locator {
    // There can be multiple "Adicionar Conta" buttons (header + empty state).
    // We intentionally return the *collection* and pick the first visible one at runtime.
    return this.page.getByRole('button', { name: /adicionar conta|add account|nova conta/i });
  }

  /**
   * Click add new account button to open form
   */
  async clickAdd(): Promise<void> {
    await this.ensureManageTabsVisible();

    // Prefer the header button when available; it's the most deterministic and implies
    // the Accounts tab is already active (button is conditional on activeTab === 'accounts').
    const headerVisible = await this.headerAddButton.isVisible().catch(() => false);
    if (!headerVisible) {
      // Activate the Accounts tab, then wait for the header action to appear.
      await this.accountsTab
        .click({ timeout: 15000 })
        .catch(() => this.accountsTab.click({ force: true, timeout: 15000 }));
      await expect(this.headerAddButton).toBeVisible({ timeout: 15000 });
    }

    await this.headerAddButton
      .click({ timeout: 15000, noWaitAfter: true })
      .catch(() => this.headerAddButton.click({ force: true, timeout: 15000, noWaitAfter: true }));
    return;

    // Fallback: pick the last visible match outside dialogs.
    const buttons = this.addButtons;
    const count = await buttons.count();
    for (let i = count - 1; i >= 0; i--) {
      const btn = buttons.nth(i);
      if (!(await btn.isVisible().catch(() => false))) continue;

      const isInsideDialog = await btn
        .evaluate((el) => !!el.closest('[role="dialog"], [role="alertdialog"]'))
        .catch(() => false);
      if (isInsideDialog) continue;

      await btn.scrollIntoViewIfNeeded().catch(() => {});
      await btn.click({ timeout: 5000, noWaitAfter: true }).catch(async () => {
        await btn.click({ force: true, noWaitAfter: true });
      });
      return;
    }

    throw new Error('No visible "Adicionar Conta" button found');
  }

  /**
   * Fill account form and submit
   */
  async createAccount(data: {
    name: string;
    type: 'checking' | 'savings' | 'investment';
    balance: string;
  }): Promise<void> {
    // Ensure the accounts section itself is ready (tab content rendered).
    await this.waitForLoad();

    // If a tour tooltip is visible, it can match role=dialog and block interactions.
    // Close it proactively to keep the flow deterministic.
    const tourCloseButton = this.page.getByRole('button', { name: /fechar tour/i });
    if (await tourCloseButton.isVisible().catch(() => false)) {
      await tourCloseButton.click({ timeout: 2000 }).catch(() => {});
    }

    // IMPORTANT: The tour tooltip also uses role="dialog" and can occasionally contain
    // copy like "Adicionar Conta". If we locate by accessible name only, we can
    // accidentally match the tour dialog instead of the account form.
    //
    // Anchor the locator to the *account form structure* (name + balance fields).
    const dialog = this.page
      .getByRole('dialog')
      .filter({ has: this.page.locator('input#name') })
      .filter({ has: this.page.locator('#balance') })
      .first();
    // Target by id for stability. Labels are correct, but under heavy CI load we occasionally
    // observe transient detach/re-render where `getByLabel()` can take longer to resolve.
    const nameInput = dialog.locator('input#name');

    // Open dialog deterministically (avoid repeated fast retries that can fight slow UIs under parallel load).
    if (!(await dialog.isVisible().catch(() => false))) {
      // Clear any open popovers/menus/tours that might intercept clicks.
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.keyboard.press('Escape').catch(() => {});

      // First attempt: click header add button via clickAdd() (tab-guarded).
      await this.clickAdd();
      await dialog.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

      // Second attempt: press Escape and try clickAdd again (handles rare overlay race).
      if (!(await dialog.isVisible().catch(() => false))) {
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.clickAdd();
        await dialog.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
      }

      if (!(await dialog.isVisible().catch(() => false))) {
        // Best-effort diagnostics for flakes (Playwright doesn't always attach screenshots for toPass timeouts).
        await this.page
          .screenshot({ path: `playwright-results/debug-accounts-add-dialog-${Date.now()}.png`, fullPage: true })
          .catch(() => {});
        throw new Error('Failed to open "Adicionar Conta" dialog');
      }
    }

    // Fill form fields - target inputs within the dialog
    await expect(nameInput).toBeVisible({ timeout: 15000 });
    await expect(nameInput).toBeEditable({ timeout: 30000 });
    await nameInput.scrollIntoViewIfNeeded().catch(() => {});
    // Prefer fill() directly. Click+force-click is a common source of flakes when overlays exist
    // (Playwright will wait for actionability and may run into the test timeout).
    // Under CI parallelism, the dialog content can re-mount once right after opening (React reconciliation),
    // briefly detaching inputs. Use short, retrying assertions instead of one long fill timeout.
    await expect(async () => {
      await expect(nameInput).toBeVisible({ timeout: 2000 });
      await nameInput.fill(data.name, { timeout: 2000 });
      await expect(nameInput).toHaveValue(data.name, { timeout: 2000 });
    }).toPass({ timeout: 30000, intervals: [250, 500, 1000] });
    
    // Select account type when needed.
    // New accounts default to "checking" in the UI, so don't touch the Select unless
    // we need to change it (avoids occasional flake where the select trigger isn't ready).
    if (data.type !== 'checking') {
      const typeTrigger = dialog.locator('#type');
      await expect(typeTrigger).toBeVisible({ timeout: 10000 });

      await typeTrigger.click({ timeout: 5000 }).catch(async () => {
        await typeTrigger.click({ force: true });
      });

      const typeLabels: Record<string, RegExp> = {
        checking: /corrente|checking/i,
        savings: /poupança|savings/i,
        investment: /investimento|investment/i,
      };
      await this.page.getByRole('option', { name: typeLabels[data.type] }).click();
    }

    // Fill balance - use the currency input
    const balanceInput = dialog.locator('#balance');
    await expect(balanceInput).toBeVisible({ timeout: 15000 });
    await expect(balanceInput).toBeEditable({ timeout: 30000 });
    await expect(async () => {
      await expect(balanceInput).toBeVisible({ timeout: 2000 });
      await balanceInput.fill(data.balance, { timeout: 2000 });
      await expect(balanceInput).toHaveValue(/\d/, { timeout: 2000 });
    }).toPass({ timeout: 30000, intervals: [250, 500, 1000] });
    // Trigger validation/masks that run on blur
    await balanceInput.blur().catch(() => {});

    // Submit form
    const submitButton = dialog.locator('button[type="submit"]').first();
    await expect(submitButton).toBeEnabled({ timeout: 10000 });
    // Avoid hanging on implicit navigation waits for SPA submit handlers
    await submitButton.click({ noWaitAfter: true });

    // Wait for dialog to close (Supabase insert + invalidation can be slow under full-suite load).
    // Fail fast if the Manage page surfaces an error message instead.
    const pageError = this.page.locator('div.bg-destructive\\/10.text-destructive').first();

    // Use Playwright's built-in polling with expect.poll() for better retry semantics
    await expect(async () => {
      // Check for error first
      if (await pageError.isVisible().catch(() => false)) {
        const message = (await pageError.textContent().catch(() => null))?.trim() || 'Unknown error';
        await this.page
          .screenshot({ path: `playwright-results/debug-accounts-submit-error-${Date.now()}.png`, fullPage: true })
          .catch(() => {});
        throw new Error(`Account submit failed: ${message}`);
      }
      // Check if dialog is closed
      const isDialogVisible = await dialog.isVisible().catch(() => false);
      if (isDialogVisible) {
        throw new Error('Dialog still visible');
      }
    }).toPass({ timeout: 45000, intervals: [250, 500, 1000] });
  }

  /**
   * Edit an existing account by clicking its edit button
   * The account cards have a "More options" button that opens a dropdown with Edit option
   */
  async editAccount(name: string): Promise<void> {
    // Ensure the accounts tab is ready before attempting to interact.
    await this.waitForLoad();

    // Close any tour tooltip that might intercept clicks.
    const tourCloseButton = this.page.getByRole('button', { name: /fechar tour/i });
    if (await tourCloseButton.isVisible().catch(() => false)) {
      await tourCloseButton.click({ timeout: 2000 }).catch(() => {});
    }

    // Find the card containing the account name - look for the heading with account name
    const accountCard = this.page.locator('div.group.relative').filter({ 
      has: this.page.getByRole('heading', { name, level: 3 }) 
    }).first();
    
    // Wait for the card to be visible
    await expect(accountCard).toBeVisible({ timeout: 10000 });
    
    // Hover to reveal the actions button
    const actionsButton = accountCard.getByRole('button', { name: /mais opções|more/i });
    await accountCard.hover();
    await expect(actionsButton).toBeVisible({ timeout: 10000 });
    await actionsButton.click();

    // Click "Editar" in the dropdown
    const editButton = this.page.getByRole('button', { name: /editar/i });
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await editButton.click();

    // Wait for dialog to open (anchor by expected input)
    const dialog = this.page
      .getByRole('dialog')
      .filter({ has: this.page.locator('input#name') })
      .first();
    await expect(dialog).toBeVisible({ timeout: 10000 });
  }

  /**
   * Update account name
   */
  async updateAccountName(currentName: string, newName: string): Promise<void> {
    await this.editAccount(currentName);
    const dialog = this.page
      .getByRole('dialog')
      .filter({ has: this.page.locator('input#name') })
      .first();
    const nameInput = dialog.locator('input#name');
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await expect(nameInput).toBeEditable({ timeout: 10000 });

    await expect(async () => {
      await nameInput.fill('');
      await nameInput.fill(newName);
      await expect(nameInput).toHaveValue(newName);
    }).toPass({ timeout: 15000, intervals: [250, 500, 1000] });

    const submitButton = dialog.getByRole('button', { name: /salvar|save|atualizar/i });
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();

    await expect(async () => {
      const isVisible = await dialog.isVisible().catch(() => false);
      if (isVisible) {
        throw new Error('Dialog still visible');
      }
    }).toPass({ timeout: 15000, intervals: [250, 500, 1000] });
  }

  /**
   * Update account balance
   */
  async updateAccountBalance(name: string, newBalance: string): Promise<void> {
    await this.editAccount(name);
    const dialog = this.page.getByRole('dialog');
    const balanceInput = dialog.getByLabel(/saldo/i);
    await balanceInput.clear();
    await balanceInput.fill(newBalance);
    await dialog.getByRole('button', { name: /salvar|save|atualizar/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Delete an account by name (with confirmation dialog)
   * Opens edit dialog first, then clicks delete, then confirms
   */
  async deleteAccount(name: string): Promise<void> {
    // Find the card containing the account name - look for the heading with account name
    const accountCard = this.page.locator('div.group.relative').filter({ 
      has: this.page.getByRole('heading', { name, level: 3, exact: true }) 
    }).first();
    
    // Wait for the card to be visible
    await expect(accountCard).toBeVisible({ timeout: 10000 });
    
    // Hover to reveal the actions button
    await accountCard.hover();
    
    // Click the "More options" button (three dots) - Playwright auto-waits for actionability
    await accountCard.getByRole('button', { name: /mais opções|more/i }).click();
    
    // Click "Excluir" in the dropdown
    await this.page.getByRole('button', { name: /excluir/i }).click();
    
    // Wait for confirmation dialog and confirm
    const confirmDialog = this.page.getByRole('alertdialog').or(this.page.getByRole('dialog'));
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    await confirmDialog.getByRole('button', { name: /confirmar|confirm|sim|yes|excluir/i }).click();
    
    // Wait for dialog to close
    await expect(confirmDialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Wait for accounts to load (either accounts appear or empty state)
   * Uses Playwright's built-in retry mechanism for stability in parallel execution
   */
  async waitForLoad(): Promise<void> {
    // Make sure the Manage tabs shell is present (prevents false positives from hidden DOM).
    await this.ensureManageTabsVisible();

    // If the header add button is visible, the Accounts tab is active and the section is ready.
    if (await this.headerAddButton.isVisible().catch(() => false)) {
      return;
    }

    // Otherwise, ensure Accounts tab is active and the header button appears.
    await this.accountsTab
      .click({ timeout: 15000 })
      .catch(() => this.accountsTab.click({ force: true, timeout: 15000 }));
    await expect(this.headerAddButton).toBeVisible({ timeout: 15000 });
  }

  /**
   * Verify account appears in the list
   */
  async expectAccountVisible(name: string): Promise<void> {
    // Wait for the accounts section to be ready
    await this.waitForLoad();

    // Wait for the specific account card to appear (realtime + fetch can be slow under full-suite load)
    await expect(async () => {
      const accountCard = this.page.locator('div.group.relative').filter({
        has: this.page.getByRole('heading', { name, level: 3, exact: true }),
      }).first();
      await expect(accountCard).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 20000, intervals: [500, 1000, 2000, 3000] });
  }

  /**
   * Verify account does not appear in the list
   */
  async expectAccountNotVisible(name: string): Promise<void> {
    // Use toPass to handle realtime deletion delays
    await expect(async () => {
      const account = this.page.locator('div.group.relative').filter({ 
        has: this.page.getByRole('heading', { name, level: 3, exact: true }) 
      });
      await expect(account).not.toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 10000, intervals: [500, 1000, 2000] });
  }

  /**
   * Get count of accounts in list
   */
  async getAccountCount(): Promise<number> {
    const accounts = this.page.locator('div.group.relative').filter({
      has: this.page.getByRole('heading', { level: 3 })
    });
    return accounts.count();
  }

  /**
   * Get account names in DOM order (top to bottom).
   * Useful for verifying stable ordering after balance updates.
   */
  async getAccountNamesInOrder(): Promise<string[]> {
    await this.waitForLoad();
    
    // Get all account cards
    const accountCards = this.page.locator('div.group.relative').filter({
      has: this.page.getByRole('heading', { level: 3 })
    });
    
    const count = await accountCards.count();
    const names: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const card = accountCards.nth(i);
      const heading = card.getByRole('heading', { level: 3 });
      const name = await heading.textContent();
      if (name) {
        names.push(name.trim());
      }
    }
    
    return names;
  }

  /**
   * Get the freshness indicator value for an account card.
   * Returns 'fresh', 'warning', or 'stale' based on the data-freshness attribute.
   */
  async getAccountFreshness(name: string): Promise<string | null> {
    const accountCard = this.page.locator('div.group.relative').filter({
      has: this.page.getByRole('heading', { name, level: 3, exact: true }),
    }).first();
    
    await expect(accountCard).toBeVisible({ timeout: 10000 });
    
    const freshnessBar = accountCard.locator('[data-freshness]');
    return freshnessBar.getAttribute('data-freshness');
  }
}

