import { useState } from 'react'
import { Flower2, MessageCircle, Send, Volume2 } from 'lucide-react'
import { Modal } from './flower-modal'
import { money, playSound } from '@/lib/flower-store'
import type { Order } from '@/lib/flower-store'
import { bouquetOptions } from '@/lib/flower-custom'

const topics = [
  {
    title: 'Pilih bunga untuk hadiah',
    reply:
      'Untuk siapa bunganya? Ceritakan acara, warna favorit, dan budgetmu. Kami bantu pilih rangkaian yang pas.',
    message:
      'Saya ingin rekomendasi buket. Acara: …\nWarna favorit: …\nBudget: …',
  },
  {
    title: 'Tanya pesanan saya',
    reply:
      'Pilih pesananmu di bawah. Nomor pesanan otomatis masuk ke pesan WhatsApp. Status terbaru juga tersedia di menu Pesanan Saya.',
    message: 'Saya ingin bertanya tentang pesanan saya.',
  },
  {
    title: 'Custom & hiasan buket',
    reply:
      'Bisa campur mawar, tulip, lily, sunflower, atau baby’s breath. Buka bagian “Buket, versi kamu” saat checkout untuk memilih tambahan dan melihat totalnya langsung.',
    message:
      'Saya ingin konsultasi custom buket. Bunga pilihan: …\nJumlah tangkai: …\nHiasan: …\nBudget: …',
  },
  {
    title: 'Pengiriman & ambil di toko',
    reply:
      'Pilih kirim ke rumah atau ambil di toko saat checkout. Pengiriman tercatat gratis. Untuk jadwal atau kebutuhan khusus, tanyakan kepada toko melalui WhatsApp.',
    message:
      'Saya ingin bertanya jadwal pengiriman / pengambilan buket. Tanggal yang diinginkan: …',
  },
]
export default function FlowerHelp({ orders }: { orders: Order[] }) {
  const [open, setOpen] = useState(false)
  const [topic, setTopic] = useState(0)
  const [order, setOrder] = useState('')
  const [question, setQuestion] = useState('')
  const selected = topics[topic]
  const message = `Halo Kenoza’s Flower!\n${selected.message}${topic === 1 && order ? `\nNomor pesanan: ${order}` : ''}${question.trim() ? `\n\n${question.trim()}` : ''}`
  return (
    <>
      <button
        type="button"
        className="flower-help-launch"
        onClick={() => {
          setOpen(true)
          playSound(false, undefined, 'chat')
        }}
        aria-label="Buka bantuan bunga dan WhatsApp"
      >
        <MessageCircle size={21} />
        <span>Tanya Kenoza</span>
      </button>
      {open && (
        <Modal
          title="Ada yang bisa dibantu?"
          description="Asisten panduan Kenoza · Lanjut ngobrol dengan toko di WhatsApp"
          onClose={() => setOpen(false)}
        >
          <div className="flower-help">
            <div className="help-greeting">
              <Flower2 size={30} />
              <p>
                Selamat datang di Kenoza’s Flower! Bunga untuk momen apa hari
                ini? Pilih topik, kami bantu siapkan pesannya.
              </p>
            </div>
            <div className="help-topics">
              {topics.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  aria-pressed={topic === index}
                  className={topic === index ? 'selected' : ''}
                  onClick={() => {
                    setTopic(index)
                    playSound(false, undefined, 'chat')
                  }}
                >
                  {item.title}
                </button>
              ))}
            </div>
            <p className="note-box" role="status">
              {selected.reply}
            </p>
            {topic === 1 && (
              <label>
                Pesanan yang ingin ditanyakan
                <select
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                >
                  <option value="">Pilih pesanan (opsional)</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.number}>
                      {o.number} · {o.status}
                    </option>
                  ))}
                </select>
                {!orders.length && (
                  <small>
                    Masuk dengan sesi belanjamu untuk melihat pesanan. Kamu juga
                    bisa menulis nomornya di bawah.
                  </small>
                )}
              </label>
            )}
            {topic === 2 && (
              <details>
                <summary>Lihat harga tambahan</summary>
                {bouquetOptions.map((o) => (
                  <p className="help-price" key={o.id}>
                    <span>{o.name}</span>
                    <strong>
                      {money(o.price)}
                      {o.max > 1 ? ' / tangkai' : ''}
                    </strong>
                  </p>
                ))}
                <small>
                  Harga tambahan per buket, di luar harga buket dasar.
                </small>
              </details>
            )}
            <label>
              Tambahkan ceritamu
              <textarea
                maxLength={1000}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Tulis pertanyaan, warna, acara, atau kebutuhanmu…"
              />
            </label>
            <details>
              <summary>Pratinjau pesan WhatsApp</summary>
              <p className="help-preview">{message}</p>
            </details>
            <a
              className="btn primary full"
              href={`https://wa.me/6281542327838?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playSound(false, undefined, 'chat')}
            >
              <Send size={17} />
              Lanjut ke WhatsApp
            </a>
            <small>
              Pesan siap diedit dan dikirim di WhatsApp. Balasan diberikan oleh
              toko.
            </small>
            <button
              type="button"
              className="text-btn"
              onClick={() =>
                playSound(
                  false,
                  'Selamat datang di Kenoza Flower. Ada yang bisa dibantu?',
                  'preview',
                )
              }
            >
              <Volume2 size={16} /> Coba suara sapaan · mengikuti Suara ON/OFF
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
