# Research: E2E Testing Suite

**Branch**: `019-e2e-testing` | **Date**: 2025-11-28

## Research Questions Resolved

### 1. Playwright Version & Configuration

**Decision**: Use @playwright/test@1.57.0 (latest stable)

**Rationale**:
- Latest stable version as of 2025-11-28
- Includes all modern features: auto-wait, trace viewer, component testing
- Native TypeScript support without additional configuration
- Excellent CI integration with GitHub Actions

**Alternatives Considered**:
- Cypress: More mature ecosystem but less performant for parallel execution and harder to integrate with magic link flows
- Vitest browser mode: Still experimental, not production-ready for comprehensive E2E testing

### 2. Magic Link Authentication Testing Strategy

**Decision**: Use Inbucket API to capture magic link emails, with polling mechanism for reliability

**Rationale**:
- Supabase local development includes Inbucket (email catcher) at port 54324
- Inbucket exposes REST API for programmatic email retrieval
- No need for real email providers in testing
- Enables isolated, reproducible auth testing

**Implementation Pattern**:
```typescript
// Poll Inbucket for new emails with retry mechanism
async function waitForMagicLinkEmail(email: string, previousToken?: string): Promise<{ token: string; url: string }> {
  const username = email.split('@')[0];
  let triesLeft = 10;
  
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      const messages = await fetch(`${INBUCKET_URL}/api/v1/mailbox/${username}`)
        .then(res => res.json());
      
      const sorted = messages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latestId = sorted[0]?.id;
      
      if (latestId) {
        const message = await fetch(`${INBUCKET_URL}/api/v1/mailbox/${username}/${latestId}`)
          .then(res => res.json());
        
        // Extract magic link URL from email body
        const urlMatch = message.body.text.match(/https?:\/\/[^\s]+/);
        if (urlMatch && urlMatch[0] !== previousToken) {
          clearInterval(interval);
          resolve({ token: message.body.text, url: urlMatch[0] });
        }
      }
      
      if (--triesLeft <= 0) {
        clearInterval(interval);
        reject(new Error('Timeout waiting for magic link email'));
      }
    }, 200);
  });
}
```

**Inbucket REST API Endpoints**:
- `GET /api/v1/mailbox/{name}` - List all messages for a mailbox
- `GET /api/v1/mailbox/{name}/{id}` - Get full message by ID
- `DELETE /api/v1/mailbox/{name}` - Purge mailbox contents

### 3. Test Database Reset Strategy

**Decision**: Reset database before each test file using `beforeAll` hook with Supabase service role

**Rationale**:
- Per-file reset balances isolation with execution speed (vs. per-test reset)
- Using Supabase admin client with service role key enables direct database manipulation
- Allows seeding test data without going through UI

**Implementation Pattern**:
```typescript
// e2e/fixtures/db.ts
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function resetDatabase() {
  // Delete all data from tables (order matters due to foreign keys)
  await supabaseAdmin.from('single_shot_income').delete().neq('id', '');
  await supabaseAdmin.from('single_shot_expenses').delete().neq('id', '');
  await supabaseAdmin.from('credit_cards').delete().neq('id', '');
  await supabaseAdmin.from('expenses').delete().neq('id', '');
  await supabaseAdmin.from('projects').delete().neq('id', '');
  await supabaseAdmin.from('accounts').delete().neq('id', '');
}

export async function ensureTestUser(email: string) {
  // Add test user email to allowed_emails table
  await supabaseAdmin.from('allowed_emails')
    .upsert({ email }, { onConflict: 'email' });
}
```

### 4. Page Object Model Structure

**Decision**: Use class-based Page Objects with locator composition

**Rationale**:
- Encapsulates UI selectors in one place for maintainability
- Enables fluent API for test readability
- Follows Playwright best practices
- Easy to extend with custom actions

**Implementation Pattern**:
```typescript
// e2e/pages/login-page.ts
import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByRole('textbox', { name: /email/i });
    this.submitButton = page.getByRole('button', { name: /enviar/i });
    this.successMessage = page.getByText(/link enviado/i);
  }

  async goto() {
    await this.page.goto('/login');
  }

  async requestMagicLink(email: string) {
    await this.emailInput.fill(email);
    await this.submitButton.click();
    await this.successMessage.waitFor();
  }
}
```

### 5. Authentication State Reuse

**Decision**: Use Playwright's `storageState` with setup project for session injection

**Rationale**:
- Auth tests run once in a setup project
- Session state is saved to JSON file
- Other test projects load saved state automatically
- Dramatically improves test execution time

**Configuration Pattern**:
```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    // Setup project - runs first, authenticates
    { 
      name: 'setup', 
      testMatch: /.*\.setup\.ts/,
      testDir: 'e2e/fixtures'
    },
    // Main tests - depend on setup
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
```

### 6. GitHub Actions CI Configuration

**Decision**: Use dedicated E2E workflow with Supabase CLI and Playwright Docker action

**Rationale**:
- Supabase CLI can be installed via `supabase/setup-cli@v1` action
- Playwright provides official Docker action for consistent environment
- Parallel test execution with sharding for speed
- Artifact upload for failure debugging

**Workflow Pattern**:
```yaml
name: E2E Tests
on:
  pull_request:
    branches: [main]

jobs:
  e2e:
    timeout-minutes: 30
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      
      - name: Start Supabase
        run: supabase start
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Install Playwright
        run: pnpm exec playwright install --with-deps chromium
      
      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          SUPABASE_URL: http://localhost:54321
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          INBUCKET_URL: http://localhost:54324
      
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

### 7. Retry and Parallelization Configuration

**Decision**: 2 retries per test, parallel execution with 50% workers on CI

**Rationale**:
- FR-016 requires 2 automatic retries
- Parallel execution improves total runtime
- CI environments benefit from limited workers to avoid resource contention

**Configuration**:
```typescript
// playwright.config.ts
export default defineConfig({
  retries: 2,
  workers: process.env.CI ? '50%' : undefined,
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
});
```

### 8. Test Data Factory Patterns

**Decision**: Use factory functions for consistent, type-safe test data

**Rationale**:
- Reusable across tests
- Type-safe with TypeScript
- Easy to customize per-test
- Follows existing codebase patterns

**Implementation Pattern**:
```typescript
// e2e/utils/test-data.ts
export const createTestAccount = (overrides = {}) => ({
  name: 'Test Account',
  type: 'checking' as const,
  balance: 100000, // R$ 1.000,00 in cents
  ...overrides,
});

export const createTestExpense = (overrides = {}) => ({
  name: 'Aluguel',
  amount: 200000, // R$ 2.000,00 in cents
  due_day: 10,
  is_active: true,
  ...overrides,
});

export const createTestProject = (overrides = {}) => ({
  name: 'Salário',
  amount: 800000, // R$ 8.000,00 in cents
  payment_day: 5,
  frequency: 'monthly' as const,
  certainty: 'guaranteed' as const,
  is_active: true,
  ...overrides,
});
```

### 9. Handling BRL Currency Format

**Decision**: Use localized input handling with currency formatting utilities

**Rationale**:
- FR-011 requires BRL format (R$ X.XXX,XX)
- UI displays formatted values, but form inputs may accept raw numbers
- Tests should verify correct display format

**Implementation Pattern**:
```typescript
// e2e/utils/format.ts
export function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

// In tests:
await expect(page.getByText(formatBRL(100000))).toBeVisible(); // R$ 1.000,00
```

### 10. Edge Case Testing Strategies

**Decision**: Implement specific test utilities for each edge case

| Edge Case | Strategy |
|-----------|----------|
| EC-001: Network loss | Use `page.route()` to simulate offline state |
| EC-002: Concurrent edits | Open two browser contexts, make simultaneous changes |
| EC-003: Session expiry | Manipulate Supabase auth state directly |
| EC-004: Large datasets | Seed 100+ records via admin client before test |
| EC-005: Realtime reconnect | Use `page.route()` to block/unblock WebSocket connections |

## Environment Variables Required

```bash
# .env.e2e
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start output>
INBUCKET_URL=http://localhost:54324
BASE_URL=http://localhost:5173
```

## Dependencies to Install

```bash
pnpm add -D @playwright/test@1.57.0
```

## File Locations Summary

| Artifact | Location |
|----------|----------|
| Playwright config | `e2e/playwright.config.ts` |
| Page Objects | `e2e/pages/*.ts` |
| Test fixtures | `e2e/fixtures/*.ts` |
| Test specs | `e2e/tests/*.spec.ts` |
| Test utilities | `e2e/utils/*.ts` |
| Auth state (gitignored) | `e2e/.auth/` |
| CI workflow | `.github/workflows/e2e.yml` |
