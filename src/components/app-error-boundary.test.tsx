import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { AppErrorBoundary } from './app-error-boundary'

const captureSentryException = vi.fn()

vi.mock('@/lib/observability/sentry', () => ({
  captureSentryException: (error: unknown, context?: unknown) =>
    captureSentryException(error, context),
}))

describe('AppErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('captures errors with Sentry', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    function Boom() {
      throw new Error('Boom')
      return <div />
    }

    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>,
    )

    expect(captureSentryException).toHaveBeenCalled()
  })
})
