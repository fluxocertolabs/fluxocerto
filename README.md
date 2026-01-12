# Fluxo Certo

A **cloud-powered** cashflow projection app for households with variable income. See your next 30-90 days of cashflow at a glance, with danger warnings before you overdraft.

> **Unlike** spreadsheets and complex budgeting apps, Fluxo Certo shows you whether you can pay your mortgage next week—in 30 seconds, once a month.

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![Vite](https://img.shields.io/badge/Vite-7-646cff)
![License](https://img.shields.io/badge/License-Proprietary-red)

## The Problem

Dual-income households with variable income streams (freelancers, contractors, project-based workers) lack visibility into their daily cashflow. They don't know if they'll have enough in their checking account on any given day to cover upcoming expenses.

**Current solutions fail because:**
- **Spreadsheets** are tedious to maintain, error-prone, and hard to visualize
- **Budgeting apps** (YNAB, Mint) are over-engineered—they want you to categorize every transaction when you just need cashflow visibility
- **Mental math** doesn't scale with multiple income sources and payment dates
- **Large buffers** are an inefficient use of money that could be invested

## Features

### ✅ Cashflow Dashboard
- **30/60/90-day projection** with configurable time horizons
- **Dual-scenario visualization**: Optimistic (all income) vs Pessimistic (guaranteed only)
- **Danger day flagging** with visual highlights when balance goes negative
- **Health indicator** showing overall financial status at a glance
- **Summary stats**: Total income, expenses, and surplus/deficit

### ✅ Financial Data Management
- **Bank Accounts**: Checking, savings, and investment accounts
- **Projects (Income)**: Variable income sources with payment schedules and certainty levels
- **Fixed Expenses**: Recurring monthly expenses with due dates
- **Credit Cards**: Statement balances with payment due dates

### ✅ Flexible Payment Schedules
- **Weekly/Biweekly**: Day-of-week based (Monday-Sunday)
- **Twice-monthly**: Two distinct payment days per month
- **Monthly**: Day-of-month with smart handling for shorter months

### ✅ Quick Balance Update (Monthly Ritual)
- Full-screen modal for rapid balance updates
- Update all accounts and credit cards in one flow
- Staleness indicators for outdated balances
- Auto-save on field blur

### ✅ Cloud-Powered Architecture
- **Supabase backend**: Secure PostgreSQL database with real-time sync
- **Magic Link authentication (self-serve)**: Passwordless sign-in/sign-up via email link
- **Real-time updates**: Changes sync instantly across tabs
- **Row-level security**: Your data is isolated and protected

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 19 + TypeScript 5.9 |
| **Build** | Vite 7 |
| **Styling** | Tailwind CSS 4 |
| **Components** | Radix UI primitives |
| **Charts** | Recharts |
| **Database** | Supabase PostgreSQL |
| **State** | Zustand |
| **Validation** | Zod |
| **Routing** | React Router 7 |
| **Date Handling** | date-fns |
| **Testing** | Vitest + Testing Library |

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 10+
- Supabase account (free tier works)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd fluxo-certo

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env
```

### Supabase Setup

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
4. Add these values to your `.env` file
5. Go to **SQL Editor** and run the migration from `supabase/migrations/001_initial_schema.sql`
6. Enable **Email (Magic Link)** sign-ins in **Authentication → Providers**

See `.specify/specs/008-supabase-migration/quickstart.md` for detailed setup instructions.

### Local Development (with Auth Bypass)

For local development, you can skip the login flow entirely using the dev auth bypass:

```bash
# 1. Start local Supabase
pnpm db:start

# 2. Generate dev tokens (first time only)
pnpm run gen:token
#    Script will write VITE_DEV_ACCESS_TOKEN and VITE_DEV_REFRESH_TOKEN to .env

# 3. Start the dev server
pnpm dev:app -- --port 5173
```

**The dashboard loads immediately—no login required!**

The token generation script creates:
- A `dev@local` user with confirmed email
- A "Dev Household" with your user profile
- A "Dev Checking" account with $10,000 balance for testing

> **Note:** This bypass only works in development mode. Production builds ignore these tokens entirely.

### Start Development Server (Standard)

```bash
pnpm dev
```

The app will be available at `http://localhost:5173`

> **Note:** Local Supabase auth redirects are configured for `http://localhost:5173` (see `supabase/config.toml`). If you want a different port, update `auth.site_url` and `auth.additional_redirect_urls`.

### Available Scripts

```bash
pnpm dev          # Start development server with HMR
pnpm build        # Type-check and build for production
pnpm preview      # Preview production build locally
pnpm lint         # Run ESLint
pnpm lint:fix     # Fix ESLint issues
pnpm typecheck    # Run TypeScript type checking
pnpm test         # Full test suite (unit + visual + e2e)
pnpm test:unit    # Unit tests (Vitest)
pnpm test:unit:watch
pnpm test:unit:coverage
pnpm test:e2e     # Playwright functional E2E
pnpm test:visual  # Playwright visual regression
```

## Usage

### Initial Setup (One-time, ~10 minutes)

1. **Sign in** via Magic Link (email link)
2. **Add your bank accounts** via Manage → Accounts
   - Add checking accounts (used for cashflow calculation)
   - Add savings/investment accounts (for reference)
   - Set current balances
3. **Add your income sources** via Manage → Projects
   - Set payment amount, frequency, and day
   - Mark certainty level: Guaranteed, Probable, or Uncertain
4. **Add fixed expenses** via Manage → Expenses
   - Rent, utilities, subscriptions, etc.
5. **Add credit cards** via Manage → Cards
   - Set statement balance and due day
6. **View your cashflow projection** on the Dashboard

### Monthly Update Ritual (~2 minutes)

1. Open the app
2. Click **"Update Balances"** on the Dashboard
3. Update credit card statement balances
4. Update account balances
5. Review the projection for any danger days
6. Done until next month!

## Project Structure

```
src/
├── components/
│   ├── cashflow/          # Dashboard visualization components
│   │   ├── cashflow-chart.tsx
│   │   ├── health-indicator.tsx
│   │   ├── summary-panel.tsx
│   │   └── ...
│   ├── manage/            # CRUD forms for financial entities
│   │   ├── accounts/
│   │   ├── projects/
│   │   ├── expenses/
│   │   └── credit-cards/
│   ├── quick-update/      # Balance update modal
│   ├── setup-required.tsx # Setup screen for missing config
│   └── ui/                # Shared UI components (Radix-based)
├── hooks/                 # React hooks
│   ├── use-cashflow-projection.ts
│   ├── use-finance-data.ts  # Supabase realtime subscriptions
│   └── use-health-indicator.ts
├── lib/
│   ├── cashflow/          # Core calculation engine
│   │   ├── calculate.ts   # Main projection logic
│   │   ├── frequencies.ts # Payment frequency helpers
│   │   └── validators.ts  # Input validation
│   ├── supabase.ts        # Supabase client + auth helpers
│   ├── format.ts          # Currency/date formatting
│   └── staleness.ts       # Balance staleness detection
├── pages/
│   ├── dashboard.tsx      # Main cashflow view
│   └── manage.tsx         # Data management view
├── stores/                # Zustand stores
│   ├── finance-store.ts   # CRUD operations via Supabase
│   └── preferences-store.ts
└── types/                 # TypeScript types + Zod schemas

supabase/
└── migrations/
    └── 001_initial_schema.sql  # Database schema + RLS policies
```

## Data Model

### Bank Account
```typescript
{
  id: string
  name: string
  type: 'checking' | 'savings' | 'investment'
  balance: number  // in cents
  balanceUpdatedAt?: Date
}
```

### Project (Income Source)
```typescript
{
  id: string
  name: string
  amount: number  // in cents
  frequency: 'weekly' | 'biweekly' | 'twice-monthly' | 'monthly'
  paymentSchedule: PaymentSchedule
  certainty: 'guaranteed' | 'probable' | 'uncertain'
  isActive: boolean
}
```

### Fixed Expense
```typescript
{
  id: string
  name: string
  amount: number  // in cents
  dueDay: number  // 1-31
  isActive: boolean
}
```

### Credit Card
```typescript
{
  id: string
  name: string
  statementBalance: number  // in cents
  dueDay: number  // 1-31
  balanceUpdatedAt?: Date
}
```

## Cashflow Engine

The cashflow engine calculates daily projections with two scenarios:

- **Optimistic**: Includes all active income (guaranteed + probable + uncertain)
- **Pessimistic**: Includes only guaranteed income

Key calculations:
- Starting balance = Sum of all checking account balances
- Daily balance = Previous balance + Income - Expenses
- Danger day = Any day where balance goes negative

The engine handles:
- Different payment frequencies (weekly, biweekly, twice-monthly, monthly)
- Month-end edge cases (e.g., payment on 31st in a 30-day month)
- Biweekly intervals with correct 14-day spacing

## Currency

All monetary values are stored in **cents** (integers) to avoid floating-point precision issues. The app is configured for **BRL (Brazilian Real)** but uses browser locale for formatting.

## Browser Support

The app requires a modern browser with JavaScript enabled. Tested on:
- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

## CI/CD & Deployments

The project uses GitHub Actions for CI/CD with Vercel for hosting and Supabase for the database.

### Deployment Strategy

| Trigger | Pipeline | Database | Environment |
|---------|----------|----------|-------------|
| **Pull Request** | quality → visual → e2e → migrate-staging → deploy-preview | Staging Supabase | Preview |
| **Push to main** | quality → visual → e2e → migrate-production → deploy-production | Production Supabase | Production |

### Setting Up Preview Deployments

Preview deployments require a **staging Supabase project** to isolate test data from production.

#### 1. Create Staging Supabase Project

1. Go to [supabase.com](https://supabase.com) (free tier allows 2 projects)
2. Create a new project named `fluxo-certo-staging`
3. Note down:
   - **Project Reference ID** (from Settings → General → Reference ID)
   - **Database Password** (set during project creation)
   - **Project URL** (from Settings → API)
   - **Anon Key** (from Settings → API)

#### 2. Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

| Secret | Description |
|--------|-------------|
| `SUPABASE_ACCESS_TOKEN` | Your Supabase personal access token (shared for both environments) |
| `SUPABASE_STAGING_PROJECT_REF` | Staging project reference ID |
| `SUPABASE_STAGING_DB_PASSWORD` | Staging database password |
| `SUPABASE_PROJECT_REF` | Production project reference ID |
| `SUPABASE_DB_PASSWORD` | Production database password |
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

#### 3. Configure Vercel Environment Variables

In your Vercel project settings (Settings → Environment Variables):

**For Preview environment:**
- `VITE_SUPABASE_URL` = `https://<staging-project-ref>.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `<staging-anon-key>`

**For Production environment:**
- `VITE_SUPABASE_URL` = `https://<production-project-ref>.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `<production-anon-key>`

#### 4. How It Works

1. **Open a PR** → CI runs quality checks, visual regression, and E2E tests
2. **Tests pass** → Migrations are applied to the staging database
3. **Migrations succeed** → Preview deployment is created on Vercel
4. **PR gets a comment** with the preview URL
5. **Merge to main** → Same pipeline runs, but deploys to production with production database

## Roadmap

See [docs/reference/USER_STORIES.md](docs/reference/USER_STORIES.md) for the full feature roadmap.

**Potential future features:**
- [ ] Data export/import (JSON/CSV backup)
- [ ] Cloud sync (optional)
- [ ] Notifications for upcoming danger days
- [ ] "What-if" scenario planning
- [ ] Historical snapshots
- [ ] Dark mode

## Contributing

This is a personal project built for a specific use case. If you find it useful and want to contribute, feel free to open an issue or PR.

## License

Proprietary - All rights reserved. See [LICENSE](LICENSE) for details.

