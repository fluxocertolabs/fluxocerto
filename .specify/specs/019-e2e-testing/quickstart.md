# Quickstart: E2E Testing Suite

**Branch**: `019-e2e-testing` | **Date**: 2025-11-28

This guide covers how to set up, run, and extend the E2E testing suite.

---

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (for Supabase local)

## Initial Setup

### 1. Install Dependencies

```bash
# From project root
pnpm install

# Install Playwright browsers
pnpm exec playwright install chromium
```

### 2. Start Local Supabase

```bash
pnpm db:start
# or directly:
npx supabase start
```

Note the output - you'll need the Inbucket URL (typically `http://localhost:54324`).

### 3. Configure Environment

Create `.env.e2e` in project root (or use existing `.env`):

```bash
# Supabase URLs (from supabase start output)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Inbucket for email capture
INBUCKET_URL=http://localhost:54324

# App URL
BASE_URL=http://localhost:5173

# Test user
TEST_USER_EMAIL=e2e-test@example.com
```

---

## Running Tests

### Run All E2E Tests

```bash
pnpm test:e2e
```

### Run Specific Test File

```bash
pnpm test:e2e e2e/tests/auth.spec.ts
```

### Run Tests in UI Mode (Debug)

```bash
pnpm test:e2e:ui
```

### Run Tests with Trace

```bash
pnpm test:e2e --trace on
```

### View Test Report

```bash
pnpm exec playwright show-report
```

---

## Project Structure

```
e2e/
├── playwright.config.ts     # Playwright configuration
├── fixtures/                
│   ├── test-base.ts         # Extended test with custom fixtures
│   ├── auth.ts              # Authentication helpers
│   └── db.ts                # Database utilities
├── pages/                   # Page Object Models
│   ├── login-page.ts
│   ├── dashboard-page.ts
│   ├── manage-page.ts
│   └── quick-update-page.ts
├── tests/                   # Test specifications
│   ├── auth.spec.ts
│   ├── accounts.spec.ts
│   ├── expenses.spec.ts
│   ├── projects.spec.ts
│   ├── dashboard.spec.ts
│   ├── quick-update.spec.ts
│   ├── credit-cards.spec.ts
│   ├── theme.spec.ts
│   └── edge-cases.spec.ts
├── utils/
│   ├── test-data.ts         # Test data factories
│   ├── inbucket.ts          # Inbucket client
│   └── supabase-admin.ts    # Admin client
└── .auth/                   # Auth state (gitignored)
```

---

## Writing Tests

### Basic Test Structure

```typescript
// e2e/tests/example.spec.ts
import { test, expect } from '../fixtures/test-base';
import { LoginPage } from '../pages/login-page';
import { createTestAccount } from '../utils/test-data';

test.describe('Account Management', () => {
  test.beforeAll(async ({ db }) => {
    await db.resetDatabase();
    await db.ensureTestUser('e2e-test@example.com');
  });

  test('should create a new account', async ({ page, managePage }) => {
    await managePage.goto();
    await managePage.selectAccountsTab();
    
    const accounts = managePage.accounts();
    await accounts.createAccount({
      name: 'Test Account',
      type: 'checking',
      balance: '1.000,00',
    });
    
    await accounts.expectAccountVisible('Test Account');
  });
});
```

### Using Test Data Factories

```typescript
import { 
  createTestAccount, 
  createTestExpense,
  createTestProject 
} from '../utils/test-data';

test.beforeAll(async ({ db }) => {
  await db.resetDatabase();
  await db.seedAccounts([
    createTestAccount({ name: 'Nubank', balance: 500000 }),
    createTestAccount({ name: 'Itaú', balance: 200000, type: 'savings' }),
  ]);
  await db.seedExpenses([
    createTestExpense({ name: 'Aluguel', amount: 200000 }),
  ]);
});
```

### Page Object Usage

```typescript
import { DashboardPage } from '../pages/dashboard-page';

test('should display cashflow chart', async ({ page }) => {
  const dashboard = new DashboardPage(page);
  await dashboard.goto();
  
  await dashboard.expectChartRendered();
  await dashboard.selectProjectionDays(90);
  
  const income = await dashboard.getIncomeTotal();
  expect(income).toContain('R$');
});
```

---

## Authentication Flow

### How Auth Works in Tests

1. **Setup Project** runs first and authenticates via magic link
2. Auth state is saved to `e2e/.auth/user.json`
3. Other test projects load saved state automatically
4. No login needed in individual tests

### Manual Auth Testing

```typescript
// e2e/tests/auth.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import { InbucketClient } from '../utils/inbucket';

test('should complete magic link flow', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const inbucket = new InbucketClient(process.env.INBUCKET_URL!);
  
  await loginPage.goto();
  await loginPage.requestMagicLink('e2e-test@example.com');
  
  // Get magic link from Inbucket
  const message = await inbucket.getLatestMessage('e2e-test');
  const magicLink = inbucket.extractMagicLink(message!);
  
  // Click magic link
  await page.goto(magicLink!);
  
  // Verify redirected to dashboard
  await expect(page).toHaveURL(/dashboard/);
});
```

---

## Database Management

### Reset Database

```typescript
test.beforeAll(async ({ db }) => {
  // Clears all data from test tables
  await db.resetDatabase();
});
```

### Seed Test Data

```typescript
test.beforeAll(async ({ db }) => {
  await db.resetDatabase();
  
  await db.seedFullScenario({
    accounts: [
      createTestAccount({ name: 'Checking', balance: 1000000 }),
    ],
    expenses: [
      createTestExpense({ name: 'Rent', amount: 200000 }),
    ],
    projects: [
      createTestProject({ name: 'Salary', amount: 800000 }),
    ],
    creditCards: [
      createTestCreditCard({ name: 'Visa', statement_balance: 150000 }),
    ],
  });
});
```

---

## Debugging

### Visual Debugging

```bash
# Run with headed browser
pnpm test:e2e --headed

# Run in UI mode
pnpm test:e2e:ui

# Pause execution (add to test)
await page.pause();
```

### Traces

```bash
# Enable tracing
pnpm test:e2e --trace on

# View trace
pnpm exec playwright show-trace test-results/path/to/trace.zip
```

### Screenshots

```typescript
// Manual screenshot
await page.screenshot({ path: 'debug.png' });

// Playwright auto-captures on failure
// Check test-results/ directory
```

### Console Output

```typescript
// Listen to console
page.on('console', msg => console.log('PAGE LOG:', msg.text()));
```

---

## CI Integration

### GitHub Actions Workflow

Tests run automatically on PRs via `.github/workflows/e2e.yml`.

### Local CI Simulation

```bash
# Run exactly as CI would
pnpm db:start
pnpm test:e2e --reporter=github
```

### Test Artifacts

Failed test artifacts (screenshots, traces) are uploaded to GitHub Actions.

---

## Extending Tests

### Adding a New Page Object

1. Create `e2e/pages/new-page.ts`:

```typescript
import type { Page, Locator } from '@playwright/test';

export class NewPage {
  readonly page: Page;
  readonly someElement: Locator;

  constructor(page: Page) {
    this.page = page;
    this.someElement = page.getByTestId('some-element');
  }

  async goto() {
    await this.page.goto('/new-path');
  }

  async doSomething() {
    await this.someElement.click();
  }
}
```

2. Use in tests:

```typescript
import { NewPage } from '../pages/new-page';

test('test new page', async ({ page }) => {
  const newPage = new NewPage(page);
  await newPage.goto();
  await newPage.doSomething();
});
```

### Adding a New Test File

1. Create `e2e/tests/new-feature.spec.ts`
2. Follow existing patterns for imports and structure
3. Use `test.beforeAll` for data setup

---

## Troubleshooting

### Tests Fail with "Element not found"

- Check if selectors match current UI
- Use UI mode to debug: `pnpm test:e2e:ui`
- Add `await page.pause()` before failing assertion

### Auth State Issues

```bash
# Clear cached auth state
rm -rf e2e/.auth/

# Re-run setup
pnpm test:e2e --project=setup
```

### Database Connection Issues

```bash
# Check Supabase is running
npx supabase status

# Restart if needed
pnpm db:stop && pnpm db:start
```

### Flaky Tests

- Increase timeout: `test.setTimeout(60000)`
- Add explicit waits: `await page.waitForLoadState('networkidle')`
- Check for race conditions in data setup

---

## Package.json Scripts

Add these to `package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  }
}
```
