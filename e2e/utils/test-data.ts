/**
 * Test data factories for E2E tests
 * Implements ITestDataFactory contract from specs/019-e2e-testing/contracts/fixtures.ts
 */

export interface TestAccount {
  id?: string;
  name: string;
  type: 'checking' | 'savings' | 'investment';
  balance: number; // in cents
  owner_id?: string | null;
  balance_updated_at?: string; // ISO date string
}

export interface TestExpense {
  id?: string;
  name: string;
  amount: number; // in cents
  due_day: number; // 1-31
  is_active: boolean;
}

export interface TestSingleShotExpense {
  id?: string;
  name: string;
  amount: number; // in cents
  date: string; // ISO date string YYYY-MM-DD
}

export interface TestProject {
  id?: string;
  name: string;
  amount: number; // in cents
  frequency: 'weekly' | 'biweekly' | 'twice-monthly' | 'monthly';
  payment_schedule: 
    | { type: 'dayOfWeek'; dayOfWeek: number }
    | { type: 'dayOfMonth'; dayOfMonth: number }
    | { type: 'twiceMonthly'; firstDay: number; secondDay: number };
  certainty: 'guaranteed' | 'probable' | 'uncertain';
  is_active: boolean;
}

export interface TestSingleShotIncome {
  id?: string;
  name: string;
  amount: number; // in cents
  date: string; // ISO date string YYYY-MM-DD
  certainty: 'guaranteed' | 'probable' | 'uncertain';
}

export interface TestCreditCard {
  id?: string;
  name: string;
  statement_balance: number; // in cents
  due_day: number; // 1-31
  owner_id?: string | null;
  balance_updated_at?: string; // ISO date string
}

export interface TestFutureStatement {
  id?: string;
  credit_card_id: string;
  target_month: number; // 1-12
  target_year: number;
  amount: number; // in cents
}

export interface TestGroup {
  id?: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface TestProfile {
  id?: string;
  name: string;
  email: string;
  group_id: string;
}

export interface TestNotification {
  id?: string;
  user_id: string;
  type: 'welcome';
  title: string;
  body: string;
  primary_action_label?: string | null;
  primary_action_href?: string | null;
  dedupe_key?: string | null;
  read_at?: string | null;
  email_sent_at?: string | null;
}

export interface TestUserPreference {
  user_id: string;
  key: string;
  value: string;
}

/**
 * Create test account with defaults
 */
export function createAccount(overrides: Partial<TestAccount> = {}): TestAccount {
  return {
    name: 'Nubank',
    type: 'checking',
    balance: 100000, // R$ 1.000,00
    ...overrides,
  };
}

/**
 * Create test fixed expense with defaults
 */
export function createExpense(overrides: Partial<TestExpense> = {}): TestExpense {
  return {
    name: 'Aluguel',
    amount: 200000, // R$ 2.000,00
    due_day: 10,
    is_active: true,
    ...overrides,
  };
}

/**
 * Create test single-shot expense with defaults
 * Default date is within 30 days of VISUAL_TEST_FIXED_DATE (2025-01-15)
 */
export function createSingleShotExpense(
  overrides: Partial<TestSingleShotExpense> = {}
): TestSingleShotExpense {
  return {
    name: 'Compra de Móveis',
    amount: 500000, // R$ 5.000,00
    date: '2025-01-25', // 10 days after visual test fixed date
    ...overrides,
  };
}

/**
 * Create test project with defaults
 * Generates appropriate payment_schedule based on frequency
 */
export function createProject(overrides: Partial<TestProject> = {}): TestProject {
  const frequency = overrides.frequency || 'monthly';
  
  // Generate default payment_schedule based on frequency if not provided
  let payment_schedule = overrides.payment_schedule;
  if (!payment_schedule) {
    switch (frequency) {
      case 'weekly':
      case 'biweekly':
        payment_schedule = { type: 'dayOfWeek', dayOfWeek: 1 }; // Monday
        break;
      case 'twice-monthly':
        payment_schedule = { type: 'twiceMonthly', firstDay: 5, secondDay: 20 };
        break;
      case 'monthly':
        payment_schedule = { type: 'dayOfMonth', dayOfMonth: 5 };
        break;
    }
  }
  
  return {
    name: 'Salário',
    amount: 800000, // R$ 8.000,00
    frequency,
    payment_schedule,
    certainty: 'guaranteed',
    is_active: true,
    ...overrides,
  };
}

/**
 * Create test single-shot income with defaults
 * Default date is within 30 days of VISUAL_TEST_FIXED_DATE (2025-01-15)
 */
export function createSingleShotIncome(
  overrides: Partial<TestSingleShotIncome> = {}
): TestSingleShotIncome {
  return {
    name: 'Bônus Anual',
    amount: 1000000, // R$ 10.000,00
    date: '2025-02-01', // ~17 days after visual test fixed date
    certainty: 'guaranteed',
    ...overrides,
  };
}

/**
 * Create test credit card with defaults
 */
export function createCreditCard(
  overrides: Partial<TestCreditCard> = {}
): TestCreditCard {
  return {
    name: 'Nubank Platinum',
    statement_balance: 300000, // R$ 3.000,00
    due_day: 15,
    ...overrides,
  };
}

/**
 * Create test future statement with defaults
 * Default target is next month from VISUAL_TEST_FIXED_DATE (2025-01-15)
 */
export function createFutureStatement(
  overrides: Partial<TestFutureStatement> = {}
): TestFutureStatement {
  return {
    credit_card_id: overrides.credit_card_id ?? '', // Must be provided
    target_month: 2, // February (next month from visual test date)
    target_year: 2025,
    amount: 150000, // R$ 1.500,00
    ...overrides,
  };
}

/**
 * Create test group with defaults
 */
export function createGroup(
  overrides: Partial<TestGroup> = {}
): TestGroup {
  return {
    name: 'Grupo Teste',
    ...overrides,
  };
}

/**
 * Create test notification with defaults (pt-BR content)
 */
export function createNotification(
  userId: string,
  overrides: Partial<Omit<TestNotification, 'user_id'>> = {}
): TestNotification {
  // Generate unique dedupe_key to avoid conflicts with automatically-created notifications
  const uniqueKey = `test:${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  return {
    user_id: userId,
    type: 'welcome',
    title: 'Bem-vindo ao Fluxo Certo! 🎉',
    body: 'Estamos felizes em ter você aqui. O Fluxo Certo vai te ajudar a organizar suas finanças pessoais e familiares de forma simples e eficiente.',
    primary_action_label: 'Começar a usar',
    primary_action_href: '/manage',
    dedupe_key: uniqueKey,
    read_at: null,
    email_sent_at: null,
    ...overrides,
  };
}

/**
 * Create test user preference with defaults
 */
export function createUserPreference(
  userId: string,
  overrides: Partial<Omit<TestUserPreference, 'user_id'>> = {}
): TestUserPreference {
  return {
    user_id: userId,
    key: 'email_notifications_enabled',
    value: 'true',
    ...overrides,
  };
}

/**
 * Create basic seed data set (1 account, 2 expenses, 1 project)
 */
export function createBasicSeedData() {
  return {
    accounts: [createAccount({ name: 'Conta Principal', balance: 500000 })],
    expenses: [
      createExpense({ name: 'Aluguel', amount: 200000, due_day: 10 }),
      createExpense({ name: 'Internet', amount: 15000, due_day: 15 }),
    ],
    projects: [createProject({ name: 'Salário', amount: 800000 })],
  };
}

/**
 * Create full seed data set (all entity types, multiple items each)
 */
export function createFullSeedData() {
  return {
    accounts: [
      createAccount({ name: 'Nubank', type: 'checking', balance: 500000 }),
      createAccount({ name: 'Itaú Poupança', type: 'savings', balance: 200000 }),
      createAccount({ name: 'XP Investimentos', type: 'investment', balance: 1000000 }),
    ],
    expenses: [
      createExpense({ name: 'Aluguel', amount: 200000, due_day: 10 }),
      createExpense({ name: 'Internet', amount: 15000, due_day: 15 }),
      createExpense({ name: 'Energia', amount: 25000, due_day: 20 }),
    ],
    singleShotExpenses: [
      createSingleShotExpense({ name: 'Compra de Móveis', amount: 500000, date: '2025-01-25' }),
    ],
    projects: [
      createProject({ name: 'Salário', amount: 800000 }),
      createProject({ 
        name: 'Freelance', 
        amount: 200000, 
        frequency: 'monthly',
        payment_schedule: { type: 'dayOfMonth', dayOfMonth: 15 },
        certainty: 'probable' 
      }),
    ],
    singleShotIncome: [
      createSingleShotIncome({ name: 'Bônus Anual', amount: 1000000, date: '2025-02-01' }),
    ],
    creditCards: [
      createCreditCard({ name: 'Nubank Platinum', statement_balance: 300000, due_day: 15 }),
      createCreditCard({ name: 'Itaú Visa', statement_balance: 150000, due_day: 10 }),
    ],
  };
}

/**
 * Create large seed data set for performance testing (100+ items per type)
 */
export function createLargeSeedData(count: number = 100) {
  const accounts: TestAccount[] = [];
  const expenses: TestExpense[] = [];
  const projects: TestProject[] = [];

  const accountTypes: Array<'checking' | 'savings' | 'investment'> = [
    'checking',
    'savings',
    'investment',
  ];
  const frequencies: Array<'weekly' | 'biweekly' | 'twice-monthly' | 'monthly'> = [
    'weekly',
    'biweekly',
    'twice-monthly',
    'monthly',
  ];
  const certainties: Array<'guaranteed' | 'probable' | 'uncertain'> = [
    'guaranteed',
    'probable',
    'uncertain',
  ];

  for (let i = 0; i < count; i++) {
    accounts.push(
      createAccount({
        name: `Conta ${i + 1}`,
        type: accountTypes[i % 3],
        balance: Math.floor(Math.random() * 1000000) + 10000,
      })
    );

    expenses.push(
      createExpense({
        name: `Despesa ${i + 1}`,
        amount: Math.floor(Math.random() * 500000) + 5000,
        due_day: (i % 28) + 1,
      })
    );

    const freq = frequencies[i % 4];
    let payment_schedule;
    const day = (i % 28) + 1;
    
    switch (freq) {
      case 'weekly':
      case 'biweekly':
        payment_schedule = { type: 'dayOfWeek' as const, dayOfWeek: (day % 7) + 1 };
        break;
      case 'twice-monthly':
        payment_schedule = { 
          type: 'twiceMonthly' as const, 
          firstDay: day, 
          secondDay: (day + 14) % 28 + 1 
        };
        break;
      case 'monthly':
        payment_schedule = { type: 'dayOfMonth' as const, dayOfMonth: day };
        break;
    }
    
    projects.push(
      createProject({
        name: `Projeto ${i + 1}`,
        amount: Math.floor(Math.random() * 1000000) + 50000,
        frequency: freq,
        payment_schedule,
        certainty: certainties[i % 3],
      })
    );
  }

  return { accounts, expenses, projects };
}

