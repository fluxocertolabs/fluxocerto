# Family Finance

A **local-first** cashflow projection app for households with variable income. See your next 30-90 days of cashflow at a glance, with danger warnings before you overdraft.

> **Unlike** spreadsheets and complex budgeting apps, Family Finance shows you whether you can pay your mortgage next week—in 30 seconds, once a month.

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

### ✅ Local-First Architecture
- **Zero server costs**: All data stored in browser (IndexedDB via Dexie.js)
- **Privacy-first**: Your financial data never leaves your device
- **Offline capable**: Works without internet connection
- **Instant**: No network latency for any operation

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 19 + TypeScript 5.9 |
| **Build** | Vite 7 |
| **Styling** | Tailwind CSS 4 |
| **Components** | Radix UI primitives |
| **Charts** | Recharts |
| **Database** | Dexie.js (IndexedDB wrapper) |
| **State** | Zustand |
| **Validation** | Zod |
| **Routing** | React Router 7 |
| **Date Handling** | date-fns |
| **Testing** | Vitest + Testing Library |

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 10+

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd family-finance

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The app will be available at `http://localhost:5173`

### Available Scripts

```bash
pnpm dev          # Start development server with HMR
pnpm build        # Type-check and build for production
pnpm preview      # Preview production build locally
pnpm lint         # Run ESLint
pnpm lint:fix     # Fix ESLint issues
pnpm typecheck    # Run TypeScript type checking
pnpm test         # Run tests once
pnpm test:watch   # Run tests in watch mode
pnpm test:coverage # Run tests with coverage report
```

## Usage

### Initial Setup (One-time, ~10 minutes)

1. **Open the app** (no login required)
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
│   └── ui/                # Shared UI components (Radix-based)
├── db/                    # Dexie.js database setup
├── hooks/                 # React hooks
│   ├── use-cashflow-projection.ts
│   ├── use-finance-data.ts
│   └── use-health-indicator.ts
├── lib/
│   ├── cashflow/          # Core calculation engine
│   │   ├── calculate.ts   # Main projection logic
│   │   ├── frequencies.ts # Payment frequency helpers
│   │   └── validators.ts  # Input validation
│   ├── format.ts          # Currency/date formatting
│   └── staleness.ts       # Balance staleness detection
├── pages/
│   ├── dashboard.tsx      # Main cashflow view
│   └── manage.tsx         # Data management view
├── stores/                # Zustand stores
│   ├── finance-store.ts   # CRUD operations
│   └── preferences-store.ts
└── types/                 # TypeScript types + Zod schemas
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

The app uses IndexedDB for storage, which is supported in all modern browsers. Tested on:
- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

## Roadmap

See [docs/USER_STORIES.md](docs/USER_STORIES.md) for the full feature roadmap.

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

