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
 * Customize the Tawk.to widget appearance:
 * - Hide "Powered by tawk.to" branding (the third iframe)
 * - Hide home/chat navigation buttons at bottom
 * - Fix padding issues
 *
 * Note: Tawk uses iframes, so we can't style inside them with CSS.
 * Instead we hide/modify the iframe containers themselves and use
 * MutationObserver to inject styles into iframes when they load.
 */
function customizeTawkWidget(): void {
  if (document.getElementById('tawk-custom-styles')) return

  const style = document.createElement('style')
  style.id = 'tawk-custom-styles'
  style.textContent = `
    /* Hide the branding iframe (usually the 3rd one with min-height:45px, bottom:30px) */
    div[id^="ki"] > iframe[style*="bottom:30px"][style*="min-height:45px"],
    div[id^="ki"] > iframe[style*="bottom: 30px"][style*="min-height: 45px"] {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      min-height: 0 !important;
      max-height: 0 !important;
    }
  `
  document.head.appendChild(style)

  // Use MutationObserver to inject styles into iframes as they load
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLIFrameElement && node.title === 'chat widget') {
          injectStylesIntoIframe(node)
        }
      })
    })
  })

  observer.observe(document.body, { childList: true, subtree: true })

  // Also inject into any existing iframes
  document.querySelectorAll('iframe[title="chat widget"]').forEach((iframe) => {
    injectStylesIntoIframe(iframe as HTMLIFrameElement)
  })
}

/**
 * Inject custom styles into a Tawk iframe
 */
function injectStylesIntoIframe(iframe: HTMLIFrameElement): void {
  // Wait for iframe to load
  const tryInject = () => {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (!doc || !doc.head) return

      // Skip if already injected
      if (doc.getElementById('tawk-iframe-custom')) return

      const style = doc.createElement('style')
      style.id = 'tawk-iframe-custom'
      style.textContent = `
        /* Hide home and chat navigation buttons at bottom */
        .tawk-footer,
        .tawk-card-footer,
        [class*="footer"],
        [class*="navigation"] > a,
        [class*="nav-item"],
        .tawk-icon-home,
        .tawk-icon-chat,
        a[href="#/"][class*="nav"],
        a[href="#/chat"][class*="nav"],
        div[class*="bottom-nav"],
        div[class*="bottomNav"],
        nav[class*="bottom"] {
          display: none !important;
        }

        /* Hide "Powered by tawk.to" branding */
        .tawk-branding,
        [class*="branding"],
        [class*="powered"],
        a[href*="tawk.to"] {
          display: none !important;
        }

        /* Remove extra top padding */
        .tawk-card-header,
        [class*="header"] {
          padding-top: 12px !important;
        }

        /* Fix chat container padding */
        .tawk-card,
        [class*="card-container"],
        [class*="chat-container"] {
          padding-top: 0 !important;
        }
      `
      doc.head.appendChild(style)
    } catch {
      // Cross-origin iframe, can't access - this is expected for some iframes
    }
  }

  // Try immediately and also after load
  tryInject()
  iframe.addEventListener('load', tryInject)

  // Retry a few times as content may load dynamically
  setTimeout(tryInject, 500)
  setTimeout(tryInject, 1000)
  setTimeout(tryInject, 2000)
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

    // Hide widget immediately after Tawk loads
    window.Tawk_API.onLoad = () => {
      window.Tawk_API?.hideWidget?.()
      customizeTawkWidget()
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

