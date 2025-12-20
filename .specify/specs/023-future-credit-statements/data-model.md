# Data Model: Future Credit Card Statements

**Feature**: 023-future-credit-statements  
**Date**: 2025-12-02

## Entity Definitions

### FutureStatement (New Entity)

Represents a pre-defined credit card statement balance for a specific future month.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, auto-generated | Unique identifier |
| `creditCardId` | UUID | FK to credit_cards, NOT NULL | Parent credit card |
| `householdId` | UUID | FK to households, NOT NULL | Household scope (RLS) |
| `targetMonth` | number | 1-12, NOT NULL | Target month (1=January) |
| `targetYear` | number | ≥2020, NOT NULL | Target year |
| `amount` | number | ≥0, NOT NULL | Statement amount in cents (R$ 0,00 allowed) |
| `createdAt` | Date | NOT NULL, auto | Creation timestamp |
| `updatedAt` | Date | NOT NULL, auto | Last update timestamp |

**Constraints**:
- `UNIQUE(creditCardId, targetMonth, targetYear)` - One statement per month per card
- `CHECK(amount >= 0)` - Zero allowed, negative not allowed
- `CHECK(targetMonth BETWEEN 1 AND 12)`
- `CHECK(targetYear >= 2020)`
- Soft constraint (client-validated): Target date within 12 months from current date

**Indexes**:
- `future_statements_credit_card_id_idx` - For FK lookups
- `future_statements_household_id_idx` - For RLS policy efficiency
- `future_statements_target_date_idx` - For date-range queries (composite on targetYear, targetMonth)

### CreditCard (Extended)

The existing CreditCard entity gains a logical relationship to FutureStatement records.

| Field | Type | Change |
|-------|------|--------|
| `futureStatements` | FutureStatement[] | NEW (virtual) - populated via join in queries |

**Note**: No schema changes to `credit_cards` table. Relationship is via FK in `future_statements`.

## Relationships

```
┌─────────────────┐       ┌──────────────────────┐
│   CreditCard    │──1:N──│   FutureStatement    │
├─────────────────┤       ├──────────────────────┤
│ id              │       │ id                   │
│ name            │       │ creditCardId (FK)    │
│ statementBalance│       │ householdId (FK)     │
│ dueDay          │       │ targetMonth          │
│ householdId     │       │ targetYear           │
│ ...             │       │ amount               │
└─────────────────┘       │ ...                  │
                          └──────────────────────┘
```

## State Transitions

### FutureStatement Lifecycle

```
┌──────────────────┐
│     Created      │ ← User adds future statement
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│     Active       │ ← Waiting for target month
└────────┬─────────┘
         │
    ┌────┴────┐
    │ Month   │
    │ arrives │
    ▼         ▼
┌────────┐  ┌────────────────┐
│ Deleted│  │ Promoted to    │
│ (no    │  │ Current Balance│
│ defined│  │ (statement     │
│ value) │  │ deleted after) │
└────────┘  └────────────────┘
```

### Month Progression Rules

1. When current month changes (detected at app launch):
   - Find future statement for new current month
   - If found: Copy `amount` to `credit_cards.statementBalance`, delete future statement
   - If not found: Keep existing `statementBalance` unchanged (FR-008)
   
2. Cleanup past entries:
   - Delete any `future_statements` where `targetMonth/targetYear` < current month (FR-012)

## Validation Rules

### Creation/Update Validation

```typescript
// 1. Amount validation
amount >= 0  // Zero allowed per spec

// 2. Month validation
targetMonth >= 1 && targetMonth <= 12

// 3. Year validation
targetYear >= 2020

// 4. Rolling window validation (12 months)
const targetDate = new Date(targetYear, targetMonth - 1)
const maxDate = addMonths(startOfMonth(new Date()), 12)
targetDate <= maxDate

// 5. Uniqueness validation (per card)
!existingStatements.some(s => 
  s.creditCardId === creditCardId && 
  s.targetMonth === targetMonth && 
  s.targetYear === targetYear
)

// 6. Current month warning (FR-011)
if (targetMonth === currentMonth && targetYear === currentYear) {
  // Warn user: will overwrite current statement balance
}
```

### Deletion Rules

- Any future statement can be deleted
- Cascade delete when parent credit card is deleted (FR-010)
- Past-month entries auto-deleted during month progression (FR-012)

## TypeScript Types

### New Types

```typescript
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

// === CreditCard with Future Statements ===
export const CreditCardWithFutureStatementsSchema = CreditCardSchema.extend({
  futureStatements: z.array(FutureStatementSchema).default([]),
})

export type CreditCardWithFutureStatements = z.infer<typeof CreditCardWithFutureStatementsSchema>
```

### Helper Types

```typescript
// For UI display: formatted month/year label
export interface FormattedFutureStatement extends FutureStatement {
  monthLabel: string  // "Janeiro/2025"
  isEditable: boolean // false if month has passed
}

// For cashflow calculation: indexed lookup
export type FutureStatementMap = Map<string, FutureStatement>
// Key format: `${creditCardId}-${targetYear}-${targetMonth}`
```

## Database Migration

```sql
-- Migration: 010_future_statements
-- Feature: 023-future-credit-statements
-- Date: 2025-12-02

CREATE TABLE IF NOT EXISTS future_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE RESTRICT,
  target_month SMALLINT NOT NULL CHECK (target_month BETWEEN 1 AND 12),
  target_year SMALLINT NOT NULL CHECK (target_year >= 2020),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(credit_card_id, target_month, target_year)
);

-- Indexes
CREATE INDEX future_statements_credit_card_id_idx ON future_statements(credit_card_id);
CREATE INDEX future_statements_household_id_idx ON future_statements(household_id);
CREATE INDEX future_statements_target_date_idx ON future_statements(target_year, target_month);

-- Enable RLS
ALTER TABLE future_statements ENABLE ROW LEVEL SECURITY;

-- RLS Policies (household-scoped)
CREATE POLICY "Users can read household future_statements"
ON future_statements FOR SELECT TO authenticated
USING (household_id = get_user_household_id());

CREATE POLICY "Users can insert household future_statements"
ON future_statements FOR INSERT TO authenticated
WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can update household future_statements"
ON future_statements FOR UPDATE TO authenticated
USING (household_id = get_user_household_id())
WITH CHECK (household_id = get_user_household_id());

CREATE POLICY "Users can delete household future_statements"
ON future_statements FOR DELETE TO authenticated
USING (household_id = get_user_household_id());

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE future_statements;

-- Updated_at trigger
CREATE TRIGGER update_future_statements_updated_at
  BEFORE UPDATE ON future_statements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Integration Points

### Cashflow Calculation

The `calculateCashflow` function in `src/lib/cashflow/calculate.ts` needs modification:

```typescript
// Current: createCreditCardEvents uses card.statementBalance directly
// New: lookup future statement amount by target month

function createCreditCardEvents(
  date: Date, 
  creditCards: CreditCard[],
  futureStatements: FutureStatement[]  // NEW parameter
): ExpenseEvent[] {
  // ... lookup logic per research.md
}
```

### Finance Store

Add CRUD operations to `useFinanceStore`:
- `addFutureStatement(input: FutureStatementInput)`
- `updateFutureStatement(id: string, input: Partial<FutureStatementInput>)`
- `deleteFutureStatement(id: string)`

### Finance Data Hook

Extend `useFinanceData` to:
- Fetch future statements with credit cards
- Subscribe to realtime changes on `future_statements` table

