# Research: Page Loading Experience

**Feature Branch**: `013-page-loading-experience`  
**Date**: 2025-11-27

## Table of Contents

1. [Loading State Architecture](#loading-state-architecture)
2. [React 19 Suspense Patterns](#react-19-suspense-patterns)
3. [Skeleton-to-Content Transitions](#skeleton-to-content-transitions)
4. [ARIA Accessibility for Loading States](#aria-accessibility-for-loading-states)
5. [Timeout and Error Handling Strategy](#timeout-and-error-handling-strategy)
6. [Implementation Approach](#implementation-approach)

---

## Loading State Architecture

### Decision: Hybrid Approach (Suspense + Coordinated State)

**Rationale**: Pure React Suspense requires data-fetching libraries that support Suspense (like React Query with suspense mode or the new React `use()` hook with promises). The current codebase uses Zustand + Supabase with `useEffect`-based data fetching. A full migration to Suspense-compatible data fetching is out of scope.

**Approach**: Use a hybrid pattern:
1. Keep existing `useFinanceData` hook with `isLoading` state
2. Add coordinated loading state management to prevent cascading state changes
3. Use CSS transitions for smooth skeleton-to-content animations
4. Wrap transitions with `startTransition` for non-blocking UI updates during navigation

**Alternatives Considered**:
- **Full Suspense Migration**: Would require rewriting all data fetching to use `use()` hook or Suspense-compatible library. Too invasive for this feature.
- **React Query with Suspense**: Would add new dependency and require significant refactoring. Overkill for current app scale.
- **Manual Promise-based Suspense**: Complex to implement correctly, error-prone.

---

## React 19 Suspense Patterns

### Key Patterns from React 19 Documentation

#### 1. Using `startTransition` for Non-Blocking Navigation

```typescript
import { startTransition } from 'react'

function handleNavigation(url: string) {
  startTransition(() => {
    setPage(url)
  })
}
```

**Application**: Use `startTransition` when navigating between pages to prevent the current UI from being replaced immediately with a loading state. This keeps the current page visible while the new page loads.

#### 2. Coordinated Loading with Single Suspense Boundary

```jsx
<Suspense fallback={<Loading />}>
  <Biography />
  <Panel>
    <Albums />
  </Panel>
</Suspense>
```

**Application**: Group all data-dependent components under a single loading boundary so they appear together, preventing partial content display.

#### 3. Using `isPending` for Visual Feedback

```typescript
const [isPending, startTransition] = useTransition()

// Show pending indicator while transition is in progress
if (isPending) {
  return <PendingIndicator />
}
```

**Application**: Use `useTransition` to show subtle loading indicators during navigation without replacing the entire page with a skeleton.

---

## Skeleton-to-Content Transitions

### Decision: CSS Opacity Fade (200-300ms)

**Rationale**: 
- GPU-accelerated (uses compositor thread)
- No layout shifts (opacity doesn't affect layout)
- Simple to implement with Tailwind CSS
- Matches spec requirement for "smooth transitions"

**Implementation**:

```css
/* Base skeleton state */
.skeleton-content {
  opacity: 0;
  transition: opacity 250ms ease-out;
}

/* Content ready state */
.skeleton-content.ready {
  opacity: 1;
}
```

**Tailwind Implementation**:
```tsx
<div className={cn(
  'transition-opacity duration-250 ease-out',
  isLoading ? 'opacity-0' : 'opacity-100'
)}>
  {/* Content */}
</div>
```

**Alternatives Considered**:
- **Transform animations**: Could cause layout shifts if not careful
- **Scale transitions**: Jarring for content, better for individual elements
- **Slide transitions**: Too dramatic for page-level content

### Minimum Display Time (100ms)

**Decision**: Implement minimum skeleton display time to prevent flash on fast loads.

**Implementation**:
```typescript
function useMinimumLoadingTime(isLoading: boolean, minTime = 100): boolean {
  const [showLoading, setShowLoading] = useState(isLoading)
  const loadingStartRef = useRef<number | null>(null)

  useEffect(() => {
    if (isLoading && !loadingStartRef.current) {
      loadingStartRef.current = Date.now()
      setShowLoading(true)
    } else if (!isLoading && loadingStartRef.current) {
      const elapsed = Date.now() - loadingStartRef.current
      const remaining = Math.max(0, minTime - elapsed)
      
      setTimeout(() => {
        setShowLoading(false)
        loadingStartRef.current = null
      }, remaining)
    }
  }, [isLoading, minTime])

  return showLoading
}
```

---

## ARIA Accessibility for Loading States

### Decision: ARIA Live Regions with `polite` Announcements

**Rationale**: Per MDN documentation and WAI-ARIA 1.2 spec:
- `aria-live="polite"` for non-critical updates (loading states)
- `aria-busy="true"` to indicate content is being updated
- Screen readers will announce changes at the next graceful opportunity

**Implementation Pattern**:

```tsx
<div 
  role="status" 
  aria-live="polite" 
  aria-busy={isLoading}
  aria-atomic="true"
>
  {isLoading ? (
    <>
      <span className="sr-only">Carregando conteúdo...</span>
      <Skeleton />
    </>
  ) : (
    <Content />
  )}
</div>
```

**Key Attributes**:
- `role="status"`: Implicit `aria-live="polite"` but explicit is clearer
- `aria-live="polite"`: Non-interrupting announcements
- `aria-busy="true"`: Delays announcements until updates complete
- `aria-atomic="true"`: Announce entire region, not just changes
- `sr-only` class: Hidden text for screen readers

**Alternatives Considered**:
- `aria-live="assertive"`: Too aggressive for loading states, interrupts user
- No live region: Screen reader users wouldn't know content is loading
- `role="alert"`: Too urgent, should be reserved for errors

---

## Timeout and Error Handling Strategy

### Decision: 5-Second Timeout with Graceful Degradation

**Rationale**: Per spec requirements:
- FR-004: No error states during normal loading (0-5 seconds)
- FR-005: Error states only after 5-second timeout OR confirmed error

**Implementation**:

```typescript
const LOADING_TIMEOUT_MS = 5000

function useLoadingWithTimeout(isLoading: boolean, error: Error | null) {
  const [timedOut, setTimedOut] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isLoading) {
      setTimedOut(false)
      timeoutRef.current = setTimeout(() => {
        setTimedOut(true)
      }, LOADING_TIMEOUT_MS)
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isLoading])

  // Show error only if:
  // 1. There's an actual error from the API, OR
  // 2. Loading has timed out
  const showError = error !== null || timedOut

  return {
    showLoading: isLoading && !showError,
    showError,
    errorMessage: error?.message || 'A requisição demorou muito. Por favor, tente novamente.',
  }
}
```

**Error State Triggers**:
1. **Immediate error**: API returns error response → show error immediately
2. **Timeout**: Loading exceeds 5 seconds → show timeout error
3. **Network failure**: Connection lost → show error immediately

---

## Implementation Approach

### Phase 1: Core Loading Infrastructure

1. **Create `useCoordinatedLoading` hook**
   - Combines multiple loading states (auth, finance data, realtime)
   - Implements minimum display time
   - Implements timeout logic
   - Provides unified `isLoading`, `showError`, `errorMessage`

2. **Create base `PageSkeleton` component**
   - Wrapper with ARIA attributes
   - Handles fade transition
   - Accepts children for page-specific skeleton content

### Phase 2: Page-Specific Skeletons

1. **Dashboard Skeleton** (existing `LoadingSkeleton` enhanced)
   - Summary panel cards (4 cards grid)
   - Chart area with shimmer
   - Match actual Dashboard layout exactly

2. **Manage Page Skeleton**
   - Tab bar skeleton
   - List items skeleton (3-5 placeholder rows)
   - Match Manage page layout

3. **Quick Update Modal Skeleton**
   - Header skeleton
   - Balance list items (3 placeholder rows)
   - Already partially implemented, enhance with transitions

### Phase 3: Integration

1. **Update Dashboard page**
   - Replace direct `isLoading` check with `useCoordinatedLoading`
   - Wrap content in `PageSkeleton`
   - Add fade transition

2. **Update Manage page**
   - Add `ManageSkeleton` component
   - Integrate with `useCoordinatedLoading`
   - Add fade transition

3. **Update Quick Update modal**
   - Enhance existing skeleton
   - Add fade transition
   - Ensure proper ARIA attributes

### Phase 4: Testing & Polish

1. **Console logging (dev only)**
   - Log load times
   - Log state transitions
   - Conditional on `import.meta.env.DEV`

2. **Manual CLS testing**
   - Verify zero layout shift on all pages
   - Test with slow network throttling
   - Test rapid navigation

---

## Summary of Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Loading Architecture | Hybrid (existing hooks + coordinated state) | Minimal refactoring, works with current Zustand/Supabase setup |
| Transition Animation | CSS opacity fade, 250ms | GPU-accelerated, no layout shifts |
| Minimum Display Time | 100ms | Prevents skeleton flash on fast loads |
| ARIA Strategy | `aria-live="polite"` + `aria-busy` | Non-interrupting, accessible |
| Timeout Threshold | 5 seconds | Per spec requirement |
| Error Display | Only on timeout OR actual error | Prevents premature error states |
| Skeleton Matching | Exact layout match per page | Zero CLS requirement |

