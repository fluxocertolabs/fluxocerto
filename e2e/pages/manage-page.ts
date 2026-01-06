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

export class ManagePage {
  readonly page: Page;
  readonly accountsTab: Locator;
  readonly creditCardsTab: Locator;
  readonly expensesTab: Locator;
  readonly projectsTab: Locator;
  readonly groupTab: Locator;

  private _accounts: AccountsSection | null = null;
  private _expenses: ExpensesSection | null = null;
  private _projects: ProjectsSection | null = null;
  private _creditCards: CreditCardsSection | null = null;
  private _group: GroupSection | null = null;

  constructor(page: Page) {
    this.page = page;
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
      await expect(pageHeading).toBeVisible({ timeout: 15000 });
    } catch (error) {
      // Take screenshot for debugging
      const timestamp = Date.now();
      await this.page.screenshot({ path: `debug-manage-heading-timeout-${timestamp}.png`, fullPage: true }).catch(() => {});
      const pageUrl = this.page.url();
      const title = await this.page.title().catch(() => 'Unable to read title');
      const pageContent = await this.page.textContent('body').catch(() => 'Unable to read');
      const pageHtml = await this.page.content().catch(() => 'Unable to read HTML');
      console.error(`❌ Manage page heading not found. URL: ${pageUrl}`);
      console.error(`   Title: ${title}`);
      console.error(`   Page content: ${pageContent?.substring(0, 500)}`);
      console.error(`   HTML snippet: ${pageHtml?.substring(0, 1000)}`);
      throw error;
    }
    
    // Wait for the loading wrapper to finish and show content.
    // The tabs are inside PageLoadingWrapper and only render when showSkeleton is false.
    //
    // CRITICAL: Do NOT use page.waitForTimeout(), setTimeout(), or toPass() with intervals here!
    // When tests seed data before navigation, any explicit wait/sleep causes the browser to hang
    // due to an interaction between Playwright's event loop and Supabase Realtime subscriptions.
    //
    // Instead, we use rapid polling with immediate retries. This allows React to complete
    // its rendering cycle without blocking the event loop.
    const firstTab = this.page.getByRole('tab').first();
    const maxAttempts = 200; // ~200 rapid checks should complete in <1s
    let tabsFound = false;
    
    for (let i = 0; i < maxAttempts; i++) {
      const count = await firstTab.count();
      if (count > 0) {
        tabsFound = true;
        break;
      }
    }
    
    if (!tabsFound) {
      // Take screenshot for debugging
      const timestamp = Date.now();
      await this.page.screenshot({ path: `debug-manage-tabs-timeout-${timestamp}.png`, fullPage: true }).catch(() => {});
      const pageUrl = this.page.url();
      const pageContent = await this.page.textContent('body').catch(() => 'Unable to read');
      console.error(`❌ Manage page tabs not found after heading was visible. URL: ${pageUrl}`);
      console.error(`   Page content: ${pageContent?.substring(0, 500)}`);
      throw new Error('Manage page tabs did not render after loading completed');
    }
  }

  /**
   * Helper method to select a tab with retry logic.
   * Uses rapid polling instead of toPass() with intervals to avoid browser hang issues
   * when tests seed data before navigation.
   */
  private async selectTabWithRetry(tab: Locator): Promise<void> {
    // Wait for tab to be visible using rapid polling (avoid expect().toBeVisible with timeout)
    const maxVisibilityAttempts = 200;
    let tabVisible = false;
    
    for (let i = 0; i < maxVisibilityAttempts; i++) {
      const visible = await tab.isVisible();
      if (visible) {
        tabVisible = true;
        break;
      }
    }
    
    if (!tabVisible) {
      throw new Error('Tab not visible after rapid polling');
    }
    
    // Check if tab is already active (no need to click)
    const currentState = await tab.getAttribute('data-state');
    if (currentState === 'active') {
      return; // Tab is already selected
    }
    
    // Click the tab and verify it became active using rapid polling
    const maxAttempts = 50;
    let success = false;
    
    for (let i = 0; i < maxAttempts; i++) {
      // Click the tab
      await tab.click();
      
      // Check if tab became active (rapid poll, no explicit wait)
      for (let j = 0; j < 20; j++) {
        const state = await tab.getAttribute('data-state');
        if (state === 'active') {
          success = true;
          break;
        }
      }
      
      if (success) break;
    }
    
    if (!success) {
      throw new Error('Tab did not become active after clicking');
    }
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

