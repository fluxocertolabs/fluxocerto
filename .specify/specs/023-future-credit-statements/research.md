# Research: Future Credit Card Statements

**Feature**: 023-future-credit-statements  
**Date**: 2025-12-02  
**Status**: Complete

## Research Tasks

### 1. Month Progression Logic

**Question**: How should automatic month progression work when multiple months pass without user login?

**Decision**: Process all applicable month progressions sequentially at app launch

**Rationale**:
- Spec explicitly states progression check runs once per session at app launch/login
- Must handle case where user is away for 2+ months
- Sequential processing ensures data integrity (each month's statement becomes current before next)
- No background jobs needed - client-side architecture maintained

**Alternatives Considered**:
- Background jobs: Rejected - adds server complexity, violates offline-first architecture
- Single progression: Rejected - spec requires handling multiple missed months
- Lazy progression on data access: Rejected - could cause inconsistent UI states

**Implementation Approach**:
```typescript
// At app launch, calculate months passed since last progression
const monthsToProgress = getMonthsDiff(lastProgressionDate, today)
for (let i = 0; i < monthsToProgress; i++) {
  await progressMonth(creditCards, futureStatements)
}
```

---

### 2. Future Statement Storage Strategy

**Question**: Should future statements be stored as separate table or JSONB array in credit_cards?

**Decision**: Separate `future_statements` table with FK to `credit_cards`

**Rationale**:
- Consistent with existing entity patterns (accounts, expenses, projects)
- Enables individual CRUD operations without touching credit_cards table
- Simpler RLS policies (same household_id pattern)
- Better query performance for date-range filtering
- Cascade delete works naturally with FK constraint

**Alternatives Considered**:
- JSONB array in credit_cards: Rejected - complicates queries, harder to maintain unique constraint per month/year
- Separate table without FK: Rejected - loses referential integrity

**Database Schema**:
```sql
CREATE TABLE future_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE RESTRICT,
  target_month SMALLINT NOT NULL CHECK (target_month BETWEEN 1 AND 12),
  target_year SMALLINT NOT NULL CHECK (target_year >= 2020),
  amount INTEGER NOT NULL CHECK (amount >= 0),  -- Allows zero per spec
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(credit_card_id, target_month, target_year)
);
```

---

### 3. Cashflow Integration Strategy

**Question**: How should cashflow calculation use future statements vs current statement balance?

**Decision**: Lookup future statement by date; fallback to 0 if not defined

**Rationale**:
- FR-006 explicitly states: "months without a defined future statement display as R$ 0,00"
- This differs from current behavior (repeating statementBalance each month)
- Need to match statement due date (dueDay) with target month
- Current month uses `statementBalance`, future months check `future_statements`

**Alternatives Considered**:
- Repeat current balance: Rejected - explicitly contradicted by FR-006
- Carry forward last known value: Rejected - explicitly contradicted by FR-006
- Average of previous months: Rejected - not mentioned in spec, adds complexity

**Implementation Approach**:
```typescript
function getCreditCardAmountForDate(
  card: CreditCard,
  futureStatements: FutureStatement[],
  date: Date
): number {
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  const targetMonth = date.getMonth() + 1
  const targetYear = date.getFullYear()

  // Current month: use statementBalance
  if (targetMonth === currentMonth && targetYear === currentYear) {
    return card.statementBalance
  }

  // Future month: lookup future statement
  const statement = futureStatements.find(
    s => s.creditCardId === card.id && 
         s.targetMonth === targetMonth && 
         s.targetYear === targetYear
  )
  
  // Return amount or 0 if not defined
  return statement?.amount ?? 0
}
```

---

### 4. 12-Month Rolling Window Implementation

**Question**: How to enforce rolling 12-month window validation?

**Decision**: Client-side validation on form submission + database check constraint

**Rationale**:
- FR-009 requires rolling 12-month limit from current date
- Must prevent entries > 12 months ahead
- Client-side validation for UX (instant feedback)
- Database constraint as safety net for data integrity

**Alternatives Considered**:
- Client-side only: Rejected - can be bypassed
- Database trigger: Rejected - harder to debug, overkill for simple date math

**Implementation Approach**:
```typescript
// Zod schema with dynamic validation
const FutureStatementInputSchema = z.object({
  targetMonth: z.number().int().min(1).max(12),
  targetYear: z.number().int().min(2020),
  amount: z.number().int().min(0),
}).refine(
  (data) => {
    const target = new Date(data.targetYear, data.targetMonth - 1)
    const maxDate = addMonths(new Date(), 12)
    return target <= maxDate
  },
  { message: 'Fatura deve estar dentro dos próximos 12 meses' }
)
```

---

### 5. Month Progression Detection

**Question**: How to detect when month progression is needed?

**Decision**: Store last progression date in `user_preferences`, check on app launch

**Rationale**:
- Need to persist progression state across sessions
- `user_preferences` table already exists for household-scoped settings
- Simple date comparison: if current month > last checked month, trigger progression

**Alternatives Considered**:
- Store in localStorage: Rejected - doesn't sync across devices
- Store per credit card: Rejected - adds complexity, progression is global

**Implementation Approach**:
```typescript
// On app launch (use-month-progression.ts hook)
const lastChecked = await getUserPreference('last_progression_check')
const today = startOfMonth(new Date())

if (!lastChecked || new Date(lastChecked) < today) {
  await performMonthProgression()
  await setUserPreference('last_progression_check', today.toISOString())
}
```

---

### 6. UI/UX for "Próximas Faturas" Section

**Question**: How to display future statements in credit card UI?

**Decision**: Collapsible section below current statement with inline month/amount editing

**Rationale**:
- Spec shows "Próximas Faturas" section per card
- Chronological order (nearest month first)
- Empty state shows CTA "Adicionar próxima fatura"
- Matches existing inline edit pattern from balance updates

**Alternatives Considered**:
- Modal form for each: Rejected - too many clicks
- Separate page/tab: Rejected - context switching, spec shows in-card view
- Table view: Rejected - doesn't match card-based design

**Implementation Approach**:
- Extend `credit-card-card.tsx` with collapsible "Próximas Faturas" section
- New `future-statement-list.tsx` for statement list
- New `future-statement-form.tsx` for add/edit modal
- Use existing shadcn/ui components (Dialog, Button, Input)

---

### 7. Current Month Override Warning

**Question**: How to handle adding a future statement for the current month?

**Decision**: Show confirmation dialog warning about overwriting current balance

**Rationale**:
- FR-011 explicitly requires warning for current month entries
- User might accidentally overwrite their actual statement
- Confirmation pattern exists elsewhere in app (delete confirmations)

**Implementation Approach**:
```typescript
// In form submission
if (targetMonth === currentMonth && targetYear === currentYear) {
  const confirmed = await showConfirmDialog({
    title: 'Sobrescrever fatura atual?',
    message: 'Isso substituirá o valor da fatura atual. Continuar?',
  })
  if (!confirmed) return
  
  // Update statementBalance instead of creating future_statement
  await updateCreditCard(cardId, { statementBalance: amount })
}
```

---

### 8. Realtime Subscription for Future Statements

**Question**: Should future statements use Supabase Realtime?

**Decision**: Yes, enable Realtime for `future_statements` table

**Rationale**:
- Consistent with other entities (accounts, projects, expenses, credit_cards)
- Household members can see updates from other users instantly
- No additional cost (already using Realtime)

**Implementation Approach**:
```sql
-- In migration
ALTER PUBLICATION supabase_realtime ADD TABLE future_statements;
```

```typescript
// In use-finance-data.ts
const futureStatementsChannel = supabase
  .channel('future_statements_changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'future_statements' }, 
      () => refetchFutureStatements())
  .subscribe()
```

---

## Summary of Decisions

| Area | Decision |
|------|----------|
| Storage | Separate `future_statements` table with FK to `credit_cards` |
| Cashflow | Lookup by month/year; return 0 if not defined |
| Rolling Window | Client validation + database constraint (12 months) |
| Month Progression | At app launch, process all missed months sequentially |
| Progression State | Store `last_progression_check` in `user_preferences` |
| UI | Collapsible section per card, inline editing |
| Current Month | Confirmation dialog before overwriting |
| Realtime | Enabled for `future_statements` table |

