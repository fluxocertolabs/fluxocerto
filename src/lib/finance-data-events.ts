/**
 * Finance data invalidation events.
 *
 * We primarily rely on Supabase Realtime for UI updates, but under load (and in
 * environments where realtime delivery is delayed), it is safer to provide an
 * explicit "data changed" signal after mutations.
 *
 * This keeps the UI consistent by allowing data hooks to refetch in the
 * background without forcing a full-page loading state.
 */

export const FINANCE_DATA_INVALIDATED_EVENT = 'finance-data-invalidated'

export function notifyFinanceDataInvalidated(): void {
  // Guard for SSR / test environments where `window` may not exist.
  if (typeof window === 'undefined') return

  window.dispatchEvent(new CustomEvent(FINANCE_DATA_INVALIDATED_EVENT))
}



