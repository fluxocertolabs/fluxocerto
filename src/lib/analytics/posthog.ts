import posthog, { type BeforeSendFn, type CaptureResult } from 'posthog-js'

const CONSENT_STORAGE_KEY = 'fluxo-certo:analytics-consent'

export interface AnalyticsConsent {
  analytics: boolean
  recordings: boolean
}

const DEFAULT_CONSENT: AnalyticsConsent = {
  analytics: true,
  recordings: true,
}

const BLOCKLISTED_KEYS = [
  'email',
  'name',
  'amount',
  'balance',
  'title',
  'body',
  'message',
  'description',
  'notes',
]

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function isPosthogDisabled(): boolean {
  if (!import.meta.env.VITE_POSTHOG_KEY) return true
  if (import.meta.env.VITE_POSTHOG_DISABLED === 'true') return true
  return false
}

function isSessionRecordingDisabled(): boolean {
  const raw = import.meta.env.VITE_POSTHOG_RECORDINGS_DISABLED
  return raw === 'true' || raw === '1'
}

function readStoredConsent(): AnalyticsConsent {
  if (!isBrowser()) return DEFAULT_CONSENT
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return DEFAULT_CONSENT
    const parsed = JSON.parse(raw) as Partial<AnalyticsConsent>
    return {
      analytics: parsed.analytics ?? DEFAULT_CONSENT.analytics,
      recordings: parsed.recordings ?? DEFAULT_CONSENT.recordings,
    }
  } catch {
    return DEFAULT_CONSENT
  }
}

function writeStoredConsent(consent: AnalyticsConsent): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent))
  } catch {
    // Ignore storage errors (private mode / quota)
  }
}

function sanitizeProperties(properties: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...properties }
  for (const key of Object.keys(next)) {
    if (key === '$set' || key === '$set_once') {
      delete next[key]
      continue
    }
    if (key.startsWith('$')) continue
    const lowered = key.toLowerCase()
    if (BLOCKLISTED_KEYS.some((blocked) => lowered.includes(blocked))) {
      delete next[key]
    }
  }
  return next
}

export function initPosthog(): void {
  if (isPosthogDisabled()) return

  const apiKey = import.meta.env.VITE_POSTHOG_KEY
  if (!apiKey) return

  const apiHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'
  const consent = readStoredConsent()
  const disableRecordings = isSessionRecordingDisabled() || !consent.recordings
  const beforeSend: BeforeSendFn = (event) => {
    if (!event || typeof event !== 'object') return event
    const payload = event as CaptureResult & { properties?: Record<string, unknown> }
    if (payload.properties) {
      payload.properties = sanitizeProperties(payload.properties)
    }
    return payload
  }

  posthog.init(apiKey, {
    api_host: apiHost,
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: disableRecordings,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '*',
    },
    before_send: beforeSend,
  })

  setAnalyticsConsent(consent)
}

export function setAnalyticsConsent(consent: AnalyticsConsent): void {
  writeStoredConsent(consent)

  if (isPosthogDisabled()) return

  if (consent.analytics) {
    posthog.opt_in_capturing()
  } else {
    posthog.opt_out_capturing()
  }

  posthog.set_config({
    disable_session_recording: isSessionRecordingDisabled() || !consent.recordings || !consent.analytics,
  })
}

export function captureEvent(event: string, properties?: Record<string, unknown>): void {
  if (isPosthogDisabled()) return
  if (posthog.has_opted_out_capturing?.()) return
  posthog.capture(event, properties ? sanitizeProperties(properties) : undefined)
}

export function identifyUser(userId: string): void {
  if (isPosthogDisabled()) return
  if (!userId) return
  posthog.identify(userId)
}

export function setGroup(groupId: string): void {
  if (isPosthogDisabled()) return
  if (!groupId) return
  posthog.group('group', groupId)
}

export function resetAnalytics(): void {
  if (isPosthogDisabled()) return
  posthog.reset()
}

