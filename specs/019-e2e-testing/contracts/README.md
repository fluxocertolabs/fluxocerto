# E2E Testing Contracts

**Branch**: `019-e2e-testing` | **Date**: 2025-11-28

This directory contains TypeScript interface contracts for the E2E testing suite. These contracts define the API surface for page objects, fixtures, and utilities.

## Files

| File | Description |
|------|-------------|
| `page-objects.ts` | Interfaces for all Page Object classes |
| `fixtures.ts` | Interfaces for test fixtures, data types, and utilities |

## Usage

Implementations should import and implement these interfaces:

```typescript
// e2e/pages/login-page.ts
import type { ILoginPage } from '../contracts/page-objects';

export class LoginPage implements ILoginPage {
  // ... implementation
}
```

```typescript
// e2e/fixtures/auth.ts
import type { IAuthFixture } from '../contracts/fixtures';

export class AuthFixture implements IAuthFixture {
  // ... implementation
}
```

## Contract Guidelines

1. **Stability**: Contracts should be stable; changes require updating all implementations
2. **Completeness**: All public methods must be defined in contracts
3. **Documentation**: JSDoc comments describe expected behavior
4. **Type Safety**: Use strict TypeScript types, avoid `any`

## Page Object Contracts

| Interface | Purpose |
|-----------|---------|
| `ILoginPage` | Login/authentication flow |
| `IDashboardPage` | Main dashboard view |
| `IManagePage` | Settings page with tabs |
| `IAccountsSection` | Account CRUD operations |
| `IExpensesSection` | Expense CRUD operations |
| `IProjectsSection` | Project/income CRUD operations |
| `ICreditCardsSection` | Credit card CRUD operations |
| `IQuickUpdatePage` | Quick Update modal |

## Fixture Contracts

| Interface | Purpose |
|-----------|---------|
| `IAuthFixture` | Authentication helpers |
| `IDatabaseFixture` | Database reset and seeding |
| `IInbucketClient` | Email retrieval from Inbucket |
| `ITestDataFactory` | Test data factory functions |
| `IFormatUtils` | BRL currency and date formatting |

## Data Type Contracts

| Type | Purpose |
|------|---------|
| `TestAccount` | Account test data structure |
| `TestExpense` | Fixed expense test data |
| `TestSingleShotExpense` | One-time expense test data |
| `TestProject` | Recurring income test data |
| `TestSingleShotIncome` | One-time income test data |
| `TestCreditCard` | Credit card test data |
| `InbucketMessage` | Inbucket email message structure |
