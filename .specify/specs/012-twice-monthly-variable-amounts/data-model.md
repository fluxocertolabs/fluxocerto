# Data Model: Twice-Monthly Variable Amounts

**Feature**: 012-twice-monthly-variable-amounts  
**Date**: 2025-11-27

## Entity Changes

### TwiceMonthlySchedule (Extended)

**Location**: `src/types/index.ts`

**Current Schema**:
```typescript
export const TwiceMonthlyScheduleSchema = z.object({
  type: z.literal('twiceMonthly'),
  firstDay: z.number().int().min(1).max(31),
  secondDay: z.number().int().min(1).max(31),
}).refine((data) => data.firstDay !== data.secondDay, {
  message: 'Both payment days must be different',
  path: ['secondDay'],
})
```

**Updated Schema**:
```typescript
export const TwiceMonthlyScheduleSchema = z.object({
  type: z.literal('twiceMonthly'),
  firstDay: z.number().int().min(1).max(31, 'First day must be 1-31'),
  secondDay: z.number().int().min(1).max(31, 'Second day must be 1-31'),
  // NEW: Optional variable amounts (in cents, matching project.amount format)
  firstAmount: z.number().positive('First amount must be positive').optional(),
  secondAmount: z.number().positive('Second amount must be positive').optional(),
})
.refine((data) => data.firstDay !== data.secondDay, {
  message: 'Both payment days must be different',
  path: ['secondDay'],
})
.refine(
  (data) => {
    const hasFirst = data.firstAmount !== undefined
    const hasSecond = data.secondAmount !== undefined
    // Either both present or both absent
    return hasFirst === hasSecond
  },
  {
    message: 'Both amounts are required when variable amounts is enabled',
    path: ['secondAmount'],
  }
)
```

**TypeScript Type**:
```typescript
export type TwiceMonthlySchedule = {
  type: 'twiceMonthly'
  firstDay: number      // 1-31
  secondDay: number     // 1-31
  firstAmount?: number  // cents (optional)
  secondAmount?: number // cents (optional)
}
```

### Project (Unchanged)

The `Project` entity remains unchanged. The `amount` field continues to serve as the default/fallback amount when variable amounts are not configured.

```typescript
export type Project = {
  id: string
  name: string
  amount: number              // Default amount in cents
  frequency: Frequency
  paymentSchedule: PaymentSchedule
  certainty: 'guaranteed' | 'probable' | 'uncertain'
  isActive: boolean
  paymentDay?: number         // Legacy field
  createdAt: Date
  updatedAt: Date
}
```

## Database Schema

### projects.payment_schedule JSONB

**No SQL migration required.** The existing JSONB column supports the extended schema.

**Example Values**:

Single amount (existing behavior):
```json
{
  "type": "twiceMonthly",
  "firstDay": 5,
  "secondDay": 20
}
```

Variable amounts (new feature):
```json
{
  "type": "twiceMonthly",
  "firstDay": 5,
  "secondDay": 20,
  "firstAmount": 300000,
  "secondAmount": 50000
}
```

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| firstDay | 1-31, integer | "First day must be 1-31" |
| secondDay | 1-31, integer, ≠ firstDay | "Second day must be 1-31" / "Both payment days must be different" |
| firstAmount | positive number, optional | "First amount must be positive" |
| secondAmount | positive number, optional | "Second amount must be positive" |
| firstAmount + secondAmount | both present or both absent | "Both amounts are required when variable amounts is enabled" |

## State Transitions

### Toggle Enable Flow

```
State: Single Amount Mode
  ├── paymentSchedule: { type: 'twiceMonthly', firstDay, secondDay }
  └── project.amount: X

User enables "Valores diferentes para cada dia" toggle

State: Variable Amounts Mode
  └── paymentSchedule: { 
        type: 'twiceMonthly', 
        firstDay, 
        secondDay,
        firstAmount: X,      // Pre-populated from project.amount
        secondAmount: null   // User must fill
      }
```

### Toggle Disable Flow

```
State: Variable Amounts Mode
  └── paymentSchedule: { 
        type: 'twiceMonthly', 
        firstDay, 
        secondDay,
        firstAmount: A,
        secondAmount: B
      }

User disables "Valores diferentes para cada dia" toggle

State: Single Amount Mode
  ├── paymentSchedule: { type: 'twiceMonthly', firstDay, secondDay }
  └── project.amount: A  // First amount becomes the single amount
```

## Cashflow Engine Impact

### Amount Resolution Logic

When calculating income events for a twice-monthly project:

```typescript
function getAmountForPaymentDay(
  project: Project,
  schedule: TwiceMonthlySchedule,
  isFirstDay: boolean
): number {
  if (schedule.firstAmount !== undefined && schedule.secondAmount !== undefined) {
    // Variable amounts mode
    return isFirstDay ? schedule.firstAmount : schedule.secondAmount
  }
  // Fallback to project's base amount
  return project.amount
}
```

### Income Event Generation

The `IncomeEvent` type remains unchanged. The `amount` field will contain the resolved amount (either variable or base):

```typescript
interface IncomeEvent {
  projectId: string
  projectName: string
  amount: number      // Resolved amount for this specific payment day
  certainty: 'guaranteed' | 'probable' | 'uncertain'
}
```

## Backward Compatibility

| Scenario | Behavior |
|----------|----------|
| Existing project without variable amounts | Uses `project.amount` for both days |
| New project with variable amounts | Uses `firstAmount`/`secondAmount` for respective days |
| Edit existing project, enable variable amounts | Pre-populates first amount, requires second |
| Edit existing project, disable variable amounts | Removes variable amounts, uses first as base |

