import { login, logout, hydrateSession, AuthError } from '@netlify/identity'
export type Product = {
  id: number
  name: string
  description: string
  price: number
  stock: number
  category: string
  image: string
  tag: string
  active: boolean
  createdAt?: string
}
export type Category = { id: number; name: string }
export type Promo = { code: string; percent: number; active: boolean }
export type CartLine = { id: number; quantity: number }
export type Account = {
  id: string
  name: string
  isAdmin: boolean
  cart: CartLine[]
  wishlist: number[]
}
export type Order = {
  id: number
  number: string
  customerName: string
  type: string
  fulfillment: string
  address: string
  courierNote: string
  note: string
  payment: string
  paymentStatus: string
  status: string
  subtotal: number
  discount: number
  total: number
  createdAt: string
  updatedAt: string
  items: {
    id: number
    productId: number
    name: string
    quantity: number
    price: number
  }[]
}
export const whatsappUrl = (orderNumber?: string) =>
  `https://wa.me/6281542327838?text=${encodeURIComponent(
    orderNumber
      ? `Halo Kenoza’s Flower, saya ingin bertanya tentang pesanan ${orderNumber}.`
      : 'Halo Kenoza’s Flower, saya ingin bertanya tentang bunga.',
  )}`
export const money = (v: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(v)
export const date = (v: string) =>
  new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(v))
export const image = (url: string, w = 600) =>
  `/.netlify/images?url=${encodeURIComponent(url)}&w=${w}&fm=webp`
export async function api(action: string, body?: unknown) {
  const r = await fetch(`/api/store?action=${action}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let data
  try {
    data = await r.json()
  } catch {
    throw new Error('Layanan belum tersedia. Silakan coba kembali.')
  }
  if (!r.ok) throw new Error(data.error || 'Permintaan gagal.')
  return data
}
export async function identityEmail(name: string) {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(name.trim().toLowerCase()),
  )
  return (
    [...new Uint8Array(bytes)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('') + '@accounts.kenozas-flower.invalid'
  )
}
export async function identityPassword(password: string) {
  if (password.length >= 8) return password
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(password),
  )
  return (
    'KF-short-v1:' +
    [...new Uint8Array(bytes)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  )
}
export async function signIn(name: string, password: string, mode: string) {
  if (mode !== 'admin') return api('guest', { name })
  const email = await identityEmail(name)
  const secret = await identityPassword(password)
  try {
    await login(email, secret)
  } catch (error) {
    // Existing accounts can log in without provisioning or operator access.
    if (
      !(error instanceof AuthError) ||
      ![400, 401, 403, 404, 422].includes(error.status || 0)
    )
      throw new Error(
        'Layanan login Admin belum tersedia. Silakan coba kembali.',
        { cause: error },
      )
    await api('bootstrap', { name, password })
    await login(email, secret)
  }
  await hydrateSession()
  let account
  try {
    account = await api('me')
  } catch {
    await api('bootstrap', { name, password })
    account = await api('me')
  }
  if (!account.isAdmin) {
    await logout()
    throw new Error('Akses Admin diperlukan.')
  }
  return account
}
export async function restore() {
  try {
    return await api('me')
  } catch {
    return null
  }
}
export async function signOut() {
  await api('leave', {})
  await logout()
}
let audio: AudioContext | undefined
let enabled = true
export function soundEnabled(value: boolean) {
  enabled = value
  if (!value) {
    if (audio) void audio.suspend()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window)
      window.speechSynthesis.cancel()
  } else if (audio) void audio.resume()
}
export function unlockSound() {
  try {
    audio ||= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    /* Audio is optional on unsupported browsers. */
  }
}
export function playSound(
  important = false,
  speech?: string,
  kind: 'default' | 'chat' | 'custom' | 'preview' = 'default',
) {
  if (!enabled) return
  unlockSound()
  if (!audio) return
  const ctx = audio
  const notes = important
    ? [523.25, 659.25, 783.99, 1046.5]
    : kind === 'chat'
      ? [659, 880, 784]
      : kind === 'custom'
        ? [523, 784]
        : kind === 'preview'
          ? [523, 659, 784, 1047, 784]
          : [784, 1047]
  notes.forEach((freq, i) => {
    const oscillator = ctx.createOscillator(),
      gain = ctx.createGain()
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.type = 'sine'
    oscillator.frequency.value = freq
    const start = ctx.currentTime + i * 0.16
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(important ? 0.6 : 0.25, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3)
    oscillator.start(start)
    oscillator.stop(start + 0.31)
  })
  if (speech && 'speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(speech)
    u.lang = 'id-ID'
    u.volume = 1
    u.rate = 0.95
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }
}
export async function downloadInvoice(o: Order, receipt = false) {
  const { jsPDF } = await import('jspdf')
  const w = receipt ? 100 : 210
  const margin = receipt ? 8 : 20
  const width = w - margin * 2
  // Measure wrapped content before choosing the continuous receipt paper height.
  const doc = new jsPDF({ format: 'a4' })
  doc.setFontSize(receipt ? 9 : 10)
  const wrap = (value: string, max = width) =>
    doc.splitTextToSize(value, max) as string[]
  const height = receipt
    ? Math.max(
        210,
        145 +
          o.items.reduce(
            (sum, i) => sum + wrap(i.name, width - 28).length * 5 + 10,
            0,
          ) +
          [o.customerName, o.address, o.note, o.courierNote].reduce(
            (sum, v) => sum + (v ? wrap(v).length * 5 + 8 : 0),
            0,
          ),
      )
    : 297
  doc.deletePage(1)
  doc.addPage([w, height], 'portrait')
  let y = 0
  const room = (needed: number) => {
    if (y + needed > height - margin) {
      doc.addPage([w, height], 'portrait')
      y = margin + 5
    }
  }
  const text = (value: string, bold = false, size = receipt ? 9 : 10) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    const lines = wrap(value)
    room(lines.length * 5 + 4)
    doc.text(lines, margin, y)
    y += lines.length * 5 + 3
  }
  const rule = () => {
    room(6)
    doc.setDrawColor(202, 171, 182)
    doc.setLineDashPattern([1, 1], 0)
    doc.line(margin, y, w - margin, y)
    doc.setLineDashPattern([], 0)
    y += 6
  }
  const pair = (label: string, value: string, bold = false) => {
    room(9)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(receipt ? 9 : 11)
    doc.text(label, margin, y)
    doc.text(value, w - margin, y, { align: 'right' })
    y += 8
  }
  doc.setFillColor(252, 233, 238)
  doc.rect(0, 0, w, 40, 'F')
  doc.setTextColor(119, 55, 79)
  doc.setFont('times', 'bold')
  doc.setFontSize(receipt ? 19 : 28)
  doc.text("KENOZA'S FLOWER", w / 2, 18, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Bunga indah, cerita bahagia', w / 2, 26, { align: 'center' })
  doc.text(receipt ? 'STRUK BELANJA' : 'INVOICE PEMBELIAN', w / 2, 34, {
    align: 'center',
  })
  doc.setTextColor(65, 48, 55)
  y = 49
  pair(o.number, o.type, true)
  text(date(o.createdAt) + ' WIB')
  text('Pelanggan: ' + o.customerName)
  text('Pengantaran: ' + o.fulfillment)
  if (o.address) text('Alamat: ' + o.address)
  rule()
  pair('RINCIAN BELANJA', 'JUMLAH', true)
  for (const i of o.items) {
    doc.setFontSize(receipt ? 9 : 10)
    const lines = wrap(i.name, width - (receipt ? 30 : 50))
    room(lines.length * 5 + 12)
    doc.setFont('helvetica', 'bold')
    doc.text(lines, margin, y)
    doc.text(money(i.quantity * i.price), w - margin, y, { align: 'right' })
    y += lines.length * 5 + 1
    text(i.quantity + ' x ' + money(i.price))
  }
  rule()
  pair('Subtotal', money(o.subtotal))
  pair('Diskon', '-' + money(o.discount))
  room(24)
  doc.setFillColor(252, 233, 238)
  doc.roundedRect(margin - 2, y - 5, width + 4, 13, 2, 2, 'F')
  pair('TOTAL', money(o.total), true)
  y += 9
  text('Pembayaran: ' + o.payment + ' / ' + o.paymentStatus, true)
  text('Status pesanan: ' + o.status)
  if (o.note) text('Catatan: ' + o.note)
  if (o.courierNote) text('Catatan kurir: ' + o.courierNote)
  rule()
  text('Terima kasih sudah berbelanja!', true)
  text('Simpan struk ini sebagai bukti pembelian.')
  doc.setProperties({
    title: `${receipt ? 'Struk' : 'Invoice'} ${o.number}`,
    author: "Kenoza's Flower",
  })
  doc.save(`${receipt ? 'Struk' : 'Invoice'}-${o.number}.pdf`)
}
export function exportFile(
  name: string,
  data: string,
  type = 'text/csv;charset=utf-8',
) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + data], { type }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
export function exportOrders(orders: Order[]) {
  const q = (v: unknown) =>
    '"' +
    String(v ?? '')
      .replaceAll('"', '""')
      .replace(/^[=+@-]/, "'") +
    '"'
  exportFile(
    'Laporan-Kenozas-Flower.csv',
    [
      [
        'Nomor',
        'Tanggal',
        'Pelanggan',
        'Jenis',
        'Pengambilan',
        'Pembayaran',
        'Status bayar',
        'Status pesanan',
        'Subtotal',
        'Diskon',
        'Total',
      ],
      ...orders.map((o) => [
        o.number,
        date(o.createdAt),
        o.customerName,
        o.type,
        o.fulfillment,
        o.payment,
        o.paymentStatus,
        o.status,
        o.subtotal,
        o.discount,
        o.total,
      ]),
    ]
      .map((row) => row.map(q).join(','))
      .join('\r\n'),
  )
}
export const initialCategories = [
  'Mawar',
  'Tulip',
  'Lily',
  'Sunflower',
  'Bouquet',
  'Hampers',
  'Bunga Meja',
  'Bunga Wisuda',
  'Bunga Ulang Tahun',
].map((name, i) => ({ id: i + 1, name }))
export const initialProducts: Product[] = [
  {
    id: 1,
    name: 'Pink Whisper Bouquet',
    description:
      'Mawar pink lembut dan baby’s breath, dibungkus kertas premium dengan pita satin.',
    price: 55000,
    stock: 24,
    category: 'Bouquet',
    image: '/img/pink-bouquet.jpg',
    tag: 'Bestseller',
    active: true,
  },
  {
    id: 2,
    name: 'Blushing Rose',
    description:
      'Mawar merah muda segar dengan eucalyptus yang harum. Manis untuk orang tersayang.',
    price: 65000,
    stock: 18,
    category: 'Mawar',
    image: '/img/rose.jpg',
    tag: 'Favorit',
    active: true,
  },
  {
    id: 3,
    name: 'Tulip Sweetheart',
    description:
      'Tulip pink elegan dengan balutan lembut. Ungkapan sayang yang berkesan.',
    price: 85000,
    stock: 12,
    category: 'Tulip',
    image: '/img/tulip.jpg',
    tag: 'Baru',
    active: true,
  },
  {
    id: 4,
    name: 'Sunshine in a Bouquet',
    description: 'Bunga matahari ceria untuk membawa senyum dan semangat baru.',
    price: 45000,
    stock: 20,
    category: 'Sunflower',
    image: '/img/sunflower.jpg',
    tag: '',
    active: true,
  },
  {
    id: 5,
    name: 'White Lily Garden',
    description: 'Lily putih yang anggun dengan dedaunan segar.',
    price: 75000,
    stock: 8,
    category: 'Lily',
    image: '/img/lily.jpg',
    tag: 'Baru',
    active: true,
  },
  {
    id: 6,
    name: 'Little Love Hampers',
    description: 'Buket bunga segar dalam kemasan hadiah cantik.',
    price: 99000,
    stock: 5,
    category: 'Hampers',
    image: '/img/hero.png',
    tag: 'Pilihan spesial',
    active: true,
  },
  {
    id: 7,
    name: 'Graduation Bloom',
    description: 'Buket mawar pastel untuk merayakan pencapaian luar biasa.',
    price: 59000,
    stock: 16,
    category: 'Bunga Wisuda',
    image: '/img/pink-bouquet.jpg',
    tag: '',
    active: true,
  },
  {
    id: 8,
    name: 'Birthday Petals',
    description: 'Perpaduan mawar dan bunga musiman penuh cinta.',
    price: 69000,
    stock: 15,
    category: 'Bunga Ulang Tahun',
    image: '/img/rose.jpg',
    tag: '',
    active: true,
  },
]
