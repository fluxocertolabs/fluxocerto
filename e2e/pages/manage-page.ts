/**
 * Page Object for the Settings/Manage page with entity tabs
 * Implements IManagePage contract from specs/019-e2e-testing/contracts/page-objects.ts
 */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { AccountsSection } from './accounts-section';
import { ExpensesSection } from './expenses-section';
import { ProjectsSection } from './projects-section';
import { CreditCardsSection } from './credit-cards-section';
import { GroupSection } from './group-section';

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), ms);
  });

  const result = await Promise.race([promise, timeoutPromise]);
  if (timeoutId) clearTimeout(timeoutId);
  return result;
}

export class ManagePage {
  readonly page: Page;
  readonly accountsTab: Locator;
  readonly creditCardsTab: Locator;
  readonly expensesTab: Locator;
  readonly projectsTab: Locator;
  readonly groupTab: Locator;
  private readonly isPerTestContext: boolean;

  private _accounts: AccountsSection | null = null;
  private _expenses: ExpensesSection | null = null;
  private _projects: ProjectsSection | null = null;
  private _creditCards: CreditCardsSection | null = null;
  private _group: GroupSection | null = null;

  constructor(page: Page) {
    this.page = page;
    this.isPerTestContext = process.env.PW_PER_TEST_CONTEXT === '1';
    this.accountsTab = page.getByRole('tab', { name: /contas|accounts/i });
    this.creditCardsTab = page.getByRole('tab', { name: /cartões|credit cards/i });
    this.expensesTab = page.getByRole('tab', { name: /despesas|expenses/i });
    this.projectsTab = page.getByRole('tab', { name: /projetos|receitas|projects|income/i });
    this.groupTab = page.getByRole('tab', { name: /grupo|group/i });
  }

  /**
   * Navigate to manage page and wait for data to fully load
   */
  async goto(): Promise<void> {
    // Avoid waiting for full page load - SPA routes + long-lived connections (Realtime/WebSockets)
    // can make `waitUntil: 'load'` slower/flakier than needed for E2E readiness.
    const start = Date.now();
    await this.page.goto('/manage', { waitUntil: 'domcontentloaded' });
    const duration = Date.now() - start;
    if (duration > 5000) {
      console.warn(`[ManagePage] Slow navigation to /manage: ${duration}ms`);
    }
    await this.waitForReady();
  }

  /**
   * Wait for the manage page to be fully ready after navigation or reload.
   * Can be called after page.reload() to ensure the page is ready for interaction.
   * 
   * Note: Internal timeouts are kept under 30s to fit within 45s test timeout.
   * 
   * IMPORTANT: Do NOT wait for networkidle here. The app uses Supabase Realtime
   * which keeps WebSocket connections open, causing networkidle to either hang
   * or cause subsequent assertions to fail due to timing issues with React's
   * rendering cycle and the PageLoadingWrapper transitions.
   */
  async waitForReady(): Promise<void> {
    // Verify we're actually on the manage page (not redirected to login)
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/manage')) {
      // Get storage state to help diagnose auth issues
      const cookies = await this.page.context().cookies();
      const hasAuthCookie = cookies.some(c => c.name.includes('sb-') || c.name.includes('supabase'));
      
      // Check localStorage for auth tokens
      const localStorageAuth = await this.page.evaluate(() => {
        const keys = Object.keys(localStorage);
        const authKeys = keys.filter(k => k.includes('sb-') || k.includes('auth'));
        return {
          totalKeys: keys.length,
          authKeys: authKeys,
          hasAuthToken: authKeys.some(k => k.includes('auth-token'))
        };
      });
      
      console.error(`❌ Redirected to login! URL: ${currentUrl}`);
      console.error(`   Cookies: ${cookies.length} total, Supabase: ${hasAuthCookie}`);
      if (cookies.length > 0) {
        console.error(`   Cookie names: ${cookies.map(c => c.name).join(', ')}`);
      }
      console.error(`   localStorage: ${localStorageAuth.totalKeys} keys, auth keys: ${localStorageAuth.authKeys.join(', ')}`);
      console.error(`   Has auth token: ${localStorageAuth.hasAuthToken}`);
      
      throw new Error(`Expected to be on /manage page, but got: ${currentUrl}`);
    }
    
    // Wait for the page heading to be visible - this always renders regardless of loading state
    // Auth/session hydration can take a few seconds (useAuth has a 7s safety timeout).
    // Use a more forgiving timeout here to avoid flaking under parallel load.
    //
    // IMPORTANT: Use expect().toBeVisible() instead of waitFor() as the latter can cause
    // timing issues with React's rendering cycle.
    const pageHeading = this.page.getByRole('heading', { name: /gerenciar dados financeiros/i });
    try {
      // Option B (per-test contexts) is a cold-cache navigation; allow a bit more time.
      await expect(pageHeading).toBeVisible({ timeout: this.isPerTestContext ? 30000 : 15000 });
    } catch (error) {
      // Take screenshot for debugging
      const timestamp = Date.now();
      await withTimeout(
        this.page.screenshot({ path: `debug-manage-heading-timeout-${timestamp}.png`, fullPage: true }),
        2000,
        undefined
      ).catch(() => {});
      const pageUrl = this.page.url();
      // Avoid hanging diagnostics (these can stall if the page is in a bad state).
      const title = await withTimeout(this.page.title(), 1000, 'Unable to read title').catch(
        () => 'Unable to read title'
      );
      const pageContent = await withTimeout(
        this.page.textContent('body'),
        1000,
        'Unable to read'
      ).catch(() => 'Unable to read');
      const pageHtml = await withTimeout(this.page.content(), 1000, 'Unable to read HTML').catch(
        () => 'Unable to read HTML'
      );
      console.error(`❌ Manage page heading not found. URL: ${pageUrl}`);
      console.error(`   Title: ${title}`);
      console.error(`   Page content: ${pageContent?.substring(0, 500)}`);
      console.error(`   HTML snippet: ${pageHtml?.substring(0, 1000)}`);
      throw error;
    }
    
    // Wait for the loading wrapper to finish and show content.
    // The tabs are inside PageLoadingWrapper and only render when showSkeleton is false.
    //
    // Use expect().toBeVisible() with a reasonable timeout. This is more reliable than
    // rapid polling because Playwright's expect() uses auto-waiting with proper retries.
    const manageTabs = this.page.locator('[data-tour="manage-tabs"]');
    try {
      // Prefer the explicit Manage tabs root rather than the first role=tab,
      // since skeleton placeholders can render before tabs (and some overlays
      // may contain role=tab elements unrelated to Manage).
      //
      // In Option B (per-test contexts), the app is "cold" each test. Under parallel load,
      // PageLoadingWrapper can transiently flip into its ErrorState (role=alert) due to the
      // coordinated loading timeout. When that happens, the tabs never render until the
      // user clicks "Tentar Novamente".
      //
      // We handle this deterministically by auto-clicking retry a small number of times.
      const waitStart = Date.now();
      const errorAlertWithRetry = this.page.getByRole('alert').filter({
        has: this.page.getByRole('button', { name: /tentar novamente/i }),
      });
      const errorRetryButton = errorAlertWithRetry.getByRole('button', { name: /tentar novamente/i });
      let retryAttempts = 0;
      let reloadAttempts = 0;

      await expect(async () => {
        const tabsVisible = await withTimeout(manageTabs.isVisible(), 1000, false).catch(() => false);
        if (tabsVisible) return;

        const canRetry = await withTimeout(errorRetryButton.isVisible(), 1000, false).catch(() => false);
        if (canRetry && retryAttempts < 3) {
          retryAttempts += 1;
          console.warn(`[ManagePage] ErrorState detected on /manage; clicking retry (attempt ${retryAttempts})`);
          await errorRetryButton.click({ timeout: 5000 }).catch(() => {});
          // Give the app a moment to transition back to skeleton/content.
          await this.page.waitForTimeout(750);
        }

        // If we are "stuck" for a long time without ever rendering the tabs,
        // do a single soft reload. This is a pragmatic flake killer under heavy
        // parallel load (cold cache + Supabase/Realtime backpressure).
        const elapsed = Date.now() - waitStart;
        // In rare cases (under heavy parallel load), the Manage skeleton can get "stuck"
        // and tabs never render even though the heading is visible. A single soft reload
        // is a pragmatic flake killer in BOTH modes; in per-test-context mode we allow
        // a bit longer before reloading due to cold-cache asset fetching.
        const reloadThresholdMs = this.isPerTestContext ? 25000 : 12000;
        if (elapsed > reloadThresholdMs && reloadAttempts < 1) {
          reloadAttempts += 1;
          console.warn(`[ManagePage] Tabs still not visible after ${elapsed}ms; reloading /manage (attempt ${reloadAttempts})`);
          try {
            await this.page.reload({ waitUntil: 'domcontentloaded' });
          } catch {
            await this.page.goto('/manage', { waitUntil: 'domcontentloaded' });
          }
          await this.page.waitForTimeout(750);
        }

        throw new Error('Manage tabs not visible yet');
      }).toPass({
        timeout: this.isPerTestContext ? 60000 : 25000,
        intervals: [500, 1000, 2000],
      });
    } catch {
      // Take screenshot for debugging
      const timestamp = Date.now();
      await withTimeout(
        this.page.screenshot({ path: `debug-manage-tabs-timeout-${timestamp}.png`, fullPage: true }),
        2000,
        undefined
      ).catch(() => {});
      const pageUrl = this.page.url();
      const pageContent = await withTimeout(
        this.page.textContent('body'),
        1000,
        'Unable to read'
      ).catch(() => 'Unable to read');
      console.error(`❌ Manage page tabs not found after heading was visible. URL: ${pageUrl}`);
      console.error(`   Page content: ${pageContent?.substring(0, 500)}`);
      throw new Error('Manage page tabs did not render after loading completed');
    }
  }

  /**
   * Helper method to select a tab with retry logic.
   * Uses Playwright's built-in auto-waiting for reliable tab selection.
   */
  private async selectTabWithRetry(tab: Locator): Promise<void> {
    // Ensure the Manage page is fully ready at the moment we interact with tabs.
    // Avoid re-running the full readiness checks if the tabs are already present.
    const manageTabs = this.page.locator('[data-tour="manage-tabs"]');
    if (!(await manageTabs.isVisible().catch(() => false))) {
      await this.waitForReady();
    }

    // Wait for tab to be visible
    await expect(tab).toBeVisible({ timeout: 15000 });
    
    // Check if tab is already active (no need to click)
    const currentState = await tab.getAttribute('data-state');
    if (currentState === 'active') {
      return; // Tab is already selected
    }
    
    // Click the tab
    await tab.click();
    
    // Wait for tab to become active
    await expect(tab).toHaveAttribute('data-state', 'active', { timeout: 5000 });
  }

  /**
   * Switch to accounts tab
   */
  async selectAccountsTab(): Promise<void> {
    await this.selectTabWithRetry(this.accountsTab);
  }

  /**
   * Switch to credit cards tab
   */
  async selectCreditCardsTab(): Promise<void> {
    await this.selectTabWithRetry(this.creditCardsTab);
  }

  /**
   * Switch to expenses tab
   */
  async selectExpensesTab(): Promise<void> {
    await this.selectTabWithRetry(this.expensesTab);
  }

  /**
   * Switch to projects tab
   */
  async selectProjectsTab(): Promise<void> {
    await this.selectTabWithRetry(this.projectsTab);
  }

  /**
   * Switch to group tab
   */
  async selectGroupTab(): Promise<void> {
    await this.selectTabWithRetry(this.groupTab);
  }

  /**
   * Get accounts section page object
   */
  accounts(): AccountsSection {
    if (!this._accounts) {
      this._accounts = new AccountsSection(this.page);
    }
    return this._accounts;
  }

  /**
   * Get expenses section page object
   */
  expenses(): ExpensesSection {
    if (!this._expenses) {
      this._expenses = new ExpensesSection(this.page);
    }
    return this._expenses;
  }

  /**
   * Get projects section page object
   */
  projects(): ProjectsSection {
    if (!this._projects) {
      this._projects = new ProjectsSection(this.page);
    }
    return this._projects;
  }

  /**
   * Get credit cards section page object
   */
  creditCards(): CreditCardsSection {
    if (!this._creditCards) {
      this._creditCards = new CreditCardsSection(this.page);
    }
    return this._creditCards;
  }

  /**
   * Get group section page object
   */
  group(): GroupSection {
    if (!this._group) {
      this._group = new GroupSection(this.page);
    }
    return this._group;
  }
}

