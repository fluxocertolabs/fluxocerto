import { describe, it, expect, vi, afterEach } from 'vitest'
import { FINANCE_DATA_INVALIDATED_EVENT, notifyFinanceDataInvalidated } from './finance-data-events'

describe('notifyFinanceDataInvalidated', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('dispatches a CustomEvent on window', () => {
    const handler = vi.fn()
    window.addEventListener(FINANCE_DATA_INVALIDATED_EVENT, handler)

    notifyFinanceDataInvalidated()

    expect(handler).toHaveBeenCalledTimes(1)
    window.removeEventListener(FINANCE_DATA_INVALIDATED_EVENT, handler)
  })

  it('no-ops when window is undefined (SSR/test safety)', () => {
    vi.stubGlobal('window', undefined as unknown as Window)
    expect(() => notifyFinanceDataInvalidated()).not.toThrow()
  })
})


