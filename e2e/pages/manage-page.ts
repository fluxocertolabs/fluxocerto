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
   * Navigate to manage page
   */
  async goto(): Promise<void> {
    await this.page.goto('/manage');
    await this.page.waitForLoadState('networkidle');
    
    // Wait for either:
    // 1. The skeleton to disappear (aria-busy="false" on the status container)
    // 2. The tab panel content to be visible
    // Using a more robust approach that doesn't rely on screen-reader text
    await Promise.race([
      // Wait for loading to complete (aria-busy becomes false or no status element)
      this.page.waitForFunction(() => {
        const statusElement = document.querySelector('[role="status"]');
        return !statusElement || statusElement.getAttribute('aria-busy') === 'false';
      }, { timeout: 20000 }),
      // Or wait for tab panel to be visible (indicates content loaded)
      this.page.getByRole('tabpanel').first().waitFor({ state: 'visible', timeout: 20000 }),
    ]);
    
    // Wait for any content items to appear (accounts, expenses, etc.)
    await Promise.race([
      this.page.locator('div.group.relative.overflow-hidden').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      this.page.locator('div.p-4.rounded-lg.border.bg-card').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      this.page.getByText(/nenhum|adicionar/i).first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
    ]);
    
    // Small delay to ensure animations complete
    await this.page.waitForTimeout(500);
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

