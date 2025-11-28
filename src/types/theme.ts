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

/** User preference as stored in database */
export interface UserPreference {
  id: string
  userId: string
  key: string
  value: string
  createdAt: Date
  updatedAt: Date
}

/** Database row shape for user_preferences */
export interface UserPreferenceRow {
  id: string
  user_id: string
  key: string
  value: string
  created_at: string
  updated_at: string
}

/** Schema for theme value validation */
export const themeValueSchema = z.enum(['light', 'dark', 'system'])

/** Schema for user preference key */
export const preferenceKeySchema = z
  .string()
  .min(1, 'Preference key must be at least 1 character')
  .max(50, 'Preference key must be at most 50 characters')
  .regex(
    /^[a-zA-Z0-9_]+$/,
    'Preference key must contain only letters, numbers, and underscores'
  )

/** Schema for user preference value */
export const preferenceValueSchema = z
  .string()
  .min(1, 'Preference value must be at least 1 character')
  .max(500, 'Preference value must be at most 500 characters')

/** Schema for creating/updating a preference */
export const upsertPreferenceSchema = z.object({
  key: preferenceKeySchema,
  value: preferenceValueSchema,
})

