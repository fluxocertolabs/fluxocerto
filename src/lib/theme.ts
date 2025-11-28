/**
 * Theme utility functions.
 * Provides helpers for system theme detection and theme resolution.
 */

import type { ResolvedTheme, ThemeValue } from '@/types/theme'

/**
 * Get the system's preferred color scheme.
 * Falls back to 'light' if unable to detect.
 */
export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light'
  }

  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  } catch {
    // matchMedia not supported
    return 'light'
  }
}

/**
 * Resolve a theme value to the actual theme to apply.
 * Converts 'system' to either 'light' or 'dark' based on system preference.
 */
export function resolveTheme(theme: ThemeValue): ResolvedTheme {
  if (theme === 'system') {
    return getSystemTheme()
  }
  return theme
}

/**
 * Apply a resolved theme to the document.
 * Adds/removes the 'dark' class on the root element.
 */
export function applyThemeToDocument(resolvedTheme: ResolvedTheme): void {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolvedTheme)
}

/**
 * Get the initial theme from localStorage.
 * Returns null if no preference is stored.
 */
export function getStoredTheme(): ThemeValue | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const stored = localStorage.getItem('family-finance-theme')
    if (!stored) {
      return null
    }

    const parsed = JSON.parse(stored)
    const theme = parsed?.state?.theme

    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      return theme
    }

    return null
  } catch {
    return null
  }
}

