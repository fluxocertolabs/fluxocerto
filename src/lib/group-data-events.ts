/**
 * Group data invalidation events.
 * 
 * Provides a simple pub/sub mechanism for notifying components
 * when group-related data has changed and needs to be refetched.
 * 
 * Used primarily when:
 * - Profile display name is updated (other UI surfaces showing the name should refresh)
 * - Group membership changes
 */

type GroupDataInvalidatedListener = () => void

const listeners = new Set<GroupDataInvalidatedListener>()

/**
 * Notify all listeners that group data has been invalidated.
 * Components listening should refetch their group-related data.
 */
export function notifyGroupDataInvalidated(): void {
  // Snapshot listeners before iterating to make notifications robust against
  // mid-notify subscribe/unsubscribe. A listener might remove itself (or add
  // another listener) during notification; iterating a snapshot avoids subtle
  // iteration semantics.
  const snapshot = Array.from(listeners)
  snapshot.forEach((listener) => {
    try {
      listener()
    } catch (err) {
      console.warn('Group data invalidation listener error:', err)
    }
  })
}

/**
 * Subscribe to group data invalidation events.
 * 
 * @param listener - Callback to invoke when group data is invalidated
 * @returns Unsubscribe function
 */
export function subscribeToGroupDataInvalidation(
  listener: GroupDataInvalidatedListener
): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

