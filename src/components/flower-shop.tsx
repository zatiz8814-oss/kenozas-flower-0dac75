import FlowerHelp from './flower-help'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Flower2,
  Search,
  Heart,
  ShoppingBag,
  UserRound,
  ArrowRight,
  ArrowUpRight,
  Truck,
  Store,
  ShieldCheck,
  Leaf,
  Check,
  Plus,
  Minus,
  Trash2,
  Package,
  Bell,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  Star,
  Sparkles,
  X,
  LogOut,
  Menu,
  Gift,
  Download,
  CheckCircle2,
} from 'lucide-react'
import {
  api,
  restore,
  signIn,
  signOut,
  money,
  image,
  initialProducts,
  initialCategories,
  soundEnabled,
  unlockSound,
  playSound,
  downloadInvoice,
  whatsappUrl,
} from '@/lib/flower-store'
import type {
  Account,
  Product,
  Category,
  Promo,
  CartLine,
  Order,
} from '@/lib/flower-store'
import { Modal } from './flower-modal'
import Checkout from './flower-checkout'
import FlowerAdmin from './flower-admin'
import { OrderList, OrderDetail } from './flower-orders'
function Logo() {
  return (
    <div className="logo">
      <div className="logo-mark">
        <Flower2 size={34} strokeWidth={1.2} />
      </div>
      <div>
        <span>Kenoza’s Flower</span>
        <small>FLOWERS, LOVE & LITTLE JOYS</small>
      </div>
    </div>
  )
}
type Notice = { title: string; description: string; order?: Order }
export default function FlowerShop() {
  const [view, setView] = useState('shop'),
    [products, setProducts] = useState<Product[]>(initialProducts),
    [categories, setCategories] = useState<Category[]>(initialCategories),
    [promos, setPromos] = useState<Promo[]>([]),
    [account, setAccount] = useState<Account | null>(null),
    [cart, setCart] = useState<CartLine[]>([]),
    [wishlist, setWishlist] = useState<number[]>([]),
    [orders, setOrders] = useState<Order[]>([]),
    [search, setSearch] = useState(''),
    [category, setCategory] = useState('Semua Bunga'),
    [sort, setSort] = useState('Pilihan untukmu'),
    [tab, setTab] = useState('populer'),
    [maxPrice, setMaxPrice] = useState(1000000),
    [availableOnly, setAvailableOnly] = useState(false),
    [filters, setFilters] = useState(false),
    [auth, setAuth] = useState<string | null>(null),
    [cartOpen, setCartOpen] = useState(false),
    [checkout, setCheckout] = useState(false),
    [fulfillment, setFulfillment] = useState('Online'),
    [detail, setDetail] = useState<Product | null>(null),
    [notice, setNotice] = useState<Notice | null>(null),
    [success, setSuccess] = useState<{ id: number; number: string } | null>(
      null,
    ),
    [invoice, setInvoice] = useState<Order | null>(null),
    [sound, setSound] = useState(true),
    [toast, setToast] = useState(''),
    [mobileMenu, setMobileMenu] = useState(false),
    [error, setError] = useState(''),
    [catalogReady, setCatalogReady] = useState(false),
    [notifications, setNotifications] = useState(false)
  const baseline = useRef<Map<number, string> | null>(null),
    stateQueue = useRef<Promise<unknown>>(Promise.resolve()),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    stateVersion = useRef(0)
  const announce = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 3300)
  }, [])
  const loadCatalog = useCallback(async () => {
    try {
      const r = await api('catalog')
      setProducts(r.products)
      setCategories(r.categories)
      setPromos(r.promos)
      setCatalogReady(true)
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])
  const loadOrders = useCallback(
    async (notify = false) => {
      if (!account) return
      const list: Order[] = await api('orders')
      if (notify && baseline.current) {
        const changed = list.find((o) =>
          account.isAdmin
            ? !baseline.current!.has(o.id)
            : baseline.current!.has(o.id) &&
              baseline.current!.get(o.id) !== o.status,
        )
        if (changed) {
          const title = account.isAdmin
            ? 'Pesanan baru masuk!'
            : changed.status === 'Selesai'
              ? 'Pesananmu selesai!'
              : 'Kabar baik untuk bungamu!'
          setNotice({
            title,
            description: `${changed.number} · ${changed.customerName} · ${changed.status}`,
            order: changed,
          })
          playSound(
            true,
            account.isAdmin
              ? 'Pesanan baru masuk. Pembayaran berhasil.'
              : `Pesanan ${changed.status}. Terima kasih.`,
          )
        }
      }
      baseline.current = new Map(list.map((o) => [o.id, o.status]))
      setOrders(list)
    },
    [account],
  )
  useEffect(() => {
    void loadCatalog()
    void restore()
      .then((a) => {
        if (a) {
          setAccount(a)
          setCart(a.cart || [])
          setWishlist(a.wishlist || [])
          if (window.location.hash === '#admin' && a.isAdmin) {
            setAuth(null)
            setView('admin')
          }
        }
      })
      .catch(() => {})
    const saved = localStorage.getItem('kf-sound')
    if (saved === 'off') {
      setSound(false)
      soundEnabled(false)
    }
    const hash = window.location.hash.slice(1)
    if (hash === 'admin') setAuth('admin')
    else if (['orders', 'profile', 'wishlist'].includes(hash)) setView(hash)
    const unlock = () => unlockSound()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [loadCatalog])
  useEffect(() => {
    baseline.current = null
    if (!account) return
    void loadOrders().catch(() => {})
    const id = setInterval(() => {
      void loadOrders(true).catch(() => {})
      void loadCatalog()
    }, 7000)
    return () => clearInterval(id)
  }, [account, loadOrders, loadCatalog])
  function navigate(next: string) {
    setView(next)
    setMobileMenu(false)
    window.history.replaceState(null, '', next === 'shop' ? '/' : `/#${next}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function persist(nextCart: CartLine[], nextWishlist: number[]) {
    if (!account) return
    const version = ++stateVersion.current
    stateQueue.current = stateQueue.current
      .catch(() => {})
      .then(() => api('state', { cart: nextCart, wishlist: nextWishlist }))
    void stateQueue.current.catch((e) => {
      if (version === stateVersion.current) announce(e.message)
    })
  }
  function setCartSaved(next: CartLine[]) {
    setCart(next)
    persist(next, wishlist)
  }
  function toggleWish(id: number) {
    if (!account) {
      setAuth('login')
      return
    }
    const next = wishlist.includes(id)
      ? wishlist.filter((v) => v !== id)
      : [...wishlist, id]
    setWishlist(next)
    persist(cart, next)
    playSound()
    announce(
      next.includes(id)
        ? 'Disimpan di bunga favoritmu.'
        : 'Dihapus dari wishlist.',
    )
  }
  function add(p: Product, buy = false) {
    if (!catalogReady) {
      announce('Katalog sedang dihubungkan. Coba kembali sebentar lagi.')
      void loadCatalog()
      return
    }
    if (!account) {
      setAuth('login')
      return
    }
    const existing = cart.find((i) => i.id === p.id)
    if ((existing?.quantity || 0) >= p.stock) {
      announce('Jumlah melebihi stok tersedia.')
      return
    }
    const next = [
      ...cart.filter((i) => i.id !== p.id),
      { id: p.id, quantity: (existing?.quantity || 0) + 1 },
    ]
    setCartSaved(next)
    playSound()
    if (buy) {
      setDetail(null)
      setCheckout(true)
    } else announce(`${p.name} masuk ke keranjang.`)
  }
  function quantity(id: number, change: number) {
    const p = products.find((p) => p.id === id)
    const next = cart
      .map((i) =>
        i.id === id
          ? { ...i, quantity: Math.min(p?.stock || 0, i.quantity + change) }
          : i,
      )
      .filter((i) => i.quantity > 0)
    setCartSaved(next)
    playSound()
  }
  async function refresh() {
    await Promise.all([loadCatalog(), loadOrders()])
  }
  async function orderSuccess(id: number, number: string) {
    setCheckout(false)
    setCartOpen(false)
    if (!account?.isAdmin) setCart([])
    setSuccess({ id, number })
    await refresh()
  }
  async function logout() {
    await stateQueue.current.catch(() => {})
    await signOut()
    setAccount(null)
    setCart([])
    setWishlist([])
    setOrders([])
    navigate('shop')
    announce('Sampai jumpa, semoga harimu berbunga!')
  }
  const subtotal = cart.reduce(
      (n, i) =>
        n + (products.find((p) => p.id === i.id)?.price || 0) * i.quantity,
      0,
    ),
    cartCount = cart.reduce((n, i) => n + i.quantity, 0)
  let shown = products.filter(
    (p) =>
      p.active &&
      (category === 'Semua Bunga' || p.category === category) &&
      `${p.name} ${p.category} ${p.description}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      p.price <= maxPrice &&
      (!availableOnly || p.stock > 0) &&
      (view !== 'wishlist' || wishlist.includes(p.id)),
  )
  if (sort === 'Harga terendah')
    shown = [...shown].sort((a, b) => a.price - b.price)
  else if (sort === 'Harga tertinggi')
    shown = [...shown].sort((a, b) => b.price - a.price)
  else if (sort === 'Terbaru' || tab === 'terbaru')
    shown = [...shown].sort((a, b) => b.id - a.id)
  else if (tab === 'populer')
    shown = [...shown].sort(
      (a, b) => Number(!!b.tag) - Number(!!a.tag) || a.id - b.id,
    )
  const selectedOrder = success
    ? orders.find((o) => o.id === success.id)
    : undefined
  function shopNow(c = 'Semua Bunga') {
    setCategory(c)
    setView('shop')
    setTimeout(
      () =>
        document
          .getElementById('koleksi')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      50,
    )
  }
  const categoryImages: Record<string, string> = {
    Mawar: '/img/rose.jpg',
    Tulip: '/img/tulip.jpg',
    Lily: '/img/lily.jpg',
    Sunflower: '/img/sunflower.jpg',
    Bouquet: '/img/pink-bouquet.jpg',
    Hampers: '/img/hero.png',
    'Bunga Meja': '/img/lily.jpg',
    'Bunga Wisuda': '/img/pink-bouquet.jpg',
    'Bunga Ulang Tahun': '/img/rose.jpg',
  }
  return (
    <div className="site-shell">
      <div className="announcement">
        <Flower2 size={13} />
        <span>
          Sedikit bunga, sejuta bahagia.{' '}
          <strong>Diskon 10% dengan kode BLOOM10</strong>
        </span>
        <Flower2 size={13} />
      </div>
      <header className="site-header">
        <div className="header-main container">
          <button
            className="logo-button"
            onClick={() => navigate('shop')}
            aria-label="Kenoza’s Flower beranda"
          >
            <Logo />
          </button>
          <form
            className="header-search"
            onSubmit={(e) => {
              e.preventDefault()
              shopNow()
            }}
          >
            <Search size={18} />
            <input
              aria-label="Cari bunga"
              placeholder="Cari bunga untuk orang tersayang…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setView('shop')
              }}
            />
            <button
              type="submit"
              className="search-submit"
              aria-label="Cari bunga"
            >
              <ArrowRight size={14} />
            </button>
          </form>
          <div className="header-actions">
            <button
              className={`sound-toggle ${sound ? 'on' : ''}`}
              onClick={() => {
                const next = !sound
                setSound(next)
                soundEnabled(next)
                localStorage.setItem('kf-sound', next ? 'on' : 'off')
                if (next) playSound()
              }}
              aria-label={`Suara ${sound ? 'ON' : 'OFF'}`}
            >
              {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>Suara {sound ? 'ON' : 'OFF'}</span>
            </button>
            <button
              className={`icon-btn ${view === 'wishlist' ? 'active' : ''}`}
              aria-label="Wishlist"
              onClick={() =>
                account ? navigate('wishlist') : setAuth('login')
              }
            >
              <Heart size={21} />
              {wishlist.length > 0 && (
                <span className="tiny-count">{wishlist.length}</span>
              )}
            </button>
            <button
              className="icon-btn bell-button"
              aria-label="Notifikasi pesanan"
              onClick={() =>
                account ? setNotifications(true) : setAuth('login')
              }
            >
              <Bell size={20} />
              {orders.length > 0 && <span className="notify-dot" />}
            </button>
            <button
              className="icon-btn cart-button"
              aria-label={`Keranjang ${cartCount} produk`}
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag size={21} />
              <span className="cart-count">{cartCount}</span>
            </button>
            <span className="header-divider" />
            <button
              className="account-button"
              onClick={() =>
                account
                  ? navigate(account.isAdmin ? 'admin' : 'profile')
                  : setAuth('login')
              }
            >
              <UserRound size={19} />
              <span>{account ? account.name : 'Mulai Belanja'}</span>
            </button>
            <button
              className="icon-btn mobile-menu-btn"
              aria-label="Menu"
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              {mobileMenu ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        <div className={`nav-wrap ${mobileMenu ? 'mobile-open' : ''}`}>
          <nav className="main-nav container">
            <div className="nav-links">
              <button
                className={
                  view === 'shop' && category === 'Semua Bunga' ? 'active' : ''
                }
                onClick={() => navigate('shop')}
              >
                Beranda
              </button>
              <button onClick={() => shopNow()}>Koleksi Bunga</button>
              <button onClick={() => shopNow('Bouquet')}>Bouquet</button>
              <button onClick={() => shopNow('Hampers')}>
                Hadiah & Hampers
              </button>
              <button
                onClick={() => {
                  navigate('shop')
                  setTimeout(
                    () =>
                      document
                        .getElementById('promo')
                        ?.scrollIntoView({ behavior: 'smooth' }),
                    50,
                  )
                }}
              >
                Promo <span className="nav-promo">Spesial</span>
              </button>
              <button
                className={view === 'orders' ? 'active' : ''}
                onClick={() =>
                  account ? navigate('orders') : setAuth('login')
                }
              >
                Pesanan Saya
              </button>
              <button
                className="mobile-only-nav"
                onClick={() =>
                  account ? navigate('wishlist') : setAuth('login')
                }
              >
                Wishlist
              </button>
              <button
                className="mobile-only-nav"
                onClick={() =>
                  account ? navigate('profile') : setAuth('login')
                }
              >
                Profil Saya
              </button>
              <button
                className="mobile-only-nav"
                onClick={() =>
                  account?.isAdmin ? navigate('admin') : setAuth('admin')
                }
              >
                Ruang Admin
              </button>
            </div>
            <button
              className="nav-store"
              onClick={() => {
                setFulfillment('Ambil di toko')
                if (cart.length) setCheckout(true)
                else {
                  shopNow()
                  announce(
                    'Pilih bunga favoritmu, lalu ambil langsung di toko.',
                  )
                }
              }}
            >
              <Store size={15} />
              Ambil di toko
              <ArrowUpRight size={13} />
            </button>
          </nav>
        </div>
      </header>
      {view === 'admin' && account?.isAdmin ? (
        <FlowerAdmin
          account={account}
          orders={orders}
          categories={categories}
          onRefresh={refresh}
          onOrderSuccess={orderSuccess}
          onAccountChange={setAccount}
          onLogout={logout}
        />
      ) : view === 'orders' ? (
        <main className="container interior-page">
          <div className="section-heading">
            <div>
              <span className="eyebrow">SETIAP PESANAN PUNYA CERITA</span>
              <h1>Pesanan Saya</h1>
              <p>
                Pantau perjalanan bunga pilihanmu, dari dirangkai hingga tiba.
              </p>
            </div>
            <button className="btn secondary" onClick={() => shopNow()}>
              Kembali Belanja <ArrowRight size={16} />
            </button>
          </div>
          {account ? (
            <OrderList orders={orders} refresh={refresh} />
          ) : (
            <div className="empty-state">
              <UserRound size={40} />
              <h3>Cerita bungamu ada di sini</h3>
              <p>Masuk untuk melihat dan mengunduh invoice pesanan.</p>
              <button className="btn primary" onClick={() => setAuth('login')}>
                Masuk ke Akun
              </button>
            </div>
          )}
        </main>
      ) : view === 'profile' ? (
        <main className="container interior-page">
          <div className="section-heading">
            <div>
              <span className="eyebrow">RUANG KECIL MILIKMU</span>
              <h1>Profil Customer</h1>
            </div>
          </div>
          {account ? (
            <div className="profile-layout">
              <div className="profile-card">
                <div className="profile-avatar">
                  {account.name.slice(0, 1).toUpperCase()}
                </div>
                <h2>{account.name}</h2>
                <span className="badge pink">
                  {account.isAdmin ? 'Admin Kenoza’s Flower' : 'Flower lover'}
                </span>
                <div className="profile-stats">
                  <span>
                    <strong>{orders.length}</strong>Pesanan
                  </span>
                  <span>
                    <strong>{wishlist.length}</strong>Favorit
                  </span>
                </div>
                <button
                  className="btn secondary full"
                  onClick={() => navigate('orders')}
                >
                  <Package size={17} />
                  Pesanan Saya
                </button>
                <button
                  className="btn secondary full"
                  onClick={() => void logout()}
                >
                  <LogOut size={17} />
                  Logout
                </button>
              </div>
              <ProfileForm account={account} onSave={setAccount} />
            </div>
          ) : (
            <button className="btn primary" onClick={() => setAuth('login')}>
              Masuk ke Akun
            </button>
          )}
        </main>
      ) : (
        <main>
          {view !== 'wishlist' && (
            <>
              <section className="hero-section container">
                <div className="hero">
                  <div className="hero-copy">
                    <span className="hero-eyebrow">
                      <span /> DIRANGKAI DENGAN CINTA, UNTUKMU
                    </span>
                    <h1>
                      Ada bunga,
                      <br />
                      ada <em>bahagia.</em>
                      <span className="hero-sparkle">✧</span>
                    </h1>
                    <p>
                      Untuk momen istimewa, ucapan sederhana,
                      <br className="desktop-break" /> atau sekadar membuat hari
                      lebih berwarna. Bunga cantik dengan harga terjangkau.
                    </p>
                    <div className="hero-buttons">
                      <button className="btn primary" onClick={() => shopNow()}>
                        Temukan Bungamu
                        <ArrowRight size={17} />
                      </button>
                      <button
                        className="hero-secondary"
                        onClick={() => {
                          setFulfillment('Ambil di toko')
                          shopNow()
                          announce(
                            'Pilih bunga, lalu pilih Ambil di toko saat checkout.',
                          )
                        }}
                      >
                        <Store size={17} />
                        Ambil di Toko
                      </button>
                    </div>
                    <div className="hero-footnote">
                      <div className="petal-icons">
                        <Flower2 size={16} />
                        <Flower2 size={16} />
                        <Flower2 size={16} />
                      </div>
                      <span>Bunga segar. Senyum yang tulus.</span>
                    </div>
                  </div>
                  <div className="hero-visual">
                    <img
                      src={image('/img/hero.png', 1100)}
                      alt="Bouquet mawar pink pastel dengan pita satin, dirangkai penuh cinta"
                      fetchPriority="high"
                    />
                    <span className="visual-outline" />
                    <div className="hero-flower-icon">
                      <Flower2 size={44} strokeWidth={1} />
                    </div>
                    <div className="hero-note">
                      <span className="note-icon">
                        <Heart size={20} />
                      </span>
                      <div>
                        Made with love<small>Setiap kelopak, penuh makna</small>
                      </div>
                    </div>
                    <div className="hero-seal">
                      FRESH FLOWERS
                      <Flower2 size={27} strokeWidth={1.2} />
                      <span>HAPPY HEARTS</span>
                    </div>
                  </div>
                </div>
              </section>
              <section className="benefits container">
                <div>
                  <div className="benefit-icon">
                    <Flower2 size={25} strokeWidth={1.4} />
                  </div>
                  <span>
                    <strong>Bunga Segar Pilihan</strong>
                    <small>Cantik & dirawat sepenuh hati</small>
                  </span>
                </div>
                <div>
                  <div className="benefit-icon">
                    <Truck size={25} strokeWidth={1.4} />
                  </div>
                  <span>
                    <strong>Kirim atau Ambil di Toko</strong>
                    <small>Sesuaikan dengan kebutuhanmu</small>
                  </span>
                </div>
                <div>
                  <div className="benefit-icon">
                    <Gift size={25} strokeWidth={1.4} />
                  </div>
                  <span>
                    <strong>Harga Ramah di Kantong</strong>
                    <small>Pilihan bunga untuk setiap anggaran</small>
                  </span>
                </div>
                <div>
                  <div className="benefit-icon">
                    <ShieldCheck size={25} strokeWidth={1.4} />
                  </div>
                  <span>
                    <strong>Belanja Mudah & Aman</strong>
                    <small>Pesan langsung, tanpa ribet</small>
                  </span>
                </div>
              </section>
              <section className="category-section container">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">PILIH YANG PALING BERMAKNA</span>
                    <h2>
                      Bunga untuk setiap cerita
                      <span className="heading-flower">✧</span>
                    </h2>
                  </div>
                  <button className="text-btn" onClick={() => shopNow()}>
                    Semua kategori
                    <ArrowRight size={16} />
                  </button>
                </div>
                <div className="category-list">
                  {categories.slice(0, 7).map((c, i) => (
                    <button
                      key={c.id}
                      className={`category-item ${category === c.name ? 'selected' : ''}`}
                      onClick={() => shopNow(c.name)}
                    >
                      <div className={`category-photo category-${i}`}>
                        <img
                          src={image(
                            categoryImages[c.name] || '/img/hero.png',
                            240,
                          )}
                          alt={c.name}
                          loading="lazy"
                        />
                      </div>
                      <span>{c.name}</span>
                    </button>
                  ))}
                  <button
                    className="category-item more-category"
                    onClick={() => {
                      setFilters(true)
                      shopNow()
                    }}
                  >
                    <div className="category-photo">
                      <Flower2 size={39} strokeWidth={1.2} />
                      <Plus size={17} />
                    </div>
                    <span>Lainnya</span>
                  </button>
                </div>
              </section>
            </>
          )}
          <section
            className={`collection-section container ${view === 'wishlist' ? 'wishlist-page' : ''}`}
            id="koleksi"
          >
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  {view === 'wishlist'
                    ? 'DISIMPAN DENGAN HATI'
                    : 'DARI HATI, UNTUK YANG BERARTI'}
                </span>
                <h2>
                  {view === 'wishlist'
                    ? 'Bunga favoritmu'
                    : 'Rangkaian pilihan untukmu'}
                  <span className="heading-flower">✧</span>
                </h2>
                <p>
                  {view === 'wishlist'
                    ? 'Rangkaian yang membuatmu jatuh hati.'
                    : 'Bunga-bunga cantik yang siap menemani momen spesialmu.'}
                </p>
              </div>
              {view === 'wishlist' ? (
                <button className="text-btn" onClick={() => navigate('shop')}>
                  Jelajahi koleksi <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  className="text-btn"
                  onClick={() => {
                    setCategory('Semua Bunga')
                    setTab('semua')
                    setMaxPrice(1000000)
                    setSearch('')
                  }}
                >
                  Lihat semua bunga
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
            <div className="collection-search">
              <Search size={17} />
              <input
                aria-label="Cari koleksi bunga"
                placeholder="Cari bunga favoritmu…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  aria-label="Hapus pencarian"
                  onClick={() => setSearch('')}
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <div className="collection-toolbar">
              <div className="product-tabs">
                <button
                  className={tab === 'populer' ? 'active' : ''}
                  onClick={() => setTab('populer')}
                >
                  <Sparkles size={15} />
                  Paling Populer
                </button>
                <button
                  className={tab === 'terbaru' ? 'active' : ''}
                  onClick={() => setTab('terbaru')}
                >
                  Koleksi Terbaru
                </button>
                <button
                  className={tab === 'semua' ? 'active' : ''}
                  onClick={() => {
                    setTab('semua')
                    setCategory('Semua Bunga')
                  }}
                >
                  Semua Bunga
                </button>
              </div>
              <div className="sort-filter">
                <button
                  className={`filter-button ${filters ? 'active' : ''}`}
                  onClick={() => setFilters(!filters)}
                >
                  <SlidersHorizontal size={15} />
                  Filter
                </button>
                <select
                  value={sort}
                  aria-label="Urutkan bunga"
                  onChange={(e) => setSort(e.target.value)}
                >
                  {[
                    'Pilihan untukmu',
                    'Harga terendah',
                    'Harga tertinggi',
                    'Terbaru',
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            {filters && (
              <div className="filter-panel">
                <label>
                  Kategori
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {['Semua Bunga', ...categories.map((c) => c.name)].map(
                      (c) => (
                        <option key={c}>{c}</option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  Harga maksimal
                  <select
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                  >
                    <option value={1000000}>Semua harga</option>
                    <option value={200000}>Rp200.000</option>
                    <option value={250000}>Rp250.000</option>
                    <option value={300000}>Rp300.000</option>
                  </select>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(e) => setAvailableOnly(e.target.checked)}
                  />{' '}
                  Hanya yang tersedia
                </label>
                <button
                  className="text-btn"
                  onClick={() => {
                    setCategory('Semua Bunga')
                    setSearch('')
                    setMaxPrice(1000000)
                    setAvailableOnly(false)
                  }}
                >
                  Reset filter
                </button>
              </div>
            )}
            {category !== 'Semua Bunga' && (
              <button
                className="selected-filter"
                onClick={() => setCategory('Semua Bunga')}
              >
                {category}
                <X size={13} />
              </button>
            )}
            {error && (
              <div className="catalog-error">
                <span>{error}</span>
                <button className="text-btn" onClick={() => void loadCatalog()}>
                  Coba lagi
                </button>
              </div>
            )}
            <div className="product-grid">
              {shown
                .slice(
                  0,
                  tab === 'semua' ||
                    search ||
                    category !== 'Semua Bunga' ||
                    view === 'wishlist'
                    ? 100
                    : 4,
                )
                .map((p) => (
                  <article className="product-card" key={p.id}>
                    <div className="product-photo">
                      <button
                        className="product-photo-button"
                        onClick={() => setDetail(p)}
                      >
                        <img
                          src={image(p.image, 600)}
                          alt={p.name}
                          loading="lazy"
                        />
                      </button>
                      {p.tag && (
                        <span
                          className={`product-tag ${p.tag === 'Baru' ? 'new-tag' : ''}`}
                        >
                          {p.tag === 'Bestseller' && <Sparkles size={11} />}{' '}
                          {p.tag}
                        </span>
                      )}
                      <button
                        className={`wishlist-btn ${wishlist.includes(p.id) ? 'saved' : ''}`}
                        aria-label={`${wishlist.includes(p.id) ? 'Hapus' : 'Simpan'} ${p.name} di wishlist`}
                        onClick={() => toggleWish(p.id)}
                      >
                        <Heart
                          size={18}
                          fill={
                            wishlist.includes(p.id) ? 'currentColor' : 'none'
                          }
                          strokeWidth={1.5}
                        />
                      </button>
                      {p.stock === 0 && (
                        <span className="sold-out">Sedang habis</span>
                      )}
                    </div>
                    <div className="product-info">
                      <div className="product-category">
                        {p.category}
                        <span>
                          <Leaf size={11} />
                          Fresh flowers
                        </span>
                      </div>
                      <button
                        className="product-name"
                        onClick={() => setDetail(p)}
                      >
                        <h3>{p.name}</h3>
                      </button>
                      <p>{p.description}</p>
                      <div className="product-price-row">
                        <div>
                          <strong>{money(p.price)}</strong>
                          <small>
                            <span
                              className={
                                p.stock ? 'stock-dot' : 'stock-dot empty'
                              }
                            />
                            {p.stock ? 'Tersedia' : 'Stok habis'}
                          </small>
                        </div>
                        <button
                          className="add-cart-btn"
                          disabled={!p.stock}
                          onClick={() => add(p)}
                          aria-label={`Tambah ${p.name} ke Keranjang`}
                        >
                          <ShoppingBag size={17} />
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
            </div>
            {!shown.length && (
              <div className="empty-state">
                <Flower2 size={45} />
                <h3>
                  {view === 'wishlist'
                    ? 'Belum ada bunga favorit'
                    : 'Bunganya belum ditemukan'}
                </h3>
                <p>
                  {view === 'wishlist'
                    ? 'Sentuh ikon hati pada bunga yang kamu sukai.'
                    : 'Coba kata kunci atau kategori lainnya.'}
                </p>
                <button
                  className="btn secondary"
                  onClick={() => {
                    setSearch('')
                    setCategory('Semua Bunga')
                    setMaxPrice(1000000)
                    if (view === 'wishlist') navigate('shop')
                  }}
                >
                  Jelajahi Semua Bunga
                </button>
              </div>
            )}
            {tab !== 'semua' && shown.length > 4 && (
              <div className="collection-more">
                <button
                  className="btn secondary"
                  onClick={() => setTab('semua')}
                >
                  Masih ada bunga cantik lainnya
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </section>
          {view !== 'wishlist' && (
            <>
              <section id="promo" className="promo-section container">
                <div className="promo-banner">
                  <div className="promo-art">
                    <Flower2 size={145} strokeWidth={0.55} />
                    <Leaf size={85} strokeWidth={0.65} />
                  </div>
                  <div className="promo-copy">
                    <span className="eyebrow">LITTLE TREAT, LOTS OF LOVE</span>
                    <h2>
                      Bikin harimu lebih <em>berbunga.</em>
                    </h2>
                    <p>
                      Hemat 10% untuk rangkaian bunga favoritmu.
                      <br />
                      Karena berbagi bahagia selalu punya alasan.
                    </p>
                    <button
                      className="btn primary"
                      onClick={() => {
                        shopNow()
                        announce(
                          'Gunakan kode BLOOM10 saat checkout untuk diskon 10%.',
                        )
                      }}
                    >
                      Belanja Sekarang <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="promo-ticket">
                    <span>HADIAH MANIS UNTUKMU</span>
                    <strong>
                      10<small>%</small>
                    </strong>
                    <span>OFF YOUR FLOWERS</span>
                    <div className="promo-code">BLOOM10</div>
                    <small>Masukkan kode saat checkout</small>
                  </div>
                  <Flower2
                    className="promo-corner"
                    size={90}
                    strokeWidth={0.7}
                  />
                </div>
              </section>
              <section className="story-section container">
                <div className="story-illustration">
                  <Flower2 size={56} strokeWidth={1} />
                  <span>
                    with love,
                    <br />
                    <em>Kenoza’s</em>
                  </span>
                </div>
                <div>
                  <span className="eyebrow">LEBIH DARI SEKADAR BUNGA</span>
                  <h2>Perasaan indah, dalam setiap kelopak.</h2>
                  <p>
                    Di Kenoza’s Flower, kami percaya hal kecil bisa berarti
                    begitu besar. Setiap rangkaian kami siapkan dengan hati,
                    untuk membantumu merayakan cinta, syukur, dan semua cerita
                    di antaranya.
                  </p>
                </div>
                <div className="story-callout">
                  <Heart size={23} strokeWidth={1.2} />
                  <p>
                    Dirangkai dengan cinta.
                    <br />
                    Diberikan dengan makna.
                  </p>
                </div>
              </section>
            </>
          )}
        </main>
      )}
      <FlowerHelp orders={orders} />
      <footer>
        <div className="footer-main container">
          <div>
            <Logo />
            <p>
              Untuk setiap rasa yang tak selalu
              <br />
              bisa diungkapkan dengan kata.
            </p>
          </div>
          <div>
            <h4>Jelajahi Kenoza’s</h4>
            <button onClick={() => shopNow()}>Koleksi Bunga</button>
            <button onClick={() => shopNow('Hampers')}>Hadiah & Hampers</button>
            <button
              onClick={() => (account ? navigate('orders') : setAuth('login'))}
            >
              Pesanan Saya
            </button>
          </div>
          <div>
            <h4>Hubungi & ikuti kami</h4>
            <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer">
              WhatsApp · 081542327838
            </a>
            <a
              href="https://www.instagram.com/kenozas.flower/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram · @kenozas.flower
            </a>
            <a
              href="https://www.tiktok.com/@kenozasflower"
              target="_blank"
              rel="noopener noreferrer"
            >
              TikTok · @kenozasflower
            </a>
            <small>Chat opsional, pesanan langsung berhasil.</small>
            <span>
              <Truck size={14} />
              OFFLINE: beli langsung, dicatat kasir
            </span>
            <span>
              <Store size={14} />
              ONLINE: pesan di web, kirim / ambil di toko
            </span>
            <span>
              <CreditCardIcon />
              Pembayaran langsung berhasil
            </span>
          </div>
          <div className="footer-note">
            <Flower2 size={28} strokeWidth={1.2} />
            <h4>Let love bloom.</h4>
            <p>
              Sedikit bunga untuk
              <br />
              bahagia yang lebih lama.
            </p>
            <button
              className="admin-link"
              onClick={() =>
                account?.isAdmin ? navigate('admin') : setAuth('admin')
              }
            >
              Ruang Admin <ArrowUpRight size={12} />
            </button>
          </div>
        </div>
        <div className="footer-bottom container">
          <span>
            © {new Date().getFullYear()} Kenoza’s Flower. Made with love.
          </span>
          <span>
            Bunga segar, hati yang hangat <Heart size={12} />
          </span>
        </div>
      </footer>
      {toast && (
        <div className="cart-toast" role="status">
          <span>
            <Check size={17} />
          </span>
          {toast}
          <button aria-label="Tutup notifikasi" onClick={() => setToast('')}>
            <X size={14} />
          </button>
        </div>
      )}
      {auth && (
        <AuthModal
          mode={auth}
          setMode={setAuth}
          onClose={() => setAuth(null)}
          onSuccess={(a) => {
            setAccount(a)
            setCart(a.cart || [])
            setWishlist(a.wishlist || [])
            setAuth(null)
            if (a.isAdmin) navigate('admin')
            else if (['orders', 'profile', 'wishlist'].includes(view))
              navigate(view)
            playSound()
            announce(`Selamat datang, ${a.name}!`)
          }}
        />
      )}
      {cartOpen && (
        <Modal
          title="Keranjang bahagiamu"
          description={`${cartCount} rangkaian · Siap berbagi senyum`}
          onClose={() => setCartOpen(false)}
        >
          <div className="cart-lines">
            {cart.length ? (
              cart.map((i) => {
                const p = products.find((p) => p.id === i.id)
                return p ? (
                  <div className="cart-line" key={i.id}>
                    <img src={image(p.image, 160)} alt={p.name} />
                    <div className="cart-line-info">
                      <strong>{p.name}</strong>
                      <small>{money(p.price)}</small>
                      <div className="quantity-control">
                        <button
                          aria-label={`Kurangi ${p.name}`}
                          onClick={() => quantity(i.id, -1)}
                        >
                          <Minus size={13} />
                        </button>
                        <span>{i.quantity}</span>
                        <button
                          aria-label={`Tambah ${p.name}`}
                          onClick={() => quantity(i.id, 1)}
                          disabled={i.quantity >= p.stock}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="cart-line-end">
                      <strong>{money(p.price * i.quantity)}</strong>
                      <button
                        className="icon-btn"
                        aria-label={`Hapus ${p.name}`}
                        onClick={() =>
                          setCartSaved(cart.filter((line) => line.id !== i.id))
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ) : null
              })
            ) : (
              <div className="empty-state">
                <ShoppingBag size={42} />
                <h3>Masih ada ruang untuk bunga</h3>
                <p>Yuk, pilih rangkaian favoritmu dulu.</p>
                <button
                  className="btn primary"
                  onClick={() => {
                    setCartOpen(false)
                    shopNow()
                  }}
                >
                  Pilih Bunga <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>
          {cart.length > 0 && (
            <>
              <div className="cart-subtotal">
                <span>Subtotal</span>
                <strong>{money(subtotal)}</strong>
              </div>
              <button
                className="btn primary full"
                onClick={() => {
                  if (!account) {
                    setCartOpen(false)
                    setAuth('login')
                  } else {
                    setCartOpen(false)
                    setCheckout(true)
                  }
                }}
              >
                Lanjut Checkout
                <ArrowRight size={17} />
              </button>
              <p className="fine-print centered">
                Kode promo bisa digunakan saat checkout.
              </p>
            </>
          )}
        </Modal>
      )}
      {checkout && account && (
        <Checkout
          account={account}
          items={cart}
          products={products}
          promos={promos}
          initialFulfillment={fulfillment}
          beforeSubmit={async () => {
            await stateQueue.current.catch(() => {})
          }}
          onClose={() => setCheckout(false)}
          onSuccess={orderSuccess}
        />
      )}
      {detail && (
        <ProductDetail
          product={detail}
          saved={wishlist.includes(detail.id)}
          onClose={() => setDetail(null)}
          add={(buy) => add(detail, buy)}
          wish={() => toggleWish(detail.id)}
          loggedIn={!!account}
        />
      )}
      {success && (
        <Modal
          title="Pesanan berhasil!"
          description="Terima kasih sudah berbagi bahagia bersama Kenoza’s Flower."
          onClose={() => setSuccess(null)}
        >
          <div className="order-success">
            <div className="success-flower">
              <Flower2 size={54} strokeWidth={1.1} />
              <span>
                <Check size={19} />
              </span>
            </div>
            <span className="eyebrow">TERIMA KASIH SUDAH BERBAGI BAHAGIA</span>
            <p>Nomor Pesanan</p>
            <strong className="order-number">{success.number}</strong>
            <div className="success-badges">
              <span className="badge green">
                <CheckCircle2 size={14} />
                Pembayaran Berhasil
              </span>
              <span className="badge pink">
                {selectedOrder?.status || 'Selesai'}
              </span>
            </div>
            <p className="muted">
              Pesanan sudah tersimpan dan diterima toko.
              <br />
              Langsung berhasil, tanpa menunggu konfirmasi Admin.
            </p>
            <a
              className="btn secondary full"
              href={whatsappUrl(success.number)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Chat WhatsApp (opsional)
            </a>
            <button
              className="btn primary full"
              onClick={() => {
                setSuccess(null)
                navigate(account?.isAdmin ? 'admin' : 'orders')
              }}
            >
              Lihat Pesanan <ArrowRight size={16} />
            </button>
            <button
              className="btn secondary full"
              disabled={!selectedOrder}
              onClick={() =>
                selectedOrder && void downloadInvoice(selectedOrder)
              }
            >
              <Download size={16} />
              Download Invoice
            </button>
            <button
              className="text-btn"
              onClick={() => {
                setSuccess(null)
                navigate('shop')
              }}
            >
              Kembali Belanja
            </button>
          </div>
        </Modal>
      )}
      {notice && (
        <Modal
          title={notice.title}
          description={notice.description}
          onClose={() => setNotice(null)}
        >
          <div className="order-success">
            <div className="success-flower">
              <Bell size={44} />
            </div>
            <h3>{notice.order?.number}</h3>
            <p>
              {notice.order?.items
                .map((i) => `${i.quantity} × ${i.name}`)
                .join(', ')}
            </p>
            <strong>{notice.order && money(notice.order.total)}</strong>
            <span className="badge green">
              Pembayaran {notice.order?.paymentStatus}
            </span>
            <button
              className="btn primary full"
              onClick={() => {
                if (notice.order) setInvoice(notice.order)
                setNotice(null)
              }}
            >
              Lihat Detail Pesanan
              <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
      {invoice && (
        <OrderDetail
          order={orders.find((o) => o.id === invoice.id) || invoice}
          onClose={() => setInvoice(null)}
        />
      )}
      {notifications && (
        <Modal
          title="Kabar dari Kenoza’s"
          description="Pembaruan pesanan tersinkron otomatis setiap beberapa detik."
          onClose={() => setNotifications(false)}
        >
          {orders.length ? (
            orders.slice(0, 8).map((o) => (
              <button
                className="notification-item"
                key={o.id}
                onClick={() => {
                  setInvoice(o)
                  setNotifications(false)
                }}
              >
                <span className="notification-icon">
                  <Package size={19} />
                </span>
                <span>
                  <strong>
                    {o.number} · {o.status}
                  </strong>
                  <small>
                    {o.customerName} · {money(o.total)} · Pembayaran{' '}
                    {o.paymentStatus}
                  </small>
                </span>
                <ArrowRight size={15} />
              </button>
            ))
          ) : (
            <div className="empty-state">
              <Bell size={35} />
              <h3>Belum ada kabar baru</h3>
              <p>Kabar bunga pilihanmu akan muncul di sini.</p>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
function CreditCardIcon() {
  return <ShieldCheck size={14} />
}
function AuthModal({
  mode,
  setMode,
  onClose,
  onSuccess,
}: {
  mode: string
  setMode: (mode: string) => void
  onClose: () => void
  onSuccess: (a: Account) => void
}) {
  const [error, setError] = useState(''),
    [pending, setPending] = useState(false)
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setPending(true)
    const f = new FormData(e.currentTarget)
    try {
      onSuccess(
        await signIn(String(f.get('name')), String(f.get('password')), mode),
      )
    } catch (e) {
      const message = (e as Error).message
      setError(
        /invalid|credentials|confirmed/i.test(message)
          ? 'Nama atau password salah. Silakan coba kembali.'
          : message,
      )
    } finally {
      setPending(false)
    }
  }
  return (
    <Modal
      title={mode === 'admin' ? 'Ruang Admin' : 'Mulai belanja'}
      description={
        mode === 'admin'
          ? 'Masuk untuk merawat bunga dan mengelola toko.'
          : 'Ketik namamu dan langsung belanja. Tanpa password atau pendaftaran.'
      }
      onClose={onClose}
    >
      <div className="auth-logo">
        <Flower2 size={36} strokeWidth={1.1} />
      </div>
      <form className="stack-form" onSubmit={submit}>
        <label>
          {mode === 'admin' ? 'Username Admin' : 'Nama kamu'}
          <input
            name="name"
            required
            minLength={1}
            maxLength={40}
            autoComplete="username"
            placeholder="Nama pilihanmu"
          />
        </label>
        {mode === 'admin' && (
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minLength={1}
              autoComplete="current-password"
              maxLength={128}
              placeholder="Password pilihanmu"
            />
          </label>
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <button className="btn primary full" disabled={pending}>
          {pending
            ? 'Memproses…'
            : mode === 'register'
              ? 'Buat Akun'
              : mode === 'admin'
                ? 'Masuk ke Dashboard'
                : 'Masuk & Mulai Belanja'}
          <ArrowRight size={17} />
        </button>
      </form>
      <p className="fine-print centered">
        {mode === 'admin'
          ? 'Khusus pengelola toko.'
          : 'Pesanan tersimpan untuk sesi di browser ini. Setelah keluar atau menghapus data browser, kamu memulai sesi belanja baru.'}
      </p>
      {mode !== 'admin' && (
        <button className="text-btn centered" onClick={() => setMode('admin')}>
          Masuk sebagai Admin <ArrowUpRight size={13} />
        </button>
      )}
    </Modal>
  )
}
function ProfileForm({
  account,
  onSave,
}: {
  account: Account
  onSave: (a: Account) => void
}) {
  const [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [pending, setPending] = useState(false)
  return (
    <div className="profile-settings">
      <h3>Rawat akunmu</h3>
      <p className="muted">
        {account.isAdmin
          ? 'Simpan nama dan password baru yang mudah kamu ingat.'
          : 'Ubah nama yang digunakan untuk berbelanja.'}
      </p>
      <form
        className="stack-form"
        onSubmit={async (e) => {
          e.preventDefault()
          const f = new FormData(e.currentTarget)
          setPending(true)
          setError('')
          try {
            await api(account.isAdmin ? 'password' : 'profile', {
              name: f.get('name'),
              password: f.get('password'),
            })
            onSave(await api('me'))
            setSuccess('Profil berhasil diperbarui.')
          } catch (e) {
            setError((e as Error).message)
          } finally {
            setPending(false)
          }
        }}
      >
        <label>
          Nama akun
          <input
            name="name"
            defaultValue={account.name}
            required
            minLength={1}
            maxLength={40}
          />
        </label>
        {account.isAdmin && (
          <label>
            Password baru
            <input
              name="password"
              type="password"
              required
              minLength={1}
              autoComplete="new-password"
            />
          </label>
        )}
        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}
        <button className="btn primary" disabled={pending}>
          {pending ? 'Menyimpan…' : 'Simpan Perubahan'}
        </button>
      </form>
    </div>
  )
}
function ProductDetail({
  product: p,
  onClose,
  add,
  wish,
  saved,
  loggedIn,
}: {
  product: Product
  onClose: () => void
  add: (buy: boolean) => void
  wish: () => void
  saved: boolean
  loggedIn: boolean
}) {
  const [reviews, setReviews] = useState<
      { id: number; name: string; rating: number; comment: string }[]
    >([]),
    [error, setError] = useState(''),
    [reviewForm, setReviewForm] = useState(false),
    [pending, setPending] = useState(false)
  useEffect(() => {
    if (loggedIn)
      void api(`reviews&product=${p.id}`)
        .then(setReviews)
        .catch(() => {})
  }, [loggedIn, p.id])
  return (
    <Modal
      title={p.name}
      description={`${p.category} · Dirangkai segar untukmu`}
      onClose={onClose}
      wide
    >
      <div className="product-detail">
        <img className="detail-image" src={image(p.image, 700)} alt={p.name} />
        <div>
          <span className="badge pink">{p.tag || p.category}</span>
          <h2>{p.name}</h2>
          <strong className="detail-price">{money(p.price)}</strong>
          <p>{p.description}</p>
          <p className="stock-info">
            <span className="stock-dot" />
            {p.stock > 0
              ? `${p.stock} rangkaian tersedia`
              : 'Stok sedang habis'}
          </p>
          <p className="detail-care">
            <Leaf size={17} /> Bunga segar pilihan, dirangkai dengan tangan.
            Warna dan bentuk dapat sedikit berbeda mengikuti keindahan alaminya.
          </p>
          <button
            className="btn primary full"
            disabled={!p.stock}
            onClick={() => add(true)}
          >
            Beli Sekarang <ArrowRight size={16} />
          </button>
          <div className="button-row">
            <button
              className="btn secondary grow"
              disabled={!p.stock}
              onClick={() => add(false)}
            >
              <ShoppingBag size={17} />
              Tambah ke Keranjang
            </button>
            <button
              className={`btn secondary ${saved ? 'saved' : ''}`}
              onClick={wish}
              aria-label="Simpan di wishlist"
            >
              <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </div>
      <div className="reviews-section">
        <div className="panel-heading">
          <h3>
            Ulasan bunga ini{' '}
            {reviews.length > 0 && <small>({reviews.length})</small>}
          </h3>
          <button
            className="text-btn"
            onClick={() => setReviewForm(!reviewForm)}
          >
            <Star size={15} />
            Tulis ulasan
          </button>
        </div>
        {reviews.map((r) => (
          <div className="review-card" key={r.id}>
            <strong>{r.name}</strong>
            <span aria-label={`${r.rating} dari 5 bintang`}>
              {Array.from({ length: r.rating }, (_, i) => (
                <Star key={i} size={13} fill="currentColor" />
              ))}
            </span>
            <p>{r.comment}</p>
          </div>
        ))}
        {!reviews.length && (
          <p className="muted">
            Belum ada ulasan. Bagikan ceritamu setelah pesanan selesai.
          </p>
        )}
        {reviewForm && (
          <form
            className="stack-form"
            onSubmit={async (e) => {
              e.preventDefault()
              const f = new FormData(e.currentTarget)
              setPending(true)
              setError('')
              try {
                await api('reviews', {
                  productId: p.id,
                  rating: f.get('rating'),
                  comment: f.get('comment'),
                })
                setReviews(await api(`reviews&product=${p.id}`))
                setReviewForm(false)
              } catch (e) {
                setError((e as Error).message)
              } finally {
                setPending(false)
              }
            }}
          >
            <label>
              Rating
              <select name="rating">
                {[5, 4, 3, 2, 1].map((v) => (
                  <option key={v} value={v}>
                    {v} bintang
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ceritamu
              <textarea
                name="comment"
                required
                maxLength={500}
                placeholder="Bagaimana rangkaian bunganya?"
              />
            </label>
            {error && <p className="error-message">{error}</p>}
            <button className="btn primary" disabled={pending}>
              {pending ? 'Mengirim…' : 'Kirim Ulasan'}
            </button>
          </form>
        )}
      </div>
    </Modal>
  )
}
