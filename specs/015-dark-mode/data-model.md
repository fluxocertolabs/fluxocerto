# Data Model: Dark Mode

**Feature**: 015-dark-mode  
**Date**: 2025-11-28  
**Status**: Complete

## Entities

### UserPreference

Represents a user's personal preference stored as a key-value pair. Designed for flexibility to support future preferences without schema changes.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| user_id | UUID | FK → auth.users(id), NOT NULL | Owner of the preference |
| key | TEXT | NOT NULL, 1-50 chars, UNIQUE with user_id | Preference identifier (e.g., "theme") |
| value | TEXT | NOT NULL, 1-500 chars | Preference value (e.g., "dark") |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() | Last update timestamp |

**Indexes**:
- `user_preferences_user_id_idx` on `user_id` (for user lookups)
- Unique constraint on `(user_id, key)` (prevents duplicate keys per user)

**RLS Policies**:
- Users can only SELECT/INSERT/UPDATE/DELETE their own preferences
- Policy: `user_id = auth.uid()`

### Theme (Application State)

Represents the current theme state in the application. Not persisted directly - derived from UserPreference.

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| theme | enum | 'light' \| 'dark' \| 'system' | Current theme selection |
| resolvedTheme | enum | 'light' \| 'dark' | Actual applied theme |

**State Derivation**:
```
if theme === 'system':
  resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
else:
  resolvedTheme = theme
```

## Relationships

```
┌─────────────────┐         ┌──────────────────────┐
│   auth.users    │ 1 ───── * │  user_preferences   │
│                 │         │                      │
│  id (PK)        │         │  id (PK)             │
│  email          │         │  user_id (FK)        │
│  ...            │         │  key                 │
└─────────────────┘         │  value               │
                            │  created_at          │
                            │  updated_at          │
                            └──────────────────────┘
```

## Validation Rules

### UserPreference

| Field | Validation | Error Message |
|-------|------------|---------------|
| key | 1-50 characters | "Preference key must be between 1 and 50 characters" |
| key | alphanumeric + underscore | "Preference key must contain only letters, numbers, and underscores" |
| value | 1-500 characters | "Preference value must be between 1 and 500 characters" |

### Theme Preference (key = "theme")

| Field | Validation | Error Message |
|-------|------------|---------------|
| value | Must be 'light', 'dark', or 'system' | "Theme must be 'light', 'dark', or 'system'" |

## TypeScript Types

```typescript
// src/types/theme.ts

/** Theme values that can be stored */
export type ThemeValue = 'light' | 'dark' | 'system'

/** Resolved theme after system preference is applied */
export type ResolvedTheme = 'light' | 'dark'

/** Theme state in the application */
export interface ThemeState {
  /** User's theme preference */
  theme: ThemeValue
  /** Actual theme being applied (resolves 'system' to light/dark) */
  resolvedTheme: ResolvedTheme
  /** Whether theme has been loaded from storage */
  isLoaded: boolean
  /** Set theme preference */
  setTheme: (theme: ThemeValue) => void
}

/** User preference as stored in database */
export interface UserPreference {
  id: string
  userId: string
  key: string
  value: string
  createdAt: Date
  updatedAt: Date
}

/** Database row shape for user_preferences */
export interface UserPreferenceRow {
  id: string
  user_id: string
  key: string
  value: string
  created_at: string
  updated_at: string
}
```

## Zod Schemas

```typescript
// src/types/theme.ts (continued)

import { z } from 'zod'

/** Schema for theme value validation */
export const themeValueSchema = z.enum(['light', 'dark', 'system'])

/** Schema for user preference key */
export const preferenceKeySchema = z
  .string()
  .min(1, 'Preference key must be at least 1 character')
  .max(50, 'Preference key must be at most 50 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Preference key must contain only letters, numbers, and underscores')

/** Schema for user preference value */
export const preferenceValueSchema = z
  .string()
  .min(1, 'Preference value must be at least 1 character')
  .max(500, 'Preference value must be at most 500 characters')

/** Schema for creating/updating a preference */
export const upsertPreferenceSchema = z.object({
  key: preferenceKeySchema,
  value: preferenceValueSchema,
})
```

## State Transitions

### Theme Toggle Flow

```
┌─────────────┐     toggle      ┌─────────────┐     toggle      ┌─────────────┐
│    light    │ ───────────────>│    dark     │ ───────────────>│   system    │
└─────────────┘                 └─────────────┘                 └─────────────┘
       ^                                                               │
       │                         toggle                                │
       └───────────────────────────────────────────────────────────────┘
```

### Initial Load Flow

```
┌──────────────────┐
│   Page Load      │
└────────┬─────────┘
         │
         v
┌──────────────────┐     found      ┌──────────────────┐
│ Check localStorage│ ─────────────>│  Apply theme     │
└────────┬─────────┘               └──────────────────┘
         │ not found
         v
┌──────────────────┐     found      ┌──────────────────┐
│ Check system pref │ ─────────────>│  Apply theme     │
└────────┬─────────┘               └──────────────────┘
         │ not found
         v
┌──────────────────┐
│ Default to light │
└──────────────────┘
```

### Auth + Sync Flow

```
┌──────────────────┐
│   User Auth      │
└────────┬─────────┘
         │
         v
┌──────────────────┐     found      ┌──────────────────┐
│ Fetch from       │ ─────────────>│  Update local    │
│ Supabase         │               │  state + storage │
└────────┬─────────┘               └──────────────────┘
         │ not found
         v
┌──────────────────┐
│ Keep current     │
│ (local) theme    │
└──────────────────┘
```

## Migration SQL

See `contracts/004_user_preferences.sql` for the complete migration.

