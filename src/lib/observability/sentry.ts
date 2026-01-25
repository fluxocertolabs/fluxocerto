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
