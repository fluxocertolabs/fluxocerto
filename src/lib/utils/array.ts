/**
 * Array helpers.
 */

/**
 * Upsert an item into an array by `id`, ensuring uniqueness.
 *
 * Behavior:
 * - Replaces the first occurrence (preserving list order)
 * - Removes any duplicates of the same id
 * - Appends if the id does not exist yet
 */
export function upsertUniqueById<T extends { id: string }>(prev: T[], nextItem: T): T[] {
  let replaced = false
  const out: T[] = []

  for (const item of prev) {
    if (item.id !== nextItem.id) {
      out.push(item)
      continue
    }

    if (!replaced) {
      out.push(nextItem)
      replaced = true
    }
    // Skip duplicates of the same id
  }

  if (!replaced) out.push(nextItem)
  return out
}


