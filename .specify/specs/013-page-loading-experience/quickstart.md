# Quickstart: Page Loading Experience

**Feature Branch**: `013-page-loading-experience`  
**Date**: 2025-11-27

## Overview

This guide provides implementation steps for the Page Loading Experience enhancement. The feature eliminates UI flickering and provides polished loading states across Dashboard, Manage page, and Quick Update modal.

---

## Prerequisites

- Node.js 20+
- pnpm 10+
- Existing codebase with working Dashboard and Manage pages

---

## Quick Implementation Guide

### Step 1: Create Loading Types

Create `src/types/loading.ts`:

```typescript
export type LoadingPhase = 'idle' | 'loading' | 'success' | 'error' | 'timeout'

export interface LoadingConfig {
  minDisplayTime?: number      // Default: 100ms
  timeoutThreshold?: number    // Default: 5000ms
  enableDevLogging?: boolean   // Default: true in dev
}

export interface CoordinatedLoadingState {
  phase: LoadingPhase
  showSkeleton: boolean
  showError: boolean
  errorMessage: string | null
  retry: () => void
}
```

### Step 2: Create Coordinated Loading Hook

Create `src/hooks/use-coordinated-loading.ts`:

```typescript
import { useState, useEffect, useRef, useCallback } from 'react'
import type { LoadingConfig, CoordinatedLoadingState, LoadingPhase } from '@/types/loading'

const DEFAULT_CONFIG: Required<LoadingConfig> = {
  minDisplayTime: 100,
  timeoutThreshold: 5000,
  enableDevLogging: import.meta.env.DEV,
}

export function useCoordinatedLoading(
  isLoading: boolean,
  error: string | null,
  onRetry: () => void,
  config?: LoadingConfig
): CoordinatedLoadingState {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  
  const [phase, setPhase] = useState<LoadingPhase>('idle')
  const [showSkeleton, setShowSkeleton] = useState(false)
  const loadingStartRef = useRef<number | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const minTimeRef = useRef<NodeJS.Timeout | null>(null)

  // Handle loading start
  useEffect(() => {
    if (isLoading && phase !== 'loading') {
      loadingStartRef.current = Date.now()
      setPhase('loading')
      setShowSkeleton(true)
      
      // Set timeout
      timeoutRef.current = setTimeout(() => {
        setPhase('timeout')
      }, mergedConfig.timeoutThreshold)
      
      if (mergedConfig.enableDevLogging) {
        console.log('[Loading] Started')
      }
    }
  }, [isLoading, phase, mergedConfig.timeoutThreshold, mergedConfig.enableDevLogging])

  // Handle loading complete
  useEffect(() => {
    if (!isLoading && phase === 'loading') {
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      if (error) {
        setPhase('error')
        setShowSkeleton(false)
      } else {
        // Ensure minimum display time
        const elapsed = Date.now() - (loadingStartRef.current ?? 0)
        const remaining = Math.max(0, mergedConfig.minDisplayTime - elapsed)
        
        minTimeRef.current = setTimeout(() => {
          setPhase('success')
          setShowSkeleton(false)
          
          if (mergedConfig.enableDevLogging) {
            console.log(`[Loading] Complete in ${elapsed + remaining}ms`)
          }
        }, remaining)
      }
    }
  }, [isLoading, error, phase, mergedConfig.minDisplayTime, mergedConfig.enableDevLogging])

  // Handle error during loading
  useEffect(() => {
    if (error && phase === 'loading') {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      setPhase('error')
      setShowSkeleton(false)
    }
  }, [error, phase])

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (minTimeRef.current) clearTimeout(minTimeRef.current)
    }
  }, [])

  const retry = useCallback(() => {
    setPhase('idle')
    setShowSkeleton(false)
    onRetry()
  }, [onRetry])

  const errorMessage = phase === 'timeout'
    ? 'A requisição demorou muito. Por favor, tente novamente.'
    : error

  return {
    phase,
    showSkeleton,
    showError: phase === 'error' || phase === 'timeout',
    errorMessage,
    retry,
  }
}
```

### Step 3: Create Page Loading Wrapper

Create `src/components/loading/page-loading-wrapper.tsx`:

```typescript
import { cn } from '@/lib/utils'
import { ErrorState } from '@/components/cashflow/error-state'
import type { CoordinatedLoadingState } from '@/types/loading'

interface PageLoadingWrapperProps {
  loadingState: CoordinatedLoadingState
  skeleton: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function PageLoadingWrapper({
  loadingState,
  skeleton,
  children,
  className,
}: PageLoadingWrapperProps) {
  const { showSkeleton, showError, errorMessage, retry } = loadingState

  if (showError) {
    return (
      <ErrorState 
        error={new Error(errorMessage ?? 'Erro desconhecido')} 
        onRetry={retry} 
      />
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={showSkeleton}
      className={cn('relative', className)}
    >
      {/* Skeleton layer */}
      <div
        className={cn(
          'transition-opacity duration-250 ease-out',
          showSkeleton ? 'opacity-100' : 'opacity-0 pointer-events-none absolute inset-0'
        )}
        aria-hidden={!showSkeleton}
      >
        {showSkeleton && (
          <span className="sr-only">Carregando conteúdo...</span>
        )}
        {skeleton}
      </div>

      {/* Content layer */}
      <div
        className={cn(
          'transition-opacity duration-250 ease-out',
          showSkeleton ? 'opacity-0' : 'opacity-100'
        )}
      >
        {!showSkeleton && children}
      </div>
    </div>
  )
}
```

### Step 4: Create Dashboard Skeleton

Enhance existing `src/components/cashflow/loading-skeleton.tsx` or create new `src/components/loading/dashboard-skeleton.tsx`:

```typescript
import { cn } from '@/lib/utils'

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-xl border border-border bg-card p-4',
        'animate-pulse',
        className
      )}
    >
      <div className="h-4 w-20 rounded bg-muted mb-2" />
      <div className="h-8 w-28 rounded bg-muted" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary panel skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Chart skeleton */}
      <div className={cn(
        'rounded-xl border border-border bg-card p-4',
        'animate-pulse'
      )}>
        <div className="h-6 w-48 rounded bg-muted mb-4" />
        <div className="h-[300px] md:h-[400px] rounded-lg bg-muted relative overflow-hidden">
          <div
            className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
            }}
          />
        </div>
        <div className="flex justify-between mt-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-4 w-10 rounded bg-muted" />
          ))}
        </div>
      </div>
    </div>
  )
}
```

### Step 5: Update Dashboard Page

Update `src/pages/dashboard.tsx`:

```typescript
import { useCoordinatedLoading } from '@/hooks/use-coordinated-loading'
import { PageLoadingWrapper } from '@/components/loading/page-loading-wrapper'
import { DashboardSkeleton } from '@/components/loading/dashboard-skeleton'

export function Dashboard() {
  const {
    chartData,
    dangerRanges,
    summaryStats,
    isLoading,
    hasData,
    error,
    retry,
  } = useCashflowProjection()

  const loadingState = useCoordinatedLoading(
    isLoading,
    error?.message ?? null,
    retry
  )

  // Empty state check (after loading complete)
  if (!loadingState.showSkeleton && !loadingState.showError && !hasData) {
    return (
      <div className={cn('container mx-auto p-4 md:p-6 max-w-6xl')}>
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Painel de Fluxo de Caixa
        </h1>
        <EmptyState />
      </div>
    )
  }

  return (
    <div className={cn('container mx-auto p-4 md:p-6 max-w-6xl')}>
      <h1 className="text-2xl font-bold text-foreground mb-6">
        Painel de Fluxo de Caixa
      </h1>
      <PageLoadingWrapper
        loadingState={loadingState}
        skeleton={<DashboardSkeleton />}
      >
        {/* Actual dashboard content */}
        <div className="space-y-6">
          <SummaryPanel stats={summaryStats} />
          <CashflowChart data={chartData} dangerRanges={dangerRanges} />
        </div>
      </PageLoadingWrapper>
    </div>
  )
}
```

---

## Testing Checklist

### Manual Testing

- [ ] Navigate to Dashboard - skeleton appears immediately
- [ ] Skeleton displays for minimum 100ms even on fast loads
- [ ] Content fades in smoothly (no flicker)
- [ ] Error state only shows after 5 seconds or actual error
- [ ] Retry button works correctly
- [ ] Screen reader announces loading state changes
- [ ] No layout shift when transitioning from skeleton to content

### Accessibility Testing

- [ ] `aria-live="polite"` is present on loading regions
- [ ] `aria-busy` updates correctly during loading
- [ ] Screen reader text is hidden visually but accessible
- [ ] Focus is not disrupted during transitions

### Performance Testing

- [ ] No visible CLS (Cumulative Layout Shift)
- [ ] Transitions are smooth at 60fps
- [ ] Console logs appear in development only

---

## Common Issues

### Skeleton flashes briefly
- Increase `minDisplayTime` in config
- Check if data is being fetched multiple times

### Layout shifts during transition
- Ensure skeleton dimensions match content exactly
- Use fixed heights where possible
- Verify skeleton structure mirrors content structure

### Error shows too early
- Check `timeoutThreshold` setting
- Verify error is not being set during initial load

### Screen reader not announcing
- Ensure `aria-live` region exists before content changes
- Check that content is being added/removed, not just hidden

---

## File Structure

```
src/
├── types/
│   └── loading.ts              # Loading state types
├── hooks/
│   └── use-coordinated-loading.ts
├── components/
│   └── loading/
│       ├── page-loading-wrapper.tsx
│       ├── dashboard-skeleton.tsx
│       ├── manage-skeleton.tsx
│       └── modal-skeleton.tsx
└── pages/
    ├── dashboard.tsx           # Updated
    └── manage.tsx              # Updated
```

