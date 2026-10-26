import { bouquetOptions, quoteBouquet } from '@/lib/flower-custom'
import type { BouquetChoices } from '@/lib/flower-custom'
import { useRef, useState } from 'react'
import {
  Check,
  CreditCard,
  Truck,
  Store,
  ShieldCheck,
  Tag,
  ArrowRight,
} from 'lucide-react'
import { api, money, playSound, image, whatsappUrl } from '@/lib/flower-store'
import type { Account, CartLine, Product, Promo } from '@/lib/flower-store'
import { Modal } from './flower-modal'
export default function Checkout({
  account,
  items,
  products,
  promos,
  onClose,
  onSuccess,
  offline = false,
  initialFulfillment = 'Online',
  beforeSubmit,
}: {
  account: Account
  items: CartLine[]
  products: Product[]
  promos: Promo[]
  onClose: () => void
  onSuccess: (id: number, number: string) => Promise<void>
  offline?: boolean
  beforeSubmit?: () => Promise<void>
  initialFulfillment?: string
}) {
  const [fulfillment, setFulfillment] = useState(initialFulfillment),
    [payment, setPayment] = useState('QRIS'),
    [promo, setPromo] = useState(''),
    [applied, setApplied] = useState<Promo | null>(null),
    [error, setError] = useState(''),
    [pending, setPending] = useState(false),
    [prices, setPrices] = useState<Record<number, number>>({})
  const [custom, setCustom] = useState<Record<number, BouquetChoices>>({})
  const requestKey = useRef(crypto.randomUUID())
  const lines = items
    .map((i) => ({ ...i, product: products.find((p) => p.id === i.id)! }))
    .filter((i) => i.product)
  const subtotal = lines.reduce(
      (n, i) =>
        n +
        ((offline ? (prices[i.id] ?? i.product.price) : i.product.price) +
          quoteBouquet(custom[i.id]).total) *
          i.quantity,
      0,
    ),
    discount = Math.floor((subtotal * (applied?.percent || 0)) / 100)
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setPending(true)
    playSound()
    const f = new FormData(e.currentTarget)
    try {
      await beforeSubmit?.()
      const r = await api('checkout', {
        items: items.map((i) => ({
          ...i,
          custom: custom[i.id],
          ...(offline
            ? {
                price:
                  prices[i.id] ?? products.find((p) => p.id === i.id)?.price,
              }
            : {}),
        })),
        type: offline ? 'OFFLINE' : 'ONLINE',
        fulfillment,
        customerName: f.get('name'),
        address: f.get('address'),
        courierNote: f.get('courierNote'),
        note: f.get('note'),
        payment,
        promo: applied?.code,
        requestKey: requestKey.current,
      })
      await onSuccess(r.id, r.number)
      playSound(
        true,
        'Pembayaran berhasil. Terima kasih sudah berbelanja di Kenoza Flower.',
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPending(false)
    }
  }
  return (
    <Modal
      title={offline ? 'Transaksi di toko' : 'Sedikit lagi, bahagia sampai!'}
      description={
        offline
          ? 'Pembelian langsung di toko · Dicatat kasir · Selesai & Lunas'
          : 'Pesanan ONLINE · Langsung Selesai & Lunas tanpa konfirmasi'
      }
      onClose={() => {
        if (!pending) onClose()
      }}
      wide
    >
      <form onSubmit={submit} className="checkout-form">
        <div className="checkout-layout">
          <div>
            {!offline && (
              <>
                <label className="field-label">
                  Mau bunganya sampai bagaimana?
                </label>
                <div className="delivery-switch">
                  <button
                    type="button"
                    className={fulfillment === 'Online' ? 'selected' : ''}
                    onClick={() => setFulfillment('Online')}
                  >
                    <Truck size={20} />
                    <strong>Pesan online</strong>
                    <small>Kirim ke alamat rumah</small>
                  </button>
                  <button
                    type="button"
                    className={
                      fulfillment === 'Ambil di toko' ? 'selected' : ''
                    }
                    onClick={() => setFulfillment('Ambil di toko')}
                  >
                    <Store size={20} />
                    <strong>Ambil di toko</strong>
                    <small>Pesan lewat web, tetap ONLINE</small>
                  </button>
                </div>
              </>
            )}
            <p className="note-box">
              {offline
                ? 'OFFLINE: pelanggan membeli langsung di toko dan kasir mencatat transaksi di web.'
                : 'ONLINE: pesan lewat web untuk dikirim atau diambil di toko. Pembelian langsung di toko dicatat kasir sebagai OFFLINE.'}
            </p>
            <label>
              Nama {offline ? 'pelanggan' : 'customer'}
              <input
                name="name"
                required
                defaultValue={offline ? '' : account.name}
                readOnly={!offline}
                placeholder="Nama pelanggan"
                maxLength={80}
              />
            </label>
            {!offline && fulfillment === 'Online' && (
              <>
                <label>
                  Alamat rumah
                  <textarea
                    name="address"
                    required
                    minLength={10}
                    placeholder="Jalan, nomor rumah, kelurahan, kecamatan, kota, dan kode pos"
                  />
                </label>
                <label>
                  Catatan kurir <span className="muted">(opsional)</span>
                  <input
                    name="courierNote"
                    placeholder="Contoh: rumah dengan pagar putih"
                  />
                </label>
              </>
            )}
            <label>
              Catatan pesanan <span className="muted">(opsional)</span>
              <textarea
                name="note"
                placeholder="Pesan untuk kartu ucapan atau detail rangkaian…"
              />
            </label>
            <section className="bouquet-custom">
              <span className="eyebrow">BUKET, VERSI KAMU</span>
              <h3>Campur bunga, tambah cerita</h3>
              <p>
                Opsional. Tambahan berlaku untuk setiap buket produk yang
                dipilih. Bunga asli tetap termasuk; stok katalog dihitung per
                buket.
              </p>
              {lines.map((line) => (
                <details key={line.id}>
                  <summary>
                    {line.product.name} · +
                    {money(quoteBouquet(custom[line.id]).total)} / buket
                  </summary>
                  {['Tangkai tambahan', 'Sentuhan akhir'].map((group) => (
                    <fieldset key={group} disabled={pending}>
                      <legend>{group}</legend>
                      {bouquetOptions
                        .filter((o) => o.group === group)
                        .map((option) => (
                          <label className="custom-option" key={option.id}>
                            <span>
                              {option.name}
                              <small>
                                {money(option.price)}
                                {option.max > 1 ? ' / tangkai' : ''}
                              </small>
                            </span>
                            <select
                              aria-label={`${option.name} untuk ${line.product.name}`}
                              value={custom[line.id]?.[option.id] || 0}
                              onChange={(e) => {
                                setCustom((previous) => ({
                                  ...previous,
                                  [line.id]: {
                                    ...previous[line.id],
                                    [option.id]: Number(e.target.value),
                                  },
                                }))
                                playSound(false, undefined, 'custom')
                              }}
                            >
                              {Array.from(
                                { length: option.max + 1 },
                                (_, n) => (
                                  <option key={n} value={n}>
                                    {option.max === 1
                                      ? n
                                        ? 'Tambahkan'
                                        : 'Tanpa tambahan'
                                      : n}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>
                        ))}
                    </fieldset>
                  ))}
                  <button
                    type="button"
                    className="text-btn"
                    disabled={pending}
                    onClick={() =>
                      setCustom((previous) => ({ ...previous, [line.id]: {} }))
                    }
                  >
                    Reset tambahan
                  </button>
                </details>
              ))}
            </section>
            <label className="field-label">Metode pembayaran</label>
            <div className="payments">
              {['QRIS', 'Transfer', 'E-wallet', 'Cash', 'COD'].map((p) => (
                <button
                  type="button"
                  className={payment === p ? 'selected' : ''}
                  key={p}
                  onClick={() => {
                    setPayment(p)
                    playSound()
                  }}
                >
                  {payment === p ? (
                    <Check size={15} />
                  ) : (
                    <CreditCard size={15} />
                  )}{' '}
                  {p}
                </button>
              ))}
            </div>
            <p className="fine-print">
              <ShieldCheck size={14} /> Pembayaran langsung tercatat berhasil
              setelah pesanan dibuat.
            </p>
          </div>
          <div className="checkout-summary">
            <h3>Rangkaian pilihanmu</h3>
            {lines.map((i) => (
              <div className="checkout-line" key={i.id}>
                <img src={image(i.product.image, 100)} alt={i.product.name} />
                <div>
                  <strong>{i.product.name}</strong>
                  <small>
                    {i.quantity} ×{' '}
                    {money(
                      (prices[i.id] ?? i.product.price) +
                        quoteBouquet(custom[i.id]).total,
                    )}
                  </small>
                  {quoteBouquet(custom[i.id]).detail && (
                    <small className="custom-breakdown">
                      {quoteBouquet(custom[i.id]).detail}
                    </small>
                  )}
                  {offline && (
                    <label>
                      Harga satuan
                      <input
                        type="number"
                        min={1}
                        required
                        value={prices[i.id] ?? i.product.price}
                        onChange={(e) =>
                          setPrices({
                            ...prices,
                            [i.id]: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  )}
                </div>
              </div>
            ))}
            <div className="promo-entry">
              <Tag size={16} />
              <input
                aria-label="Kode promo"
                value={promo}
                placeholder="Punya kode promo?"
                onChange={(e) => setPromo(e.target.value.toUpperCase())}
              />
              <button
                type="button"
                onClick={() => {
                  const found = promos.find(
                    (p) => p.code === promo.trim() && p.active,
                  )
                  if (found) {
                    setApplied(found)
                    setError('')
                  } else {
                    setError('Kode promo tidak aktif atau tidak ditemukan.')
                    setApplied(null)
                  }
                }}
              >
                Pakai
              </button>
            </div>
            {applied && (
              <p className="success-text">
                {applied.code} · Hemat {applied.percent}%{' '}
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => {
                    setApplied(null)
                    setPromo('')
                  }}
                >
                  Hapus
                </button>
              </p>
            )}
            <div className="totals">
              <p>
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </p>
              <p>
                <span>Diskon</span>
                <span>−{money(discount)}</span>
              </p>
              <p>
                <span>Pengiriman</span>
                <span>Gratis</span>
              </p>
              <p className="grand-total">
                <strong>Total pembayaran</strong>
                <strong>{money(subtotal - discount)}</strong>
              </p>
            </div>
            <span className="badge pink">
              Jenis transaksi: {offline ? 'OFFLINE' : 'ONLINE'}
            </span>
            <p className="muted">
              Langsung berhasil tanpa persetujuan Admin.{' '}
              <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer">
                Chat WhatsApp opsional
              </a>
              .
            </p>
            {error && (
              <p role="alert" className="error-message">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="btn primary full"
              disabled={pending || !lines.length}
            >
              {pending
                ? 'Menyimpan pesanan…'
                : offline
                  ? 'Simpan Transaksi'
                  : 'Bayar & Buat Pesanan'}
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
