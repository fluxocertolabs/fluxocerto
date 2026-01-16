/**
 * Tawk.to live-chat integration wrapper.
 *
 * Design:
 * - Lazy-loads the Tawk script only when configured (env vars present).
 * - Keeps the widget hidden by default (no extra bubble).
 * - Exposes `openSupportChat(visitor)` which shows + maximizes the widget
 *   and identifies the visitor (email, name).
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
  onChatMaximized?: () => void
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
// Widget customization (use at your own risk - may violate Tawk.to ToS)
// ---------------------------------------------------------------------------

/**
 * Inject styles to hide Tawk elements BEFORE the script loads.
 * This prevents the original bubble from flashing on first load.
 */
function injectPreloadStyles(): void {
  if (document.getElementById('tawk-preload-styles')) return

  const style = document.createElement('style')
  style.id = 'tawk-preload-styles'
  style.textContent = `
    /* Hide ALL Tawk iframes by default until we're ready to show */
    div[id^="ki"] {
      visibility: hidden !important;
      opacity: 0 !important;
    }
    
    /* Hide the branding iframe completely */
    div[id^="ki"] > iframe[style*="bottom:30px"][style*="min-height:45px"],
    div[id^="ki"] > iframe[style*="bottom: 30px"][style*="min-height: 45px"],
    div[id^="ki"] > iframe[style*="min-height: 45px"][style*="max-height: 45px"] {
      display: none !important;
      height: 0 !important;
      min-height: 0 !important;
      max-height: 0 !important;
    }
    
    /* Hide the floating bubble iframe (64x60) */
    div[id^="ki"] > iframe[style*="width:64px"][style*="height:60px"],
    div[id^="ki"] > iframe[style*="width: 64px"][style*="height: 60px"],
    div[id^="ki"] > iframe[style*="max-width:64px"],
    div[id^="ki"] > iframe[style*="max-width: 64px"] {
      display: none !important;
      visibility: hidden !important;
    }
  `
  document.head.appendChild(style)
}

/**
 * Show the Tawk widget container (called after widget is ready)
 */
function showTawkContainer(): void {
  const style = document.getElementById('tawk-preload-styles')
  if (style) {
    // Update styles to show the main chat iframe but keep bubble hidden
    style.textContent = `
      /* Show the main container */
      div[id^="ki"] {
        visibility: visible !important;
        opacity: 1 !important;
      }
      
      /* Keep branding iframe hidden */
      div[id^="ki"] > iframe[style*="bottom:30px"][style*="min-height:45px"],
      div[id^="ki"] > iframe[style*="bottom: 30px"][style*="min-height: 45px"],
      div[id^="ki"] > iframe[style*="min-height: 45px"][style*="max-height: 45px"] {
        display: none !important;
        height: 0 !important;
        min-height: 0 !important;
        max-height: 0 !important;
      }
      
      /* Keep the floating bubble iframe hidden always */
      div[id^="ki"] > iframe[style*="width:64px"][style*="height:60px"],
      div[id^="ki"] > iframe[style*="width: 64px"][style*="height: 60px"],
      div[id^="ki"] > iframe[style*="max-width:64px"],
      div[id^="ki"] > iframe[style*="max-width: 64px"] {
        display: none !important;
        visibility: hidden !important;
      }
    `
  }
}

/**
 * Focus the message textarea when chat is maximized
 */
function focusMessageInput(): void {
  // Try to find and focus the message input in the chat iframe
  setTimeout(() => {
    const iframes = document.querySelectorAll('iframe[title="chat widget"]')
    iframes.forEach((iframe) => {
      try {
        const doc = (iframe as HTMLIFrameElement).contentDocument
        if (!doc) return
        
        // Try various selectors for the message input
        const textarea = doc.querySelector('textarea') ||
                        doc.querySelector('input[type="text"]') ||
                        doc.querySelector('[contenteditable="true"]')
        if (textarea instanceof HTMLElement) {
          textarea.focus()
        }
      } catch {
        // Cross-origin, can't access
      }
    })
  }, 500)
}

// ---------------------------------------------------------------------------
// Script loader (singleton)
// ---------------------------------------------------------------------------

let loadPromise: Promise<void> | null = null
let isLoading = false
let loadingCallback: ((loading: boolean) => void) | null = null

/**
 * Set a callback to be notified when loading state changes
 */
export function onLoadingChange(callback: (loading: boolean) => void): void {
  loadingCallback = callback
  // Immediately notify current state
  callback(isLoading)
}

function setLoading(loading: boolean): void {
  isLoading = loading
  loadingCallback?.(loading)
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

  // Inject preload styles BEFORE loading the script to hide the bubble
  injectPreloadStyles()
  setLoading(true)

  loadPromise = new Promise<void>((resolve, reject) => {
    // Initialise global stubs
    window.Tawk_API = window.Tawk_API || {}
    window.Tawk_LoadStart = new Date()

    // Hide widget immediately after Tawk loads
    window.Tawk_API.onLoad = () => {
      window.Tawk_API?.hideWidget?.()
      setLoading(false)
      resolve()
    }

    // When user minimises the chat, hide the widget again (no lingering bubble)
    window.Tawk_API.onChatMinimized = () => {
      window.Tawk_API?.hideWidget?.()
    }

    // Focus message input when chat is maximized
    window.Tawk_API.onChatMaximized = () => {
      focusMessageInput()
    }

    // Inject the script
    const script = document.createElement('script')
    script.async = true
    script.src = `https://embed.tawk.to/${propertyId}/${widgetId}`
    script.charset = 'UTF-8'
    script.setAttribute('crossorigin', '*')

    script.onerror = () => {
      loadPromise = null
      setLoading(false)
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

  // Show the container (unhide from preload styles)
  showTawkContainer()

  // Show and maximise
  api.showWidget?.()
  api.maximize?.()

  // Focus the message input
  focusMessageInput()
}

