/**
 * Theme store with localStorage persistence.
 * Manages theme state and applies theme to DOM.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeValue, ResolvedTheme, ThemeState } from '@/types/theme'

/** Get the system's preferred color scheme */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

/** Resolve theme value to actual light/dark */
function resolveTheme(theme: ThemeValue): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme
}

/** Apply resolved theme to DOM by toggling dark class */
function applyTheme(resolvedTheme: ResolvedTheme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolvedTheme)
}

/** Get initial theme from localStorage or system preference */
function getInitialTheme(): ThemeValue {
  if (typeof window === 'undefined') return 'system'

  try {
    const stored = localStorage.getItem('family-finance-theme')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (
        parsed?.state?.theme &&
        ['light', 'dark', 'system'].includes(parsed.state.theme)
      ) {
        return parsed.state.theme as ThemeValue
      }
    }
  } catch {
    // localStorage not available or invalid JSON
  }

  return 'system'
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => {
      const initialTheme = getInitialTheme()
      const initialResolved = resolveTheme(initialTheme)

      return {
        theme: initialTheme,
        resolvedTheme: initialResolved,
        isLoaded: false,
        setTheme: (theme: ThemeValue) => {
          const resolvedTheme = resolveTheme(theme)
          applyTheme(resolvedTheme)
          set({ theme, resolvedTheme })
        },
      }
    },
    {
      name: 'family-finance-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolvedTheme = resolveTheme(state.theme)
          applyTheme(resolvedTheme)
          state.resolvedTheme = resolvedTheme
          state.isLoaded = true
        }
      },
    }
  )
)

