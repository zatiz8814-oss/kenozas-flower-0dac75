/** Shared tariff; the server always recalculates the price from option IDs. */
export const bouquetOptions = [
  {
    id: 'rose',
    name: 'Mawar',
    price: 5000,
    max: 30,
    group: 'Tangkai tambahan',
  },
  {
    id: 'tulip',
    name: 'Tulip',
    price: 8000,
    max: 30,
    group: 'Tangkai tambahan',
  },
  {
    id: 'lily',
    name: 'Lily',
    price: 10000,
    max: 20,
    group: 'Tangkai tambahan',
  },
  {
    id: 'sunflower',
    name: 'Sunflower',
    price: 8000,
    max: 20,
    group: 'Tangkai tambahan',
  },
  {
    id: 'baby',
    name: 'Baby’s breath',
    price: 4000,
    max: 20,
    group: 'Tangkai tambahan',
  },
  {
    id: 'wrap',
    name: 'Wrapping premium pastel',
    price: 10000,
    max: 1,
    group: 'Sentuhan akhir',
  },
  {
    id: 'ribbon',
    name: 'Pita satin',
    price: 5000,
    max: 1,
    group: 'Sentuhan akhir',
  },
  {
    id: 'fairy',
    name: 'Lampu fairy',
    price: 15000,
    max: 1,
    group: 'Sentuhan akhir',
  },
  {
    id: 'butterfly',
    name: 'Hiasan kupu-kupu',
    price: 5000,
    max: 1,
    group: 'Sentuhan akhir',
  },
] as const
export type BouquetChoices = Record<string, number>
export function quoteBouquet(input: unknown) {
  if (input === undefined) return { total: 0, detail: '' }
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Pilihan custom tidak valid.')
  let total = 0
  const details: string[] = []
  for (const [id, quantity] of Object.entries(input)) {
    const option = bouquetOptions.find((o) => o.id === id)
    if (
      !option ||
      !Number.isSafeInteger(quantity) ||
      quantity < 0 ||
      quantity > option.max
    )
      throw new Error('Jumlah tambahan bunga atau hiasan tidak valid.')
    if (!quantity) continue
    total += quantity * option.price
    details.push(
      `${option.name} ×${quantity} (+Rp${(quantity * option.price).toLocaleString('id-ID')})`,
    )
  }
  return { total, detail: details.join(', ') }
}
