import { describe, it, expect } from 'vitest'
import { upsertUniqueById } from './array'

describe('upsertUniqueById', () => {
  it('appends when the list is empty', () => {
    const next = upsertUniqueById([], { id: 'a', value: 1 })
    expect(next).toEqual([{ id: 'a', value: 1 }])
  })

  it('appends when id does not exist', () => {
    const prev = [{ id: 'a', value: 1 }]
    const next = upsertUniqueById(prev, { id: 'b', value: 2 })
    expect(next).toEqual([
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
    ])
  })

  it('replaces the first occurrence and preserves order', () => {
    const prev = [
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
      { id: 'c', value: 3 },
    ]
    const next = upsertUniqueById(prev, { id: 'b', value: 99 })
    expect(next).toEqual([
      { id: 'a', value: 1 },
      { id: 'b', value: 99 },
      { id: 'c', value: 3 },
    ])
  })

  it('removes duplicates of the same id', () => {
    const prev = [
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
      { id: 'b', value: 3 },
      { id: 'c', value: 4 },
      { id: 'b', value: 5 },
    ]
    const next = upsertUniqueById(prev, { id: 'b', value: 99 })
    expect(next).toEqual([
      { id: 'a', value: 1 },
      { id: 'b', value: 99 },
      { id: 'c', value: 4 },
    ])
  })
})


