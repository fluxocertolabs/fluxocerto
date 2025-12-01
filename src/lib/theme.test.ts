/**
 * Theme Utilities Tests
 *
 * Tests for theme detection, resolution, and application functions.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  getSystemTheme,
  resolveTheme,
  applyThemeToDocument,
  getStoredTheme,
} from './theme'

// =============================================================================
// getSystemTheme TESTS
// =============================================================================

describe('getSystemTheme', () => {
  const originalWindow = global.window

  afterEach(() => {
    global.window = originalWindow
    vi.restoreAllMocks()
  })

  it('returns "light" when window is undefined (SSR)', () => {
    // @ts-expect-error - Testing SSR scenario
    global.window = undefined
    expect(getSystemTheme()).toBe('light')
  })

  it('returns "dark" when system prefers dark mode', () => {
    global.window = {
      ...originalWindow,
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
    } as unknown as Window & typeof globalThis

    expect(getSystemTheme()).toBe('dark')
  })

  it('returns "light" when system prefers light mode', () => {
    global.window = {
      ...originalWindow,
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    } as unknown as Window & typeof globalThis

    expect(getSystemTheme()).toBe('light')
  })

  it('returns "light" when matchMedia throws an error', () => {
    global.window = {
      ...originalWindow,
      matchMedia: vi.fn().mockImplementation(() => {
        throw new Error('matchMedia not supported')
      }),
    } as unknown as Window & typeof globalThis

    expect(getSystemTheme()).toBe('light')
  })
})

// =============================================================================
// resolveTheme TESTS
// =============================================================================

describe('resolveTheme', () => {
  const originalWindow = global.window

  beforeEach(() => {
    // Default mock for system theme
    global.window = {
      ...originalWindow,
      matchMedia: vi.fn().mockReturnValue({ matches: false }), // Light mode
    } as unknown as Window & typeof globalThis
  })

  afterEach(() => {
    global.window = originalWindow
    vi.restoreAllMocks()
  })

  it('returns "light" for light theme value', () => {
    expect(resolveTheme('light')).toBe('light')
  })

  it('returns "dark" for dark theme value', () => {
    expect(resolveTheme('dark')).toBe('dark')
  })

  it('returns system theme for "system" value when system prefers light', () => {
    global.window = {
      ...originalWindow,
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    } as unknown as Window & typeof globalThis

    expect(resolveTheme('system')).toBe('light')
  })

  it('returns system theme for "system" value when system prefers dark', () => {
    global.window = {
      ...originalWindow,
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
    } as unknown as Window & typeof globalThis

    expect(resolveTheme('system')).toBe('dark')
  })
})

// =============================================================================
// applyThemeToDocument TESTS
// =============================================================================

describe('applyThemeToDocument', () => {
  const originalDocument = global.document

  afterEach(() => {
    global.document = originalDocument
    vi.restoreAllMocks()
  })

  it('does nothing when document is undefined (SSR)', () => {
    // @ts-expect-error - Testing SSR scenario
    global.document = undefined
    expect(() => applyThemeToDocument('dark')).not.toThrow()
  })

  it('adds "dark" class and removes "light" for dark theme', () => {
    const classList = {
      remove: vi.fn(),
      add: vi.fn(),
    }
    global.document = {
      documentElement: { classList },
    } as unknown as Document

    applyThemeToDocument('dark')

    expect(classList.remove).toHaveBeenCalledWith('light', 'dark')
    expect(classList.add).toHaveBeenCalledWith('dark')
  })

  it('adds "light" class and removes "dark" for light theme', () => {
    const classList = {
      remove: vi.fn(),
      add: vi.fn(),
    }
    global.document = {
      documentElement: { classList },
    } as unknown as Document

    applyThemeToDocument('light')

    expect(classList.remove).toHaveBeenCalledWith('light', 'dark')
    expect(classList.add).toHaveBeenCalledWith('light')
  })
})

// =============================================================================
// getStoredTheme TESTS
// =============================================================================

describe('getStoredTheme', () => {
  const originalWindow = global.window
  const originalLocalStorage = global.localStorage

  afterEach(() => {
    global.window = originalWindow
    global.localStorage = originalLocalStorage
    vi.restoreAllMocks()
  })

  it('returns null when window is undefined (SSR)', () => {
    // @ts-expect-error - Testing SSR scenario
    global.window = undefined
    expect(getStoredTheme()).toBe(null)
  })

  it('returns null when no theme is stored', () => {
    global.localStorage = {
      getItem: vi.fn().mockReturnValue(null),
    } as unknown as Storage

    expect(getStoredTheme()).toBe(null)
  })

  it('returns "light" for valid light theme in storage', () => {
    global.localStorage = {
      getItem: vi.fn().mockReturnValue(JSON.stringify({ state: { theme: 'light' } })),
    } as unknown as Storage

    expect(getStoredTheme()).toBe('light')
  })

  it('returns "dark" for valid dark theme in storage', () => {
    global.localStorage = {
      getItem: vi.fn().mockReturnValue(JSON.stringify({ state: { theme: 'dark' } })),
    } as unknown as Storage

    expect(getStoredTheme()).toBe('dark')
  })

  it('returns "system" for valid system theme in storage', () => {
    global.localStorage = {
      getItem: vi.fn().mockReturnValue(JSON.stringify({ state: { theme: 'system' } })),
    } as unknown as Storage

    expect(getStoredTheme()).toBe('system')
  })

  it('returns null for invalid theme value', () => {
    global.localStorage = {
      getItem: vi.fn().mockReturnValue(JSON.stringify({ state: { theme: 'invalid' } })),
    } as unknown as Storage

    expect(getStoredTheme()).toBe(null)
  })

  it('returns null for malformed JSON', () => {
    global.localStorage = {
      getItem: vi.fn().mockReturnValue('not-valid-json'),
    } as unknown as Storage

    expect(getStoredTheme()).toBe(null)
  })

  it('returns null when localStorage throws', () => {
    global.localStorage = {
      getItem: vi.fn().mockImplementation(() => {
        throw new Error('localStorage not available')
      }),
    } as unknown as Storage

    expect(getStoredTheme()).toBe(null)
  })

  it('returns null for empty state object', () => {
    global.localStorage = {
      getItem: vi.fn().mockReturnValue(JSON.stringify({ state: {} })),
    } as unknown as Storage

    expect(getStoredTheme()).toBe(null)
  })

  it('returns null for missing state key', () => {
    global.localStorage = {
      getItem: vi.fn().mockReturnValue(JSON.stringify({})),
    } as unknown as Storage

    expect(getStoredTheme()).toBe(null)
  })
})

