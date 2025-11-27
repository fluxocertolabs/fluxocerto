# Data Model: Page Loading Experience

**Feature Branch**: `013-page-loading-experience`  
**Date**: 2025-11-27

## Overview

This feature introduces loading state management types and skeleton configuration. No database changes required - all state is client-side React state.

---

## Type Definitions

### Loading State Types

```typescript
/**
 * Represents the current phase of a loading operation.
 */
type LoadingPhase = 'idle' | 'loading' | 'success' | 'error' | 'timeout'

/**
 * Configuration for coordinated loading behavior.
 */
interface LoadingConfig {
  /** Minimum time to display skeleton (prevents flash), in ms. Default: 100 */
  minDisplayTime?: number
  /** Maximum time to wait before showing timeout error, in ms. Default: 5000 */
  timeoutThreshold?: number
  /** Whether to log timing information in development. Default: true */
  enableDevLogging?: boolean
}

/**
 * Result from the useCoordinatedLoading hook.
 */
interface CoordinatedLoadingState {
  /** Current loading phase */
  phase: LoadingPhase
  /** Whether skeleton should be displayed */
  showSkeleton: boolean
  /** Whether error state should be displayed */
  showError: boolean
  /** Error message to display (if showError is true) */
  errorMessage: string | null
  /** Timestamp when loading started (for dev logging) */
  loadingStartTime: number | null
  /** Function to retry the failed operation */
  retry: () => void
}

/**
 * Props for skeleton wrapper components.
 */
interface SkeletonWrapperProps {
  /** Whether content is currently loading */
  isLoading: boolean
  /** Error object if loading failed */
  error?: Error | null
  /** Callback to retry loading */
  onRetry?: () => void
  /** Page-specific skeleton component to render */
  skeleton: React.ReactNode
  /** Actual content to render when loaded */
  children: React.ReactNode
  /** Optional custom loading config */
  config?: LoadingConfig
}
```

### Skeleton Component Types

```typescript
/**
 * Props for page-level skeleton components.
 * Each page has its own skeleton that matches its layout.
 */
interface PageSkeletonProps {
  /** Optional additional CSS classes */
  className?: string
}

/**
 * Props for the base skeleton card building block.
 */
interface SkeletonCardProps {
  /** Width of the card (Tailwind class) */
  width?: string
  /** Height of the card (Tailwind class) */
  height?: string
  /** Whether to show shimmer animation */
  shimmer?: boolean
  /** Optional additional CSS classes */
  className?: string
}

/**
 * Props for skeleton text lines.
 */
interface SkeletonLineProps {
  /** Width of the line (Tailwind class or CSS value) */
  width?: string
  /** Height of the line. Default: 'h-4' */
  height?: string
  /** Optional additional CSS classes */
  className?: string
}
```

### Error State Types

```typescript
/**
 * Error state information for display.
 */
interface LoadingErrorState {
  /** Type of error that occurred */
  type: 'network' | 'timeout' | 'api' | 'unknown'
  /** User-friendly error message */
  message: string
  /** Whether the error is retryable */
  canRetry: boolean
  /** Original error object (for logging) */
  originalError?: Error
}

/**
 * Maps error types to user-friendly messages (Portuguese).
 */
const ERROR_MESSAGES: Record<LoadingErrorState['type'], string> = {
  network: 'Erro de conexão. Verifique sua internet e tente novamente.',
  timeout: 'A requisição demorou muito. Por favor, tente novamente.',
  api: 'Erro ao carregar dados. Por favor, tente novamente.',
  unknown: 'Ocorreu um erro inesperado. Por favor, tente novamente.',
}
```

---

## State Transitions

### Loading Phase State Machine

```
┌─────────┐
│  idle   │
└────┬────┘
     │ start loading
     ▼
┌─────────┐
│ loading │◄────────────────┐
└────┬────┘                 │
     │                      │ retry
     ├─── success ──────────┼───────────┐
     │                      │           │
     ├─── error ────────────┤           │
     │                      │           │
     └─── timeout ──────────┘           │
                                        │
┌─────────┐                             │
│ success │◄────────────────────────────┘
└─────────┘

┌─────────┐
│  error  │───── retry ────► loading
└─────────┘

┌─────────┐
│ timeout │───── retry ────► loading
└─────────┘
```

### Transition Rules

| From State | Event | To State | Side Effects |
|------------|-------|----------|--------------|
| idle | startLoading | loading | Start timeout timer, record start time |
| loading | dataReceived | success | Clear timeout timer, wait for minDisplayTime |
| loading | errorReceived | error | Clear timeout timer, set error message |
| loading | timeoutReached | timeout | Set timeout error message |
| success | startLoading | loading | (Re-fetch scenario) |
| error | retry | loading | Clear error, restart loading |
| timeout | retry | loading | Clear error, restart loading |

---

## Component Hierarchy

```
App
├── AppRoutes (auth loading)
│   └── LoadingSpinner (app-level auth loading)
│
├── Dashboard (page)
│   └── PageLoadingWrapper
│       ├── DashboardSkeleton (when loading)
│       │   ├── SummaryPanelSkeleton
│       │   └── ChartSkeleton
│       │
│       └── DashboardContent (when ready)
│           ├── SummaryPanel
│           └── CashflowChart
│
├── ManagePage (page)
│   └── PageLoadingWrapper
│       ├── ManageSkeleton (when loading)
│       │   ├── TabBarSkeleton
│       │   └── ListSkeleton
│       │
│       └── ManageContent (when ready)
│           ├── Tabs
│           └── EntityLists
│
└── QuickUpdateModal (modal)
    └── QuickUpdateView
        ├── ModalSkeleton (when loading)
        │   └── BalanceListSkeleton
        │
        └── ModalContent (when ready)
            └── BalanceList
```

---

## CSS Animation Specifications

### Fade Transition

```css
/* Applied to content wrapper */
.loading-transition {
  transition-property: opacity;
  transition-duration: 250ms;
  transition-timing-function: ease-out;
}

.loading-transition[data-loading="true"] {
  opacity: 0;
}

.loading-transition[data-loading="false"] {
  opacity: 1;
}
```

### Shimmer Animation (existing, for reference)

```css
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}
```

---

## Validation Rules

### Loading Config Validation

```typescript
const LoadingConfigSchema = z.object({
  minDisplayTime: z.number().min(0).max(1000).optional().default(100),
  timeoutThreshold: z.number().min(1000).max(30000).optional().default(5000),
  enableDevLogging: z.boolean().optional().default(true),
})
```

### Constraints

1. **minDisplayTime**: Must be between 0-1000ms (prevent excessive delays)
2. **timeoutThreshold**: Must be between 1000-30000ms (reasonable timeout range)
3. **Skeleton must match content layout**: Verified manually during development

---

## Integration Points

### Existing Hooks to Integrate With

1. **`useAuth`** - Provides `isLoading` for auth state
2. **`useFinanceData`** - Provides `isLoading` and `error` for data fetching
3. **`useCashflowProjection`** - Wraps `useFinanceData`, provides `isLoading` and `error`

### New Hook to Create

```typescript
/**
 * Coordinates multiple loading states into a single unified state.
 * Implements minimum display time and timeout logic.
 */
function useCoordinatedLoading(
  sources: {
    auth: { isLoading: boolean }
    data: { isLoading: boolean; error: string | null }
  },
  config?: LoadingConfig
): CoordinatedLoadingState
```

---

## File Locations

| Type | File Path |
|------|-----------|
| Loading Types | `src/types/loading.ts` |
| useCoordinatedLoading | `src/hooks/use-coordinated-loading.ts` |
| PageLoadingWrapper | `src/components/loading/page-loading-wrapper.tsx` |
| DashboardSkeleton | `src/components/loading/dashboard-skeleton.tsx` |
| ManageSkeleton | `src/components/loading/manage-skeleton.tsx` |
| ModalSkeleton | `src/components/loading/modal-skeleton.tsx` |
| Skeleton primitives | `src/components/loading/skeleton-primitives.tsx` |

