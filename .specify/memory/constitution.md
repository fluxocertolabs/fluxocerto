# CONSTITUTION.md

**Project-specific facts and implementation details**

> **For universal collaboration protocols**, see `../AGENTS.md`

---

## TECH STACK

```
Language:        TypeScript 5.9.3
Framework:       React 19.2.0 + Vite 7.2.4
Database:        Supabase PostgreSQL (@supabase/supabase-js 2.86.0)
State:           Zustand 5.0.8
UI:              Tailwind CSS 4.1.17 + shadcn/ui
Charts:          Recharts 3.5.0
Testing:         Vitest 4.0.14 + React Testing Library 16.3.0
Validation:      Zod 4.1.13
Build Tool:      Vite 7.2.4
Package Manager: pnpm 10+
CI/CD:           GitHub Actions
Deployment:      Vercel (production), Local development (dev)
Secret Manager:  Environment variables (.env)
```

---

## PINNED DEPENDENCIES

> **IMPORTANT**: Always use exact pinned versions. Never use `@latest`, `^`, or `~`.
> When adding new dependencies, check npm for the current latest version and pin it exactly.

### Production Dependencies
```json
{
  "react": "19.2.0",
  "react-dom": "19.2.0",
  "react-router-dom": "7.9.6",
  "@supabase/supabase-js": "2.86.0",
  "zustand": "5.0.8",
  "recharts": "3.5.0",
  "zod": "4.1.13",
  "clsx": "2.1.1",
  "tailwind-merge": "3.4.0"
}
```

### Development Dependencies
```json
{
  "typescript": "5.9.3",
  "vite": "7.2.4",
  "@vitejs/plugin-react": "5.1.1",
  "tailwindcss": "4.1.17",
  "vitest": "4.0.14",
  "@testing-library/react": "16.3.0"
}
```

### Version Update Protocol
1. **Before adding any dependency**: Run `npm view <package> version` to get latest
2. **Pin exactly**: Use `pnpm add <package>@<version>` with exact version
3. **No floating versions**: Never use `^`, `~`, `*`, or `latest`
4. **Document updates**: When updating versions, update this section
5. **Last verified**: 2025-11-25

---

## ARCHITECTURE OVERVIEW

### Pattern
Single-Page Application (SPA) with cloud-powered data persistence via Supabase

### Key Components

- `/src/components` - React UI components (shadcn/ui based)
  - `/src/components/manage/` - Entity management (accounts, credit-cards, expenses, projects)
  - `/src/components/ui/` - shadcn/ui primitives
- `/src/pages` - Page-level components (Dashboard, Settings, etc.)
- `/src/stores` - State management (Zustand stores with Supabase operations)
- `/src/lib/supabase.ts` - Supabase client, auth helpers, error handling
- `/src/lib` - Utilities, cashflow calculation engine
- `/src/types` - TypeScript type definitions

### Data Flow
```
User Input → React Components → Zustand Store → Supabase Client → PostgreSQL
                    ↓
            Cashflow Engine (calculates projections)
                    ↓
            Recharts Visualization
                    
Supabase Realtime → useFinanceData hook → React State → UI Updates
```

### External Dependencies
- Supabase (PostgreSQL database, authentication, realtime subscriptions)

---

## PROJECT STRUCTURE

```
family-finance/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/            # shadcn/ui primitives
│   │   ├── accounts/      # Account-related components
│   │   ├── projects/      # Income/project components
│   │   ├── expenses/      # Expense components
│   │   ├── credit-cards/  # Credit card components
│   │   ├── cashflow/      # Cashflow chart & projections
│   │   └── setup-required.tsx  # Setup screen for missing config
│   ├── pages/             # Page components
│   │   ├── Dashboard.tsx  # Main cashflow view
│   │   └── Settings.tsx   # Manage accounts, projects, expenses
│   ├── stores/            # Zustand state stores (Supabase operations)
│   ├── hooks/             # React hooks
│   │   ├── use-finance-data.ts      # Supabase realtime subscriptions
│   │   ├── use-cashflow-projection.ts
│   │   └── use-health-indicator.ts
│   ├── lib/               # Business logic
│   │   ├── supabase.ts    # Supabase client, auth, error handling
│   │   ├── cashflow/      # Cashflow calculation engine
│   │   └── utils.ts       # Helper functions
│   ├── types/             # TypeScript types
│   │   └── index.ts       # Domain types (Zod schemas)
│   ├── App.tsx            # Root component
│   ├── main.tsx           # Entry point (auth initialization)
│   └── index.css          # Global styles (Tailwind)
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql  # Database schema + RLS policies
│       ├── 002_invite_auth.sql     # Invite-only authentication
│       ├── 003_single_shot_expenses.sql  # One-time expenses
│       └── 004_user_preferences.sql      # User preferences
├── public/                # Static assets
├── docs/                  # Documentation
│   ├── CONSTITUTION.md    # This file
│   ├── PMF.md             # Product-market fit
│   └── USER_STORIES.md    # User stories
├── .env.example           # Environment variable template
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── vite.config.ts         # Vite config
├── tailwind.config.ts     # Tailwind config (v4 CSS-first)
├── components.json        # shadcn/ui config
└── AGENTS.md              # AI collaboration protocols
```

---

## ENVIRONMENT SETUP

### Prerequisites
```bash
Node.js 20+
pnpm 10+
```

### Initial Setup
```bash
# 1. Clone repository
git clone <repo-url>
cd family-finance

# 2. Install dependencies
pnpm install

# 3. Start development server
pnpm dev
```

### Environment Variables
```bash
# Required for Supabase connection
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Hot Reload & Background Services
- **Hot reload status**: Yes - Vite HMR enabled
- **Required background services**: Supabase (cloud-hosted)
- **Port usage**: 5173 (Vite dev server)

### Common Gotchas
- Supabase requires anonymous sign-ins to be enabled in Authentication → Providers
- Database migration must be run before first use (see supabase/migrations/)
- Missing env vars will show a setup screen instead of crashing

---

## TESTING

### Test Discovery
```bash
Test files:     src/**/*.test.ts, src/**/*.test.tsx
Test config:    vitest.config.ts
```

### Test Execution
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test src/lib/cashflow.test.ts
```

### Test Standards (Project-Specific)
- **Coverage requirements**: Focus on cashflow calculation engine
- **Required test types**: Unit tests for `lib/cashflow.ts`
- **Test data**: Use factory functions for test fixtures
- **Mocking strategy**: Mock Supabase client for component tests

---

## DEVELOPMENT WORKFLOW

### 1. Pick Up Task
- Check GitHub Issues or TODO comments in code
- For MVP: Work through USER_STORIES.md checklist

### 2. Create Branch
```bash
git checkout main
git pull origin main
git checkout -b feature/description

# Branch naming:
feature/add-account-management
feature/cashflow-chart
bugfix/calculation-error
```

### 3. Make Changes
- Follow existing component patterns
- Use shadcn/ui components where possible
- Write tests for business logic (cashflow calculations)

### 4. Test Locally
```bash
pnpm lint          # ESLint
pnpm typecheck     # TypeScript
pnpm test          # Vitest
pnpm build         # Ensure build succeeds
```

### 5. Submit PR
```bash
git add .
git commit -m "feat(cashflow): add danger day flagging"
git push origin feature/description
```

---

## CODING STANDARDS (PROJECT-SPECIFIC)

### TypeScript Guidelines
```typescript
// Type usage
- Use strict mode
- Prefer interfaces for domain objects
- Use Zod for runtime validation (forms)

// Naming
- Files: kebab-case (cashflow-chart.tsx)
- Components: PascalCase (CashflowChart)
- Functions: camelCase (calculateCashflow)
- Constants: SCREAMING_SNAKE_CASE (MAX_PROJECTION_DAYS)
- Types/Interfaces: PascalCase (BankAccount, Project)

// Patterns
- Use async/await
- Prefer functional components with hooks
- Colocate component styles (Tailwind classes)
```

### Component Structure
```typescript
// Preferred component structure
export function ComponentName({ prop1, prop2 }: Props) {
  // 1. Hooks (state, effects, custom hooks)
  // 2. Derived state / calculations
  // 3. Event handlers
  // 4. Render
  return <div>...</div>
}
```

### Naming Conventions Summary
```
Files:            kebab-case.tsx
Directories:      kebab-case/
Components:       PascalCase
Functions:        camelCase
Variables:        camelCase
Constants:        SCREAMING_SNAKE_CASE
Types:            PascalCase
Test files:       *.test.ts, *.test.tsx
```

---

## COMMON COMMANDS

### Daily Development
```bash
# Start development
pnpm dev

# Code quality
pnpm lint
pnpm lint:fix
pnpm typecheck

# Testing
pnpm test
pnpm test:watch

# Build
pnpm build
pnpm preview        # Preview production build
```

### Troubleshooting
```bash
# Clear dependencies and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Clear Vite cache
rm -rf node_modules/.vite

# Reset Supabase data (via Supabase dashboard)
# Go to Table Editor → Select table → Delete rows
# Or re-run migration to recreate tables
```

---

## KEY FILES & DIRECTORIES

### Configuration Files
- `vite.config.ts` - Vite 7 bundler config
- `tsconfig.json` - TypeScript 5.9 config
- `tailwind.config.ts` - Tailwind CSS v4 config
- `components.json` - shadcn/ui config
- `eslint.config.js` - ESLint flat config (ESLint 9+)

### Critical Source Files
- `src/main.tsx` - App entry point (initializes Supabase auth)
- `src/lib/supabase.ts` - Supabase client, auth, and error handling
- `src/types/index.ts` - Domain type definitions (Zod schemas - source of truth)
- `supabase/migrations/001_initial_schema.sql` - Database schema + RLS policies
- `src/lib/cashflow/calculate.ts` - Core cashflow calculation logic

### Generated Files (Don't Edit)
- `dist/` - Build output
- `node_modules/` - Dependencies
- `pnpm-lock.yaml` - Lock file (commit but don't manually edit)

---

## DOMAIN LOGIC & BUSINESS RULES

### Core Concepts

**Account Types**:
- **Checking**: Used for cashflow calculation (combined balance)
- **Savings**: Buffer/backup (display only, not in cashflow)
- **Investment**: Net worth awareness (display only)

**Project Certainty**:
- **Guaranteed**: Will definitely pay on schedule
- **Uncertain**: May pay, may delay, may cancel

**Expense Types**:
- **Fixed Expenses**: Same amount, same day each month
- **Credit Cards**: Variable amount (updated monthly), specific due date

### Business Rules

1. **Cashflow Calculation**:
   - Start with combined checking balance (all checking accounts)
   - Each day: `balance += income - expenses - credit_card_payments`
   - Generate two scenarios: optimistic (all income) and pessimistic (guaranteed only)

2. **Danger Day**:
   - Any day where projected checking balance < 0
   - Indicates need to pull from savings

3. **Monthly Update Ritual**:
   - Update current balances (checking, savings, investment)
   - Update credit card statement balances
   - Review cashflow projection
   - Allocate surplus to goals/investments

4. **Data Lifecycle**:
   - Forward-looking only (no historical tracking)
   - On monthly refresh, past data is considered "used"
   - No explicit "mark as paid" for income (assume paid when date passes)

### Data Models

```typescript
interface BankAccount {
  id: string
  name: string                    // "My Checking", "Joint Savings"
  type: 'checking' | 'savings' | 'investment'
  balance: number                 // Current balance in cents
  createdAt: Date
  updatedAt: Date
}

interface Project {
  id: string
  name: string                    // "Client X Retainer"
  amount: number                  // Payment amount in cents
  paymentDay: number              // Day of month (1-31) - DEPRECATED: use paymentSchedule
  paymentSchedule?: PaymentSchedule // New flexible schedule (see 007-flexible-payment-schedule)
  frequency: 'weekly' | 'biweekly' | 'twice-monthly' | 'monthly'
  certainty: 'guaranteed' | 'probable' | 'uncertain'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface FixedExpense {
  id: string
  name: string                    // "Mortgage", "Netflix"
  amount: number                  // Amount in cents
  dueDay: number                  // Day of month (1-31)
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface CreditCard {
  id: string
  name: string                    // "Amex", "Visa"
  statementBalance: number        // Current statement in cents
  dueDay: number                  // Day of month (1-31)
  createdAt: Date
  updatedAt: Date
}
```

---

## CASHFLOW CALCULATION ENGINE

### Algorithm
```typescript
function calculateCashflow(
  accounts: BankAccount[],
  projects: Project[],
  expenses: FixedExpense[],
  creditCards: CreditCard[],
  days: number = 30,
  scenario: 'optimistic' | 'pessimistic' = 'optimistic'
): CashflowDay[] {
  // 1. Get starting balance (sum of all checking accounts)
  let balance = accounts
    .filter(a => a.type === 'checking')
    .reduce((sum, a) => sum + a.balance, 0)

  // 2. Filter projects by scenario
  const activeProjects = projects.filter(p => 
    p.isActive && (scenario === 'optimistic' || p.certainty === 'guaranteed')
  )

  // 3. For each day in range
  const result: CashflowDay[] = []
  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const date = addDays(today, dayOffset)
    const dayOfMonth = date.getDate()

    // Add income due today
    const income = activeProjects
      .filter(p => isDueOnDay(p, dayOfMonth))
      .reduce((sum, p) => sum + p.amount, 0)

    // Subtract expenses due today
    const expenseTotal = expenses
      .filter(e => e.isActive && e.dueDay === dayOfMonth)
      .reduce((sum, e) => sum + e.amount, 0)

    // Subtract credit card payments due today
    const ccTotal = creditCards
      .filter(cc => cc.dueDay === dayOfMonth)
      .reduce((sum, cc) => sum + cc.statementBalance, 0)

    balance = balance + income - expenseTotal - ccTotal

    result.push({
      date,
      balance,
      income,
      expenses: expenseTotal + ccTotal,
      isDanger: balance < 0
    })
  }

  return result
}
```

---

## PERFORMANCE CONSTRAINTS

### Targets
- Initial load: < 1s
- Cashflow recalculation: < 100ms
- No perceptible lag on data entry

### Considerations
- IndexedDB operations are async but fast for small datasets
- Cashflow calculation is O(days × entities) - negligible for 30 days

---

## SECURITY REQUIREMENTS

### Current Security
- **Anonymous authentication**: Users get a unique ID without sign-up
- **Row-Level Security (RLS)**: Each user can only access their own data
- **HTTPS only**: All Supabase connections use TLS
- **Anon key is safe**: RLS policies protect data, anon key is meant to be public

### Security Features
- Data isolated per user via `user_id` column and RLS policies
- Anonymous sessions persist in browser storage
- No passwords or PII required
- Session can be upgraded to permanent account later (future feature)

---

## DESIGN DECISIONS & TRADE-OFFS

### Why Supabase?
- **Cloud persistence**: Data syncs across devices and survives browser clears
- **Real-time subscriptions**: UI updates instantly when data changes
- **Row-Level Security**: Built-in user isolation without complex backend code
- **Anonymous auth**: No sign-up friction while still having user-scoped data
- **Free tier**: Generous limits for personal use
- **PostgreSQL**: Reliable, powerful database with great tooling

### Why React 19 + Vite 7 (not Next.js)?
- SPA is sufficient (no SEO needed)
- Simpler setup for client-side app
- Faster development iteration with Vite 7's improved HMR
- No server-side complexity
- React 19 concurrent features for smooth UI

### Why shadcn/ui?
- Beautiful, modern components
- Fully customizable (not a black box)
- Accessible by default
- Works great with Tailwind

### Known Technical Debt
- No data export/import for MVP (add later)
- Anonymous sessions can be lost if browser data is cleared
- No account upgrade flow yet (anonymous → permanent)

---

## FOLLOW AGENTS.MD PROTOCOLS

When making changes to this project:
1. ✅ Follow all execution sequences defined in `AGENTS.md`
2. ✅ Apply universal coding standards from `AGENTS.md`
3. ✅ Use this file (CONSTITUTION.md) for project-specific facts
4. ✅ Update this file when project facts change
5. ✅ Keep AGENTS.md universal, keep CONSTITUTION.md specific

**The litmus test**: "If I started a new project tomorrow, would this rule still apply?"
- **YES** → It belongs in AGENTS.md
- **NO** → It belongs in this file (CONSTITUTION.md)
