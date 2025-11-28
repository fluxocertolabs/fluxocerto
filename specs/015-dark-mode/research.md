# Research: Dark Mode Implementation

**Feature**: 015-dark-mode  
**Date**: 2025-11-28  
**Status**: Complete

## Research Questions

### 1. How to implement dark mode with Tailwind CSS v4?

**Decision**: Use Tailwind CSS v4's `@custom-variant` with class-based dark mode toggling.

**Rationale**: 
- Tailwind CSS v4 uses CSS-first configuration with `@theme` directive
- The project already uses CSS variables in `index.css` for theming
- Class-based toggling (`class="dark"` on `<html>`) provides manual control
- Works seamlessly with the existing shadcn/ui components

**Implementation**:
```css
/* In index.css */
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* Light mode variables (existing) */
  --color-background: hsl(0 0% 100%);
  /* ... */
}

.dark {
  /* Dark mode overrides */
  --color-background: hsl(222.2 84% 4.9%);
  /* ... */
}
```

**Alternatives Considered**:
- `prefers-color-scheme` media query only: Rejected because it doesn't allow manual override
- Data attribute (`data-theme="dark"`): Rejected for consistency with shadcn/ui patterns

### 2. How to persist theme preference in Supabase?

**Decision**: Create a `user_preferences` table with key-value design.

**Rationale**:
- Spec requires: "Stored in a new `user_preferences` table with a flexible key-value design"
- Key-value design allows future extension without schema changes
- Follows existing RLS patterns from other tables

**Implementation**:
```sql
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL CHECK (length(key) BETWEEN 1 AND 50),
  value TEXT NOT NULL CHECK (length(value) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);
```

**Alternatives Considered**:
- Separate `theme_preferences` table: Rejected for inflexibility
- JSONB column on users table: Rejected because we don't control the auth.users table
- localStorage only: Rejected because spec requires cross-device sync

### 3. How to handle theme state management?

**Decision**: Use Zustand store with localStorage cache + Supabase sync.

**Rationale**:
- Project already uses Zustand for state management
- localStorage provides instant access on page load (prevents FOUC)
- Supabase sync enables cross-device preference sharing
- "Last write wins" conflict resolution per spec

**Implementation**:
```typescript
// Theme state flow:
// 1. Initial load: localStorage → Zustand → Apply to DOM
// 2. After auth: Fetch from Supabase → Update Zustand → Update localStorage
// 3. On toggle: Update Zustand → Apply to DOM → Save to localStorage → Sync to Supabase
```

**Alternatives Considered**:
- React Context only: Rejected because Zustand is already the pattern
- Supabase realtime subscription: Rejected as overkill for single-user preference

### 4. How to implement smooth theme transitions?

**Decision**: CSS transitions on color properties with 200ms duration.

**Rationale**:
- Spec requires: "colors transition smoothly over approximately 200-300 milliseconds"
- CSS transitions are performant and don't require JavaScript
- Can be applied globally to prevent jarring changes

**Implementation**:
```css
/* Apply to root or body */
* {
  transition: background-color 200ms ease-in-out,
              border-color 200ms ease-in-out,
              color 200ms ease-in-out;
}

/* Disable during initial load to prevent FOUC animation */
.no-transitions * {
  transition: none !important;
}
```

**Alternatives Considered**:
- JavaScript-based animations: Rejected for complexity and performance
- Longer transitions (500ms+): Rejected as spec indicates 200-300ms

### 5. How to detect system theme preference?

**Decision**: Use `window.matchMedia('(prefers-color-scheme: dark)')` on initial load.

**Rationale**:
- Standard browser API with excellent support
- Spec requires: "System preference is used until they set a new preference"
- Only checked when no saved preference exists

**Implementation**:
```typescript
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches 
    ? 'dark' 
    : 'light'
}

function getInitialTheme(): Theme {
  // 1. Check localStorage first (fastest)
  const stored = localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark') return stored
  
  // 2. Fall back to system preference
  return getSystemTheme()
}
```

**Alternatives Considered**:
- Listen to system preference changes: Rejected per spec ("does not automatically switch")
- Default to light always: Rejected because spec requires system detection

### 6. How to prevent flash of wrong theme (FOUC)?

**Decision**: Inline script in `<head>` + initial theme application before React hydration.

**Rationale**:
- Script must run before any content renders
- Cannot rely on React lifecycle for initial theme
- Spec requires: "no flash of incorrect theme"

**Implementation**:
```html
<!-- In index.html <head> -->
<script>
  (function() {
    const theme = localStorage.getItem('theme') || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
  })();
</script>
```

**Alternatives Considered**:
- CSS `prefers-color-scheme` only: Rejected because it doesn't respect saved preference
- Server-side rendering: Not applicable (SPA architecture)

### 7. What dark mode color palette to use?

**Decision**: Use shadcn/ui's Zinc theme dark mode colors adapted to HSL format.

**Rationale**:
- Maintains consistency with existing shadcn/ui components
- Zinc is neutral and professional, fitting a finance app
- WCAG AA compliant contrast ratios
- Already defined in shadcn/ui documentation

**Implementation**:
```css
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
```

**Alternatives Considered**:
- Custom color palette: Rejected for consistency with shadcn/ui
- Slate/Gray variants: Zinc chosen for neutrality in finance context

### 8. How to handle Recharts in dark mode?

**Decision**: Use CSS variables for chart colors and update chart components to read current theme.

**Rationale**:
- Recharts supports custom colors via props
- Chart colors should complement the theme
- Existing chart components already use color props

**Implementation**:
```css
@theme {
  /* Chart colors for light mode */
  --color-chart-1: hsl(220 70% 50%);
  --color-chart-2: hsl(160 60% 45%);
  --color-chart-3: hsl(30 80% 55%);
  --color-chart-4: hsl(280 65% 60%);
  --color-chart-5: hsl(340 75% 55%);
}

.dark {
  /* Chart colors for dark mode - more vibrant for visibility */
  --color-chart-1: hsl(220 70% 60%);
  --color-chart-2: hsl(160 60% 55%);
  --color-chart-3: hsl(30 80% 60%);
  --color-chart-4: hsl(280 65% 65%);
  --color-chart-5: hsl(340 75% 60%);
}
```

**Alternatives Considered**:
- Hardcoded chart colors: Rejected for maintainability
- Theme-unaware charts: Rejected for visual consistency

### 9. What icon library to use for theme toggle?

**Decision**: Use lucide-react (Sun/Moon icons) - already available or easy to add.

**Rationale**:
- shadcn/ui examples use lucide-react
- Clean, consistent icon design
- Small bundle size impact
- Industry-standard Sun/Moon metaphor for theme toggle

**Implementation**:
```tsx
import { Moon, Sun } from "lucide-react"

// In toggle button
<Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
<Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
```

**Alternatives Considered**:
- Heroicons: Valid but lucide-react is shadcn/ui standard
- Custom SVG icons: Rejected for consistency
- Text-only toggle: Rejected for UX (icons are more intuitive)

### 10. How to handle offline/network errors when saving preference?

**Decision**: Optimistic updates with localStorage cache, silent retry on reconnect.

**Rationale**:
- Spec requires: "preference is saved locally and synced when connection is restored"
- "Last write wins" conflict resolution per spec
- Non-blocking error toast may be shown

**Implementation**:
```typescript
async function saveThemePreference(theme: Theme) {
  // 1. Save to localStorage immediately (optimistic)
  localStorage.setItem('theme', theme)
  
  // 2. Try to sync to Supabase
  try {
    await upsertPreference('theme', theme)
  } catch (error) {
    // Log but don't block - localStorage has the preference
    console.warn('Failed to sync theme preference:', error)
    // Could show non-blocking toast here
  }
}
```

**Alternatives Considered**:
- Block until sync completes: Rejected for poor UX
- No localStorage fallback: Rejected because offline support is required

## Dependencies to Add

| Package | Version | Purpose |
|---------|---------|---------|
| lucide-react | 0.468.0 | Icons for theme toggle (Sun/Moon) |

**Note**: Version 0.468.0 is the latest stable as of 2025-11-28. Must pin exactly per constitution.

## Summary of Decisions

1. **Dark Mode Strategy**: Tailwind CSS v4 with `@custom-variant` and class-based toggling
2. **Persistence**: `user_preferences` table in Supabase with key-value design
3. **State Management**: Zustand store with localStorage cache + Supabase sync
4. **Transitions**: CSS transitions (200ms) on color properties
5. **System Detection**: `prefers-color-scheme` media query on initial load
6. **FOUC Prevention**: Inline `<head>` script for immediate theme application
7. **Color Palette**: shadcn/ui Zinc theme adapted to HSL
8. **Charts**: CSS variables for Recharts colors
9. **Icons**: lucide-react Sun/Moon icons
10. **Offline Handling**: Optimistic localStorage + background Supabase sync

