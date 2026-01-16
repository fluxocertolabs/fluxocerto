/**
 * Tests for Tawk.to integration wrapper.
 *
 * Covers:
 * - isTawkConfigured() returns correct value based on env vars
 * - openSupportChat() loads script, sets attributes, and shows widget
 * - Script injection is idempotent (only loads once)
 * - Error handling for missing configuration
 *
 * Note: These tests run in jsdom environment (configured in vitest.config.ts)
 * so window and document are available.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We need to dynamically import the module to reset its internal singleton state
type TawkModule = typeof import('./tawk')

describe('Tawk.to integration', () => {
  let tawkModule: TawkModule

  beforeEach(async () => {
    // Reset modules to clear the singleton loadPromise
    vi.resetModules()

    // Clear any existing Tawk globals
    delete (window as { Tawk_API?: unknown }).Tawk_API
    delete (window as { Tawk_LoadStart?: unknown }).Tawk_LoadStart

    // Remove any injected scripts
    document.querySelectorAll('script[src*="tawk.to"]').forEach((s) => s.remove())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  describe('isTawkConfigured', () => {
    it('returns false when no env vars are set', async () => {
      vi.stubEnv('VITE_TAWK_PROPERTY_ID', '')
      vi.stubEnv('VITE_TAWK_WIDGET_ID', '')
      tawkModule = await import('./tawk')
      expect(tawkModule.isTawkConfigured()).toBe(false)
    })

    it('returns false when only VITE_TAWK_PROPERTY_ID is set', async () => {
      vi.stubEnv('VITE_TAWK_PROPERTY_ID', 'test-property-id')
      vi.stubEnv('VITE_TAWK_WIDGET_ID', '')
      tawkModule = await import('./tawk')
      expect(tawkModule.isTawkConfigured()).toBe(false)
    })

    it('returns false when only VITE_TAWK_WIDGET_ID is set', async () => {
      vi.stubEnv('VITE_TAWK_PROPERTY_ID', '')
      vi.stubEnv('VITE_TAWK_WIDGET_ID', 'test-widget-id')
      tawkModule = await import('./tawk')
      expect(tawkModule.isTawkConfigured()).toBe(false)
    })

    it('returns true when both env vars are set', async () => {
      vi.stubEnv('VITE_TAWK_PROPERTY_ID', 'test-property-id')
      vi.stubEnv('VITE_TAWK_WIDGET_ID', 'test-widget-id')
      tawkModule = await import('./tawk')
      expect(tawkModule.isTawkConfigured()).toBe(true)
    })
  })

  describe('openSupportChat', () => {
    it('rejects when Tawk is not configured', async () => {
      vi.stubEnv('VITE_TAWK_PROPERTY_ID', '')
      vi.stubEnv('VITE_TAWK_WIDGET_ID', '')
      tawkModule = await import('./tawk')

      await expect(tawkModule.openSupportChat({ email: 'test@example.com' })).rejects.toThrow(
        'Tawk.to is not configured'
      )
    })

    it('injects script with correct URL when configured', async () => {
      vi.stubEnv('VITE_TAWK_PROPERTY_ID', 'prop123')
      vi.stubEnv('VITE_TAWK_WIDGET_ID', 'widget456')
      tawkModule = await import('./tawk')

      // Track script creation
      const originalCreateElement = document.createElement.bind(document)
      let createdScriptSrc: string | undefined

      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName)
        if (tagName === 'script') {
          const scriptEl = el as HTMLScriptElement
          // Track src when it gets set
          Object.defineProperty(scriptEl, 'src', {
            set(value: string) {
              createdScriptSrc = value
            },
            get() {
              return createdScriptSrc
            },
          })
          // Simulate script load after a tick
          setTimeout(() => {
            window.Tawk_API = {
              ...window.Tawk_API,
              hideWidget: vi.fn(),
              showWidget: vi.fn(),
              maximize: vi.fn(),
              setAttributes: vi.fn(),
            }
            window.Tawk_API?.onLoad?.()
          }, 5)
        }
        return el
      })

      await tawkModule.openSupportChat({ email: 'test@example.com' })

      // Check script was injected with correct URL
      expect(createdScriptSrc).toBe('https://embed.tawk.to/prop123/widget456')
    })

    it('calls setAttributes with visitor info including provided name', async () => {
      vi.stubEnv('VITE_TAWK_PROPERTY_ID', 'prop123')
      vi.stubEnv('VITE_TAWK_WIDGET_ID', 'widget456')
      tawkModule = await import('./tawk')

      const mockSetAttributes = vi.fn()

      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName)
        if (tagName === 'script') {
          setTimeout(() => {
            window.Tawk_API = {
              ...window.Tawk_API,
              hideWidget: vi.fn(),
              showWidget: vi.fn(),
              maximize: vi.fn(),
              setAttributes: mockSetAttributes,
            }
            window.Tawk_API?.onLoad?.()
          }, 5)
        }
        return el
      })

      await tawkModule.openSupportChat({ email: 'user@example.com', name: 'Test User' })

      expect(mockSetAttributes).toHaveBeenCalledWith(
        { email: 'user@example.com', name: 'Test User' },
        expect.any(Function)
      )
    })

    it('derives name from email when not provided', async () => {
      vi.stubEnv('VITE_TAWK_PROPERTY_ID', 'prop123')
      vi.stubEnv('VITE_TAWK_WIDGET_ID', 'widget456')
      tawkModule = await import('./tawk')

      const mockSetAttributes = vi.fn()

      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName)
        if (tagName === 'script') {
          setTimeout(() => {
            window.Tawk_API = {
              ...window.Tawk_API,
              hideWidget: vi.fn(),
              showWidget: vi.fn(),
              maximize: vi.fn(),
              setAttributes: mockSetAttributes,
            }
            window.Tawk_API?.onLoad?.()
          }, 5)
        }
        return el
      })

      await tawkModule.openSupportChat({ email: 'john.doe@example.com' })

      expect(mockSetAttributes).toHaveBeenCalledWith(
        { email: 'john.doe@example.com', name: 'john.doe' },
        expect.any(Function)
      )
    })

    it('calls showWidget and maximize after setting attributes', async () => {
      vi.stubEnv('VITE_TAWK_PROPERTY_ID', 'prop123')
      vi.stubEnv('VITE_TAWK_WIDGET_ID', 'widget456')
      tawkModule = await import('./tawk')

      const mockShowWidget = vi.fn()
      const mockMaximize = vi.fn()

      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName)
        if (tagName === 'script') {
          setTimeout(() => {
            window.Tawk_API = {
              ...window.Tawk_API,
              hideWidget: vi.fn(),
              showWidget: mockShowWidget,
              maximize: mockMaximize,
              setAttributes: vi.fn(),
            }
            window.Tawk_API?.onLoad?.()
          }, 5)
        }
        return el
      })

      await tawkModule.openSupportChat({ email: 'test@example.com' })

      expect(mockShowWidget).toHaveBeenCalled()
      expect(mockMaximize).toHaveBeenCalled()
    })

    it('hides widget immediately on load', async () => {
      vi.stubEnv('VITE_TAWK_PROPERTY_ID', 'prop123')
      vi.stubEnv('VITE_TAWK_WIDGET_ID', 'widget456')
      tawkModule = await import('./tawk')

      const mockHideWidget = vi.fn()

      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName)
        if (tagName === 'script') {
          setTimeout(() => {
            window.Tawk_API = {
              ...window.Tawk_API,
              hideWidget: mockHideWidget,
              showWidget: vi.fn(),
              maximize: vi.fn(),
              setAttributes: vi.fn(),
            }
            window.Tawk_API?.onLoad?.()
          }, 5)
        }
        return el
      })

      await tawkModule.openSupportChat({ email: 'test@example.com' })

      // hideWidget should be called by the onLoad handler
      expect(mockHideWidget).toHaveBeenCalled()
    })

    it('only loads script once (singleton behavior)', async () => {
      vi.stubEnv('VITE_TAWK_PROPERTY_ID', 'prop123')
      vi.stubEnv('VITE_TAWK_WIDGET_ID', 'widget456')
      tawkModule = await import('./tawk')

      let scriptCreateCount = 0

      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName)
        if (tagName === 'script') {
          scriptCreateCount++
          setTimeout(() => {
            window.Tawk_API = {
              ...window.Tawk_API,
              hideWidget: vi.fn(),
              showWidget: vi.fn(),
              maximize: vi.fn(),
              setAttributes: vi.fn(),
            }
            window.Tawk_API?.onLoad?.()
          }, 5)
        }
        return el
      })

      // Call openSupportChat twice
      await tawkModule.openSupportChat({ email: 'test1@example.com' })
      await tawkModule.openSupportChat({ email: 'test2@example.com' })

      // Script should only be created once
      expect(scriptCreateCount).toBe(1)
    })
  })

  describe('onChatMinimized behavior', () => {
    it('sets up onChatMinimized to hide widget', async () => {
      vi.stubEnv('VITE_TAWK_PROPERTY_ID', 'prop123')
      vi.stubEnv('VITE_TAWK_WIDGET_ID', 'widget456')
      tawkModule = await import('./tawk')

      const mockHideWidget = vi.fn()

      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName)
        if (tagName === 'script') {
          setTimeout(() => {
            window.Tawk_API = {
              ...window.Tawk_API,
              hideWidget: mockHideWidget,
              showWidget: vi.fn(),
              maximize: vi.fn(),
              setAttributes: vi.fn(),
            }
            window.Tawk_API?.onLoad?.()
          }, 5)
        }
        return el
      })

      await tawkModule.openSupportChat({ email: 'test@example.com' })

      // Reset mock to check only the minimize call
      mockHideWidget.mockClear()

      // Simulate user minimizing the chat
      window.Tawk_API?.onChatMinimized?.()

      // hideWidget should be called again
      expect(mockHideWidget).toHaveBeenCalledTimes(1)
    })
  })

  describe('error handling', () => {
    it('rejects when script fails to load', async () => {
      vi.stubEnv('VITE_TAWK_PROPERTY_ID', 'prop123')
      vi.stubEnv('VITE_TAWK_WIDGET_ID', 'widget456')
      tawkModule = await import('./tawk')

      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName)
        if (tagName === 'script') {
          // Simulate script load failure
          setTimeout(() => {
            ;(el as HTMLScriptElement).onerror?.(new Event('error'))
          }, 5)
        }
        return el
      })

      await expect(tawkModule.openSupportChat({ email: 'test@example.com' })).rejects.toThrow(
        'Failed to load Tawk.to script'
      )
    })
  })
})
