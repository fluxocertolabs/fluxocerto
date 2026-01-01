import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock, setSessionMock } = vi.hoisted(() => {
  return {
    createClientMock: vi.fn(),
    setSessionMock: vi.fn(),
  }
})

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: createClientMock,
  }
})

import { injectPreviewSession } from './supabase'

describe('injectPreviewSession', () => {
  beforeEach(() => {
    // Default to enabled + configured unless a test overrides
    vi.stubEnv('VITE_PREVIEW_AUTH_BYPASS', 'true')
    vi.stubEnv('VITE_SUPABASE_URL', 'http://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')

    // Ensure our mocked client is returned by getSupabase()
    createClientMock.mockReturnValue({
      auth: {
        setSession: setSessionMock,
      },
    })

    setSessionMock.mockReset()
    createClientMock.mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns failure when preview bypass is disabled', async () => {
    vi.stubEnv('VITE_PREVIEW_AUTH_BYPASS', '')

    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const result = await injectPreviewSession()
    expect(result.success).toBe(false)
    expect(result.error).toContain('disabled')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(setSessionMock).not.toHaveBeenCalled()
  })

  it('returns failure when Supabase is not configured', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')

    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const result = await injectPreviewSession()
    expect(result.success).toBe(false)
    expect(result.error).toContain('Supabase is not configured')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(setSessionMock).not.toHaveBeenCalled()
  })

  it('returns failure when endpoint responds non-OK with error JSON', async () => {
    const fetchSpy = vi.fn(async () => {
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      } as any
    })
    vi.stubGlobal('fetch', fetchSpy)

    const result = await injectPreviewSession()
    expect(result.success).toBe(false)
    expect(result.error).toContain('Preview auth endpoint failed')
    expect(result.error).toContain('Not found')
    expect(setSessionMock).not.toHaveBeenCalled()
  })

  it('returns failure when endpoint returns invalid tokens', async () => {
    const fetchSpy = vi.fn(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({ accessToken: 123, refreshToken: 'rt' }),
      } as any
    })
    vi.stubGlobal('fetch', fetchSpy)

    const result = await injectPreviewSession()
    expect(result.success).toBe(false)
    expect(result.error).toContain('invalid tokens')
    expect(setSessionMock).not.toHaveBeenCalled()
  })

  it('returns failure when setSession returns an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return {
          ok: true,
          status: 200,
          json: async () => ({ accessToken: 'at', refreshToken: 'rt' }),
        } as any
      })
    )

    setSessionMock.mockResolvedValue({ error: { message: 'bad session' } })

    const result = await injectPreviewSession()
    expect(result.success).toBe(false)
    expect(result.error).toContain('setSession failed')
    expect(result.error).toContain('bad session')
  })

  it('returns success when endpoint returns tokens and setSession succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return {
          ok: true,
          status: 200,
          json: async () => ({ accessToken: 'at', refreshToken: 'rt' }),
        } as any
      })
    )

    setSessionMock.mockResolvedValue({ error: null })

    const result = await injectPreviewSession()
    expect(result.success).toBe(true)
    expect(setSessionMock).toHaveBeenCalledWith({
      access_token: 'at',
      refresh_token: 'rt',
    })
  })
})



