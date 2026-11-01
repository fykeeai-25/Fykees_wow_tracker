import { describe, it, expect } from 'vitest'
import { abbreviateCurrency } from './currency'

describe('abbreviateCurrency', () => {
  it.each([
    ["Merchant's Favor", 'MF'],
    ['Honor Points', 'HP'],
    ['Arena', 'A']
  ])('%s → %s', (name, short) => {
    expect(abbreviateCurrency(name)).toBe(short)
  })
})
