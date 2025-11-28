# Research: Single-Shot Expenses

**Feature**: 014-single-shot-expenses  
**Date**: 2025-11-28  
**Status**: Complete

## Research Questions

This document captures research findings for key technical decisions in implementing single-shot (one-time) expenses.

---

## 1. Database Schema Strategy: Extend vs. New Table

### Question
Should single-shot expenses be stored in a new table or extend the existing `expenses` table?

### Decision
**Extend the existing `expenses` table** with a `type` discriminator column.

### Rationale

The spec explicitly states: "Extend existing expenses table with `type` column, properly organized to support both fixed and single-shot types."

Benefits of this approach:
1. **Single source of truth** - All expenses in one table simplifies queries
2. **Shared infrastructure** - Reuses existing RLS policies, realtime subscriptions, and triggers
3. **Simpler UI state** - One data source for the expenses tab
4. **Easier migration** - Just add columns, no data movement needed

### Schema Design

```sql
-- Add type discriminator and date column to expenses table
ALTER TABLE expenses ADD COLUMN type TEXT NOT NULL DEFAULT 'fixed' 
  CHECK (type IN ('fixed', 'single_shot'));
ALTER TABLE expenses ADD COLUMN date DATE;

-- Rename due_day to day_of_month for clarity (optional but recommended)
-- Actually: Keep as due_day for backward compatibility

-- Add constraint: fixed expenses must have due_day, single_shot must have date
ALTER TABLE expenses ADD CONSTRAINT expense_type_fields CHECK (
  (type = 'fixed' AND due_day IS NOT NULL AND date IS NULL) OR
  (type = 'single_shot' AND date IS NOT NULL AND due_day IS NULL)
);
```

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| New `single_shot_expenses` table | Spec explicitly requires extending existing table; would duplicate RLS policies, triggers, and complicate UI state |
| JSONB for flexible fields | Over-engineering; discriminated union with CHECK constraints is cleaner |
| Nullable fields without constraints | Allows invalid states; CHECK constraints ensure data integrity |

---

## 2. TypeScript Type Strategy: Discriminated Union vs. Optional Fields

### Question
How should the TypeScript types model the fixed vs. single-shot expense distinction?

### Decision
**Discriminated union with shared base type** using Zod schemas.

### Rationale

TypeScript's discriminated unions provide:
1. **Type safety** - Compiler enforces correct field access based on `type`
2. **Exhaustive checking** - Switch statements catch unhandled cases
3. **Clear intent** - Code documents which fields apply to which type
4. **Zod integration** - `z.discriminatedUnion` validates at runtime

### Implementation Pattern

```typescript
// Base fields shared by all expense types
const ExpenseBaseSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().positive(),
})

// Fixed expense (recurring monthly)
const FixedExpenseInputSchema = ExpenseBaseSchema.extend({
  type: z.literal('fixed'),
  dueDay: z.number().int().min(1).max(31),
  isActive: z.boolean().default(true),
})

// Single-shot expense (one-time on specific date)
const SingleShotExpenseInputSchema = ExpenseBaseSchema.extend({
  type: z.literal('single_shot'),
  date: z.date(), // or z.string() for ISO date string
})

// Discriminated union for input
const ExpenseInputSchema = z.discriminatedUnion('type', [
  FixedExpenseInputSchema,
  SingleShotExpenseInputSchema,
])
```

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| Single type with all optional fields | Allows invalid combinations; no compile-time safety |
| Separate unrelated types | Loses ability to handle both in unified collections |
| Class hierarchy | Over-engineering; Zod schemas with discriminated unions are simpler |

---

## 3. Cashflow Integration Strategy

### Question
How should single-shot expenses be integrated into the cashflow calculation engine?

### Decision
**Extend `createFixedExpenseEvents` to handle both types** with date-based matching for single-shot expenses.

### Rationale

The existing cashflow engine processes expenses by checking if `expense.dueDay` matches the current day of month. For single-shot expenses, we check if the expense's specific `date` matches the projection date.

Key considerations from spec:
1. Single-shot expenses appear on their **exact date** (not recurring)
2. They appear in **both** optimistic and pessimistic scenarios (certain expenses)
3. No `isActive` toggle for single-shot expenses (always included if within projection period)

### Implementation Pattern

```typescript
function createExpenseEvents(
  date: Date,
  fixedExpenses: FixedExpense[],
  singleShotExpenses: SingleShotExpense[]
): ExpenseEvent[] {
  const events: ExpenseEvent[] = []
  
  // Fixed expenses: check day of month
  const dayOfMonth = getDate(date)
  for (const expense of fixedExpenses) {
    if (expense.isActive && getEffectiveDay(expense.dueDay, date) === dayOfMonth) {
      events.push({
        sourceId: expense.id,
        sourceName: expense.name,
        sourceType: 'expense',
        amount: expense.amount,
      })
    }
  }
  
  // Single-shot expenses: check exact date match
  for (const expense of singleShotExpenses) {
    if (isSameDay(expense.date, date)) {
      events.push({
        sourceId: expense.id,
        sourceName: expense.name,
        sourceType: 'expense', // or 'single_shot_expense' for distinction
        amount: expense.amount,
      })
    }
  }
  
  return events
}
```

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| Separate calculation function | Duplicates logic; single function handles both cleanly |
| New `sourceType` value | Could add 'single_shot' but 'expense' is sufficient for cashflow display |
| Filter in validators | Better to pass both types to calculation and filter there |

---

## 4. UI Organization: Tabs vs. Sections

### Question
How should fixed and single-shot expenses be organized in the Manage page UI?

### Decision
**Sub-tabs within the Expenses tab**: "Fixas" and "Pontuais"

### Rationale

The spec explicitly states: "Sub-tab under existing 'Despesas' section with tabs: 'Fixas' / 'Pontuais'"

Benefits:
1. **Clear separation** - Users understand the distinction
2. **Focused lists** - Each tab shows only relevant expenses
3. **Consistent pattern** - Tabs are already used in the app
4. **Scalable** - Easy to add more expense types later if needed

### Implementation Pattern

```tsx
// Inside ExpenseList component or new ExpenseSection component
<Tabs defaultValue="fixed">
  <TabsList>
    <TabsTrigger value="fixed">Fixas</TabsTrigger>
    <TabsTrigger value="single_shot">Pontuais</TabsTrigger>
  </TabsList>
  <TabsContent value="fixed">
    <FixedExpenseList expenses={fixedExpenses} ... />
  </TabsContent>
  <TabsContent value="single_shot">
    <SingleShotExpenseList expenses={singleShotExpenses} ... />
  </TabsContent>
</Tabs>
```

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| Combined list with type badges | Harder to scan; spec requires separation |
| Accordion sections | Tabs are more discoverable and consistent with app patterns |
| Separate top-level tabs | Over-complicates navigation; expenses should stay together |

---

## 5. Date Handling: Date Object vs. ISO String

### Question
Should the `date` field for single-shot expenses use JavaScript `Date` objects or ISO date strings?

### Decision
**Use `Date` objects in TypeScript, ISO strings in database/API**

### Rationale

Following existing patterns in the codebase:
1. Database stores dates as `DATE` type (ISO format)
2. TypeScript uses `Date` objects for manipulation
3. Zod schemas handle conversion at boundaries
4. `date-fns` functions work with `Date` objects

The `use-finance-data.ts` hook already maps database timestamps to `Date` objects.

### Implementation Pattern

```typescript
// Zod schema for input (accepts ISO string or Date)
const SingleShotExpenseInputSchema = z.object({
  type: z.literal('single_shot'),
  date: z.coerce.date(), // Coerces string to Date
  // ...
})

// Database row type
interface ExpenseRow {
  // ...
  date: string | null // ISO date string from PostgreSQL
}

// Mapping function
function mapExpenseFromDb(row: ExpenseRow): Expense {
  if (row.type === 'single_shot') {
    return {
      type: 'single_shot',
      date: new Date(row.date!),
      // ...
    }
  }
  // ... fixed expense mapping
}
```

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| Store as timestamp | DATE is more appropriate for calendar dates (no timezone issues) |
| Keep as string everywhere | Requires manual parsing for comparisons; Date objects are cleaner |
| Use dayjs/moment | date-fns is already in use; no need for additional library |

---

## 6. Empty State and List Sorting

### Question
How should the single-shot expense list handle empty state and sorting?

### Decision
**Chronological sort by date, with visual distinction for past expenses**

### Rationale

From spec:
1. Empty state: Illustrated graphic + "Nenhuma despesa pontual cadastrada" + CTA
2. Sorting: Chronological order by date
3. Past expenses: Visually distinguished (muted styling, "Vencido" badge)
4. Today: Show "Hoje" indicator

### Implementation Pattern

```typescript
// Sort single-shot expenses chronologically
const sortedExpenses = [...singleShotExpenses].sort(
  (a, b) => a.date.getTime() - b.date.getTime()
)

// Determine status for display
function getExpenseStatus(date: Date): 'past' | 'today' | 'future' {
  const today = startOfDay(new Date())
  const expenseDate = startOfDay(date)
  
  if (isBefore(expenseDate, today)) return 'past'
  if (isSameDay(expenseDate, today)) return 'today'
  return 'future'
}
```

### Visual Treatment

| Status | Styling |
|--------|---------|
| Past | Muted text color, "Vencido" badge |
| Today | Normal styling, "Hoje" badge (accent color) |
| Future | Normal styling, formatted date |

---

## 7. Migration Strategy

### Question
How should existing fixed expenses be migrated when adding the `type` column?

### Decision
**Default existing rows to `type = 'fixed'` with non-null constraint**

### Rationale

1. All existing expenses are fixed (recurring monthly)
2. Adding `DEFAULT 'fixed'` automatically sets type for existing rows
3. No data loss or manual migration needed
4. New constraint ensures data integrity going forward

### Migration SQL

```sql
-- Add type column with default for existing rows
ALTER TABLE expenses 
  ADD COLUMN type TEXT NOT NULL DEFAULT 'fixed' 
  CHECK (type IN ('fixed', 'single_shot'));

-- Add date column (nullable, required only for single_shot)
ALTER TABLE expenses ADD COLUMN date DATE;

-- Make due_day nullable (required only for fixed)
ALTER TABLE expenses ALTER COLUMN due_day DROP NOT NULL;

-- Add constraint to enforce type-specific fields
ALTER TABLE expenses ADD CONSTRAINT expense_type_fields CHECK (
  (type = 'fixed' AND due_day IS NOT NULL) OR
  (type = 'single_shot' AND date IS NOT NULL)
);

-- Add index for date queries
CREATE INDEX IF NOT EXISTS expenses_date_idx ON expenses(date) WHERE type = 'single_shot';
```

---

## 8. Store Actions Design

### Question
Should single-shot expenses have separate store actions or extend existing expense actions?

### Decision
**Separate actions for single-shot expenses** with clear naming.

### Rationale

While the database uses a unified table, the TypeScript API benefits from explicit separation:
1. **Type safety** - Different input shapes require different validation
2. **Clear intent** - `addSingleShotExpense` vs `addExpense` is unambiguous
3. **Simpler forms** - Each form submits to its specific action
4. **Easier testing** - Actions can be tested independently

### Action Names

| Action | Description |
|--------|-------------|
| `addSingleShotExpense` | Create new single-shot expense |
| `updateSingleShotExpense` | Update existing single-shot expense |
| `deleteSingleShotExpense` | Delete single-shot expense |

Note: No `toggleActive` for single-shot expenses (always active per spec).

---

## Summary of Decisions

| Topic | Decision |
|-------|----------|
| Database schema | Extend `expenses` table with `type` discriminator |
| TypeScript types | Discriminated union with Zod schemas |
| Cashflow integration | Extend expense event creation with date matching |
| UI organization | Sub-tabs "Fixas" / "Pontuais" within Expenses section |
| Date handling | `Date` objects in TS, ISO strings in DB |
| List behavior | Chronological sort, visual past/today/future distinction |
| Migration | Default existing to `type = 'fixed'`, add constraints |
| Store actions | Separate actions for type safety |

