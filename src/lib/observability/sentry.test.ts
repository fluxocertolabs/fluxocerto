import { describe, expect, it, vi, beforeEach } from 'vitest'
import { initSentry } from './sentry'

const initSpy = vi.fn()

vi.mock('@sentry/react', async () => {
  return {
    init: (options: unknown) => initSpy(options),
    startSpan: vi.fn((_ctx: unknown, cb: () => unknown) => cb()),
    addBreadcrumb: vi.fn(),
    captureException: vi.fn(),
    setUser: vi.fn(),
    setTag: vi.fn(),
    browserTracingIntegration: vi.fn(() => ({ name: 'browserTracing' })),
    reactRouterV6BrowserTracingIntegration: vi.fn(() => ({ name: 'reactRouterTracing' })),
  }
})

describe('initSentry', () => {
  beforeEach(() => {
    initSpy.mockClear()
    vi.stubEnv('VITE_SENTRY_DSN', 'https://example@sentry.io/123')
    vi.stubEnv('VITE_SENTRY_TRACES_SAMPLE_RATE', '0.5')
    vi.stubEnv('VITE_SENTRY_ENVIRONMENT', 'test')
  })

  it('scrubs sensitive fields in beforeSend', () => {
    initSentry()
    const options = initSpy.mock.calls[0]?.[0] as { beforeSend?: (event: any) => any }
    expect(options?.beforeSend).toBeTypeOf('function')

    const event = {
      user: { id: 'user', email: 'test@example.com' },
      request: {
        headers: { authorization: 'Bearer secret', accept: 'application/json' },
        data: { email: 'test@example.com', amount: 1000, safe: 'ok' },
      },
      extra: { token: 'secret', safe: 'ok' },
      tags: { message: 'hello', safe: 'ok' },
      breadcrumbs: [{ data: { email: 'test@example.com', safe: 'ok' } }],
    }

    const scrubbed = options.beforeSend?.(event)
    expect(scrubbed.user.email).toBeUndefined()
    expect(scrubbed.request.headers.authorization).toBeUndefined()
    expect(scrubbed.request.headers.accept).toBe('application/json')
    expect(scrubbed.request.data.email).toBeUndefined()
    expect(scrubbed.request.data.amount).toBeUndefined()
    expect(scrubbed.request.data.safe).toBe('ok')
    expect(scrubbed.extra.token).toBeUndefined()
    expect(scrubbed.extra.safe).toBe('ok')
    expect(scrubbed.tags.message).toBeUndefined()
    expect(scrubbed.tags.safe).toBe('ok')
    expect(scrubbed.breadcrumbs[0].data.email).toBeUndefined()
  })
})
