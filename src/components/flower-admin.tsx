import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Store,
  Tags,
  Flower2,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Download,
  ArrowUpRight,
  CircleAlert,
  Activity,
  Search,
  Check,
} from 'lucide-react'
import {
  api,
  date,
  money,
  image,
  exportOrders,
  exportFile,
} from '@/lib/flower-store'
import type {
  Account,
  Product,
  Order,
  Category,
  Promo,
  CartLine,
} from '@/lib/flower-store'
import { OrderList } from './flower-orders'
import { Modal } from './flower-modal'
import Checkout from './flower-checkout'
type AdminData = {
  products: Product[]
  customers: { id: string; name: string }[]
  activity: { id: number; actor: string; message: string; createdAt: string }[]
  promos: Promo[]
}
const menus = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', name: 'Kelola Pesanan', icon: ShoppingBag },
  { id: 'offline', name: 'Pesanan Offline', icon: Store },
  { id: 'products', name: 'Produk & Stok', icon: Flower2 },
  { id: 'categories', name: 'Kategori Bunga', icon: Tags },
  { id: 'promos', name: 'Kode Promo', icon: Tags },
  { id: 'reports', name: 'Laporan Penjualan', icon: BarChart3 },
  { id: 'customers', name: 'Customer', icon: Users },
  { id: 'activity', name: 'Aktivitas Admin', icon: Activity },
  { id: 'settings', name: 'Pengaturan', icon: Settings },
]
export default function FlowerAdmin({
  account,
  orders,
  categories,
  onRefresh,
  onOrderSuccess,
  onAccountChange,
  onLogout,
}: {
  account: Account
  orders: Order[]
  categories: Category[]
  onRefresh: () => Promise<void>
  onOrderSuccess: (id: number, number: string) => Promise<void>
  onLogout: () => Promise<void>
  onAccountChange: (a: Account) => void
}) {
  const [tab, setTab] = useState('dashboard'),
    [data, setData] = useState<AdminData>({
      products: [],
      customers: [],
      activity: [],
      promos: [],
    }),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [filter, setFilter] = useState('Semua'),
    [search, setSearch] = useState(''),
    [product, setProduct] = useState<Partial<Product> | null>(null),
    [category, setCategory] = useState<Partial<Category> | null>(null),
    [promo, setPromo] = useState<Partial<Promo> | null>(null),
    [pending, setPending] = useState(false),
    [offlineCart, setOfflineCart] = useState<CartLine[]>([]),
    [checkout, setCheckout] = useState(false),
    [message, setMessage] = useState('')
  async function refresh() {
    const r = await api('admin')
    setData(r)
    await onRefresh()
  }
  useEffect(() => {
    let active = true
    api('admin')
      .then((r) => {
        if (active) setData(r)
      })
      .catch((e) => {
        if (active) setError(e.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [orders])
  const revenue = orders.reduce((n, o) => n + o.total, 0),
    online = orders.filter((o) => o.type === 'ONLINE'),
    offline = orders.filter((o) => o.type === 'OFFLINE'),
    low = data.products.filter((p) => p.active && p.stock <= 5),
    paid = orders.filter((o) => o.paymentStatus === 'Lunas'),
    completed = orders.filter((o) => o.status === 'Selesai')
  const timeKey = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d)
  const today = timeKey(new Date()),
    todayRevenue = orders
      .filter((o) => timeKey(new Date(o.createdAt)) === today)
      .reduce((n, o) => n + o.total, 0),
    weekRevenue = orders
      .filter(
        (o) => new Date(o.createdAt).getTime() >= Date.now() - 7 * 86400000,
      )
      .reduce((n, o) => n + o.total, 0),
    monthRevenue = orders
      .filter(
        (o) => timeKey(new Date(o.createdAt)).slice(0, 7) === today.slice(0, 7),
      )
      .reduce((n, o) => n + o.total, 0)
  const best = Object.entries(
    orders
      .flatMap((o) => o.items)
      .reduce<Record<string, number>>(
        (a, i) => ({ ...a, [i.name]: (a[i.name] || 0) + i.quantity }),
        {},
      ),
  ).sort((a, b) => b[1] - a[1])
  const filteredOrders = orders.filter(
    (o) =>
      (filter === 'Semua' || o.type === filter || o.status === filter) &&
      `${o.number} ${o.customerName}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  )
  async function save(
    e: React.FormEvent<HTMLFormElement>,
    action: string,
    extra: object = {},
  ) {
    e.preventDefault()
    setPending(true)
    setError('')
    const f = Object.fromEntries(new FormData(e.currentTarget))
    try {
      await api(action, { ...f, ...extra })
      setProduct(null)
      setCategory(null)
      setPromo(null)
      await refresh()
      setMessage('Perubahan berhasil disimpan.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPending(false)
    }
  }
  async function remove(p: Product) {
    setPending(true)
    try {
      await api('delete-product', { id: p.id })
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPending(false)
    }
  }
  async function upload(file: File) {
    setPending(true)
    setError('')
    try {
      if (file.size > 3 * 1024 * 1024) throw new Error('Foto maksimal 3 MB.')
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1])
        reader.onerror = () => reject(new Error('Foto gagal dibaca.'))
        reader.readAsDataURL(file)
      })
      const r = await api('upload', { mime: file.type, data: base64 })
      setProduct((p) => ({ ...p, image: r.url }))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPending(false)
    }
  }
  const statCards = [
    ['Total penjualan', money(revenue), ShoppingBag],
    ['Total pesanan', String(orders.length), Package],
    ['Pesanan online', String(online.length), ShoppingBag],
    ['Pesanan offline', String(offline.length), Store],
    ['Pembayaran berhasil', String(paid.length), Check],
    ['Produk hampir habis', String(low.length), CircleAlert],
    ['Pesanan selesai', String(completed.length), Check],
    ['Jumlah customer', String(data.customers.length), Users],
  ] as const
  return (
    <main className="admin-layout container">
      <aside className="admin-sidebar">
        <div className="admin-label">RUANG ADMIN</div>
        <p className="admin-welcome">
          Halo, {account.name}
          <span>Semoga harimu berbunga.</span>
        </p>
        <nav>
          {menus.map((m) => (
            <button
              key={m.id}
              className={tab === m.id ? 'active' : ''}
              onClick={() => {
                setTab(m.id)
                setError('')
                setMessage('')
                setSearch('')
                setFilter('Semua')
              }}
            >
              <m.icon size={18} />
              {m.name}
            </button>
          ))}
          <button onClick={() => void onLogout()}>
            <LogOut size={18} />
            Logout
          </button>
        </nav>
        <div className="admin-sidebar-footer">
          <Flower2 size={24} />
          <span>
            Setiap pesanan,
            <br />
            sebuah kebahagiaan.
          </span>
        </div>
      </aside>
      <section className="admin-main">
        <div className="section-heading">
          <div>
            <span className="eyebrow">KENOZA’S FLOWER / ADMIN</span>
            <h1>{menus.find((m) => m.id === tab)?.name}</h1>
          </div>
          {['dashboard', 'orders', 'offline'].includes(tab) && (
            <button className="btn primary" onClick={() => setTab('offline')}>
              <Plus size={17} />
              Tambah Pesanan Offline
            </button>
          )}
          {tab === 'products' && (
            <button
              className="btn primary"
              onClick={() =>
                setProduct({
                  active: true,
                  stock: 10,
                  price: 185000,
                  category: categories[0]?.name || 'Bouquet',
                  image: '/img/hero.png',
                })
              }
            >
              <Plus size={17} />
              Tambah Produk
            </button>
          )}
          {tab === 'reports' && (
            <button
              className="btn primary"
              onClick={() => exportOrders(orders)}
            >
              <Download size={17} />
              Download Laporan
            </button>
          )}
        </div>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        {message && <p className="success-message">{message}</p>}
        {loading && <div className="loading-bar" />}
        {tab === 'dashboard' && (
          <>
            <div className="admin-stats">
              {statCards.map(([name, value, Icon]) => (
                <div className="stat-card" key={name}>
                  <div>
                    <span>{name}</span>
                    <Icon size={19} />
                  </div>
                  <strong>{value}</strong>
                  <small>Data transaksi tersimpan</small>
                </div>
              ))}
            </div>
            <div className="admin-panels">
              <div className="admin-panel">
                <div className="panel-heading">
                  <h3>Pesanan terbaru</h3>
                  <button className="text-btn" onClick={() => setTab('orders')}>
                    Lihat semua <ArrowUpRight size={15} />
                  </button>
                </div>
                <OrderList
                  orders={orders.slice(0, 3)}
                  adminMode
                  refresh={refresh}
                />
              </div>
              <div className="admin-panel">
                <h3>
                  <CircleAlert size={18} /> Stok hampir habis
                </h3>
                {low.length ? (
                  low.map((p) => (
                    <button
                      className="low-stock"
                      key={p.id}
                      onClick={() => {
                        setTab('products')
                        setProduct(p)
                      }}
                    >
                      <img src={image(p.image, 80)} alt="" />
                      <span>
                        {p.name}
                        <small>Sisa {p.stock} rangkaian</small>
                      </span>
                      <Pencil size={15} />
                    </button>
                  ))
                ) : (
                  <p className="muted">Stok semua bunga masih cukup.</p>
                )}
                <div className="mini-revenue">
                  <span>Pendapatan hari ini</span>
                  <strong>{money(todayRevenue)}</strong>
                  <small>Dari penjualan online dan offline</small>
                </div>
              </div>
            </div>
          </>
        )}
        {tab === 'orders' && (
          <>
            <div className="admin-filters">
              <div className="search-box">
                <Search size={17} />
                <input
                  aria-label="Cari pesanan"
                  placeholder="Cari nomor / nama customer…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                aria-label="Filter pesanan"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {['Semua', 'ONLINE', 'OFFLINE', 'Selesai'].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>
            <OrderList orders={filteredOrders} adminMode refresh={refresh} />
          </>
        )}
        {tab === 'offline' && (
          <>
            <div className="note-box">
              <Store size={22} />
              <span>
                <strong>Layani pelanggan langsung di toko</strong>
                <br />
                Pilih produk, atur jumlah, lalu lanjutkan ke pembayaran. Stok
                dan laporan diperbarui otomatis.
              </span>
            </div>
            <div className="offline-products">
              {data.products
                .filter((p) => p.active)
                .map((p) => (
                  <div className="offline-product" key={p.id}>
                    <img src={image(p.image, 150)} alt={p.name} />
                    <div>
                      <strong>{p.name}</strong>
                      <small>
                        {money(p.price)} · Stok {p.stock}
                      </small>
                    </div>
                    <input
                      aria-label={`Jumlah ${p.name}`}
                      type="number"
                      min={0}
                      max={p.stock}
                      value={
                        offlineCart.find((i) => i.id === p.id)?.quantity || 0
                      }
                      onChange={(e) => {
                        const qty = Math.max(
                          0,
                          Math.min(p.stock, Number(e.target.value)),
                        )
                        setOfflineCart((prev) => [
                          ...prev.filter((i) => i.id !== p.id),
                          ...(qty ? [{ id: p.id, quantity: qty }] : []),
                        ])
                      }}
                    />
                  </div>
                ))}
            </div>
            <button
              className="btn primary full"
              disabled={!offlineCart.length}
              onClick={() => setCheckout(true)}
            >
              Lanjutkan Pembayaran ·{' '}
              {money(
                offlineCart.reduce(
                  (n, i) =>
                    n +
                    (data.products.find((p) => p.id === i.id)?.price || 0) *
                      i.quantity,
                  0,
                ),
              )}
              <ArrowUpRight size={17} />
            </button>
            <h3 className="spaced-heading">Transaksi offline terakhir</h3>
            <OrderList
              orders={offline.slice(0, 5)}
              adminMode
              refresh={refresh}
            />
          </>
        )}
        {tab === 'products' && (
          <>
            <div className="admin-filters">
              <div className="search-box">
                <Search size={17} />
                <input
                  placeholder="Cari produk…"
                  aria-label="Cari produk admin"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <span className="muted">
                {data.products.filter((p) => p.active).length} produk aktif ·{' '}
                {low.length} stok menipis
              </span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>Kategori</th>
                    <th>Harga</th>
                    <th>Stok</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products
                    .filter((p) =>
                      p.name.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="table-product">
                            <img src={image(p.image, 80)} alt="" />
                            <strong>{p.name}</strong>
                          </div>
                        </td>
                        <td>{p.category}</td>
                        <td>{money(p.price)}</td>
                        <td>
                          <span
                            className={`badge ${p.stock <= 5 ? 'pink' : 'green'}`}
                          >
                            {p.stock}
                          </span>
                        </td>
                        <td>
                          {!p.active
                            ? 'Diarsipkan'
                            : p.stock
                              ? 'Tersedia'
                              : 'Habis'}
                        </td>
                        <td>
                          <div className="button-row">
                            <button
                              className="icon-btn"
                              aria-label={`Edit ${p.name}`}
                              onClick={() => setProduct(p)}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              disabled={pending || !p.active}
                              className="icon-btn"
                              aria-label={`Hapus ${p.name}`}
                              onClick={() => void remove(p)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {tab === 'categories' && (
          <>
            <button className="btn primary" onClick={() => setCategory({})}>
              <Plus size={17} />
              Tambah Kategori
            </button>
            <div className="category-admin-grid">
              {categories.map((c) => (
                <div key={c.id}>
                  <Flower2 size={22} />
                  <strong>{c.name}</strong>
                  <button
                    className="icon-btn"
                    aria-label={`Edit ${c.name}`}
                    onClick={() => setCategory(c)}
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
        {tab === 'promos' && (
          <>
            <button
              className="btn primary"
              onClick={() => setPromo({ active: true, percent: 10 })}
            >
              <Plus size={17} />
              Buat Kode Promo
            </button>
            <div className="promo-admin-grid">
              {data.promos.map((p) => (
                <div className="promo-admin-card" key={p.code}>
                  <Tags size={25} />
                  <strong>{p.code}</strong>
                  <span>Diskon {p.percent}%</span>
                  <span className={`badge ${p.active ? 'green' : ''}`}>
                    {p.active ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <button className="btn secondary" onClick={() => setPromo(p)}>
                    <Pencil size={15} />
                    Edit Promo
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
        {tab === 'reports' && (
          <>
            <div className="admin-stats report-stats">
              {[
                ['Penjualan hari ini', todayRevenue],
                ['7 hari terakhir', weekRevenue],
                ['Penjualan bulan ini', monthRevenue],
                ['Total pendapatan', revenue],
              ].map(([n, v]) => (
                <div className="stat-card" key={n}>
                  <span>{n}</span>
                  <strong>{money(Number(v))}</strong>
                </div>
              ))}
            </div>
            <div className="admin-panels">
              <div className="admin-panel">
                <h3>Online & offline</h3>
                {[
                  ['ONLINE', online],
                  ['OFFLINE', offline],
                ].map(([label, list]) => (
                  <div className="report-line" key={String(label)}>
                    <span>
                      {String(label)}
                      <small>{(list as Order[]).length} transaksi</small>
                    </span>
                    <strong>
                      {money(
                        (list as Order[]).reduce((n, o) => n + o.total, 0),
                      )}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="admin-panel">
                <h3>Bunga paling disukai</h3>
                {best.length ? (
                  best.slice(0, 6).map(([name, count], i) => (
                    <div className="best-product" key={name}>
                      <span>{i + 1}</span>
                      <strong>{name}</strong>
                      <small>{count} terjual</small>
                    </div>
                  ))
                ) : (
                  <p className="muted">
                    Peringkat tersedia setelah transaksi pertama.
                  </p>
                )}
              </div>
            </div>
            <div className="admin-panel spaced-heading">
              <h3>Rincian seluruh penjualan</h3>
              <OrderList orders={orders} refresh={refresh} />
            </div>
          </>
        )}
        {tab === 'customers' && (
          <div className="admin-panel">
            <h3>{data.customers.length} customer terdaftar</h3>
            {data.customers.map((c) => (
              <div className="report-line" key={c.id}>
                <div className="customer-avatar">
                  {c.name.slice(0, 1).toUpperCase()}
                </div>
                <strong>{c.name}</strong>
                <span>
                  {
                    orders.filter(
                      (o) => o.customerName === c.name && o.type === 'ONLINE',
                    ).length
                  }{' '}
                  pesanan
                </span>
              </div>
            ))}
            {!data.customers.length && (
              <p className="muted">Customer yang mendaftar tampil di sini.</p>
            )}
          </div>
        )}
        {tab === 'activity' && (
          <div className="admin-panel">
            <h3>Jejak aktivitas toko</h3>
            {data.activity.map((a) => (
              <div className="activity-line" key={a.id}>
                <span className="activity-dot" />
                <div>
                  <strong>{a.message}</strong>
                  <small>
                    {a.actor} · {date(a.createdAt)}
                  </small>
                </div>
              </div>
            ))}
            {!data.activity.length && (
              <p className="muted">
                Aktivitas transaksi dan pengelolaan toko tampil di sini.
              </p>
            )}
          </div>
        )}
        {tab === 'settings' && (
          <div className="admin-panel settings-panel">
            <h3>Akun Admin</h3>
            <p className="muted">Ubah nama dan password akun pengelola toko.</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const f = new FormData(e.currentTarget)
                setPending(true)
                setError('')
                try {
                  await api('password', {
                    name: f.get('name'),
                    password: f.get('password'),
                  })
                  onAccountChange(await api('me'))
                  setMessage('Nama dan password berhasil diperbarui.')
                } catch (e) {
                  setError((e as Error).message)
                } finally {
                  setPending(false)
                }
              }}
            >
              <label>
                Username
                <input
                  name="name"
                  defaultValue={account.name}
                  required
                  minLength={2}
                  maxLength={40}
                />
              </label>
              <label>
                Password baru
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
              <button className="btn primary" disabled={pending}>
                {pending ? 'Menyimpan…' : 'Simpan Pengaturan'}
              </button>
            </form>
            <hr />
            <h3>Ekspor data toko</h3>
            <p className="muted">
              Unduh salinan produk, kategori, transaksi, customer, promo, dan
              aktivitas. Data login tidak disertakan.
            </p>
            <button
              className="btn secondary"
              onClick={() =>
                exportFile(
                  'Backup-Kenozas-Flower.json',
                  JSON.stringify(
                    {
                      exportedAt: new Date().toISOString(),
                      products: data.products,
                      categories,
                      orders,
                      customers: data.customers,
                      promos: data.promos,
                      activity: data.activity,
                    },
                    null,
                    2,
                  ),
                  'application/json',
                )
              }
            >
              <Download size={16} />
              Backup / Export Data
            </button>
          </div>
        )}
      </section>
      {product && (
        <Modal
          title={product.id ? 'Edit rangkaian bunga' : 'Rangkaian bunga baru'}
          onClose={() => setProduct(null)}
        >
          <form
            onSubmit={(e) =>
              void save(e, 'product', {
                id: product.id,
                image: product.image,
                active: product.active,
              })
            }
            className="stack-form"
          >
            <label>
              Foto produk
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  if (e.target.files?.[0]) void upload(e.target.files[0])
                }}
              />
            </label>
            {product.image && (
              <img
                className="edit-preview"
                src={image(product.image, 300)}
                alt="Preview produk"
              />
            )}
            <label>
              Atau URL foto Unsplash / Pexels
              <input
                value={product.image || ''}
                onChange={(e) =>
                  setProduct({ ...product, image: e.target.value })
                }
              />
            </label>
            <label>
              Nama bunga
              <input name="name" required defaultValue={product.name} />
            </label>
            <label>
              Deskripsi
              <textarea
                name="description"
                required
                defaultValue={product.description}
              />
            </label>
            <div className="two-col">
              <label>
                Harga
                <input
                  name="price"
                  type="number"
                  min={1}
                  required
                  defaultValue={product.price}
                />
              </label>
              <label>
                Stok
                <input
                  name="stock"
                  type="number"
                  min={0}
                  required
                  defaultValue={product.stock}
                />
              </label>
            </div>
            <label>
              Kategori
              <select name="category" defaultValue={product.category}>
                {categories.map((c) => (
                  <option key={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label>
              Label
              <input
                name="tag"
                defaultValue={product.tag}
                placeholder="Bestseller / Baru"
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={product.active !== false}
                onChange={(e) =>
                  setProduct({ ...product, active: e.target.checked })
                }
              />{' '}
              Produk aktif
            </label>
            {error && <p className="error-message">{error}</p>}
            <button className="btn primary full" disabled={pending}>
              {pending ? 'Menyimpan…' : 'Simpan Produk'}
            </button>
          </form>
        </Modal>
      )}
      {category && (
        <Modal
          title={category.id ? 'Edit kategori' : 'Tambah kategori'}
          onClose={() => setCategory(null)}
        >
          <form
            className="stack-form"
            onSubmit={(e) => void save(e, 'category', { id: category.id })}
          >
            <label>
              Nama kategori
              <input name="name" required defaultValue={category.name} />
            </label>
            {error && <p className="error-message">{error}</p>}
            <button className="btn primary" disabled={pending}>
              Simpan Kategori
            </button>
          </form>
        </Modal>
      )}
      {promo && (
        <Modal
          title={promo.code ? 'Edit promo' : 'Buat promo baru'}
          onClose={() => setPromo(null)}
        >
          <form
            className="stack-form"
            onSubmit={(e) => void save(e, 'promo', { active: promo.active })}
          >
            <label>
              Kode promo
              <input
                name="code"
                required
                minLength={3}
                defaultValue={promo.code}
                readOnly={!!promo.code}
                placeholder="BLOOM10"
              />
            </label>
            <label>
              Diskon (%)
              <input
                name="percent"
                required
                type="number"
                min={1}
                max={90}
                defaultValue={promo.percent}
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={promo.active}
                onChange={(e) =>
                  setPromo({ ...promo, active: e.target.checked })
                }
              />{' '}
              Promo aktif
            </label>
            {error && <p className="error-message">{error}</p>}
            <button className="btn primary" disabled={pending}>
              Simpan Promo
            </button>
          </form>
        </Modal>
      )}
      {checkout && (
        <Checkout
          account={account}
          items={offlineCart}
          products={data.products}
          promos={data.promos}
          offline
          onClose={() => setCheckout(false)}
          onSuccess={async (id, number) => {
            setCheckout(false)
            setOfflineCart([])
            await refresh()
            await onOrderSuccess(id, number)
          }}
        />
      )}
    </main>
  )
}
