import { describe, it, expect } from 'vitest'
import { isWowheadUrl, wowheadItemUrl, wowheadSpellUrl } from './wowhead'

describe('wowhead links', () => {
  it('builds Forever item and spell URLs', () => {
    expect(wowheadItemUrl(2447)).toBe('https://www.wowhead.com/forever/item=2447')
    expect(wowheadSpellUrl(2330)).toBe('https://www.wowhead.com/forever/spell=2330')
  })

  it('only allows wowhead.com URLs', () => {
    expect(isWowheadUrl('https://www.wowhead.com/forever/item=2447')).toBe(true)
    expect(isWowheadUrl('https://www.wowhead.com.evil.test/x')).toBe(false)
    expect(isWowheadUrl('http://www.wowhead.com/forever/item=1')).toBe(false)
    expect(isWowheadUrl('file:///C:/Windows')).toBe(false)
  })
})
