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
    await this.page.goto('/manage');
    await this.waitForReady();
  }

  /**
   * Wait for the manage page to be fully ready after navigation or reload.
   * Can be called after page.reload() to ensure the page is ready for interaction.
   * 
   * Note: Internal timeouts are kept under 30s to fit within 45s test timeout.
   */
  async waitForReady(): Promise<void> {
    // Use shorter timeout for networkidle - it may never reach idle in busy environments
    await Promise.race([this.page.waitForLoadState('networkidle'), this.page.waitForTimeout(3000)]);
    
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
    
    // First, wait for the page heading to be visible - this always renders regardless of loading state
    const pageHeading = this.page.getByRole('heading', { name: /gerenciar dados financeiros/i });
    try {
      await pageHeading.waitFor({ state: 'visible', timeout: 15000 });
    } catch (error) {
      // Take screenshot for debugging
      const timestamp = Date.now();
      await this.page.screenshot({ path: `debug-manage-heading-timeout-${timestamp}.png`, fullPage: true }).catch(() => {});
      const pageUrl = this.page.url();
      const pageContent = await this.page.textContent('body').catch(() => 'Unable to read');
      console.error(`❌ Manage page heading not found. URL: ${pageUrl}`);
      console.error(`   Page content: ${pageContent?.substring(0, 500)}`);
      throw error;
    }
    
    // Wait for the page to be ready - either:
    // 1. PageLoadingWrapper finishes loading (aria-busy="false")
    // 2. OR tabs are already visible (page loaded quickly)
    const loadingWrapper = this.page.locator('[role="status"][aria-live="polite"]').first();
    const tabsVisible = this.page.getByRole('tab').first();
    
    try {
      // Wait for either: loading wrapper to finish OR tabs to be visible
      // Use 20s timeout to fit within 45s test timeout (leaving room for assertions)
      await Promise.race([
        // Option 1: Wait for loading wrapper to finish
        this.page.waitForFunction(
          () => {
            const wrapper = document.querySelector('[role="status"][aria-live="polite"]');
            // Either wrapper doesn't exist (fast load) or it's done loading
            return !wrapper || wrapper.getAttribute('aria-busy') === 'false';
          },
          { timeout: 20000 }
        ),
        // Option 2: Tabs are already visible (fast load, no skeleton)
        tabsVisible.waitFor({ state: 'visible', timeout: 20000 }),
      ]);
      
      // Wait for the opacity transition to complete (PageLoadingWrapper uses 250ms transition)
      // Add extra buffer for slower environments
      await this.page.waitForTimeout(500);
    } catch (error) {
      // Take screenshot and log state for debugging
      await this.page.screenshot({ path: 'debug-manage-page-timeout.png', fullPage: true }).catch(() => {});
      const ariaBusy = await loadingWrapper.getAttribute('aria-busy').catch(() => 'N/A');
      const pageUrl = this.page.url();
      const pageContent = await this.page.textContent('body').catch(() => 'Unable to read');
      console.error(`Loading timeout. URL: ${pageUrl}, aria-busy: ${ariaBusy}`);
      console.error(`Page content: ${pageContent?.substring(0, 500)}`);
      throw error;
    }
    
    // Now wait for the tabs structure to be visible
    // Use multiple fallback selectors to be more resilient
    try {
      await Promise.race([
        // Primary: Wait for tabpanel (actual content)
        this.page.getByRole('tabpanel').first().waitFor({ state: 'visible', timeout: 10000 }),
        // Fallback 1: Wait for tablist (tabs bar)
        this.page.getByRole('tablist').first().waitFor({ state: 'visible', timeout: 10000 }),
        // Fallback 2: Wait for any tab trigger
        this.page.getByRole('tab').first().waitFor({ state: 'visible', timeout: 10000 }),
      ]);
    } catch (error) {
      // If none appeared, capture diagnostic info and throw
      const html = await this.page.content();
      console.error('Tabs structure did not appear after loading.');
      console.error('HTML snippet:', html.substring(0, 1000));
      console.error('Checking for specific elements:');
      console.error('  - Tabs wrapper exists:', await this.page.locator('[role="tablist"]').count());
      console.error('  - Tab triggers exist:', await this.page.locator('[role="tab"]').count());
      console.error('  - Tab panels exist:', await this.page.locator('[role="tabpanel"]').count());
      throw new Error('Manage page tabs did not render after loading completed');
    }
  }

  /**
   * Helper method to select a tab with retry logic.
   * Uses expect().toPass() for aggressive retry under heavy parallel load.
   * This prevents flakiness in CI environments where tab clicks may not register immediately.
   */
  private async selectTabWithRetry(tab: Locator): Promise<void> {
    await expect(async () => {
      // Ensure the tab is visible
      await expect(tab).toBeVisible({ timeout: 5000 });
      
      // Click the tab
      await tab.click();
      
      // Wait a moment for tab switch animation
      await this.page.waitForTimeout(200);
      
      // Verify the tab became selected
      await expect(tab).toHaveAttribute('data-state', 'active', { timeout: 3000 });
    }).toPass({ timeout: 25000, intervals: [500, 1000, 2000, 3000, 5000] });
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

