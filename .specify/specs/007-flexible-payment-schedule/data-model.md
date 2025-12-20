# Data Model: Flexible Payment Schedule

**Feature**: 007-flexible-payment-schedule  
**Date**: 2025-11-27  
**Status**: Complete

## Entity Changes

### PaymentSchedule (New Union Type)

A discriminated union representing when payments occur, varying by frequency type.

```typescript
// src/types/index.ts

/**
 * Payment schedule for weekly/biweekly frequencies.
 * Uses ISO 8601 day numbering: 1 = Monday, 7 = Sunday
 */
export const DayOfWeekScheduleSchema = z.object({
  type: z.literal('dayOfWeek'),
  dayOfWeek: z.number().int().min(1).max(7, 'Day of week must be 1-7 (Monday-Sunday)'),
})

/**
 * Payment schedule for monthly frequency.
 * Day of month (1-31), with month-end handling for shorter months.
 */
export const DayOfMonthScheduleSchema = z.object({
  type: z.literal('dayOfMonth'),
  dayOfMonth: z.number().int().min(1).max(31, 'Day of month must be 1-31'),
})

/**
 * Payment schedule for twice-monthly frequency.
 * Two distinct days of month (1-31).
 */
export const TwiceMonthlyScheduleSchema = z.object({
  type: z.literal('twiceMonthly'),
  firstDay: z.number().int().min(1).max(31, 'First day must be 1-31'),
  secondDay: z.number().int().min(1).max(31, 'Second day must be 1-31'),
}).refine(
  (data) => data.firstDay !== data.secondDay,
  { message: 'Both payment days must be different', path: ['secondDay'] }
)

/**
 * Discriminated union for all payment schedule types.
 */
export const PaymentScheduleSchema = z.discriminatedUnion('type', [
  DayOfWeekScheduleSchema,
  DayOfMonthScheduleSchema,
  TwiceMonthlyScheduleSchema,
])

export type DayOfWeekSchedule = z.infer<typeof DayOfWeekScheduleSchema>
export type DayOfMonthSchedule = z.infer<typeof DayOfMonthScheduleSchema>
export type TwiceMonthlySchedule = z.infer<typeof TwiceMonthlyScheduleSchema>
export type PaymentSchedule = z.infer<typeof PaymentScheduleSchema>
```

### Project (Updated Entity)

Updated to support flexible payment schedules while maintaining backward compatibility.

```typescript
// src/types/index.ts

/**
 * Frequency options ordered by occurrence rate (most frequent first).
 */
export const FrequencySchema = z.enum(['weekly', 'biweekly', 'twice-monthly', 'monthly'])
export type Frequency = z.infer<typeof FrequencySchema>

/**
 * Project input schema with flexible payment schedule.
 * Includes refinement to ensure paymentSchedule type matches frequency.
 */
export const ProjectInputSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  amount: z.number().positive('Amount must be positive'),
  frequency: FrequencySchema,
  paymentSchedule: PaymentScheduleSchema,
  certainty: z.enum(['guaranteed', 'probable', 'uncertain']),
  isActive: z.boolean().default(true),
}).refine(
  (data) => validateFrequencyScheduleMatch(data.frequency, data.paymentSchedule),
  { message: 'Payment schedule type must match frequency', path: ['paymentSchedule'] }
)

/**
 * Full project schema with system fields.
 * Inherits frequency/paymentSchedule validation from ProjectInputSchema.
 */
export const ProjectSchema = ProjectInputSchema.extend({
  id: z.string().uuid(),
  // Legacy field - kept for backward compatibility during migration
  paymentDay: z.number().int().min(1).max(31).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type ProjectInput = z.infer<typeof ProjectInputSchema>
export type Project = z.infer<typeof ProjectSchema>
```

## Validation Rules

### Frequency-Schedule Consistency

The payment schedule type must match the frequency:

| Frequency | Required Schedule Type |
|-----------|----------------------|
| `weekly` | `dayOfWeek` |
| `biweekly` | `dayOfWeek` |
| `twice-monthly` | `twiceMonthly` |
| `monthly` | `dayOfMonth` |

```typescript
// Validation helper for form submission
export function validateFrequencyScheduleMatch(
  frequency: Frequency,
  schedule: PaymentSchedule
): boolean {
  switch (frequency) {
    case 'weekly':
    case 'biweekly':
      return schedule.type === 'dayOfWeek'
    case 'twice-monthly':
      return schedule.type === 'twiceMonthly'
    case 'monthly':
      return schedule.type === 'dayOfMonth'
  }
}
```

### Day-of-Week Values (ISO 8601)

| Value | Day |
|-------|-----|
| 1 | Monday |
| 2 | Tuesday |
| 3 | Wednesday |
| 4 | Thursday |
| 5 | Friday |
| 6 | Saturday |
| 7 | Sunday |

### Twice-Monthly Validation

- Both days must be in range 1-31
- Both days must be different
- Order doesn't matter (firstDay can be > secondDay)

## State Transitions

### Frequency Change Behavior

When user changes frequency in the form:

```
┌─────────────────┐
│ Current State   │
│ (any frequency) │
└────────┬────────┘
         │ User changes frequency
         ▼
┌─────────────────┐
│ Clear Schedule  │
│ (reset to null) │
└────────┬────────┘
         │ User must select new schedule
         ▼
┌─────────────────┐
│ New Schedule    │
│ (matches freq)  │
└─────────────────┘
```

**Rule**: Previous schedule data is cleared when frequency changes to prevent invalid combinations.

### Legacy Data Migration

When editing an existing project with legacy `paymentDay` field:

```
┌─────────────────────────┐
│ Existing Project        │
│ paymentDay: 15          │
│ frequency: weekly       │
│ paymentSchedule: null   │
└───────────┬─────────────┘
            │ User opens edit form
            ▼
┌─────────────────────────┐
│ Auto-Convert            │
│ Map day 15 to weekday   │
│ of current month        │
│ (e.g., 15th = Thursday) │
└───────────┬─────────────┘
            │ dayOfWeek: 4
            ▼
┌─────────────────────────┐
│ Form Pre-populated      │
│ paymentSchedule: {      │
│   type: 'dayOfWeek',    │
│   dayOfWeek: 4          │
│ }                       │
└───────────┬─────────────┘
            │ User can modify & save
            ▼
┌─────────────────────────┐
│ Saved Project           │
│ paymentSchedule: {...}  │
│ paymentDay: undefined   │
└─────────────────────────┘
```

## Database Schema (Dexie.js)

### Version 3 Migration

```typescript
// src/db/index.ts

this.version(3).stores({
  accounts: 'id, name, type',
  projects: 'id, name, isActive, frequency',  // Add frequency index
  expenses: 'id, name, isActive',
  creditCards: 'id, name',
})
// Note: paymentSchedule is stored as JSON within the project record
// No schema change needed for Dexie - it stores objects as-is
```

### Data Shape in IndexedDB

```json
{
  "id": "uuid-here",
  "name": "Freelance Client",
  "amount": 250000,
  "frequency": "weekly",
  "paymentSchedule": {
    "type": "dayOfWeek",
    "dayOfWeek": 5
  },
  "certainty": "guaranteed",
  "isActive": true,
  "createdAt": "2025-11-27T00:00:00.000Z",
  "updatedAt": "2025-11-27T00:00:00.000Z"
}
```

## Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                        Project                               │
├─────────────────────────────────────────────────────────────┤
│ id: string (PK)                                             │
│ name: string                                                │
│ amount: number (cents)                                      │
│ frequency: 'weekly' | 'biweekly' | 'twice-monthly' | 'monthly'│
│ paymentSchedule: PaymentSchedule                            │
│ certainty: 'guaranteed' | 'probable' | 'uncertain'          │
│ isActive: boolean                                           │
│ paymentDay?: number (deprecated)                            │
│ createdAt: Date                                             │
│ updatedAt: Date                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ used by
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Cashflow Engine                            │
├─────────────────────────────────────────────────────────────┤
│ Reads projects and calculates income events based on        │
│ frequency + paymentSchedule                                 │
└─────────────────────────────────────────────────────────────┘
```

## Summary

| Entity | Change Type | Description |
|--------|-------------|-------------|
| `PaymentSchedule` | New | Discriminated union for schedule types |
| `Project.frequency` | Modified | Added 'twice-monthly' option |
| `Project.paymentSchedule` | New | Replaces `paymentDay` |
| `Project.paymentDay` | Deprecated | Kept for migration only |

