import { describe, it, expect, vi, afterEach } from 'vitest'
import { notifyGroupDataInvalidated, subscribeToGroupDataInvalidation } from './group-data-events'

describe('group-data-events', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('notifies subscribed listeners', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToGroupDataInvalidation(listener)

    notifyGroupDataInvalidated()

    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('unsubscribes listeners', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToGroupDataInvalidation(listener)

    unsubscribe()
    notifyGroupDataInvalidated()

    expect(listener).not.toHaveBeenCalled()
  })

  it('continues notifying other listeners even if one throws', () => {
    const badListener = vi.fn(() => {
      throw new Error('boom')
    })
    const goodListener = vi.fn()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const unsubBad = subscribeToGroupDataInvalidation(badListener)
    const unsubGood = subscribeToGroupDataInvalidation(goodListener)

    notifyGroupDataInvalidated()

    expect(badListener).toHaveBeenCalledTimes(1)
    expect(goodListener).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalled()

    unsubBad()
    unsubGood()
  })
})

