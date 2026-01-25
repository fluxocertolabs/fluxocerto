import * as Sentry from 'https://esm.sh/@sentry/deno@10.36.0'

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
  'apikey',
  'x-supabase-auth',
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
    if (typeof value === 'string') next[key] = value
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
  const dsn = Deno.env.get('SENTRY_DSN')
  if (!dsn) return

  const tracesSampleRate = parseSampleRate(Deno.env.get('SENTRY_TRACES_SAMPLE_RATE'), 0.2)
  const environment = Deno.env.get('SENTRY_ENVIRONMENT') ?? 'production'
  const release = Deno.env.get('SENTRY_RELEASE') ?? undefined

  Sentry.init({
    dsn,
    environment,
    release,
    tracesSampleRate,
    beforeSend: scrubEvent,
    sendDefaultPii: false,
  })
}

export function startEdgeSpan<T>(
  context: Sentry.StartSpanOptions,
  callback: () => T,
): T {
  if (typeof Sentry.startSpan === 'function') {
    return Sentry.startSpan(context, callback)
  }
  return callback()
}

export function captureEdgeException(
  error: unknown,
  captureContext?: Sentry.CaptureContext,
): void {
  Sentry.captureException(error, captureContext)
}

export function addEdgeBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  Sentry.addBreadcrumb(breadcrumb)
}

export function setEdgeTag(key: string, value: string): void {
  Sentry.setTag(key, value)
}

export function setRequestContext(req: Request): void {
  const url = new URL(req.url)
  Sentry.setContext('request', {
    method: req.method,
    path: url.pathname,
    origin: url.origin,
  })
}
