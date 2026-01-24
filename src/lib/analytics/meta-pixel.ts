type FbqFunction = ((command: string, ...args: unknown[]) => void) & {
  callMethod?: (command: string, ...args: unknown[]) => void
  queue?: unknown[]
  loaded?: boolean
  version?: string
  push?: (args: unknown[]) => void
}

declare global {
  interface Window {
    fbq?: FbqFunction
    _fbq?: FbqFunction
  }
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function getPixelId(): string | null {
  const id = import.meta.env.VITE_META_PIXEL_ID
  if (!id) return null
  const normalized = String(id).trim()
  return normalized.length > 0 ? normalized : null
}

function isMetaPixelDisabled(): boolean {
  if (!getPixelId()) return true
  if (import.meta.env.VITE_META_PIXEL_DISABLED === 'true') return true
  return false
}

function ensureFbqStub(): FbqFunction {
  const existing = window.fbq
  if (existing) return existing

  const fbq: FbqFunction = function (...args: unknown[]) {
    // Queue calls until the script loads and sets callMethod.
    ;(fbq.queue ||= []).push(args)
  } as FbqFunction

  fbq.loaded = false
  fbq.version = '2.0'
  fbq.queue = []

  window.fbq = fbq
  window._fbq = fbq
  return fbq
}

function loadPixelScript(): void {
  const scriptId = 'meta-pixel-script'
  if (document.getElementById(scriptId)) return

  const script = document.createElement('script')
  script.id = scriptId
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(script)
}

let initialized = false
let consentGranted = true

export function initMetaPixel(): void {
  if (!isBrowser()) return
  if (isMetaPixelDisabled()) return
  if (initialized) return

  const pixelId = getPixelId()
  if (!pixelId) return

  const fbq = ensureFbqStub()
  loadPixelScript()

  try {
    fbq('init', pixelId)
    initialized = true

    // If consent was already revoked before init, try to propagate it.
    if (!consentGranted) {
      try {
        fbq('consent', 'revoke')
      } catch {
        // ignore
      }
    }
  } catch {
    // If Meta Pixel throws for any reason, don't break the app.
  }
}

export function setMetaPixelConsent(analyticsEnabled: boolean): void {
  consentGranted = analyticsEnabled
  if (!isBrowser()) return
  if (isMetaPixelDisabled()) return

  const fbq = window.fbq
  if (!fbq) return

  // Best-effort: rely on Meta Pixel's consent API when present, and also gate our own tracking.
  try {
    fbq('consent', analyticsEnabled ? 'grant' : 'revoke')
  } catch {
    // ignore
  }
}

export function metaTrack(eventName: string, params?: Record<string, unknown>): void {
  if (!isBrowser()) return
  if (isMetaPixelDisabled()) return
  if (!consentGranted) return

  initMetaPixel()

  const fbq = window.fbq
  if (!fbq) return
  try {
    if (params) fbq('track', eventName, params)
    else fbq('track', eventName)
  } catch {
    // ignore
  }
}

export function metaTrackCustom(eventName: string, params?: Record<string, unknown>): void {
  if (!isBrowser()) return
  if (isMetaPixelDisabled()) return
  if (!consentGranted) return

  initMetaPixel()

  const fbq = window.fbq
  if (!fbq) return
  try {
    if (params) fbq('trackCustom', eventName, params)
    else fbq('trackCustom', eventName)
  } catch {
    // ignore
  }
}

