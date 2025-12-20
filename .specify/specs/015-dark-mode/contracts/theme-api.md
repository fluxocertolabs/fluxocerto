# Theme API Contracts

**Feature**: 015-dark-mode  
**Date**: 2025-11-28  
**Status**: Complete

## Overview

The theme API uses Supabase client SDK directly (no REST endpoints). All operations go through the `user_preferences` table with RLS policies enforcing user isolation.

## Operations

### Get Theme Preference

Retrieves the user's saved theme preference from Supabase.

**Supabase Query**:
```typescript
const { data, error } = await supabase
  .from('user_preferences')
  .select('value')
  .eq('key', 'theme')
  .single()
```

**Response Shape**:
```typescript
// Success
{ data: { value: 'light' | 'dark' | 'system' }, error: null }

// Not found (no preference set)
{ data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } }

// Error
{ data: null, error: PostgrestError }
```

**Behavior**:
- Returns `null` if no preference exists (new user)
- RLS ensures only authenticated user's preference is returned
- Should be called after successful authentication

---

### Upsert Theme Preference

Creates or updates the user's theme preference.

**Supabase Query**:
```typescript
const { data, error } = await supabase
  .from('user_preferences')
  .upsert(
    {
      user_id: userId,
      key: 'theme',
      value: theme, // 'light' | 'dark' | 'system'
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id,key',
    }
  )
  .select()
  .single()
```

**Request Validation**:
```typescript
// Zod schema
z.object({
  theme: z.enum(['light', 'dark', 'system'])
})
```

**Response Shape**:
```typescript
// Success
{ 
  data: { 
    id: string,
    user_id: string,
    key: 'theme',
    value: 'light' | 'dark' | 'system',
    created_at: string,
    updated_at: string
  }, 
  error: null 
}

// Error
{ data: null, error: PostgrestError }
```

**Behavior**:
- Uses upsert to handle both create and update
- `onConflict: 'user_id,key'` ensures one theme preference per user
- RLS ensures user can only modify their own preference
- `updated_at` is set explicitly for "last write wins" conflict resolution

---

### Delete Theme Preference

Removes the user's theme preference (resets to system default).

**Supabase Query**:
```typescript
const { error } = await supabase
  .from('user_preferences')
  .delete()
  .eq('key', 'theme')
```

**Response Shape**:
```typescript
// Success
{ data: null, error: null }

// Error
{ data: null, error: PostgrestError }
```

**Behavior**:
- Deletes the theme preference row
- After deletion, app should fall back to system preference
- RLS ensures only user's own preference can be deleted

---

## Error Handling

### Error Codes

| Code | Meaning | Client Action |
|------|---------|---------------|
| `PGRST116` | No rows returned | Treat as "no preference set", use default |
| `23505` | Unique violation | Should not occur with upsert, retry |
| `42501` | RLS violation | User not authenticated, redirect to login |
| Network error | Connection failed | Use cached localStorage value, retry later |

### Retry Strategy

```typescript
const RETRY_DELAYS = [1000, 2000, 5000] // ms

async function saveThemeWithRetry(theme: ThemeValue): Promise<void> {
  // Always save to localStorage first (optimistic)
  localStorage.setItem('theme', theme)
  
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      await upsertThemePreference(theme)
      return // Success
    } catch (error) {
      if (attempt < RETRY_DELAYS.length) {
        await delay(RETRY_DELAYS[attempt])
      } else {
        console.warn('Failed to sync theme after retries:', error)
        // Don't throw - localStorage has the preference
      }
    }
  }
}
```

---

## TypeScript Service Interface

```typescript
// src/lib/theme-service.ts

export interface ThemeService {
  /** Get theme preference from Supabase */
  getThemePreference(): Promise<ThemeValue | null>
  
  /** Save theme preference to Supabase */
  saveThemePreference(theme: ThemeValue): Promise<void>
  
  /** Delete theme preference from Supabase */
  deleteThemePreference(): Promise<void>
}
```

---

## Realtime Subscription (Optional Enhancement)

For cross-tab/device sync, subscribe to preference changes:

```typescript
const subscription = supabase
  .channel('theme-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'user_preferences',
      filter: `key=eq.theme`,
    },
    (payload) => {
      if (payload.new?.value) {
        // Update local state from another device/tab
        setTheme(payload.new.value as ThemeValue)
      }
    }
  )
  .subscribe()
```

**Note**: This is an optional enhancement. The base implementation uses fetch-on-auth + save-on-change pattern.

