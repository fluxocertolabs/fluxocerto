# Research: Single-Shot Income

**Feature**: 018-single-shot-income  
**Date**: 2025-11-28  
**Status**: Complete

## Research Questions

This document captures research findings for key technical decisions in implementing single-shot (one-time) income.

---

## 1. Database Schema Strategy: Extend vs. New Table

### Question
Should single-shot income be stored in a new table or extend the existing `projects` table?

### Decision
**Extend the existing `projects` table** with a `type` discriminator column.

### Rationale

The spec explicitly states: "Extend existing projects table with `type` column, properly organized to support both recurring and single-shot types."

This follows the exact same pattern established by feature 014-single-shot-expenses, which extended the `expenses` table with a `type` discriminator.

Benefits of this approach:
1. **Single source of truth** - All income sources in one table simplifies queries
2. **Shared infrastructure** - Reuses existing RLS policies, realtime subscriptions, and triggers
3. **Simpler UI state** - One data source for the projects section
4. **Easier migration** - Just add columns, no data movement needed
5. **Proven pattern** - Already validated with single-shot expenses

### Schema Design

```sql
-- Add type discriminator with default for existing rows
ALTER TABLE projects 
  ADD COLUMN type TEXT NOT NULL DEFAULT 'recurring' 
  CHECK (type IN ('recurring', 'single_shot'));

-- Add date column for single-shot income
ALTER TABLE projects ADD COLUMN date DATE;

-- Make recurring-specific fields nullable
ALTER TABLE projects ALTER COLUMN frequency DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN payment_schedule DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN is_active DROP NOT NULL;

-- Add constraint: type determines required fields
ALTER TABLE projects ADD CONSTRAINT project_type_fields CHECK (
  (type = 'recurring' AND frequency IS NOT NULL AND payment_schedule IS NOT NULL AND is_active IS NOT NULL AND date IS NULL) OR
  (type = 'single_shot' AND date IS NOT NULL AND frequency IS NULL AND payment_schedule IS NULL)
);
```

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| New `single_shot_income` table | Spec explicitly requires extending existing table; would duplicate RLS policies, triggers, and complicate UI state |
| JSONB for flexible fields | Over-engineering; discriminated union with CHECK constraints is cleaner |
| Separate certainty handling | Spec requires same certainty levels as recurring projects |

---

## 2. Certainty Level Behavior

### Question
How should certainty levels affect single-shot income visibility in cashflow scenarios?

### Decision
**Follow the same rules as recurring projects:**
- `guaranteed`: Appears in both optimistic and pessimistic scenarios
- `probable`: Appears only in optimistic scenario
- `uncertain`: Appears only in optimistic scenario

### Rationale

The spec explicitly states: "Single-shot income uses the same certainty levels as recurring projects (guaranteed, probable, uncertain) and follows the same scenario rules."

This is consistent with the existing cashflow calculation logic in `src/lib/cashflow/calculate.ts`:
- `calculateOptimisticIncome()` includes all income events
- `calculatePessimisticIncome()` filters to `certainty === 'guaranteed'` only

### Implementation

The existing `IncomeEvent` type already includes a `certainty` field, so single-shot income events can use the same filtering logic without modification to the scenario calculation.

---

## 3. TypeScript Type Strategy

### Question
How should single-shot income types be structured in TypeScript?

### Decision
**Use discriminated union pattern** matching single-shot expenses.

### Rationale

This provides:
1. Type-safe compile-time checking
2. Exhaustive switch statements
3. Consistent pattern with expenses
4. Clear separation of type-specific fields

### Type Structure

```typescript
// Project type discriminator
export const ProjectTypeSchema = z.enum(['recurring', 'single_shot'])
export type ProjectType = z.infer<typeof ProjectTypeSchema>

// Recurring project (existing, renamed)
export const RecurringProjectInputSchema = z.object({
  type: z.literal('recurring'),
  name: z.string().min(1).max(100),
  amount: z.number().positive(),
  frequency: FrequencySchema,
  paymentSchedule: PaymentScheduleSchema,
  certainty: z.enum(['guaranteed', 'probable', 'uncertain']),
  isActive: z.boolean().default(true),
})

// Single-shot income (new)
export const SingleShotIncomeInputSchema = z.object({
  type: z.literal('single_shot'),
  name: z.string().min(1).max(100),
  amount: z.number().positive(),
  date: z.coerce.date(),
  certainty: z.enum(['guaranteed', 'probable', 'uncertain']),
})

// Unified project type
export const ProjectInputSchema = z.discriminatedUnion('type', [
  RecurringProjectInputSchema,
  SingleShotIncomeInputSchema,
])
```

---

## 4. UI Tab Structure

### Question
How should single-shot income be organized in the Manage page UI?

### Decision
**Sub-tabs under "Projetos" section**: "Recorrentes" and "Pontuais"

### Rationale

The spec explicitly states: "Single-shot income will be accessible via a sub-tab under the existing 'Projetos' section, with tabs labeled 'Recorrentes' and 'Pontuais'."

This mirrors the exact pattern used for expenses (sub-tabs "Fixas" and "Pontuais" under "Despesas").

### Implementation

Create a new `ProjectSection` component following the `ExpenseSection` pattern:

```typescript
// src/components/manage/projects/project-section.tsx
export function ProjectSection({
  recurringProjects,
  singleShotIncome,
  onAddRecurring,
  onAddSingleShot,
  // ... other handlers
}: ProjectSectionProps) {
  return (
    <Tabs defaultValue="recurring" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="recurring">Recorrentes</TabsTrigger>
        <TabsTrigger value="single_shot">Pontuais</TabsTrigger>
      </TabsList>
      {/* Tab contents */}
    </Tabs>
  )
}
```

---

## 5. Cashflow Integration

### Question
How should single-shot income be integrated into the cashflow calculation engine?

### Decision
**Add parallel to single-shot expenses** with certainty-based filtering.

### Rationale

The cashflow engine already handles single-shot expenses. Single-shot income follows the same pattern but with certainty filtering (unlike expenses which are always included).

### Implementation

1. Add `singleShotIncome?: SingleShotIncome[]` to `CashflowEngineInput`
2. Add `createSingleShotIncomeEvents()` function in `calculate.ts`
3. Filter by certainty when creating events (same as recurring projects)
4. Include events in daily snapshot `incomeEvents` array

```typescript
function createSingleShotIncomeEvents(
  date: Date,
  income: SingleShotIncome[],
  scenario: 'optimistic' | 'pessimistic'
): IncomeEvent[] {
  return income
    .filter(item => {
      if (!isSameDay(item.date, date)) return false
      if (scenario === 'pessimistic' && item.certainty !== 'guaranteed') return false
      return true
    })
    .map(item => ({
      projectId: item.id,
      projectName: item.name,
      amount: item.amount,
      certainty: item.certainty,
    }))
}
```

---

## 6. Past Income Visual Distinction

### Question
How should past single-shot income be visually distinguished in the list?

### Decision
**Muted styling with "Recebido" badge** for income with dates in the past.

### Rationale

The spec states: "System MUST visually distinguish past income entries from upcoming entries" and suggests "(e.g., muted styling, 'Recebido' badge)".

This is determined at render time by comparing the income's date to the current date - no database field needed.

### Implementation

```typescript
function SingleShotIncomeListItem({ income }: { income: SingleShotIncome }) {
  const isPast = isBefore(income.date, startOfDay(new Date()))
  
  return (
    <div className={cn(isPast && 'opacity-60')}>
      {isPast && <Badge variant="secondary">Recebido</Badge>}
      {/* ... rest of item */}
    </div>
  )
}
```

---

## 7. Empty State Content

### Question
What should be displayed when no single-shot income exists?

### Decision
Use the standard `EntityEmptyState` component with income-specific messaging.

### Content (from spec)

- Message: "Nenhuma receita pontual cadastrada"
- Subtext: "Adicione receitas que ocorrem uma única vez, como restituição de IR, bônus ou venda de bens"
- CTA: "Adicionar Receita Pontual"

---

## 8. Date Picker Component

### Question
Which date picker component should be used?

### Decision
Use the existing shadcn/ui `Calendar` component with `Popover`, same as single-shot expenses.

### Rationale

The spec states: "The date picker will use a standard calendar date picker component (same as single-shot expenses)."

The single-shot expense form already implements this pattern, which can be reused.

---

## Summary

All technical decisions align with:
1. Existing patterns from 014-single-shot-expenses
2. Constitution.md requirements
3. Feature specification requirements

No NEEDS CLARIFICATION items remain.

