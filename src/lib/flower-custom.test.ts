import { describe, expect, it } from 'vitest'
import { quoteBouquet } from './flower-custom'

describe('bouquet pricing', () => {
  it('keeps existing checkout totals unchanged without customization', () => {
    expect(quoteBouquet(undefined)).toEqual({ total: 0, detail: '' })
    expect(quoteBouquet({})).toEqual({ total: 0, detail: '' })
  })
  it('prices mixed stems and decorations with historical detail', () => {
    const result = quoteBouquet({ rose: 3, tulip: 2, ribbon: 1, wrap: 1 })
    expect(result.total).toBe(46000)
    expect(result.detail).toContain('Mawar ×3 (+Rp15.000)')
    expect(result.detail).toContain('Tulip ×2 (+Rp16.000)')
    // Two bouquets each receive their own additions.
    expect((45000 + result.total) * 2).toBe(182000)
  })
  it.each([
    { rose: -1 },
    { lily: 21 },
    { ribbon: 2 },
    { rose: 1.5 },
    { rose: '2' },
    { price: 1 },
    [],
    null,
  ])('rejects invalid or forged custom options: %j', (input) => {
    expect(() => quoteBouquet(input)).toThrow()
  })
})
