# Data Model: E2E Testing Suite

**Branch**: `019-e2e-testing` | **Date**: 2025-11-28

## Overview

This document defines the data structures for E2E test fixtures, test data factories, and page objects used in the Playwright testing suite.

---

## Test Fixtures & Helpers

### AuthFixture

Authentication helper for managing test user sessions.

```typescript
interface AuthFixture {
  /** Pre-approved test email in allowed_emails table */
  testEmail: string;
  
  /** Inbucket API base URL */
  inbucketUrl: string;
  
  /** Path to saved storage state */
  storageStatePath: string;
  
  /** Request magic link for given email */
  requestMagicLink(email: string): Promise<void>;
  
  /** Poll Inbucket for magic link email and return URL */
  getMagicLinkUrl(email: string): Promise<string>;
  
  /** Complete auth flow and save session */
  authenticate(): Promise<void>;
  
  /** Clear auth session */
  logout(): Promise<void>;
}
```

### DatabaseFixture

Database management for test isolation.

```typescript
interface DatabaseFixture {
  /** Supabase admin client (service role) */
  adminClient: SupabaseClient;
  
  /** Delete all data from test tables */
  resetDatabase(): Promise<void>;
  
  /** Ensure test user email is in allowed_emails */
  ensureTestUser(email: string): Promise<void>;
  
  /** Seed accounts with test data */
  seedAccounts(accounts: TestAccount[]): Promise<void>;
  
  /** Seed expenses with test data */
  seedExpenses(expenses: TestExpense[]): Promise<void>;
  
  /** Seed projects with test data */
  seedProjects(projects: TestProject[]): Promise<void>;
  
  /** Seed credit cards with test data */
  seedCreditCards(cards: TestCreditCard[]): Promise<void>;
  
  /** Seed single-shot expenses */
  seedSingleShotExpenses(expenses: TestSingleShotExpense[]): Promise<void>;
  
  /** Seed single-shot income */
  seedSingleShotIncome(income: TestSingleShotIncome[]): Promise<void>;
}
```

---

## Test Data Factories

### TestAccount

Factory for creating account test data.

```typescript
interface TestAccount {
  id?: string;
  name: string;
  type: 'checking' | 'savings' | 'investment';
  balance: number; // in cents
  owner_id?: string | null;
}

const defaultAccount: TestAccount = {
  name: 'Nubank',
  type: 'checking',
  balance: 100000, // R$ 1.000,00
  owner_id: null,
};
```

**Factory Function**:
```typescript
function createTestAccount(overrides?: Partial<TestAccount>): TestAccount;
```

### TestExpense (Fixed)

Factory for creating fixed expense test data.

```typescript
interface TestExpense {
  id?: string;
  name: string;
  amount: number; // in cents
  due_day: number; // 1-31
  is_active: boolean;
}

const defaultExpense: TestExpense = {
  name: 'Aluguel',
  amount: 200000, // R$ 2.000,00
  due_day: 10,
  is_active: true,
};
```

**Factory Function**:
```typescript
function createTestExpense(overrides?: Partial<TestExpense>): TestExpense;
```

### TestSingleShotExpense

Factory for creating one-time expense test data.

```typescript
interface TestSingleShotExpense {
  id?: string;
  name: string;
  amount: number; // in cents
  date: string; // ISO date string YYYY-MM-DD
}

const defaultSingleShotExpense: TestSingleShotExpense = {
  name: 'Compra de Móveis',
  amount: 500000, // R$ 5.000,00
  date: '2025-12-15',
};
```

**Factory Function**:
```typescript
function createTestSingleShotExpense(overrides?: Partial<TestSingleShotExpense>): TestSingleShotExpense;
```

### TestProject (Recurring Income)

Factory for creating project/income test data.

```typescript
interface TestProject {
  id?: string;
  name: string;
  amount: number; // in cents
  payment_day: number; // 1-31
  frequency: 'weekly' | 'biweekly' | 'twice-monthly' | 'monthly';
  certainty: 'guaranteed' | 'probable' | 'uncertain';
  is_active: boolean;
}

const defaultProject: TestProject = {
  name: 'Salário',
  amount: 800000, // R$ 8.000,00
  payment_day: 5,
  frequency: 'monthly',
  certainty: 'guaranteed',
  is_active: true,
};
```

**Factory Function**:
```typescript
function createTestProject(overrides?: Partial<TestProject>): TestProject;
```

### TestSingleShotIncome

Factory for creating one-time income test data.

```typescript
interface TestSingleShotIncome {
  id?: string;
  name: string;
  amount: number; // in cents
  date: string; // ISO date string YYYY-MM-DD
  certainty: 'guaranteed' | 'probable' | 'uncertain';
}

const defaultSingleShotIncome: TestSingleShotIncome = {
  name: 'Bônus Anual',
  amount: 1000000, // R$ 10.000,00
  date: '2025-12-20',
  certainty: 'guaranteed',
};
```

**Factory Function**:
```typescript
function createTestSingleShotIncome(overrides?: Partial<TestSingleShotIncome>): TestSingleShotIncome;
```

### TestCreditCard

Factory for creating credit card test data.

```typescript
interface TestCreditCard {
  id?: string;
  name: string;
  statement_balance: number; // in cents
  due_day: number; // 1-31
}

const defaultCreditCard: TestCreditCard = {
  name: 'Nubank Platinum',
  statement_balance: 300000, // R$ 3.000,00
  due_day: 15,
};
```

**Factory Function**:
```typescript
function createTestCreditCard(overrides?: Partial<TestCreditCard>): TestCreditCard;
```

---

## Page Objects

### LoginPage

Page Object for the login/authentication flow.

```typescript
interface LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  
  /** Navigate to login page */
  goto(): Promise<void>;
  
  /** Enter email and submit magic link request */
  requestMagicLink(email: string): Promise<void>;
  
  /** Verify success message is displayed */
  expectMagicLinkSent(): Promise<void>;
  
  /** Verify login page is displayed (for redirect assertions) */
  expectToBeOnLoginPage(): Promise<void>;
}
```

**Locator Selectors**:
| Element | Selector Strategy |
|---------|-------------------|
| emailInput | `getByRole('textbox', { name: /email/i })` |
| submitButton | `getByRole('button', { name: /enviar|entrar/i })` |
| successMessage | `getByText(/link enviado|verifique seu email/i)` |

### DashboardPage

Page Object for the main dashboard view.

```typescript
interface DashboardPage {
  readonly page: Page;
  readonly cashflowChart: Locator;
  readonly summaryPanel: Locator;
  readonly projectionSelector: Locator;
  readonly healthIndicator: Locator;
  readonly quickUpdateButton: Locator;
  readonly emptyState: Locator;
  
  /** Navigate to dashboard */
  goto(): Promise<void>;
  
  /** Check if dashboard displays empty state */
  hasEmptyState(): Promise<boolean>;
  
  /** Change projection period (30, 60, 90 days) */
  selectProjectionDays(days: 30 | 60 | 90): Promise<void>;
  
  /** Open Quick Update modal */
  openQuickUpdate(): Promise<void>;
  
  /** Verify chart is rendered with data */
  expectChartRendered(): Promise<void>;
  
  /** Get displayed income total */
  getIncomeTotal(): Promise<string>;
  
  /** Get displayed expense total */
  getExpenseTotal(): Promise<string>;
  
  /** Check if stale data warning is visible */
  hasStaleWarning(): Promise<boolean>;
}
```

**Locator Selectors**:
| Element | Selector Strategy |
|---------|-------------------|
| cashflowChart | `getByTestId('cashflow-chart')` or `locator('.recharts-wrapper')` |
| summaryPanel | `getByTestId('summary-panel')` |
| projectionSelector | `getByRole('combobox', { name: /período/i })` |
| quickUpdateButton | `getByRole('button', { name: /atualizar saldos/i })` |
| emptyState | `getByText(/adicione.*contas/i)` |

### ManagePage

Page Object for the Settings/Manage page with tabs.

```typescript
interface ManagePage {
  readonly page: Page;
  readonly accountsTab: Locator;
  readonly creditCardsTab: Locator;
  readonly expensesTab: Locator;
  readonly projectsTab: Locator;
  
  /** Navigate to manage page */
  goto(): Promise<void>;
  
  /** Switch to accounts tab */
  selectAccountsTab(): Promise<void>;
  
  /** Switch to credit cards tab */
  selectCreditCardsTab(): Promise<void>;
  
  /** Switch to expenses tab */
  selectExpensesTab(): Promise<void>;
  
  /** Switch to projects tab */
  selectProjectsTab(): Promise<void>;
  
  /** Get sub-page object for accounts management */
  accounts(): AccountsSection;
  
  /** Get sub-page object for expenses management */
  expenses(): ExpensesSection;
  
  /** Get sub-page object for projects management */
  projects(): ProjectsSection;
  
  /** Get sub-page object for credit cards management */
  creditCards(): CreditCardsSection;
}
```

### AccountsSection

Section object for account management within ManagePage.

```typescript
interface AccountsSection {
  readonly page: Page;
  readonly addButton: Locator;
  readonly accountList: Locator;
  
  /** Click add new account button */
  clickAdd(): Promise<void>;
  
  /** Fill account form and submit */
  createAccount(data: { name: string; type: string; balance: string }): Promise<void>;
  
  /** Edit an existing account by name */
  editAccount(name: string): Promise<void>;
  
  /** Delete an account by name (with confirmation) */
  deleteAccount(name: string): Promise<void>;
  
  /** Verify account appears in list */
  expectAccountVisible(name: string): Promise<void>;
  
  /** Verify account does not appear in list */
  expectAccountNotVisible(name: string): Promise<void>;
  
  /** Get count of accounts in list */
  getAccountCount(): Promise<number>;
}
```

### ExpensesSection

Section object for expense management.

```typescript
interface ExpensesSection {
  readonly page: Page;
  readonly fixedExpensesTab: Locator;
  readonly singleShotTab: Locator;
  readonly addButton: Locator;
  
  /** Switch to fixed expenses tab */
  selectFixedExpenses(): Promise<void>;
  
  /** Switch to single-shot expenses tab */
  selectSingleShot(): Promise<void>;
  
  /** Create a fixed expense */
  createFixedExpense(data: { name: string; amount: string; dueDay: string }): Promise<void>;
  
  /** Create a single-shot expense */
  createSingleShotExpense(data: { name: string; amount: string; date: string }): Promise<void>;
  
  /** Toggle expense active/inactive */
  toggleExpense(name: string): Promise<void>;
  
  /** Delete expense with confirmation */
  deleteExpense(name: string): Promise<void>;
  
  /** Verify expense visibility */
  expectExpenseVisible(name: string): Promise<void>;
}
```

### ProjectsSection

Section object for project/income management.

```typescript
interface ProjectsSection {
  readonly page: Page;
  readonly recurringTab: Locator;
  readonly singleShotTab: Locator;
  readonly addButton: Locator;
  
  /** Switch to recurring projects tab */
  selectRecurring(): Promise<void>;
  
  /** Switch to single-shot income tab */
  selectSingleShot(): Promise<void>;
  
  /** Create a recurring project */
  createRecurringProject(data: {
    name: string;
    amount: string;
    paymentDay: string;
    frequency: string;
    certainty: string;
  }): Promise<void>;
  
  /** Create a single-shot income */
  createSingleShotIncome(data: {
    name: string;
    amount: string;
    date: string;
    certainty: string;
  }): Promise<void>;
  
  /** Toggle project active/inactive */
  toggleProject(name: string): Promise<void>;
  
  /** Delete project with confirmation */
  deleteProject(name: string): Promise<void>;
  
  /** Verify project visibility */
  expectProjectVisible(name: string): Promise<void>;
}
```

### QuickUpdatePage

Page Object for the Quick Update modal.

```typescript
interface QuickUpdatePage {
  readonly page: Page;
  readonly modal: Locator;
  readonly accountsList: Locator;
  readonly creditCardsList: Locator;
  readonly completeButton: Locator;
  readonly cancelButton: Locator;
  
  /** Wait for modal to be visible */
  waitForModal(): Promise<void>;
  
  /** Update balance for an account */
  updateAccountBalance(name: string, newBalance: string): Promise<void>;
  
  /** Update balance for a credit card */
  updateCreditCardBalance(name: string, newBalance: string): Promise<void>;
  
  /** Click complete/save button */
  complete(): Promise<void>;
  
  /** Click cancel button */
  cancel(): Promise<void>;
  
  /** Verify modal is closed */
  expectModalClosed(): Promise<void>;
}
```

---

## Inbucket Email Types

### InbucketMessage

Structure returned from Inbucket API.

```typescript
interface InbucketMessageHeader {
  id: string;
  from: string;
  to: string[];
  subject: string;
  date: string;
  size: number;
}

interface InbucketMessageBody {
  text: string;
  html: string;
}

interface InbucketMessage {
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
```

---

## Test Scenarios Data

### Seed Data Sets

Pre-configured data sets for specific test scenarios.

```typescript
interface TestSeedData {
  /** Empty state - no data */
  empty: {};
  
  /** Basic setup - one account, one expense, one project */
  basic: {
    accounts: TestAccount[];
    expenses: TestExpense[];
    projects: TestProject[];
  };
  
  /** Full setup - all entity types with multiple items */
  full: {
    accounts: TestAccount[];
    expenses: TestExpense[];
    singleShotExpenses: TestSingleShotExpense[];
    projects: TestProject[];
    singleShotIncome: TestSingleShotIncome[];
    creditCards: TestCreditCard[];
  };
  
  /** Large dataset for performance testing (EC-004) */
  large: {
    accounts: TestAccount[]; // 100+
    expenses: TestExpense[]; // 100+
    projects: TestProject[]; // 100+
  };
}
```

**Basic Seed Data Example**:
```typescript
const basicSeedData = {
  accounts: [
    createTestAccount({ name: 'Conta Principal', balance: 500000 }),
  ],
  expenses: [
    createTestExpense({ name: 'Aluguel', amount: 200000, due_day: 10 }),
    createTestExpense({ name: 'Internet', amount: 15000, due_day: 15 }),
  ],
  projects: [
    createTestProject({ name: 'Salário', amount: 800000, payment_day: 5 }),
  ],
};
```

---

## Environment Configuration

### E2E Test Environment Variables

```typescript
interface E2EEnvironment {
  /** Supabase API URL */
  SUPABASE_URL: string; // 'http://localhost:54321'
  
  /** Supabase anonymous key */
  SUPABASE_ANON_KEY: string;
  
  /** Supabase service role key (for admin operations) */
  SUPABASE_SERVICE_ROLE_KEY: string;
  
  /** Inbucket API URL */
  INBUCKET_URL: string; // 'http://localhost:54324'
  
  /** App base URL */
  BASE_URL: string; // 'http://localhost:5173'
  
  /** Test user email */
  TEST_USER_EMAIL: string; // 'e2e-test@example.com'
}
```
