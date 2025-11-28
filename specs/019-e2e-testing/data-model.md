# Data Model: E2E Testing Suite

**Branch**: `019-e2e-testing` | **Date**: 2025-11-28

## Overview

This document describes the data structures and page objects used in the Playwright E2E testing suite.

> **Note**: All TypeScript interface definitions are located in the `contracts/` directory:
> - `contracts/fixtures.ts` - Test data types, fixtures, and factory interfaces
> - `contracts/page-objects.ts` - Page Object Model interfaces

---

## Test Fixtures & Helpers

See `contracts/fixtures.ts` for complete interface definitions:

- **`IAuthFixture`**: Authentication helper for managing test user sessions via magic link flow
- **`IDatabaseFixture`**: Database management for test isolation and seeding
- **`IInbucketClient`**: Inbucket API client for email retrieval
- **`ITestDataFactory`**: Factory functions for creating test data with defaults
- **`IFormatUtils`**: Utility functions for BRL currency and date formatting

---

## Test Data Types

See `contracts/fixtures.ts` for complete interface definitions:

| Type | Description | Default Example |
|------|-------------|-----------------|
| `TestAccount` | Bank account test data | Nubank checking, R$ 1.000,00 |
| `TestExpense` | Fixed recurring expense | Aluguel, R$ 2.000,00, due day 10 |
| `TestSingleShotExpense` | One-time expense | Compra de Móveis, R$ 5.000,00 |
| `TestProject` | Recurring income | Salário, R$ 8.000,00, monthly |
| `TestSingleShotIncome` | One-time income | Bônus Anual, R$ 10.000,00 |
| `TestCreditCard` | Credit card | Nubank Platinum, R$ 3.000,00 |

---

## Page Objects

See `contracts/page-objects.ts` for complete interface definitions.

| Page Object | Description | Key Methods |
|-------------|-------------|-------------|
| `ILoginPage` | Login/authentication flow | `goto()`, `requestMagicLink()`, `expectMagicLinkSent()` |
| `IDashboardPage` | Main dashboard/cashflow view | `goto()`, `selectProjectionDays()`, `openQuickUpdate()` |
| `IManagePage` | Settings/Manage page with tabs | `selectAccountsTab()`, `accounts()`, `expenses()` |
| `IAccountsSection` | Account management section | `createAccount()`, `editAccount()`, `deleteAccount()` |
| `IExpensesSection` | Expense management section | `createFixedExpense()`, `createSingleShotExpense()` |
| `IProjectsSection` | Project/income management section | `createRecurringProject()`, `createSingleShotIncome()` |
| `ICreditCardsSection` | Credit card management section | `createCreditCard()`, `updateBalance()` |
| `IQuickUpdatePage` | Quick Update modal | `updateAccountBalance()`, `complete()`, `cancel()` |

### Locator Strategies

| Page | Element | Selector Strategy |
|------|---------|-------------------|
| Login | emailInput | `getByRole('textbox', { name: /email/i })` |
| Login | submitButton | `getByRole('button', { name: /enviar|entrar/i })` |
| Login | successMessage | `getByText(/link enviado|verifique seu email/i)` |
| Dashboard | cashflowChart | `getByTestId('cashflow-chart')` or `locator('.recharts-wrapper')` |
| Dashboard | summaryPanel | `getByTestId('summary-panel')` |
| Dashboard | projectionSelector | `getByRole('combobox', { name: /período/i })` |
| Dashboard | quickUpdateButton | `getByRole('button', { name: /atualizar saldos/i })` |
| Dashboard | emptyState | `getByText(/adicione.*contas/i)` |

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
