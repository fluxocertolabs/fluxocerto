/**
 * NFR-001 performance check (in-memory only)
 *
 * Measures the estimate + rebase computation path for a representative dataset
 * (≤100 entities; projectionDays = 90).
 *
 * Run:
 *   pnpm tsx scripts/bench-estimate-today.ts
 */

import { performance } from 'node:perf_hooks'
import {
  calculateEstimatedTodayBalance,
  rebaseProjectionFromEstimatedToday,
} from '../src/lib/cashflow'
import type {
  BankAccount,
  CreditCard,
  FixedExpense,
  FutureStatement,
  Project,
  SingleShotExpense,
  SingleShotIncome,
} from '../src/types'

const TIME_ZONE = 'America/Sao_Paulo'

function uuid() {
  return crypto.randomUUID()
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function createAccounts(): BankAccount[] {
  const now = new Date()

  const accounts: BankAccount[] = []

  // 3 checking accounts (with differing bases)
  for (let i = 0; i < 3; i++) {
    accounts.push({
      id: uuid(),
      name: `Checking ${i + 1}`,
      type: 'checking',
      balance: 250_000 + i * 10_000,
      owner: null,
      ownerId: null,
      balanceUpdatedAt: daysAgo(10 + i),
      createdAt: now,
      updatedAt: now,
    })
  }

  // Remaining accounts (savings/investment)
  for (let i = 0; i < 7; i++) {
    accounts.push({
      id: uuid(),
      name: i % 2 === 0 ? `Savings ${i + 1}` : `Investment ${i + 1}`,
      type: i % 2 === 0 ? 'savings' : 'investment',
      balance: 100_000 + i * 50_000,
      owner: null,
      ownerId: null,
      balanceUpdatedAt: daysAgo(30),
      createdAt: now,
      updatedAt: now,
    })
  }

  return accounts
}

function createProjects(): Project[] {
  const now = new Date()

  const projects: Project[] = []
  for (let i = 0; i < 25; i++) {
    projects.push({
      id: uuid(),
      type: 'recurring',
      name: `Project ${i + 1}`,
      amount: 50_000 + (i % 5) * 10_000,
      frequency: i % 4 === 0 ? 'weekly' : i % 4 === 1 ? 'biweekly' : i % 4 === 2 ? 'twice-monthly' : 'monthly',
      paymentSchedule:
        i % 4 === 0 || i % 4 === 1
          ? { type: 'dayOfWeek', dayOfWeek: (i % 7) + 1 }
          : i % 4 === 2
            ? { type: 'twiceMonthly', firstDay: 5, secondDay: 20 }
            : { type: 'dayOfMonth', dayOfMonth: ((i % 28) + 1) as number },
      paymentDay: undefined,
      certainty: i % 3 === 0 ? 'guaranteed' : i % 3 === 1 ? 'probable' : 'uncertain',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
  }

  return projects
}

function createFixedExpenses(): FixedExpense[] {
  const now = new Date()

  const expenses: FixedExpense[] = []
  for (let i = 0; i < 25; i++) {
    expenses.push({
      id: uuid(),
      type: 'fixed',
      name: `Expense ${i + 1}`,
      amount: 10_000 + (i % 10) * 1_000,
      dueDay: ((i % 28) + 1) as number,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
  }
  return expenses
}

function createSingleShotExpenses(): SingleShotExpense[] {
  const now = new Date()
  const expenses: SingleShotExpense[] = []
  for (let i = 0; i < 10; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - ((i % 9) + 1))
    expenses.push({
      id: uuid(),
      type: 'single_shot',
      name: `Single Expense ${i + 1}`,
      amount: 5_000 + (i % 5) * 1_000,
      date: d,
      createdAt: now,
      updatedAt: now,
    })
  }
  return expenses
}

function createSingleShotIncome(): SingleShotIncome[] {
  const now = new Date()
  const income: SingleShotIncome[] = []
  for (let i = 0; i < 10; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - ((i % 9) + 1))
    income.push({
      id: uuid(),
      type: 'single_shot',
      name: `Single Income ${i + 1}`,
      amount: 10_000 + (i % 5) * 2_000,
      date: d,
      certainty: i % 3 === 0 ? 'guaranteed' : i % 3 === 1 ? 'probable' : 'uncertain',
      createdAt: now,
      updatedAt: now,
    })
  }
  return income
}

function createCreditCards(): CreditCard[] {
  const now = new Date()
  const cards: CreditCard[] = []
  for (let i = 0; i < 5; i++) {
    cards.push({
      id: uuid(),
      name: `Card ${i + 1}`,
      statementBalance: 50_000 + i * 5_000,
      dueDay: ((i % 28) + 1) as number,
      owner: null,
      ownerId: null,
      balanceUpdatedAt: daysAgo(20),
      createdAt: now,
      updatedAt: now,
    })
  }
  return cards
}

function createFutureStatements(cards: CreditCard[]): FutureStatement[] {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const statements: FutureStatement[] = []
  for (let i = 0; i < 5; i++) {
    statements.push({
      id: uuid(),
      creditCardId: cards[i]!.id,
      groupId: uuid(),
      targetMonth: ((month % 12) + 1) as number,
      targetYear: year,
      amount: 10_000 + i * 1_000,
      createdAt: now,
      updatedAt: now,
    })
  }
  return statements
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))]
}

function main() {
  const accounts = createAccounts()
  const projects = createProjects()
  const fixedExpenses = createFixedExpenses()
  const singleShotExpenses = createSingleShotExpenses()
  const singleShotIncome = createSingleShotIncome()
  const creditCards = createCreditCards()
  const futureStatements = createFutureStatements(creditCards)

  const projectionDays = 90

  // Warm-up
  for (let i = 0; i < 5; i++) {
    const estimate = calculateEstimatedTodayBalance({
      accounts,
      projects,
      fixedExpenses,
      singleShotExpenses,
      singleShotIncome,
      creditCards,
      futureStatements,
      timeZone: TIME_ZONE,
    })
    rebaseProjectionFromEstimatedToday({
      projectionDays,
      estimatedToday: estimate,
      accounts,
      projects,
      fixedExpenses,
      singleShotExpenses,
      singleShotIncome,
      creditCards,
      futureStatements,
    })
  }

  const samples: number[] = []
  const runs = 50

  for (let i = 0; i < runs; i++) {
    const start = performance.now()

    const estimate = calculateEstimatedTodayBalance({
      accounts,
      projects,
      fixedExpenses,
      singleShotExpenses,
      singleShotIncome,
      creditCards,
      futureStatements,
      timeZone: TIME_ZONE,
    })
    rebaseProjectionFromEstimatedToday({
      projectionDays,
      estimatedToday: estimate,
      accounts,
      projects,
      fixedExpenses,
      singleShotExpenses,
      singleShotIncome,
      creditCards,
      futureStatements,
    })

    const end = performance.now()
    samples.push(end - start)
  }

  const avg = samples.reduce((sum, v) => sum + v, 0) / samples.length
  const p95 = percentile(samples, 95)
  const max = Math.max(...samples)

  console.log('Estimate+Rebase benchmark (in-memory)')
  console.log(`Entities: accounts=${accounts.length}, projects=${projects.length}, fixedExpenses=${fixedExpenses.length}, singleShotExpenses=${singleShotExpenses.length}, singleShotIncome=${singleShotIncome.length}, cards=${creditCards.length}, futureStatements=${futureStatements.length}`)
  console.log(`projectionDays=${projectionDays}, runs=${runs}`)
  console.log(`avg=${avg.toFixed(2)}ms p95=${p95.toFixed(2)}ms max=${max.toFixed(2)}ms`)
}

main()







