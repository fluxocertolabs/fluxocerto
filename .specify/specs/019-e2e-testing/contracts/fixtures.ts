/**
 * E2E Testing Suite - Fixture Contracts
 * Branch: 019-e2e-testing
 * Date: 2025-11-28
 *
 * This file defines TypeScript interfaces for test fixtures used in E2E tests.
 * These contracts define the API for authentication, database management, and test utilities.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Page } from '@playwright/test';

// =============================================================================
// TEST DATA TYPES
// =============================================================================

/**
 * Test account data structure
 */
export interface TestAccount {
  id?: string;
  name: string;
  type: 'checking' | 'savings' | 'investment';
  balance: number; // in cents
  owner_id?: string | null;
}

/**
 * Test fixed expense data structure
 */
export interface TestExpense {
  id?: string;
  name: string;
  amount: number; // in cents
  due_day: number; // 1-31
  is_active: boolean;
}

/**
 * Test single-shot expense data structure
 */
export interface TestSingleShotExpense {
  id?: string;
  name: string;
  amount: number; // in cents
  date: string; // ISO date string YYYY-MM-DD
}

/**
 * Test project/income data structure
 */
export interface TestProject {
  id?: string;
  name: string;
  amount: number; // in cents
  payment_day: number; // 1-31
  frequency: 'weekly' | 'biweekly' | 'twice-monthly' | 'monthly';
  certainty: 'guaranteed' | 'probable' | 'uncertain';
  is_active: boolean;
}

/**
 * Test single-shot income data structure
 */
export interface TestSingleShotIncome {
  id?: string;
  name: string;
  amount: number; // in cents
  date: string; // ISO date string YYYY-MM-DD
  certainty: 'guaranteed' | 'probable' | 'uncertain';
}

/**
 * Test credit card data structure
 */
export interface TestCreditCard {
  id?: string;
  name: string;
  statement_balance: number; // in cents
  due_day: number; // 1-31
}

// =============================================================================
// AUTH FIXTURE
// =============================================================================

/**
 * Authentication helper fixture for managing test user sessions.
 * Handles magic link flow via Inbucket integration.
 */
export interface IAuthFixture {
  /** Pre-approved test email in allowed_emails table */
  readonly testEmail: string;

  /** Inbucket API base URL */
  readonly inbucketUrl: string;

  /** Path to saved storage state file */
  readonly storageStatePath: string;

  /**
   * Request a magic link for the given email address
   * @param email - Email to authenticate
   * @param page - Playwright page instance
   */
  requestMagicLink(email: string, page: Page): Promise<void>;

  /**
   * Poll Inbucket for magic link email and extract the URL
   * @param email - Email address to check
   * @param previousUrl - Previous URL to compare against (for polling)
   * @returns Magic link URL
   */
  getMagicLinkUrl(email: string, previousUrl?: string): Promise<string>;

  /**
   * Wait for a new magic link email (with retry mechanism)
   * @param email - Email address to check
   * @param previousUrl - Previous URL to detect new email
   * @param maxRetries - Maximum retry attempts (default: 10)
   * @param intervalMs - Polling interval in ms (default: 200)
   */
  waitForMagicLinkEmail(
    email: string,
    previousUrl?: string,
    maxRetries?: number,
    intervalMs?: number
  ): Promise<string>;

  /**
   * Complete full authentication flow:
   * 1. Request magic link
   * 2. Wait for email
   * 3. Click magic link
   * 4. Save session state
   * @param page - Playwright page instance
   */
  authenticate(page: Page): Promise<void>;

  /**
   * Clear authentication session
   * @param page - Playwright page instance
   */
  logout(page: Page): Promise<void>;

  /**
   * Load saved authentication state into page context
   * @param page - Playwright page instance
   */
  loadSession(page: Page): Promise<void>;
}

// =============================================================================
// DATABASE FIXTURE
// =============================================================================

/**
 * Database management fixture for test isolation and seeding.
 * Uses Supabase admin client with service role for direct database access.
 */
export interface IDatabaseFixture {
  /** Supabase admin client (service role) */
  readonly adminClient: SupabaseClient;

  /**
   * Delete all data from test tables in correct order (respecting foreign keys)
   * Tables cleared: single_shot_income, single_shot_expenses, credit_cards,
   *                 expenses, projects, accounts
   */
  resetDatabase(): Promise<void>;

  /**
   * Ensure test user email exists in allowed_emails table
   * @param email - Email to add/upsert
   */
  ensureTestUser(email: string): Promise<void>;

  /**
   * Remove test user from allowed_emails table
   * @param email - Email to remove
   */
  removeTestUser(email: string): Promise<void>;

  /**
   * Seed accounts with test data
   * @param accounts - Array of accounts to insert
   * @returns Inserted accounts with IDs
   */
  seedAccounts(accounts: TestAccount[]): Promise<TestAccount[]>;

  /**
   * Seed fixed expenses with test data
   * @param expenses - Array of expenses to insert
   * @returns Inserted expenses with IDs
   */
  seedExpenses(expenses: TestExpense[]): Promise<TestExpense[]>;

  /**
   * Seed single-shot expenses with test data
   * @param expenses - Array of single-shot expenses to insert
   * @returns Inserted expenses with IDs
   */
  seedSingleShotExpenses(
    expenses: TestSingleShotExpense[]
  ): Promise<TestSingleShotExpense[]>;

  /**
   * Seed projects/income with test data
   * @param projects - Array of projects to insert
   * @returns Inserted projects with IDs
   */
  seedProjects(projects: TestProject[]): Promise<TestProject[]>;

  /**
   * Seed single-shot income with test data
   * @param income - Array of single-shot income to insert
   * @returns Inserted income items with IDs
   */
  seedSingleShotIncome(
    income: TestSingleShotIncome[]
  ): Promise<TestSingleShotIncome[]>;

  /**
   * Seed credit cards with test data
   * @param cards - Array of credit cards to insert
   * @returns Inserted credit cards with IDs
   */
  seedCreditCards(cards: TestCreditCard[]): Promise<TestCreditCard[]>;

  /**
   * Seed complete test scenario with all entity types
   * @param data - Object containing arrays for each entity type
   */
  seedFullScenario(data: {
    accounts?: TestAccount[];
    expenses?: TestExpense[];
    singleShotExpenses?: TestSingleShotExpense[];
    projects?: TestProject[];
    singleShotIncome?: TestSingleShotIncome[];
    creditCards?: TestCreditCard[];
  }): Promise<void>;
}

// =============================================================================
// INBUCKET CLIENT
// =============================================================================

/**
 * Inbucket message header from list endpoint
 */
export interface InbucketMessageHeader {
  id: string;
  from: string;
  to: string[];
  subject: string;
  date: string;
  size: number;
}

/**
 * Inbucket message body content
 */
export interface InbucketMessageBody {
  text: string;
  html: string;
}

/**
 * Full Inbucket message from get endpoint
 */
export interface InbucketMessage {
  mailbox: string;
  id: string;
  from: string;
  to: string[];
  subject: string;
  date: string;
  size: number;
  body: InbucketMessageBody;
  header: Record<string, string[]>;
}

/**
 * Inbucket API client for email retrieval
 */
export interface IInbucketClient {
  readonly baseUrl: string;

  /**
   * List all messages in a mailbox
   * @param mailbox - Mailbox name (usually email local part)
   * @returns Array of message headers, sorted by date descending
   */
  listMessages(mailbox: string): Promise<InbucketMessageHeader[]>;

  /**
   * Get full message by ID
   * @param mailbox - Mailbox name
   * @param messageId - Message ID
   * @returns Full message with body
   */
  getMessage(mailbox: string, messageId: string): Promise<InbucketMessage>;

  /**
   * Delete a specific message
   * @param mailbox - Mailbox name
   * @param messageId - Message ID to delete
   */
  deleteMessage(mailbox: string, messageId: string): Promise<void>;

  /**
   * Purge all messages in a mailbox
   * @param mailbox - Mailbox name to purge
   */
  purgeMailbox(mailbox: string): Promise<void>;

  /**
   * Get latest message in mailbox
   * @param mailbox - Mailbox name
   * @returns Latest message or null if empty
   */
  getLatestMessage(mailbox: string): Promise<InbucketMessage | null>;

  /**
   * Extract magic link URL from email body
   * @param message - Inbucket message
   * @returns Extracted URL or null if not found
   */
  extractMagicLink(message: InbucketMessage): string | null;
}

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

/**
 * Factory functions for creating test data with defaults
 */
export interface ITestDataFactory {
  /**
   * Create test account with defaults
   * @param overrides - Fields to override
   */
  createAccount(overrides?: Partial<TestAccount>): TestAccount;

  /**
   * Create test fixed expense with defaults
   * @param overrides - Fields to override
   */
  createExpense(overrides?: Partial<TestExpense>): TestExpense;

  /**
   * Create test single-shot expense with defaults
   * @param overrides - Fields to override
   */
  createSingleShotExpense(
    overrides?: Partial<TestSingleShotExpense>
  ): TestSingleShotExpense;

  /**
   * Create test project with defaults
   * @param overrides - Fields to override
   */
  createProject(overrides?: Partial<TestProject>): TestProject;

  /**
   * Create test single-shot income with defaults
   * @param overrides - Fields to override
   */
  createSingleShotIncome(
    overrides?: Partial<TestSingleShotIncome>
  ): TestSingleShotIncome;

  /**
   * Create test credit card with defaults
   * @param overrides - Fields to override
   */
  createCreditCard(overrides?: Partial<TestCreditCard>): TestCreditCard;

  /**
   * Create basic seed data set (1 account, 2 expenses, 1 project)
   */
  createBasicSeedData(): {
    accounts: TestAccount[];
    expenses: TestExpense[];
    projects: TestProject[];
  };

  /**
   * Create full seed data set (all entity types, multiple items each)
   */
  createFullSeedData(): {
    accounts: TestAccount[];
    expenses: TestExpense[];
    singleShotExpenses: TestSingleShotExpense[];
    projects: TestProject[];
    singleShotIncome: TestSingleShotIncome[];
    creditCards: TestCreditCard[];
  };

  /**
   * Create large seed data set for performance testing (100+ items per type)
   * @param count - Number of items per entity type (default: 100)
   */
  createLargeSeedData(count?: number): {
    accounts: TestAccount[];
    expenses: TestExpense[];
    projects: TestProject[];
  };
}

// =============================================================================
// FORMATTING UTILITIES
// =============================================================================

/**
 * Utility functions for BRL currency formatting
 */
export interface IFormatUtils {
  /**
   * Format cents to BRL currency string
   * @param cents - Value in cents
   * @returns Formatted string (e.g., "R$ 1.000,00")
   */
  formatBRL(cents: number): string;

  /**
   * Parse BRL currency string to cents
   * @param value - Formatted string (e.g., "R$ 1.000,00" or "1.000,00")
   * @returns Value in cents
   */
  parseBRL(value: string): number;

  /**
   * Format date for display (pt-BR locale)
   * @param date - Date or ISO string
   * @returns Formatted date (e.g., "15/12/2025")
   */
  formatDate(date: Date | string): string;

  /**
   * Parse pt-BR date string to ISO
   * @param value - Date string (e.g., "15/12/2025")
   * @returns ISO date string (e.g., "2025-12-15")
   */
  parseDate(value: string): string;
}
