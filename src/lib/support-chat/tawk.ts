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
let preloadStylesInjected = false
let tawkVisible = false
const visibilityListeners = new Set<(visible: boolean) => void>()

function notifyVisibilityChange(visible: boolean): void {
  if (tawkVisible === visible) return
  tawkVisible = visible
  visibilityListeners.forEach((listener) => listener(visible))
}

export function subscribeTawkVisibility(listener: (visible: boolean) => void): () => void {
  visibilityListeners.add(listener)
  // Sync immediately with current state
  listener(tawkVisible)
  return () => {
    visibilityListeners.delete(listener)
  }
}

/**
 * Inject CSS that hides the Tawk widget by default.
 * This prevents the bubble from flashing before our onLoad handler runs.
 * 
 * We use a data attribute on the document root to control visibility:
 * - Default: widget is hidden via CSS
 * - When we call showWidget(): we add [data-tawk-visible] to show it
 */
function injectPreloadStyles(): void {
  if (preloadStylesInjected) return
  preloadStylesInjected = true

  const style = document.createElement('style')
  style.id = 'tawk-preload-styles'
  style.textContent = `
    /* Hide Tawk widget surfaces by default to prevent flash */
    :root:not([data-tawk-visible]) [class*="widget-visible"],
    :root:not([data-tawk-visible]) [class*="tawk"],
    :root:not([data-tawk-visible]) [id^="tawk"],
    :root:not([data-tawk-visible]) [id*="tawk"],
    :root:not([data-tawk-visible]) iframe[src*="tawk.to"] {
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `
  document.head.appendChild(style)
}

/**
 * Mark the Tawk container as visible (removes the CSS hiding).
 */
function showTawkContainer(): void {
  document.documentElement.setAttribute('data-tawk-visible', 'true')

  // Mark any existing containers as visible to override local hiding
  document
    .querySelectorAll('[class*="widget-visible"], [class*="tawk"], [id^="tawk"], [id*="tawk"]')
    .forEach((container) => {
      container.setAttribute('data-tawk-visible', 'true')
    })

  notifyVisibilityChange(true)
}

/**
 * Mark the Tawk container as hidden (applies the CSS hiding).
 */
function hideTawkContainer(): void {
  document.documentElement.removeAttribute('data-tawk-visible')

  document
    .querySelectorAll('[class*="widget-visible"], [class*="tawk"], [id^="tawk"], [id*="tawk"]')
    .forEach((container) => {
      container.removeAttribute('data-tawk-visible')
    })

  notifyVisibilityChange(false)
}

function ensureTawkLoaded(): Promise<void> {
  if (loadPromise) {
    return loadPromise
  }

  const propertyId = getPropertyId()
  const widgetId = getWidgetId()

  if (!propertyId || !widgetId) {
    return Promise.reject(new Error('Tawk.to is not configured'))
  }

  // Inject hiding styles BEFORE loading the script
  injectPreloadStyles()

  loadPromise = new Promise<void>((resolve, reject) => {
    // Initialise global stubs
    window.Tawk_API = window.Tawk_API || {}
    window.Tawk_LoadStart = new Date()

    // Hide widget immediately after Tawk loads (we'll show it on demand)
    window.Tawk_API.onLoad = () => {
      window.Tawk_API?.hideWidget?.()
      hideTawkContainer()
      resolve()
    }

    // When user minimises the chat, hide the widget again (no lingering bubble)
    window.Tawk_API.onChatMinimized = () => {
      window.Tawk_API?.hideWidget?.()
      hideTawkContainer()
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
 * Preload the Tawk.to widget in the background.
 * 
 * Call this when the user is authenticated to load the widget ahead of time.
 * The widget will be hidden until `openSupportChat()` is called.
 * 
 * This makes the chat open instantly when the user clicks "Falar com suporte".
 */
export function preloadTawkWidget(): void {
  if (!isTawkConfigured()) return
  
  // Fire and forget - we don't need to wait for it
  ensureTawkLoaded().catch((err) => {
    console.warn('[Tawk.to] Failed to preload widget:', err)
  })
}

/**
 * Inject CSS to hide Tawk UI surfaces early (before script load).
 * Useful to prevent the default floating button from flashing on refresh.
 */
export function preloadTawkStyles(): void {
  if (!isTawkConfigured()) return
  injectPreloadStyles()
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

  // Show the container (removes CSS hiding) and maximise
  showTawkContainer()
  api.showWidget?.()
  api.maximize?.()
}
