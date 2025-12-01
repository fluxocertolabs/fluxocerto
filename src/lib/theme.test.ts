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
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns "light" when window is undefined (SSR)', () => {
    vi.stubGlobal('window', undefined)
    expect(getSystemTheme()).toBe('light')
  })

  it('returns "dark" when system prefers dark mode', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
    })
    expect(getSystemTheme()).toBe('dark')
  })

  it('returns "light" when system prefers light mode', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    })
    expect(getSystemTheme()).toBe('light')
  })

  it('returns "light" when matchMedia throws an error', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockImplementation(() => {
        throw new Error('matchMedia not supported')
      }),
    })
    expect(getSystemTheme()).toBe('light')
  })
})

// =============================================================================
// resolveTheme TESTS
// =============================================================================

describe('resolveTheme', () => {
  beforeEach(() => {
    // Default mock for system theme (light mode)
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns "light" for light theme value', () => {
    expect(resolveTheme('light')).toBe('light')
  })

  it('returns "dark" for dark theme value', () => {
    expect(resolveTheme('dark')).toBe('dark')
  })

  it('returns system theme for "system" value when system prefers light', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    })
    expect(resolveTheme('system')).toBe('light')
  })

  it('returns system theme for "system" value when system prefers dark', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
    })
    expect(resolveTheme('system')).toBe('dark')
  })
})

// =============================================================================
// applyThemeToDocument TESTS
// =============================================================================

describe('applyThemeToDocument', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does nothing when document is undefined (SSR)', () => {
    vi.stubGlobal('document', undefined)
    expect(() => applyThemeToDocument('dark')).not.toThrow()
  })

  it('adds "dark" class and removes "light" for dark theme', () => {
    const classList = {
      remove: vi.fn(),
      add: vi.fn(),
    }
    vi.stubGlobal('document', {
      documentElement: { classList },
    })

    applyThemeToDocument('dark')

    expect(classList.remove).toHaveBeenCalledWith('light', 'dark')
    expect(classList.add).toHaveBeenCalledWith('dark')
  })

  it('adds "light" class and removes "dark" for light theme', () => {
    const classList = {
      remove: vi.fn(),
      add: vi.fn(),
    }
    vi.stubGlobal('document', {
      documentElement: { classList },
    })

    applyThemeToDocument('light')

    expect(classList.remove).toHaveBeenCalledWith('light', 'dark')
    expect(classList.add).toHaveBeenCalledWith('light')
  })
})

// =============================================================================
// getStoredTheme TESTS
// =============================================================================

describe('getStoredTheme', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null when window is undefined (SSR)', () => {
    vi.stubGlobal('window', undefined)
    expect(getStoredTheme()).toBe(null)
  })

  it('returns null when no theme is stored', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
    })
    expect(getStoredTheme()).toBe(null)
  })

  it('returns "light" for valid light theme in storage', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(JSON.stringify({ state: { theme: 'light' } })),
    })
    expect(getStoredTheme()).toBe('light')
  })

  it('returns "dark" for valid dark theme in storage', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(JSON.stringify({ state: { theme: 'dark' } })),
    })
    expect(getStoredTheme()).toBe('dark')
  })

  it('returns "system" for valid system theme in storage', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(JSON.stringify({ state: { theme: 'system' } })),
    })
    expect(getStoredTheme()).toBe('system')
  })

  it('returns null for invalid theme value', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(JSON.stringify({ state: { theme: 'invalid' } })),
    })
    expect(getStoredTheme()).toBe(null)
  })

  it('returns null for malformed JSON', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue('not-valid-json'),
    })
    expect(getStoredTheme()).toBe(null)
  })

  it('returns null when localStorage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockImplementation(() => {
        throw new Error('localStorage not available')
      }),
    })
    expect(getStoredTheme()).toBe(null)
  })

  it('returns null for empty state object', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(JSON.stringify({ state: {} })),
    })
    expect(getStoredTheme()).toBe(null)
  })

  it('returns null for missing state key', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(JSON.stringify({})),
    })
    expect(getStoredTheme()).toBe(null)
  })
})
