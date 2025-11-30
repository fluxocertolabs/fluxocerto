/**
 * Page Object for the Settings/Manage page with entity tabs
 * Implements IManagePage contract from specs/019-e2e-testing/contracts/page-objects.ts
 */

import type { Locator, Page } from '@playwright/test';
import { AccountsSection } from './accounts-section';
import { ExpensesSection } from './expenses-section';
import { ProjectsSection } from './projects-section';
import { CreditCardsSection } from './credit-cards-section';

export class ManagePage {
  readonly page: Page;
  readonly accountsTab: Locator;
  readonly creditCardsTab: Locator;
  readonly expensesTab: Locator;
  readonly projectsTab: Locator;

  private _accounts: AccountsSection | null = null;
  private _expenses: ExpensesSection | null = null;
  private _projects: ProjectsSection | null = null;
  private _creditCards: CreditCardsSection | null = null;

  constructor(page: Page) {
    this.page = page;
    this.accountsTab = page.getByRole('tab', { name: /contas|accounts/i });
    this.creditCardsTab = page.getByRole('tab', { name: /cartões|credit cards/i });
    this.expensesTab = page.getByRole('tab', { name: /despesas|expenses/i });
    this.projectsTab = page.getByRole('tab', { name: /projetos|receitas|projects|income/i });
  }

  /**
   * Navigate to manage page and wait for data to fully load
   */
  async goto(): Promise<void> {
    await this.page.goto('/manage');
    await this.page.waitForLoadState('networkidle');
    
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
    
    // First, wait for the PageLoadingWrapper to appear (role="status")
    const loadingWrapper = this.page.locator('[role="status"][aria-live="polite"]').first();
    try {
      await loadingWrapper.waitFor({ state: 'visible', timeout: 10000 });
    } catch (error) {
      // Log page state for debugging
      const pageContent = await this.page.textContent('body').catch(() => 'Unable to read page content');
      console.error('Failed to find PageLoadingWrapper. Page content:', pageContent);
      throw error;
    }
    
    // Wait for loading to complete by checking aria-busy attribute becomes "false"
    // The PageLoadingWrapper sets aria-busy=true during loading and false when done
    try {
      await this.page.waitForFunction(
        () => {
          // Check if loading completed successfully
          const wrapper = document.querySelector('[role="status"][aria-live="polite"]');
          return wrapper && wrapper.getAttribute('aria-busy') === 'false';
        },
        { timeout: 60000 }
      );
      
      // Wait for the opacity transition to complete (PageLoadingWrapper uses 250ms transition)
      // Add extra buffer for slower environments
      await this.page.waitForTimeout(500);
    } catch (error) {
      // Take screenshot and log state for debugging
      await this.page.screenshot({ path: 'debug-manage-page-timeout.png', fullPage: true }).catch(() => {});
      const ariaBusy = await loadingWrapper.getAttribute('aria-busy');
      const pageUrl = this.page.url();
      console.error(`Loading timeout. URL: ${pageUrl}, aria-busy: ${ariaBusy}`);
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
   * Switch to accounts tab
   */
  async selectAccountsTab(): Promise<void> {
    await this.accountsTab.click();
  }

  /**
   * Switch to credit cards tab
   */
  async selectCreditCardsTab(): Promise<void> {
    await this.creditCardsTab.click();
  }

  /**
   * Switch to expenses tab
   */
  async selectExpensesTab(): Promise<void> {
    await this.expensesTab.click();
  }

  /**
   * Switch to projects tab
   */
  async selectProjectsTab(): Promise<void> {
    await this.projectsTab.click();
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
}

