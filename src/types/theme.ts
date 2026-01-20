/**
 * Theme type definitions for dark mode implementation.
 * Provides types and Zod schemas for theme values and state.
 */

import { z } from 'zod'

/** Theme values that can be stored/selected by user */
export type ThemeValue = 'light' | 'dark' | 'system'

/** Resolved theme after system preference is applied */
export type ResolvedTheme = 'light' | 'dark'

/** Theme state in the application */
export interface ThemeState {
  /** User's theme preference */
  theme: ThemeValue
  /** Actual theme being applied (resolves 'system' to light/dark) */
  resolvedTheme: ResolvedTheme
  /** Whether theme has been loaded from storage */
  isLoaded: boolean
  /** Set theme preference */
  setTheme: (theme: ThemeValue) => void
}

/** Schema for theme value validation */
export const themeValueSchema = z.enum(['light', 'dark', 'system'])

