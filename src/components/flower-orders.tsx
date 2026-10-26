import { useState } from 'react'
import {
  Package,
  Download,
  Printer,
  ArrowRight,
  MapPin,
  CheckCircle2,
  Flower2,
} from 'lucide-react'
import {
  api,
  date,
  money,
  downloadInvoice,
  whatsappUrl,
  playSound,
} from '@/lib/flower-store'
import type { Order } from '@/lib/flower-store'
import { Modal } from './flower-modal'
export function OrderDetail({
  order: o,
  onClose,
}: {
  order: Order
  onClose: () => void
}) {
  return (
    <Modal
      title={`Pesanan ${o.number}`}
      description={`${date(o.createdAt)} · ${o.type}`}
      onClose={onClose}
      wide
    >
      <div className="invoice-preview">
        <div className="invoice-heading">
          <div className="receipt-brand">
            <Flower2 size={30} aria-hidden="true" />
            <span className="brand-text">Kenoza’s Flower</span>
            <small>Bunga indah, cerita bahagia</small>
          </div>
          <span className="badge green">
            <CheckCircle2 size={13} /> {o.paymentStatus}
          </span>
        </div>
        <div className="invoice-reference">
          <strong>STRUK BELANJA · {o.number}</strong>
          <span>
            {date(o.createdAt)} WIB · {o.type}
          </span>
        </div>
        <div className="invoice-meta">
          <div>
            <small>Pelanggan</small>
            <strong>{o.customerName}</strong>
          </div>
          <div>
            <small>Metode pembayaran</small>
            <strong>{o.payment}</strong>
          </div>
          <div>
            <small>Pengantaran</small>
            <strong>{o.fulfillment}</strong>
          </div>
        </div>
        {o.address && (
          <p className="muted address">
            <MapPin size={15} />
            {o.address}
          </p>
        )}
        <div className="receipt-column-head">
          <span>Rincian belanja</span>
          <span>Jumlah</span>
        </div>
        <div className="invoice-lines">
          {o.items.map((i) => (
            <div key={i.id}>
              <span>
                {i.name}
                <small>
                  {i.quantity} × {money(i.price)}
                </small>
              </span>
              <strong>{money(i.quantity * i.price)}</strong>
            </div>
          ))}
        </div>
        <div className="totals">
          <p>
            <span>Subtotal</span>
            <span>{money(o.subtotal)}</span>
          </p>
          <p>
            <span>Diskon</span>
            <span>−{money(o.discount)}</span>
          </p>
          <p className="grand-total">
            <strong>Total pembayaran</strong>
            <strong>{money(o.total)}</strong>
          </p>
        </div>
        {o.note && <p className="note-box">Catatan: {o.note}</p>}
        {o.courierNote && (
          <p className="note-box">Catatan kurir: {o.courierNote}</p>
        )}
        <p className="note-box">
          Status pesanan: <strong>{o.status}</strong> · {o.paymentStatus}.
          Pesanan langsung berhasil tanpa konfirmasi Admin.
        </p>
        <div className="receipt-footer">
          <Flower2 size={20} aria-hidden="true" />
          <strong>Terima kasih sudah berbelanja!</strong>
          <p>Simpan struk ini sebagai bukti pembelian.</p>
          <span>{o.number}</span>
        </div>
        <a
          className="receipt-contact"
          href={whatsappUrl(o.number)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Tanya pesanan via WhatsApp (opsional)
        </a>
      </div>
      <div className="button-row">
        <button className="btn primary" onClick={() => void downloadInvoice(o)}>
          <Download size={16} />
          Download Invoice
        </button>
        <button
          className="btn secondary"
          onClick={() => void downloadInvoice(o, true)}
        >
          <Download size={16} />
          Download Struk
        </button>
        <button className="btn secondary" onClick={() => window.print()}>
          <Printer size={16} />
          Cetak
        </button>
      </div>
    </Modal>
  )
}
export function OrderList({
  orders,
  adminMode = false,
  refresh,
}: {
  orders: Order[]
  adminMode?: boolean
  refresh: () => Promise<void>
}) {
  const [detail, setDetail] = useState<Order | null>(null),
    [error, setError] = useState(''),
    [pending, setPending] = useState<number | null>(null)
  async function advance(o: Order) {
    setPending(o.id)
    setError('')
    try {
      await api('status', {
        id: o.id,
        status: 'Selesai',
      })
      await refresh()
      playSound(true, 'Status pesanan berhasil diperbarui.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPending(null)
    }
  }
  return (
    <>
      {error && <p className="error-message">{error}</p>}
      {orders.length === 0 ? (
        <div className="empty-state">
          <Package size={42} />
          <h3>Belum ada pesanan</h3>
          <p>Rangkaian bunga untuk cerita berikutnya menantimu.</p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((o) => (
            <article className="order-card" key={o.id}>
              <div className="order-top">
                <div>
                  <strong>{o.number}</strong>
                  <span
                    className={`badge ${o.type === 'ONLINE' ? 'pink' : ''}`}
                  >
                    {o.type}
                  </span>
                </div>
                <span
                  className={`badge ${o.status === 'Selesai' ? 'green' : 'pink'}`}
                >
                  {o.status}
                </span>
              </div>
              <small className="muted">
                {date(o.createdAt)} · {o.customerName} · {o.fulfillment}
              </small>
              <div className="order-summary">
                <div>
                  {o.items.map((i) => (
                    <p key={i.id}>
                      {i.quantity} × {i.name}
                    </p>
                  ))}
                </div>
                <strong>{money(o.total)}</strong>
              </div>
              <div className="order-bottom">
                <small className="payment-label">
                  <CheckCircle2 size={13} />
                  {o.payment} · {o.paymentStatus}
                </small>
                <div className="button-row">
                  <button className="text-btn" onClick={() => setDetail(o)}>
                    Lihat detail <ArrowRight size={14} />
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={`Download invoice ${o.number}`}
                    onClick={() => void downloadInvoice(o)}
                  >
                    <Download size={17} />
                  </button>
                  {adminMode && o.status !== 'Selesai' && (
                    <button
                      disabled={pending === o.id}
                      className="btn primary small"
                      onClick={() => void advance(o)}
                    >
                      {pending === o.id ? 'Menyimpan…' : 'Selesaikan'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {detail && (
        <OrderDetail
          order={orders.find((o) => o.id === detail.id) || detail}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  )
}
