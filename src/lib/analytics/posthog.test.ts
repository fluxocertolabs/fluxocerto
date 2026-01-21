import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import posthog from 'posthog-js'
import { captureEvent, initPosthog, setAnalyticsConsent } from './posthog'

vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    group: vi.fn(),
    reset: vi.fn(),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
    set_config: vi.fn(),
    has_opted_out_capturing: vi.fn(() => false),
  },
}))

describe('posthog analytics wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('no-ops when disabled (missing key)', () => {
    captureEvent('test_event', { safe: true })
    expect(posthog.capture).not.toHaveBeenCalled()
  })

  it('scrubs sensitive properties before capture', () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'test_key')
    vi.stubEnv('VITE_POSTHOG_DISABLED', 'false')

    captureEvent('test_event', {
      email: 'test@example.com',
      amount: 1200,
      safe: true,
    })

    expect(posthog.capture).toHaveBeenCalledWith('test_event', {
      safe: true,
    })
  })

  it('applies consent without throwing', () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'test_key')
    vi.stubEnv('VITE_POSTHOG_DISABLED', 'false')

    initPosthog()
    setAnalyticsConsent({ analytics: false, recordings: false })

    expect(posthog.opt_out_capturing).toHaveBeenCalled()
    expect(posthog.set_config).toHaveBeenCalledWith({
      disable_session_recording: true,
    })
  })
})

