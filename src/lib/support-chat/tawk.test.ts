/**
 * Tests for Tawk.to chat URL helper.
 *
 * Covers:
 * - returns null when configuration is missing
 * - returns the correct chat URL when configured
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type TawkModule = typeof import('./tawk')

describe('Tawk.to chat URL helper', () => {
  let tawkModule: TawkModule

  beforeEach(async () => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('returns null when no env vars are set', async () => {
    vi.stubEnv('VITE_TAWK_PROPERTY_ID', '')
    vi.stubEnv('VITE_TAWK_WIDGET_ID', '')
    tawkModule = await import('./tawk')
    expect(tawkModule.getTawkChatUrl()).toBeNull()
  })

  it('returns null when only VITE_TAWK_PROPERTY_ID is set', async () => {
    vi.stubEnv('VITE_TAWK_PROPERTY_ID', 'test-property-id')
    vi.stubEnv('VITE_TAWK_WIDGET_ID', '')
    tawkModule = await import('./tawk')
    expect(tawkModule.getTawkChatUrl()).toBeNull()
  })

  it('returns null when only VITE_TAWK_WIDGET_ID is set', async () => {
    vi.stubEnv('VITE_TAWK_PROPERTY_ID', '')
    vi.stubEnv('VITE_TAWK_WIDGET_ID', 'test-widget-id')
    tawkModule = await import('./tawk')
    expect(tawkModule.getTawkChatUrl()).toBeNull()
  })

  it('returns the chat URL when both env vars are set', async () => {
    vi.stubEnv('VITE_TAWK_PROPERTY_ID', 'prop123')
    vi.stubEnv('VITE_TAWK_WIDGET_ID', 'widget456')
    tawkModule = await import('./tawk')
    expect(tawkModule.getTawkChatUrl()).toBe('https://tawk.to/chat/prop123/widget456')
  })
})
