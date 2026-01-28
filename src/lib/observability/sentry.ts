import { useEffect } from 'react'
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom'
import * as Sentry from '@sentry/react'

const BLOCKLISTED_KEYS = [
  'email',
  'name',
  'amount',
  'balance',
  'title',
  'body',
  'message',
  'description',
  'notes',
  'token',
  'authorization',
  'cookie',
  'secret',
  'key',
]

const HEADER_BLOCKLIST = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-supabase-auth',
  'apikey',
])

function parseSampleRate(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback
  const value = Number(raw)
  if (!Number.isFinite(value)) return fallback
  return Math.max(0, Math.min(1, value))
}

function scrubObject(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(scrubObject)
  const next: Record<string, unknown> = { ...(value as Record<string, unknown>) }
  for (const key of Object.keys(next)) {
    const lowered = key.toLowerCase()
    if (BLOCKLISTED_KEYS.some((blocked) => lowered.includes(blocked))) {
      delete next[key]
      continue
    }
    next[key] = scrubObject(next[key])
  }
  return next
}

function scrubHeaders(headers: unknown): unknown {
  if (!headers || typeof headers !== 'object') return headers
  const next: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
    if (HEADER_BLOCKLIST.has(key.toLowerCase())) continue
    if (typeof value === 'string') {
      next[key] = value
    }
  }
  return next
}

function scrubEvent(event: Sentry.Event): Sentry.Event | null {
  if (!event) return event
  if (event.user?.email) {
    delete event.user.email
  }
  if (event.request?.headers) {
    event.request.headers = scrubHeaders(event.request.headers) as Record<string, string>
  }
  if (event.request?.data) {
    event.request.data = scrubObject(event.request.data) as Record<string, unknown>
  }
  if (event.extra) {
    event.extra = scrubObject(event.extra) as Record<string, unknown>
  }
  if (event.tags) {
    event.tags = scrubObject(event.tags) as Record<string, string>
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
      ...crumb,
      data: crumb.data ? (scrubObject(crumb.data) as Record<string, unknown>) : crumb.data,
    }))
  }
  return event
}

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  const tracesSampleRate = parseSampleRate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, 0.1)
  const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE
  const release = import.meta.env.VITE_SENTRY_RELEASE

  const integrations: Array<ReturnType<typeof Sentry.browserTracingIntegration>> = []
  if (Sentry.reactRouterV6BrowserTracingIntegration) {
    integrations.push(
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }) as ReturnType<typeof Sentry.browserTracingIntegration>,
    )
  } else {
    integrations.push(Sentry.browserTracingIntegration())
  }

  const beforeSend: NonNullable<Parameters<typeof Sentry.init>[0]['beforeSend']> = (event) =>
    scrubEvent(event as Sentry.Event) as ReturnType<NonNullable<Parameters<typeof Sentry.init>[0]['beforeSend']>>

  Sentry.init({
    dsn,
    environment,
    release,
    tracesSampleRate,
    integrations,
    beforeSend,
  })
}

type StartSpanContext = Parameters<typeof Sentry.startSpan>[0]

export function startSentrySpan<T>(context: StartSpanContext, callback: () => T): T {
  if (typeof Sentry.startSpan === 'function') {
    return Sentry.startSpan(context, callback)
  }
  return callback()
}

/**
 * Best-effort browser "long task" observer.
 *
 * Why:
 * - Firefox's "page is slowing down" warning often correlates with long main-thread tasks.
 * - Capturing long tasks as breadcrumbs helps correlate user-reported slowness with
 *   specific flows (e.g., onboarding wizard auto-show).
 *
 * Notes:
 * - The `longtask` entry type isn't supported in all browsers.
 * - We record breadcrumbs (not errors) to avoid event spam.
 */
export function initBrowserLongTaskObserver(options?: {
  thresholdMs?: number
  maxBreadcrumbsPerMinute?: number
}): void {
  const thresholdMs = options?.thresholdMs ?? 50
  const maxBreadcrumbsPerMinute = options?.maxBreadcrumbsPerMinute ?? 30

  const perf = typeof performance !== 'undefined' ? performance : null
  const observerCtor = typeof PerformanceObserver !== 'undefined' ? PerformanceObserver : null
  if (!perf || !observerCtor) return

  const supported = (PerformanceObserver as unknown as { supportedEntryTypes?: string[] }).supportedEntryTypes
  if (!supported || !supported.includes('longtask')) return

  let windowStart = Date.now()
  let countInWindow = 0

  const observer = new PerformanceObserver((list) => {
    const now = Date.now()
    if (now - windowStart > 60_000) {
      windowStart = now
      countInWindow = 0
    }

    for (const entry of list.getEntries()) {
      // @ts-expect-error: entry type isn't in lib.dom for all TS configs
      const duration = typeof entry.duration === 'number' ? entry.duration : 0
      if (duration < thresholdMs) continue
      if (countInWindow >= maxBreadcrumbsPerMinute) break
      countInWindow += 1

      const startTime = typeof entry.startTime === 'number' ? entry.startTime : undefined
      const name = typeof entry.name === 'string' ? entry.name : 'longtask'

      // Some browsers expose attribution; keep it minimal and non-identifying.
      const attribution = (entry as unknown as { attribution?: Array<Record<string, unknown>> }).attribution
      const attributionSummary =
        Array.isArray(attribution) && attribution.length > 0
          ? attribution.map((a) => ({
              // `name` can be "script", "event", etc. Avoid copying URLs.
              name: typeof a.name === 'string' ? a.name : undefined,
              entryType: typeof a.entryType === 'string' ? a.entryType : undefined,
              startTime: typeof a.startTime === 'number' ? a.startTime : undefined,
              duration: typeof a.duration === 'number' ? a.duration : undefined,
            }))
          : undefined

      addSentryBreadcrumb({
        category: 'performance.longtask',
        message: 'Long task detected',
        level: 'info',
        data: {
          duration_ms: Math.round(duration),
          startTime_ms: startTime != null ? Math.round(startTime) : undefined,
          name,
          attribution: attributionSummary,
        },
      })
    }
  })

  try {
    observer.observe({ entryTypes: ['longtask'] })
  } catch {
    // Ignore: some browsers throw even if supportedEntryTypes lies.
  }
}

export function addSentryBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  Sentry.addBreadcrumb(breadcrumb)
}

export function captureSentryException(
  error: unknown,
  captureContext?: Sentry.CaptureContext,
): void {
  Sentry.captureException(error, captureContext)
}

export function setSentryUser(user: Sentry.User | null): void {
  Sentry.setUser(user)
}

export function setSentryTag(key: string, value: string | null): void {
  if (value === null) {
    Sentry.setTag(key, undefined)
    return
  }
  Sentry.setTag(key, value)
}
