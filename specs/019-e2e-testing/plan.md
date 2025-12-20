# Implementation Plan: E2E Testing Suite

**Branch**: `019-e2e-testing` | **Date**: 2025-11-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/019-e2e-testing/spec.md`

## Summary

Build a comprehensive Playwright E2E testing suite for the Fluxo Certo application that covers all critical user flows (auth, accounts, expenses, projects, dashboard, credit cards, quick update, themes). Tests run against a local Supabase instance with isolated test databases, use Page Object Model pattern for maintainability, and integrate with GitHub Actions CI as a blocking PR check. Authentication is handled via Magic Link capture from Inbucket, with session injection for non-auth tests.

## Technical Context

**Language/Version**: TypeScript 5.9.3
**Primary Dependencies**: Playwright 1.57.0, @playwright/test 1.57.0
**Storage**: Local Supabase PostgreSQL (port 54322), Inbucket email server (port 54324)
**Testing**: Playwright with 2 automatic retries per test
**Target Platform**: Linux server (CI), macOS/Linux (local development)
**Project Type**: Web application (React 19 SPA with Vite 7)
**Performance Goals**: Full test suite completes in < 5 minutes
**Constraints**: 95%+ pass rate on repeated runs, < 5 minutes total execution
**Scale/Scope**: 8 user stories, ~40 acceptance scenarios, 5 edge cases

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Requirement | Status | Notes |
|------|-------------|--------|-------|
| **Dependency Pinning** | Exact versions, no `^`, `~`, `*`, `latest` | ✅ PASS | Will pin @playwright/test@1.57.0 |
| **Test Standards** | Follow project test patterns | ✅ PASS | E2E extends existing Vitest unit test patterns |
| **TypeScript Strict** | Use strict mode | ✅ PASS | TypeScript 5.9.3 with strict mode |
| **File Naming** | kebab-case for files | ✅ PASS | e.g., `login-page.ts`, `auth.spec.ts` |
| **Component Naming** | PascalCase for classes | ✅ PASS | e.g., `LoginPage`, `DashboardPage` |
| **Supabase Integration** | Use existing local Supabase setup | ✅ PASS | Uses `supabase start` via existing scripts |
| **CI/CD** | GitHub Actions integration | ✅ PASS | Will add E2E workflow file |
| **Package Manager** | pnpm 10+ | ✅ PASS | Uses pnpm for dependencies |
| **Node Version** | Node.js 20+ | ✅ PASS | Engines constraint already in package.json |

**Pre-Phase 0 Gate Result**: ✅ PASS - No violations

## Project Structure

### Documentation (this feature)

```text
specs/019-e2e-testing/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (test fixtures & data factories)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (Page Objects interface contracts)
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
e2e/
├── playwright.config.ts     # Playwright configuration
├── fixtures/                # Test fixtures and custom test setup
│   ├── test-base.ts         # Extended test with custom fixtures
│   ├── auth.ts              # Authentication helpers (Inbucket integration)
│   └── db.ts                # Database reset/seed utilities
├── pages/                   # Page Object Models
│   ├── login-page.ts
│   ├── dashboard-page.ts
│   ├── manage-page.ts
│   └── quick-update-page.ts
├── tests/                   # Test specifications
│   ├── auth.spec.ts         # US1: Authentication flow
│   ├── accounts.spec.ts     # US2: Account management
│   ├── expenses.spec.ts     # US3: Expense management
│   ├── projects.spec.ts     # US4: Project (income) management
│   ├── dashboard.spec.ts    # US5: Dashboard & cashflow projection
│   ├── quick-update.spec.ts # US6: Quick update flow
│   ├── credit-cards.spec.ts # US7: Credit card management
│   ├── theme.spec.ts        # US8: Theme switching
│   └── edge-cases.spec.ts   # EC-001 to EC-005
├── utils/                   # Shared utilities
│   ├── test-data.ts         # Test data factories
│   ├── inbucket.ts          # Inbucket API client
│   └── supabase-admin.ts    # Supabase admin client for test setup
└── .auth/                   # Storage state for authenticated sessions (gitignored)
    └── user.json

.github/workflows/
└── e2e.yml                  # GitHub Actions E2E workflow (new)
```

**Structure Decision**: Dedicated `e2e/` directory at repository root, separate from `src/test/` which houses Vitest unit tests. This follows Playwright conventions and keeps E2E tests isolated with their own configuration.

## Constitution Check - Post-Design

*Re-evaluated after Phase 1 design completion.*

| Gate | Requirement | Status | Notes |
|------|-------------|--------|-------|
| **Dependency Pinning** | Exact versions | ✅ PASS | @playwright/test@1.57.0 pinned |
| **Test Standards** | Project patterns | ✅ PASS | Page Objects, factories, fixtures follow patterns |
| **TypeScript Strict** | Strict mode | ✅ PASS | Contracts define strict interfaces |
| **File Naming** | kebab-case | ✅ PASS | All specs use kebab-case |
| **Component Naming** | PascalCase | ✅ PASS | LoginPage, DashboardPage, etc. |
| **Supabase Integration** | Local setup | ✅ PASS | Uses existing db:start, db:reset |
| **CI/CD** | GitHub Actions | ✅ PASS | e2e.yml workflow defined |
| **Package Manager** | pnpm 10+ | ✅ PASS | Uses pnpm scripts |
| **Node Version** | Node.js 20+ | ✅ PASS | Workflow uses node 20 |
| **BRL Format** | Currency display | ✅ PASS | IFormatUtils contract defines formatBRL |
| **pt-BR Locale** | UI text | ✅ PASS | Selectors use Portuguese patterns |

**Post-Phase 1 Gate Result**: ✅ PASS - Design complete, no violations

## Complexity Tracking

> No Constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | - | - |
