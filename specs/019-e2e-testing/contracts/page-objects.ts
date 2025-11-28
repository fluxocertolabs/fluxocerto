/**
 * E2E Testing Suite - Page Object Contracts
 * Branch: 019-e2e-testing
 * Date: 2025-11-28
 *
 * This file defines TypeScript interfaces for all Page Objects used in E2E tests.
 * Implementations must conform to these contracts.
 */

import type { Locator, Page } from '@playwright/test';

// =============================================================================
// LOGIN PAGE
// =============================================================================

/**
 * Page Object for the login/authentication flow.
 * Handles magic link request and authentication verification.
 */
export interface ILoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  /**
   * Navigate to login page
   */
  goto(): Promise<void>;

  /**
   * Enter email and submit magic link request
   * @param email - Email address to authenticate
   */
  requestMagicLink(email: string): Promise<void>;

  /**
   * Verify success message is displayed after magic link request
   */
  expectMagicLinkSent(): Promise<void>;

  /**
   * Verify user is on the login page (useful for redirect assertions)
   */
  expectToBeOnLoginPage(): Promise<void>;
}

// =============================================================================
// DASHBOARD PAGE
// =============================================================================

/**
 * Page Object for the main dashboard/cashflow view.
 * Handles chart interactions, projection selection, and quick update access.
 */
export interface IDashboardPage {
  readonly page: Page;
  readonly cashflowChart: Locator;
  readonly summaryPanel: Locator;
  readonly projectionSelector: Locator;
  readonly healthIndicator: Locator;
  readonly quickUpdateButton: Locator;
  readonly emptyState: Locator;

  /**
   * Navigate to dashboard
   */
  goto(): Promise<void>;

  /**
   * Check if dashboard displays empty state (no financial data)
   */
  hasEmptyState(): Promise<boolean>;

  /**
   * Change projection period
   * @param days - Number of days for projection (30, 60, or 90)
   */
  selectProjectionDays(days: 30 | 60 | 90): Promise<void>;

  /**
   * Open Quick Update modal
   */
  openQuickUpdate(): Promise<void>;

  /**
   * Verify cashflow chart is rendered with data points
   */
  expectChartRendered(): Promise<void>;

  /**
   * Get the displayed income total from summary panel
   * @returns Formatted income string (e.g., "R$ 8.000,00")
   */
  getIncomeTotal(): Promise<string>;

  /**
   * Get the displayed expense total from summary panel
   * @returns Formatted expense string (e.g., "R$ 2.000,00")
   */
  getExpenseTotal(): Promise<string>;

  /**
   * Check if stale data warning indicator is visible
   */
  hasStaleWarning(): Promise<boolean>;
}

// =============================================================================
// MANAGE PAGE
// =============================================================================

/**
 * Page Object for the Settings/Manage page with entity tabs.
 * Provides access to sub-sections for accounts, expenses, projects, and credit cards.
 */
export interface IManagePage {
  readonly page: Page;
  readonly accountsTab: Locator;
  readonly creditCardsTab: Locator;
  readonly expensesTab: Locator;
  readonly projectsTab: Locator;

  /**
   * Navigate to manage page
   */
  goto(): Promise<void>;

  /**
   * Switch to accounts tab
   */
  selectAccountsTab(): Promise<void>;

  /**
   * Switch to credit cards tab
   */
  selectCreditCardsTab(): Promise<void>;

  /**
   * Switch to expenses tab
   */
  selectExpensesTab(): Promise<void>;

  /**
   * Switch to projects tab
   */
  selectProjectsTab(): Promise<void>;

  /**
   * Get accounts section page object
   */
  accounts(): IAccountsSection;

  /**
   * Get expenses section page object
   */
  expenses(): IExpensesSection;

  /**
   * Get projects section page object
   */
  projects(): IProjectsSection;

  /**
   * Get credit cards section page object
   */
  creditCards(): ICreditCardsSection;
}

// =============================================================================
// ACCOUNTS SECTION
// =============================================================================

/**
 * Section object for account management within ManagePage.
 */
export interface IAccountsSection {
  readonly page: Page;
  readonly addButton: Locator;
  readonly accountList: Locator;

  /**
   * Click add new account button to open form
   */
  clickAdd(): Promise<void>;

  /**
   * Fill account form and submit
   * @param data - Account data to create
   */
  createAccount(data: {
    name: string;
    type: 'checking' | 'savings' | 'investment';
    balance: string;
  }): Promise<void>;

  /**
   * Edit an existing account by clicking its edit button
   * @param name - Account name to edit
   */
  editAccount(name: string): Promise<void>;

  /**
   * Update account name
   * @param currentName - Current account name
   * @param newName - New account name
   */
  updateAccountName(currentName: string, newName: string): Promise<void>;

  /**
   * Update account balance
   * @param name - Account name
   * @param newBalance - New balance value
   */
  updateAccountBalance(name: string, newBalance: string): Promise<void>;

  /**
   * Delete an account by name (with confirmation dialog)
   * @param name - Account name to delete
   */
  deleteAccount(name: string): Promise<void>;

  /**
   * Verify account appears in the list
   * @param name - Account name to check
   */
  expectAccountVisible(name: string): Promise<void>;

  /**
   * Verify account does not appear in the list
   * @param name - Account name to check
   */
  expectAccountNotVisible(name: string): Promise<void>;

  /**
   * Get count of accounts in list
   */
  getAccountCount(): Promise<number>;
}

// =============================================================================
// EXPENSES SECTION
// =============================================================================

/**
 * Section object for expense management (fixed and single-shot).
 */
export interface IExpensesSection {
  readonly page: Page;
  readonly fixedExpensesTab: Locator;
  readonly singleShotTab: Locator;
  readonly addButton: Locator;
  readonly expenseList: Locator;

  /**
   * Switch to fixed expenses sub-tab
   */
  selectFixedExpenses(): Promise<void>;

  /**
   * Switch to single-shot expenses sub-tab
   */
  selectSingleShot(): Promise<void>;

  /**
   * Create a fixed recurring expense
   * @param data - Expense data
   */
  createFixedExpense(data: {
    name: string;
    amount: string;
    dueDay: string;
  }): Promise<void>;

  /**
   * Create a one-time expense
   * @param data - Single-shot expense data
   */
  createSingleShotExpense(data: {
    name: string;
    amount: string;
    date: string;
  }): Promise<void>;

  /**
   * Toggle expense active/inactive status
   * @param name - Expense name
   */
  toggleExpense(name: string): Promise<void>;

  /**
   * Edit expense amount
   * @param name - Expense name
   * @param newAmount - New amount value
   */
  updateExpenseAmount(name: string, newAmount: string): Promise<void>;

  /**
   * Delete expense with confirmation dialog
   * @param name - Expense name to delete
   */
  deleteExpense(name: string): Promise<void>;

  /**
   * Verify expense is visible in list
   * @param name - Expense name to check
   */
  expectExpenseVisible(name: string): Promise<void>;

  /**
   * Verify expense is not visible in list
   * @param name - Expense name to check
   */
  expectExpenseNotVisible(name: string): Promise<void>;

  /**
   * Verify expense shows as inactive
   * @param name - Expense name to check
   */
  expectExpenseInactive(name: string): Promise<void>;
}

// =============================================================================
// PROJECTS SECTION
// =============================================================================

/**
 * Section object for project/income management (recurring and single-shot).
 */
export interface IProjectsSection {
  readonly page: Page;
  readonly recurringTab: Locator;
  readonly singleShotTab: Locator;
  readonly addButton: Locator;
  readonly projectList: Locator;

  /**
   * Switch to recurring projects sub-tab
   */
  selectRecurring(): Promise<void>;

  /**
   * Switch to single-shot income sub-tab
   */
  selectSingleShot(): Promise<void>;

  /**
   * Create a recurring project/income
   * @param data - Project data
   */
  createRecurringProject(data: {
    name: string;
    amount: string;
    paymentDay: string;
    frequency: 'weekly' | 'biweekly' | 'twice-monthly' | 'monthly';
    certainty: 'guaranteed' | 'probable' | 'uncertain';
  }): Promise<void>;

  /**
   * Create a one-time income entry
   * @param data - Single-shot income data
   */
  createSingleShotIncome(data: {
    name: string;
    amount: string;
    date: string;
    certainty: 'guaranteed' | 'probable' | 'uncertain';
  }): Promise<void>;

  /**
   * Toggle project active/inactive status
   * @param name - Project name
   */
  toggleProject(name: string): Promise<void>;

  /**
   * Change project frequency
   * @param name - Project name
   * @param frequency - New frequency value
   */
  updateProjectFrequency(
    name: string,
    frequency: 'weekly' | 'biweekly' | 'twice-monthly' | 'monthly'
  ): Promise<void>;

  /**
   * Change project certainty
   * @param name - Project name
   * @param certainty - New certainty value
   */
  updateProjectCertainty(
    name: string,
    certainty: 'guaranteed' | 'probable' | 'uncertain'
  ): Promise<void>;

  /**
   * Delete project with confirmation dialog
   * @param name - Project name to delete
   */
  deleteProject(name: string): Promise<void>;

  /**
   * Verify project is visible in list
   * @param name - Project name to check
   */
  expectProjectVisible(name: string): Promise<void>;

  /**
   * Verify project is not visible in list
   * @param name - Project name to check
   */
  expectProjectNotVisible(name: string): Promise<void>;

  /**
   * Verify project shows as inactive
   * @param name - Project name to check
   */
  expectProjectInactive(name: string): Promise<void>;

  /**
   * Verify certainty badge displays correct value
   * @param name - Project name
   * @param certainty - Expected certainty value
   */
  expectCertaintyBadge(
    name: string,
    certainty: 'guaranteed' | 'probable' | 'uncertain'
  ): Promise<void>;
}

// =============================================================================
// CREDIT CARDS SECTION
// =============================================================================

/**
 * Section object for credit card management.
 */
export interface ICreditCardsSection {
  readonly page: Page;
  readonly addButton: Locator;
  readonly cardList: Locator;

  /**
   * Click add new credit card button
   */
  clickAdd(): Promise<void>;

  /**
   * Create a new credit card entry
   * @param data - Credit card data
   */
  createCreditCard(data: {
    name: string;
    balance: string;
    dueDay: string;
  }): Promise<void>;

  /**
   * Edit credit card due day
   * @param name - Card name
   * @param newDueDay - New due day value
   */
  updateDueDay(name: string, newDueDay: string): Promise<void>;

  /**
   * Update credit card statement balance
   * @param name - Card name
   * @param newBalance - New balance value
   */
  updateBalance(name: string, newBalance: string): Promise<void>;

  /**
   * Delete credit card with confirmation dialog
   * @param name - Card name to delete
   */
  deleteCreditCard(name: string): Promise<void>;

  /**
   * Verify credit card is visible in list
   * @param name - Card name to check
   */
  expectCardVisible(name: string): Promise<void>;

  /**
   * Verify credit card is not visible in list
   * @param name - Card name to check
   */
  expectCardNotVisible(name: string): Promise<void>;
}

// =============================================================================
// QUICK UPDATE PAGE (MODAL)
// =============================================================================

/**
 * Page Object for the Quick Update modal.
 * Handles batch balance updates for accounts and credit cards.
 */
export interface IQuickUpdatePage {
  readonly page: Page;
  readonly modal: Locator;
  readonly accountsList: Locator;
  readonly creditCardsList: Locator;
  readonly completeButton: Locator;
  readonly cancelButton: Locator;

  /**
   * Wait for Quick Update modal to be visible
   */
  waitForModal(): Promise<void>;

  /**
   * Update balance for an account inline
   * @param name - Account name
   * @param newBalance - New balance value
   */
  updateAccountBalance(name: string, newBalance: string): Promise<void>;

  /**
   * Update balance for a credit card inline
   * @param name - Card name
   * @param newBalance - New balance value
   */
  updateCreditCardBalance(name: string, newBalance: string): Promise<void>;

  /**
   * Click complete/save button to save all changes
   */
  complete(): Promise<void>;

  /**
   * Click cancel button to discard changes
   */
  cancel(): Promise<void>;

  /**
   * Verify modal is closed
   */
  expectModalClosed(): Promise<void>;

  /**
   * Verify all listed accounts are present
   * @param accountNames - Array of expected account names
   */
  expectAccountsListed(accountNames: string[]): Promise<void>;

  /**
   * Verify all listed credit cards are present
   * @param cardNames - Array of expected card names
   */
  expectCardsListed(cardNames: string[]): Promise<void>;
}
