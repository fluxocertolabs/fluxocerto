/// <reference types="node" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock, generateLinkMock } = vi.hoisted(() => {
  return {
    createClientMock: vi.fn(),
    generateLinkMock: vi.fn(),
  }
})

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: createClientMock,
  }
})

import handler from '../../api/preview-auth-bypass'

function createMockRes() {
  const headers: Record<string, string> = {}
  let body = ''

  return {
    statusCode: 200,
    headers,
    setHeader: (key: string, value: string) => {
      headers[key] = value
    },
    end: (chunk: string) => {
      body = chunk
    },
    getBody: () => body,
    getJson: () => JSON.parse(body) as { error?: string; accessToken?: string; refreshToken?: string; email?: string },
  }
}

function setEnv(vars: Record<string, string | undefined>): void {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) {
      delete process.env[k]
    } else {
      process.env[k] = v
    }
  }
}

describe('api/preview-auth-bypass handler', () => {
  beforeEach(() => {
    generateLinkMock.mockReset()
    createClientMock.mockReset()
    createClientMock.mockReturnValue({
      auth: {
        admin: {
          generateLink: generateLinkMock,
        },
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    // Clear env vars that this handler relies on
    setEnv({
      VERCEL_ENV: undefined,
      PREVIEW_AUTH_BYPASS_ENABLED: undefined,
      PREVIEW_AUTH_BYPASS_EMAIL: undefined,
      VITE_SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    })
  })

  it('returns 404 outside Vercel preview', async () => {
    setEnv({ VERCEL_ENV: 'production', PREVIEW_AUTH_BYPASS_ENABLED: 'true' })
    const res = createMockRes()

    await handler({ method: 'GET' } as any, res as any)

    expect(res.statusCode).toBe(404)
    expect(res.getJson().error).toBe('Not found')
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('returns 404 when bypass is not enabled', async () => {
    setEnv({ VERCEL_ENV: 'preview', PREVIEW_AUTH_BYPASS_ENABLED: 'false' })
    const res = createMockRes()

    await handler({ method: 'GET' } as any, res as any)

    expect(res.statusCode).toBe(404)
    expect(res.getJson().error).toBe('Not found')
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('returns 405 for non-GET methods', async () => {
    setEnv({ VERCEL_ENV: 'preview', PREVIEW_AUTH_BYPASS_ENABLED: 'true' })
    const res = createMockRes()

    await handler({ method: 'POST' } as any, res as any)

    expect(res.statusCode).toBe(405)
    expect(res.headers['Allow']).toBe('GET')
  })

  it('returns 500 when VITE_SUPABASE_URL is missing', async () => {
    setEnv({
      VERCEL_ENV: 'preview',
      PREVIEW_AUTH_BYPASS_ENABLED: 'true',
      VITE_SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    })
    const res = createMockRes()

    await handler({ method: 'GET' } as any, res as any)

    expect(res.statusCode).toBe(500)
    expect(res.getJson().error).toContain('VITE_SUPABASE_URL')
  })

  it('returns 500 when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    setEnv({
      VERCEL_ENV: 'preview',
      PREVIEW_AUTH_BYPASS_ENABLED: 'true',
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    })
    const res = createMockRes()

    await handler({ method: 'GET' } as any, res as any)

    expect(res.statusCode).toBe(500)
    expect(res.getJson().error).toContain('SUPABASE_SERVICE_ROLE_KEY')
  })

  it('returns 500 when generateLink fails', async () => {
    setEnv({
      VERCEL_ENV: 'preview',
      PREVIEW_AUTH_BYPASS_ENABLED: 'true',
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    })

    generateLinkMock.mockResolvedValue({
      data: null,
      error: { message: 'boom' },
    })

    const res = createMockRes()
    await handler({ method: 'GET' } as any, res as any)

    expect(res.statusCode).toBe(500)
    expect(res.getJson().error).toContain('generateLink failed')
  })

  it('returns 500 when generateLink returns no action_link', async () => {
    setEnv({
      VERCEL_ENV: 'preview',
      PREVIEW_AUTH_BYPASS_ENABLED: 'true',
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    })

    generateLinkMock.mockResolvedValue({
      data: { properties: {} },
      error: null,
    })

    const res = createMockRes()
    await handler({ method: 'GET' } as any, res as any)

    expect(res.statusCode).toBe(500)
    expect(res.getJson().error).toContain('no action_link')
  })

  it('returns 500 when redirect chain does not yield tokens', async () => {
    setEnv({
      VERCEL_ENV: 'preview',
      PREVIEW_AUTH_BYPASS_ENABLED: 'true',
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    })

    generateLinkMock.mockResolvedValue({
      data: { properties: { action_link: 'https://supabase.test/auth/v1/verify?token=abc&type=magiclink' } },
      error: null,
    })

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return {
          headers: {
            get: () => null,
          },
        } as any
      })
    )

    const res = createMockRes()
    await handler({ method: 'GET' } as any, res as any)

    expect(res.statusCode).toBe(500)
    expect(res.getJson().error).toContain('Failed to resolve session tokens')
  })

  it('returns tokens when enabled in preview and redirects include token hash', async () => {
    setEnv({
      VERCEL_ENV: 'preview',
      PREVIEW_AUTH_BYPASS_ENABLED: 'true',
      PREVIEW_AUTH_BYPASS_EMAIL: 'preview-auth-bypass@example.test',
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    })

    generateLinkMock.mockResolvedValue({
      data: { properties: { action_link: 'https://supabase.test/auth/v1/verify?token=abc&type=magiclink' } },
      error: null,
    })

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return {
          headers: {
            get: () => 'https://example.com/#access_token=at&refresh_token=rt',
          },
        } as any
      })
    )

    const res = createMockRes()
    await handler({ method: 'GET' } as any, res as any)

    expect(res.statusCode).toBe(200)
    expect(res.getJson().accessToken).toBe('at')
    expect(res.getJson().refreshToken).toBe('rt')
    expect(res.getJson().email).toBe('preview-auth-bypass@example.test')
  })
})


