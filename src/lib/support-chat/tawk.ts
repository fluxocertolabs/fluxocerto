/**
 * Tawk.to live-chat integration wrapper.
 *
 * Design:
 * - Lazy-loads the Tawk script only when configured (env vars present).
 * - Keeps the widget hidden by default (no extra bubble).
 * - Exposes `openSupportChat(visitor)` which shows + maximizes the widget
 *   and identifies the visitor (email, name).
 *
 * NOTE: Widget appearance (colors, buttons, padding, branding) must be
 * configured in the Tawk.to dashboard, not via code. Tawk uses cross-origin
 * iframes which cannot be styled from our application.
 * 
 * Dashboard: https://dashboard.tawk.to → Administration → Chat Widget
 */

// ---------------------------------------------------------------------------
// Tawk_API type stubs (minimal subset we use)
// ---------------------------------------------------------------------------
interface TawkVisitor {
  name?: string
  email?: string
  hash?: string // for Secure Mode (optional)
  [key: string]: unknown
}

interface TawkAPI {
  onLoad?: () => void
  onChatMinimized?: () => void
  hideWidget?: () => void
  showWidget?: () => void
  maximize?: () => void
  setAttributes?: (attributes: TawkVisitor, callback?: (error?: unknown) => void) => void
}

declare global {
  interface Window {
    Tawk_API?: TawkAPI
    Tawk_LoadStart?: Date
  }
}

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

function getPropertyId(): string | undefined {
  return import.meta.env.VITE_TAWK_PROPERTY_ID as string | undefined
}

function getWidgetId(): string | undefined {
  return import.meta.env.VITE_TAWK_WIDGET_ID as string | undefined
}

/**
 * Check if Tawk.to is configured (both IDs present).
 */
export function isTawkConfigured(): boolean {
  return Boolean(getPropertyId() && getWidgetId())
}

// ---------------------------------------------------------------------------
// Script loader (singleton)
// ---------------------------------------------------------------------------

let loadPromise: Promise<void> | null = null

function ensureTawkLoaded(): Promise<void> {
  if (loadPromise) {
    return loadPromise
  }

  const propertyId = getPropertyId()
  const widgetId = getWidgetId()

  if (!propertyId || !widgetId) {
    return Promise.reject(new Error('Tawk.to is not configured'))
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    // Initialise global stubs
    window.Tawk_API = window.Tawk_API || {}
    window.Tawk_LoadStart = new Date()

    // Hide widget immediately after Tawk loads (we'll show it on demand)
    window.Tawk_API.onLoad = () => {
      window.Tawk_API?.hideWidget?.()
      resolve()
    }

    // When user minimises the chat, hide the widget again (no lingering bubble)
    window.Tawk_API.onChatMinimized = () => {
      window.Tawk_API?.hideWidget?.()
    }

    // Inject the script
    const script = document.createElement('script')
    script.async = true
    script.src = `https://embed.tawk.to/${propertyId}/${widgetId}`
    script.charset = 'UTF-8'
    script.setAttribute('crossorigin', '*')

    script.onerror = () => {
      loadPromise = null
      reject(new Error('Failed to load Tawk.to script'))
    }

    document.head.appendChild(script)
  })

  return loadPromise
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SupportChatVisitor {
  email: string
  name?: string
}

/**
 * Open the Tawk.to chat widget and identify the visitor.
 *
 * - Ensures the script is loaded.
 * - Sets visitor attributes (email, name).
 * - Shows the widget and maximises the chat window.
 */
export async function openSupportChat(visitor: SupportChatVisitor): Promise<void> {
  await ensureTawkLoaded()

  const api = window.Tawk_API
  if (!api) {
    throw new Error('Tawk_API not available after load')
  }

  // Identify the visitor
  const name = visitor.name ?? visitor.email.split('@')[0]
  api.setAttributes?.({ email: visitor.email, name }, (err) => {
    if (err) {
      console.warn('[Tawk.to] setAttributes error:', err)
    }
  })

  // Show and maximise
  api.showWidget?.()
  api.maximize?.()
}
