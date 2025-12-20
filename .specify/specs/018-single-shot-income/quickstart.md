# Quickstart: Single-Shot Income

**Feature**: 018-single-shot-income  
**Date**: 2025-11-28  
**Status**: Ready for Implementation

## Overview

This guide provides a step-by-step implementation path for adding single-shot income support. Follow the order below to minimize integration issues.

---

## Prerequisites

- [ ] Feature 014-single-shot-expenses is complete (provides the pattern to follow)
- [ ] Branch `018-single-shot-income` is checked out
- [ ] Development server runs without errors (`pnpm dev`)

---

## Implementation Order

### Phase 1: Database Migration

**File**: `supabase/migrations/008_single_shot_income.sql`

See `data-model.md` section "Migration: 008_single_shot_income.sql" for complete migration SQL.

**Apply migration**: Run via Supabase Dashboard SQL Editor or CLI.

---

### Phase 2: TypeScript Types

**File**: `src/types/index.ts`

Add after the existing `Project` types (around line 126):

```typescript
// === Project Types ===

// Project type discriminator
export const ProjectTypeSchema = z.enum(['recurring', 'single_shot'])
export type ProjectType = z.infer<typeof ProjectTypeSchema>

// === Recurring Project (existing Project, renamed) ===
// Keep existing ProjectInputSchema and ProjectSchema but rename internally

// === Single-Shot Income ===
export const SingleShotIncomeInputSchema = z.object({
  type: z.literal('single_shot'),
  name: z.string().min(1, 'Nome da receita é obrigatório').max(100),
  amount: z.number().positive('Valor deve ser positivo'),
  date: z.coerce.date(),
  certainty: z.enum(['guaranteed', 'probable', 'uncertain']),
})

export const SingleShotIncomeSchema = SingleShotIncomeInputSchema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type SingleShotIncomeInput = z.infer<typeof SingleShotIncomeInputSchema>
export type SingleShotIncome = z.infer<typeof SingleShotIncomeSchema>

// Type guard
export function isSingleShotIncome(project: unknown): project is SingleShotIncome {
  return typeof project === 'object' && project !== null && 
    'type' in project && project.type === 'single_shot'
}
```

---

### Phase 3: Supabase Types

**File**: `src/lib/supabase.ts`

Update `ProjectRow` interface:

```typescript
export interface ProjectRow {
  id: string
  name: string
  amount: number
  type: 'recurring' | 'single_shot'  // NEW
  frequency: 'weekly' | 'biweekly' | 'twice-monthly' | 'monthly' | null  // Now nullable
  payment_schedule: PaymentScheduleJson | null  // Now nullable
  certainty: 'guaranteed' | 'probable' | 'uncertain'
  is_active: boolean | null  // Now nullable
  date: string | null  // NEW: ISO date string
  created_at: string
  updated_at: string
}
```

---

### Phase 4: Finance Store

**File**: `src/stores/finance-store.ts`

Add single-shot income state and actions:

```typescript
interface FinanceState {
  // ... existing state
  singleShotIncome: SingleShotIncome[]  // NEW
}

interface FinanceActions {
  // ... existing actions
  addSingleShotIncome: (input: SingleShotIncomeInput) => Promise<Result<SingleShotIncome>>
  updateSingleShotIncome: (id: string, input: Partial<SingleShotIncomeInput>) => Promise<Result<SingleShotIncome>>
  deleteSingleShotIncome: (id: string) => Promise<Result<void>>
}

// Initial state
singleShotIncome: [],

// Actions implementation
addSingleShotIncome: async (input) => {
  const validation = SingleShotIncomeInputSchema.safeParse(input)
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0]?.message ?? 'Validation failed' }
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('projects')
    .insert({
      type: 'single_shot',
      name: input.name,
      amount: input.amount,
      date: input.date.toISOString().split('T')[0],
      certainty: input.certainty,
      frequency: null,
      payment_schedule: null,
      is_active: null,
    })
    .select()
    .single()

  if (error) return handleSupabaseError(error)

  const mapped = mapSingleShotIncomeFromDb(data)
  set((state) => ({ singleShotIncome: [...state.singleShotIncome, mapped] }))
  return { success: true, data: mapped }
},

// Similar for update and delete...
```

---

### Phase 5: Data Hook

**File**: `src/hooks/use-finance-data.ts`

Update project mapping and add single-shot income handling:

```typescript
// Add mapping function
function mapSingleShotIncomeFromDb(row: ProjectRow): SingleShotIncome {
  return {
    id: row.id,
    type: 'single_shot',
    name: row.name,
    amount: row.amount,
    date: new Date(row.date!),
    certainty: row.certainty,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

// In the projects fetch, separate by type:
const { data: projectsData } = await supabase.from('projects').select('*')

const recurringProjects = projectsData
  ?.filter(p => p.type === 'recurring')
  .map(mapProjectFromDb) ?? []

const singleShotIncome = projectsData
  ?.filter(p => p.type === 'single_shot')
  .map(mapSingleShotIncomeFromDb) ?? []
```

---

### Phase 6: Cashflow Engine

**File**: `src/lib/cashflow/calculate.ts`

Add single-shot income event creation:

```typescript
import type { SingleShotIncome } from '../../types'

// Add to CashflowEngineInput
singleShotIncome?: SingleShotIncome[]

// Add function
function createSingleShotIncomeEvents(
  date: Date,
  income: SingleShotIncome[]
): IncomeEvent[] {
  const events: IncomeEvent[] = []

  for (const item of income) {
    if (isSameDay(item.date, date)) {
      events.push({
        projectId: item.id,
        projectName: item.name,
        amount: item.amount,
        certainty: item.certainty,
      })
    }
  }

  return events
}

// In calculateCashflow, add to daily loop:
const singleShotIncomeEvents = createSingleShotIncomeEvents(
  date,
  validated.singleShotIncome
)

// Merge with recurring income events:
const allIncomeEvents = [...recurringIncomeEvents, ...singleShotIncomeEvents]
```

**File**: `src/lib/cashflow/validators.ts`

Add single-shot income to input:

```typescript
export interface CashflowEngineInput {
  // ... existing
  singleShotIncome?: SingleShotIncome[]
}

export interface ValidatedInput {
  // ... existing
  singleShotIncome: SingleShotIncome[]
}
```

---

### Phase 7: UI Components

**Create new files** in `src/components/manage/projects/`:

1. `project-section.tsx` - Tab container (copy pattern from `expense-section.tsx`)
2. `single-shot-income-form.tsx` - Create/edit form (copy from `single-shot-expense-form.tsx`)
3. `single-shot-income-list.tsx` - List component (copy from `single-shot-expense-list.tsx`)
4. `single-shot-income-list-item.tsx` - List item (copy from `single-shot-expense-list-item.tsx`)

**Key differences from expenses**:
- Add certainty level selector (dropdown with: Garantida, Provável, Incerta)
- Labels in Portuguese: "Receita Pontual", "Adicionar Receita Pontual"
- Empty state message from spec

---

### Phase 8: Manage Page Integration

**File**: `src/pages/Manage.tsx`

Replace direct ProjectList usage with ProjectSection:

```typescript
import { ProjectSection } from '@/components/manage/projects/project-section'

// In the projects section:
<ProjectSection
  recurringProjects={projects.filter(p => p.type === 'recurring')}
  singleShotIncome={singleShotIncome}
  onAddRecurring={() => setShowProjectForm(true)}
  onAddSingleShot={() => setShowSingleShotIncomeForm(true)}
  onEditRecurring={handleEditProject}
  onEditSingleShot={handleEditSingleShotIncome}
  onDeleteRecurring={handleDeleteProject}
  onDeleteSingleShot={handleDeleteSingleShotIncome}
  onToggleRecurringActive={handleToggleProjectActive}
/>
```

---

## Testing Checklist

### Unit Tests

- [ ] `SingleShotIncomeInputSchema` validates correctly
- [ ] `isSingleShotIncome` type guard works
- [ ] `createSingleShotIncomeEvents` creates events on correct date
- [ ] Certainty filtering works in cashflow calculation

### Integration Tests

- [ ] CRUD operations persist to Supabase
- [ ] Realtime updates work
- [ ] Cashflow includes single-shot income

### Manual Tests (from spec)

- [ ] Create single-shot income in < 30 seconds
- [ ] Income appears on exact date in cashflow
- [ ] Guaranteed income in both scenarios
- [ ] Probable/uncertain income only in optimistic
- [ ] Past income shows "Recebido" badge
- [ ] List sorted chronologically

---

## Verification Commands

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Tests
pnpm test

# Build
pnpm build
```

---

## Common Issues

### Migration fails with constraint error
**Cause**: Existing projects have NULL values in required fields.
**Fix**: Ensure default values are set before adding constraint.

### Type errors after migration
**Cause**: `ProjectRow` interface not updated.
**Fix**: Update `src/lib/supabase.ts` with nullable fields.

### Cashflow doesn't show single-shot income
**Cause**: `singleShotIncome` not passed to `calculateCashflow`.
**Fix**: Update `use-cashflow-projection.ts` to include single-shot income.

### Certainty not filtering correctly
**Cause**: Missing certainty field in income events.
**Fix**: Ensure `createSingleShotIncomeEvents` includes certainty in events.

