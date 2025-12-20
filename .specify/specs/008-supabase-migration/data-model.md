# Data Model: Supabase Migration

**Feature**: 008-supabase-migration  
**Date**: 2025-11-27

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              auth.users                                  │
│                         (Supabase managed)                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ id (UUID) - Primary Key                                          │    │
│  │ is_anonymous (BOOLEAN) - True for anonymous users                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ user_id (FK)
                    ┌───────────────┼───────────────┬───────────────┐
                    ▼               ▼               ▼               ▼
            ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────────┐
            │ accounts  │   │ projects  │   │ expenses  │   │ credit_cards  │
            └───────────┘   └───────────┘   └───────────┘   └───────────────┘
```

## Table Definitions

### accounts

Maps to `BankAccount` TypeScript type.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| user_id | UUID | NOT NULL, FK → auth.users(id) ON DELETE CASCADE | Owner reference |
| name | TEXT | NOT NULL, CHECK (length(name) BETWEEN 1 AND 100) | Account name |
| type | TEXT | NOT NULL, CHECK (type IN ('checking', 'savings', 'investment')) | Account type |
| balance | INTEGER | NOT NULL, DEFAULT 0, CHECK (balance >= 0) | Balance in cents |
| balance_updated_at | TIMESTAMPTZ | NULL | Last balance update timestamp |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `accounts_user_id_idx` on `user_id` (for RLS filtering)
- `accounts_type_idx` on `type` (for filtering by account type)

### projects

Maps to `Project` TypeScript type.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| user_id | UUID | NOT NULL, FK → auth.users(id) ON DELETE CASCADE | Owner reference |
| name | TEXT | NOT NULL, CHECK (length(name) BETWEEN 1 AND 100) | Project name |
| amount | INTEGER | NOT NULL, CHECK (amount > 0) | Payment amount in cents |
| frequency | TEXT | NOT NULL, CHECK (frequency IN ('weekly', 'biweekly', 'twice-monthly', 'monthly')) | Payment frequency |
| payment_schedule | JSONB | NOT NULL | Payment schedule (discriminated union) |
| certainty | TEXT | NOT NULL, CHECK (certainty IN ('guaranteed', 'probable', 'uncertain')) | Income certainty |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Active status |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `projects_user_id_idx` on `user_id` (for RLS filtering)
- `projects_is_active_idx` on `is_active` (for filtering active projects)

**JSONB Structure for payment_schedule**:

```typescript
// Type: 'dayOfWeek' (for weekly/biweekly)
{ "type": "dayOfWeek", "dayOfWeek": 1 }  // 1=Monday, 7=Sunday

// Type: 'dayOfMonth' (for monthly)
{ "type": "dayOfMonth", "dayOfMonth": 15 }  // 1-31

// Type: 'twiceMonthly'
{ "type": "twiceMonthly", "firstDay": 1, "secondDay": 15 }  // Two days per month
```

### expenses

Maps to `FixedExpense` TypeScript type.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| user_id | UUID | NOT NULL, FK → auth.users(id) ON DELETE CASCADE | Owner reference |
| name | TEXT | NOT NULL, CHECK (length(name) BETWEEN 1 AND 100) | Expense name |
| amount | INTEGER | NOT NULL, CHECK (amount > 0) | Amount in cents |
| due_day | SMALLINT | NOT NULL, CHECK (due_day BETWEEN 1 AND 31) | Day of month |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Active status |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `expenses_user_id_idx` on `user_id` (for RLS filtering)
- `expenses_is_active_idx` on `is_active` (for filtering active expenses)

### credit_cards

Maps to `CreditCard` TypeScript type.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| user_id | UUID | NOT NULL, FK → auth.users(id) ON DELETE CASCADE | Owner reference |
| name | TEXT | NOT NULL, CHECK (length(name) BETWEEN 1 AND 100) | Card name |
| statement_balance | INTEGER | NOT NULL, DEFAULT 0, CHECK (statement_balance >= 0) | Balance in cents |
| due_day | SMALLINT | NOT NULL, CHECK (due_day BETWEEN 1 AND 31) | Due day of month |
| balance_updated_at | TIMESTAMPTZ | NULL | Last balance update timestamp |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `credit_cards_user_id_idx` on `user_id` (for RLS filtering)

## Row Level Security Policies

All tables follow the same RLS pattern:

```sql
-- Enable RLS
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own data
CREATE POLICY "Users can manage own {table_name}"
ON {table_name}
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

## Realtime Configuration

Enable Realtime for all tables to support live updates:

```sql
-- Enable Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE credit_cards;
```

## TypeScript ↔ PostgreSQL Column Name Mapping

| TypeScript (camelCase) | PostgreSQL (snake_case) |
|------------------------|-------------------------|
| id | id |
| userId | user_id |
| name | name |
| type | type |
| balance | balance |
| balanceUpdatedAt | balance_updated_at |
| createdAt | created_at |
| updatedAt | updated_at |
| amount | amount |
| frequency | frequency |
| paymentSchedule | payment_schedule |
| certainty | certainty |
| isActive | is_active |
| dueDay | due_day |
| statementBalance | statement_balance |

## Validation Rules

Validation remains in TypeScript/Zod (source of truth). Database constraints provide defense-in-depth:

| Rule | Zod Schema | PostgreSQL Constraint |
|------|------------|----------------------|
| Name required | `.min(1)` | `CHECK (length(name) >= 1)` |
| Name max length | `.max(100)` | `CHECK (length(name) <= 100)` |
| Balance non-negative | `.min(0)` | `CHECK (balance >= 0)` |
| Amount positive | `.positive()` | `CHECK (amount > 0)` |
| Day 1-31 | `.min(1).max(31)` | `CHECK (due_day BETWEEN 1 AND 31)` |
| Enum values | `.enum([...])` | `CHECK (type IN (...))` |

## State Transitions

No explicit state machine. Entity lifecycle:

1. **Create**: Insert with `user_id = auth.uid()`, auto-generate `id`, `created_at`, `updated_at`
2. **Update**: Set `updated_at = now()`, optionally update `balance_updated_at` for balance changes
3. **Delete**: Hard delete (no soft delete for MVP)

## Migration Notes

- No data migration from IndexedDB (per spec clarification: "No existing data, switching directly to Supabase")
- Dexie.js database can be deleted after migration is complete
- All existing Zod schemas remain unchanged

