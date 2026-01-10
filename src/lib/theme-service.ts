/**
 * Theme service for Supabase operations.
 * Handles fetching, saving, and deleting theme preferences.
 */

import { getSupabase, getGroupId, isSupabaseConfigured } from '@/lib/supabase'
import type { ThemeValue } from '@/types/theme'
import { themeValueSchema } from '@/types/theme'

/** Retry delays in milliseconds */
const RETRY_DELAYS = [1000, 2000, 5000]

/** Simple delay helper */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Get theme preference from Supabase.
 * Returns null if no preference exists or user is not authenticated.
 */
export async function getThemePreference(): Promise<ThemeValue | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  const supabase = getSupabase()

  try {
    const { data, error } = await supabase
      .from('group_preferences')
      .select('value')
      .eq('key', 'theme')
      .single()

    if (error) {
      // PGRST116 means no rows returned - this is expected for new users
      if (error.code === 'PGRST116') {
        return null
      }
      console.warn('Failed to get theme preference:', error.message)
      return null
    }

    // Validate the theme value
    const result = themeValueSchema.safeParse(data?.value)
    if (result.success) {
      return result.data
    }

    console.warn('Invalid theme value in database:', data?.value)
    return null
  } catch (error) {
    console.warn('Error fetching theme preference:', error)
    return null
  }
}

/**
 * Save theme preference to Supabase.
 * Uses upsert to handle both create and update.
 * Implements retry logic for network failures.
 */
export async function saveThemePreference(theme: ThemeValue): Promise<void> {
  if (!isSupabaseConfigured()) {
    return
  }

  const supabase = getSupabase()

  // Get current user ID
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    console.warn('Cannot save theme preference: user not authenticated')
    return
  }

  // Get current user's group_id
  const groupId = await getGroupId()
  if (!groupId) {
    console.warn('Cannot save theme preference: group not found')
    return
  }

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const { error } = await supabase.from('group_preferences').upsert(
        {
          user_id: user.id,
          group_id: groupId,
          key: 'theme',
          value: theme,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'group_id,key',
        }
      )

      if (error) {
        throw error
      }

      // Success - log at INFO level per FR-013
      console.info(`Theme preference saved: ${theme}`)
      return
    } catch (error) {
      if (attempt < RETRY_DELAYS.length) {
        console.warn(
          `Failed to save theme preference (attempt ${attempt + 1}), retrying...`,
          error
        )
        await delay(RETRY_DELAYS[attempt])
      } else {
        // Final attempt failed - don't throw, localStorage has the preference
        console.warn('Failed to sync theme preference after retries:', error)
      }
    }
  }
}

/**
 * Delete theme preference from Supabase.
 * After deletion, app should fall back to system preference.
 */
export async function deleteThemePreference(): Promise<void> {
  if (!isSupabaseConfigured()) {
    return
  }

  const supabase = getSupabase()

  try {
    const { error } = await supabase
      .from('group_preferences')
      .delete()
      .eq('key', 'theme')

    if (error) {
      console.warn('Failed to delete theme preference:', error.message)
    }
  } catch (error) {
    console.warn('Error deleting theme preference:', error)
  }
}

