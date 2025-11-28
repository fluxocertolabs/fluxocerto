# Quickstart: Dark Mode Implementation

**Feature**: 015-dark-mode  
**Date**: 2025-11-28  
**Estimated Effort**: 4-6 hours

## Prerequisites

- [ ] Supabase project with existing tables (accounts, projects, expenses, credit_cards)
- [ ] Local development environment running (`pnpm dev`)
- [ ] Access to Supabase dashboard for running migrations

## Quick Implementation Order

### Step 1: Database Migration (15 min)

1. Copy migration to Supabase:
   ```bash
   cp specs/015-dark-mode/contracts/004_user_preferences.sql supabase/migrations/
   ```

2. Run migration via Supabase dashboard (SQL Editor) or CLI:
   ```sql
   -- Copy contents of 004_user_preferences.sql and execute
   ```

3. Verify table created:
   ```sql
   SELECT * FROM user_preferences LIMIT 1;
   ```

### Step 2: Install Dependencies (5 min)

```bash
pnpm add lucide-react@0.468.0
```

### Step 3: Update CSS Variables (20 min)

Update `src/index.css` with dark mode variables:

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* Light mode (existing) */
  --color-background: hsl(0 0% 100%);
  --color-foreground: hsl(0 0% 3.9%);
  /* ... keep existing variables ... */
}

.dark {
  --color-background: hsl(240 10% 3.9%);
  --color-foreground: hsl(0 0% 98%);
  --color-card: hsl(240 10% 3.9%);
  --color-card-foreground: hsl(0 0% 98%);
  --color-popover: hsl(240 10% 3.9%);
  --color-popover-foreground: hsl(0 0% 98%);
  --color-primary: hsl(0 0% 98%);
  --color-primary-foreground: hsl(240 5.9% 10%);
  --color-secondary: hsl(240 3.7% 15.9%);
  --color-secondary-foreground: hsl(0 0% 98%);
  --color-muted: hsl(240 3.7% 15.9%);
  --color-muted-foreground: hsl(240 5% 64.9%);
  --color-accent: hsl(240 3.7% 15.9%);
  --color-accent-foreground: hsl(0 0% 98%);
  --color-destructive: hsl(0 62.8% 30.6%);
  --color-destructive-foreground: hsl(0 0% 98%);
  --color-border: hsl(240 3.7% 15.9%);
  --color-input: hsl(240 3.7% 15.9%);
  --color-ring: hsl(240 4.9% 83.9%);
}

/* Smooth transitions */
* {
  transition: background-color 200ms ease-in-out,
              border-color 200ms ease-in-out,
              color 200ms ease-in-out;
}

/* Disable transitions during initial load */
.no-transitions * {
  transition: none !important;
}
```

### Step 4: Add FOUC Prevention Script (10 min)

Add to `index.html` inside `<head>`:

```html
<script>
  (function() {
    var theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
    document.documentElement.classList.add('no-transitions');
    window.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() {
        document.documentElement.classList.remove('no-transitions');
      }, 0);
    });
  })();
</script>
```

### Step 5: Create Theme Types (10 min)

Create `src/types/theme.ts`:

```typescript
import { z } from 'zod'

export type ThemeValue = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const themeValueSchema = z.enum(['light', 'dark', 'system'])

export interface ThemeState {
  theme: ThemeValue
  resolvedTheme: ResolvedTheme
  isLoaded: boolean
  setTheme: (theme: ThemeValue) => void
}
```

### Step 6: Create Theme Store (30 min)

Create `src/stores/theme-store.ts`:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeValue, ResolvedTheme, ThemeState } from '@/types/theme'

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(theme: ThemeValue): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme
}

function applyTheme(resolvedTheme: ResolvedTheme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolvedTheme)
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: 'light',
      isLoaded: false,
      setTheme: (theme) => {
        const resolvedTheme = resolveTheme(theme)
        applyTheme(resolvedTheme)
        set({ theme, resolvedTheme })
      },
    }),
    {
      name: 'family-finance-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolvedTheme = resolveTheme(state.theme)
          applyTheme(resolvedTheme)
          state.resolvedTheme = resolvedTheme
          state.isLoaded = true
        }
      },
    }
  )
)
```

### Step 7: Create Theme Toggle Component (30 min)

Create `src/components/theme/theme-toggle.tsx`:

```typescript
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useThemeStore } from '@/stores/theme-store'

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore()

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(nextTheme)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={`Tema atual: ${theme === 'light' ? 'Claro' : theme === 'dark' ? 'Escuro' : 'Sistema'}`}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
```

### Step 8: Add to Header (15 min)

Update `src/components/layout/header.tsx`:

```typescript
import { ThemeToggle } from '@/components/theme/theme-toggle'

// In the header JSX, add before the sign-out button:
<ThemeToggle />
```

### Step 9: Add Supabase Sync (45 min)

Create `src/lib/theme-service.ts` for Supabase operations and update the theme store to sync on auth changes.

### Step 10: Test (30 min)

1. Toggle theme via button - should switch instantly
2. Refresh page - theme should persist
3. Log out and log in - theme should sync from Supabase
4. Test on different device - theme should sync

## Verification Checklist

- [ ] Theme toggle visible in header
- [ ] Clicking toggle cycles through light → dark → system
- [ ] All UI components adapt colors correctly
- [ ] Theme persists across page refreshes
- [ ] Theme syncs across devices after login
- [ ] No flash of wrong theme on page load
- [ ] Smooth 200ms transitions between themes
- [ ] System preference detected for new users
- [ ] WCAG AA contrast maintained in both themes

## Common Issues

### Flash of wrong theme
- Ensure inline script is in `<head>` before any content
- Check `no-transitions` class is applied initially

### Theme not persisting
- Check localStorage in DevTools
- Verify Zustand persist middleware is configured

### Supabase sync failing
- Check RLS policies allow authenticated users
- Verify `user_id` is being set correctly
- Check network tab for 401/403 errors

### Colors not changing
- Verify CSS variables are defined in `.dark` class
- Check `@custom-variant` is configured correctly
- Ensure components use CSS variable colors (not hardcoded)

