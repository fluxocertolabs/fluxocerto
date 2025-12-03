# Quickstart: Future Credit Card Statements

**Feature**: 023-future-credit-statements  
**Date**: 2025-12-02

## Overview

This guide provides implementation steps for the Future Credit Card Statements feature. Follow these steps in order for a smooth implementation.

## Prerequisites

- [ ] Review `spec.md` for full requirements
- [ ] Review `research.md` for design decisions
- [ ] Review `data-model.md` for entity structure
- [ ] Review `contracts/future-statement.schema.ts` for type definitions

## Implementation Order

### Phase 1: Database & Types (Foundation)

**Goal**: Establish data layer before any UI work.

#### Step 1.1: Create Database Migration

Create file: `supabase/migrations/20251202XXXXXX_future_statements.sql`

```sql
-- See data-model.md for full migration SQL
-- Key points:
-- - Create future_statements table
-- - Add indexes for performance
-- - Enable RLS with household policies
-- - Enable Realtime
```

**Test**: Run migration locally, verify table exists in Supabase dashboard.

#### Step 1.2: Add TypeScript Types

Edit: `src/types/index.ts`

```typescript
// Add at end of file:
// === Future Statement ===
export const FutureStatementInputSchema = z.object({
  creditCardId: z.string().uuid(),
  targetMonth: z.number().int().min(1).max(12),
  targetYear: z.number().int().min(2020),
  amount: z.number().int().min(0),
})

export const FutureStatementSchema = FutureStatementInputSchema.extend({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type FutureStatementInput = z.infer<typeof FutureStatementInputSchema>
export type FutureStatement = z.infer<typeof FutureStatementSchema>
```

**Test**: Run `pnpm typecheck` - should pass.

---

### Phase 2: Store & Data Layer

**Goal**: Enable CRUD operations for future statements.

#### Step 2.1: Add Store Actions

Edit: `src/stores/finance-store.ts`

Add new interface methods:

```typescript
// In FinanceStore interface:
addFutureStatement: (input: FutureStatementInput) => Promise<Result<string>>
updateFutureStatement: (id: string, input: Partial<Omit<FutureStatementInput, 'creditCardId'>>) => Promise<Result<void>>
deleteFutureStatement: (id: string) => Promise<Result<void>>
```

Implement each action following existing patterns (see `addCreditCard`, etc.).

**Test**: Unit tests for each action.

#### Step 2.2: Extend Finance Data Hook

Edit: `src/hooks/use-finance-data.ts`

- Add `futureStatements` to returned data
- Add Supabase query for `future_statements` table
- Add realtime subscription for `future_statements`

```typescript
// In useFinanceData:
const [futureStatements, setFutureStatements] = useState<FutureStatement[]>([])

// Fetch with credit cards
const { data: futureStatementsData } = await supabase
  .from('future_statements')
  .select('*')
  .order('target_year', { ascending: true })
  .order('target_month', { ascending: true })

// Realtime subscription
.on('postgres_changes', { 
  event: '*', 
  schema: 'public', 
  table: 'future_statements' 
}, handleFutureStatementChange)
```

**Test**: Verify data loads and realtime updates work.

---

### Phase 3: Cashflow Integration

**Goal**: Make cashflow projections use future statement values.

#### Step 3.1: Modify Cashflow Calculation

Edit: `src/lib/cashflow/calculate.ts`

Add `futureStatements` parameter to `CashflowEngineInput`:

```typescript
export interface CashflowEngineInput {
  // ... existing fields
  futureStatements?: FutureStatement[]
}
```

Modify `createCreditCardEvents`:

```typescript
function createCreditCardEvents(
  date: Date, 
  creditCards: CreditCard[],
  futureStatements: FutureStatement[]
): ExpenseEvent[] {
  const targetMonth = date.getMonth() + 1
  const targetYear = date.getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  const isCurrentMonth = targetMonth === currentMonth && targetYear === currentYear

  const events: ExpenseEvent[] = []

  for (const card of creditCards) {
    if (isMonthlyPaymentDue(date, card.dueDay)) {
      let amount: number

      if (isCurrentMonth) {
        // Current month: use statementBalance
        amount = card.statementBalance
      } else {
        // Future month: lookup or default to 0
        const statement = futureStatements.find(
          s => s.creditCardId === card.id && 
               s.targetMonth === targetMonth && 
               s.targetYear === targetYear
        )
        amount = statement?.amount ?? 0  // Zero if not defined (FR-006)
      }

      events.push({
        sourceId: card.id,
        sourceName: card.name,
        sourceType: 'credit_card',
        amount,
      })
    }
  }

  return events
}
```

**Test**: Unit tests with various scenarios (current month, future with statement, future without statement).

#### Step 3.2: Update Cashflow Hook

Edit: `src/hooks/use-cashflow-projection.ts`

Pass `futureStatements` to calculation:

```typescript
const projection = calculateCashflow({
  accounts,
  projects,
  expenses,
  creditCards,
  futureStatements,  // NEW
  options: { projectionDays }
})
```

**Test**: Verify cashflow chart shows correct values for future months.

---

### Phase 4: Month Progression

**Goal**: Auto-promote future statements when month changes.

#### Step 4.1: Create Month Progression Hook

Create: `src/hooks/use-month-progression.ts`

```typescript
export function useMonthProgression() {
  const [isChecking, setIsChecking] = useState(true)
  
  useEffect(() => {
    checkAndProgressMonth().finally(() => setIsChecking(false))
  }, [])

  return { isChecking }
}

async function checkAndProgressMonth() {
  const lastCheck = await getUserPreference('last_progression_check')
  const today = startOfMonth(new Date())
  
  if (!lastCheck || new Date(lastCheck) < today) {
    await performMonthProgression()
    await setUserPreference('last_progression_check', today.toISOString())
  }
}

async function performMonthProgression() {
  // 1. Get all credit cards and future statements
  // 2. For each credit card, find statement for current month
  // 3. If found, update credit card balance and delete statement
  // 4. Clean up any past-month statements
}
```

**Test**: Integration test simulating month change.

#### Step 4.2: Integrate with App Launch

Edit: `src/App.tsx` or `src/pages/dashboard.tsx`

```typescript
function Dashboard() {
  const { isChecking } = useMonthProgression()
  
  if (isChecking) {
    return <LoadingState message="Verificando atualizações..." />
  }
  
  // ... rest of dashboard
}
```

**Test**: E2E test verifying progression happens on login.

---

### Phase 5: UI Components

**Goal**: Build user interface for managing future statements.

#### Step 5.1: Future Statement List Component

Create: `src/components/manage/credit-cards/future-statement-list.tsx`

```typescript
interface FutureStatementListProps {
  creditCardId: string
  statements: FutureStatement[]
  onAdd: () => void
  onEdit: (statement: FutureStatement) => void
  onDelete: (id: string) => void
}

export function FutureStatementList({ ... }: FutureStatementListProps) {
  if (statements.length === 0) {
    return (
      <div className="text-center py-4">
        <Button variant="ghost" onClick={onAdd}>
          + Adicionar próxima fatura
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {statements.map(statement => (
        <FutureStatementItem
          key={statement.id}
          statement={statement}
          onEdit={() => onEdit(statement)}
          onDelete={() => onDelete(statement.id)}
        />
      ))}
      <Button variant="ghost" onClick={onAdd}>
        + Adicionar
      </Button>
    </div>
  )
}
```

#### Step 5.2: Future Statement Form Component

Create: `src/components/manage/credit-cards/future-statement-form.tsx`

```typescript
interface FutureStatementFormProps {
  creditCardId: string
  existingStatements: FutureStatement[]
  editingStatement?: FutureStatement
  onSubmit: (input: FutureStatementInput) => Promise<void>
  onCancel: () => void
}

export function FutureStatementForm({ ... }: FutureStatementFormProps) {
  // Form with:
  // - Month/Year selector (pre-filled with next available month)
  // - Amount input (CurrencyInput component)
  // - Save/Cancel buttons
  // - Current month warning dialog
}
```

#### Step 5.3: Extend Credit Card Card

Edit: `src/components/manage/credit-cards/credit-card-card.tsx`

Add collapsible "Próximas Faturas" section below current balance:

```typescript
// After the Balance section:
<Collapsible>
  <CollapsibleTrigger className="flex items-center gap-2">
    <ChevronDown className="h-4 w-4" />
    <span>Próximas Faturas ({futureStatements.length})</span>
  </CollapsibleTrigger>
  <CollapsibleContent>
    <FutureStatementList
      creditCardId={card.id}
      statements={futureStatements}
      onAdd={() => setShowForm(true)}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  </CollapsibleContent>
</Collapsible>
```

**Test**: Visual regression tests for all states (empty, with statements, editing).

---

### Phase 6: Testing

**Goal**: Ensure comprehensive test coverage per TR-001 to TR-004.

#### Step 6.1: Unit Tests

Create: `src/lib/cashflow/calculate.test.ts` (extend existing)

```typescript
describe('createCreditCardEvents with future statements', () => {
  it('uses statementBalance for current month')
  it('uses future statement amount when defined')
  it('returns 0 when future statement not defined')
  it('handles multiple credit cards correctly')
})
```

Create: `src/hooks/use-month-progression.test.ts`

```typescript
describe('month progression', () => {
  it('promotes future statement to current balance')
  it('keeps existing balance when no future statement')
  it('handles multiple months passing')
  it('cleans up past-month statements')
})
```

#### Step 6.2: Integration Tests

Create: `src/stores/finance-store.test.ts` (extend existing)

```typescript
describe('future statement operations', () => {
  it('adds a future statement')
  it('updates a future statement')
  it('deletes a future statement')
  it('prevents duplicate month/year')
  it('cascades on credit card delete')
})
```

#### Step 6.3: E2E Tests

Create: `e2e/future-statements.spec.ts`

```typescript
test('User Story 1 - Add Future Statement', async ({ page }) => {
  // Given a user has a credit card "Nubank"
  // When they add a future statement for "Janeiro/2025" with R$ 3.200
  // Then the future statement is displayed in "Próximas Faturas"
})

test('User Story 2 - Edit Future Statement', async ({ page }) => {
  // Given a user has a future statement for "Janeiro/2025"
  // When they edit the amount to R$ 2.800
  // Then the updated value is reflected in cashflow
})

test('User Story 3 - Automatic Progression', async ({ page }) => {
  // Given it's December 2024 with future statement for January 2025
  // When the calendar date moves to January 2025
  // Then the "Fatura Atual" shows the January value
})
```

---

## Validation Checklist

Before marking implementation complete:

- [ ] All acceptance scenarios from spec.md pass
- [ ] Unit test coverage > 80% for new code
- [ ] Visual regression tests pass
- [ ] E2E tests pass
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` succeeds
- [ ] Manual testing in browser complete
- [ ] CodeRabbit review passed

## Key Files Reference

| Purpose | File |
|---------|------|
| Feature Spec | `specs/023-future-credit-statements/spec.md` |
| Research | `specs/023-future-credit-statements/research.md` |
| Data Model | `specs/023-future-credit-statements/data-model.md` |
| Type Contracts | `specs/023-future-credit-statements/contracts/future-statement.schema.ts` |
| DB Migration | `supabase/migrations/20251202XXXXXX_future_statements.sql` |
| Types | `src/types/index.ts` |
| Store | `src/stores/finance-store.ts` |
| Cashflow | `src/lib/cashflow/calculate.ts` |
| Finance Hook | `src/hooks/use-finance-data.ts` |
| Progression Hook | `src/hooks/use-month-progression.ts` |
| Card Component | `src/components/manage/credit-cards/credit-card-card.tsx` |
| List Component | `src/components/manage/credit-cards/future-statement-list.tsx` |
| Form Component | `src/components/manage/credit-cards/future-statement-form.tsx` |

