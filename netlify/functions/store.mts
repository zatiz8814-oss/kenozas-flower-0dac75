import { quoteBouquet } from '../../src/lib/flower-custom'
import { getUser, admin, AuthError } from '@netlify/identity'
import { getDatabase } from '@netlify/database'
import { getStore } from '@netlify/blobs'
import { eq, desc, and, gt } from 'drizzle-orm'
import {
  createHash,
  scryptSync,
  timingSafeEqual,
  randomBytes,
} from 'node:crypto'
import { database } from '../../db/index'
import * as s from '../../db/schema'
import type { Config } from '@netlify/functions'
function fail(message: string): never {
  throw new Error(message)
}
function username(v: unknown) {
  const n = String(v || '')
    .trim()
    .toLowerCase()
  if (n.length < 1 || n.length > 40) fail('Nama harus 1–40 karakter.')
  return n
}
function email(n: string) {
  return `${createHash('sha256').update(n).digest('hex')}@accounts.kenozas-flower.invalid`
}
function identityPassword(password: string) {
  // Identity requires a minimum length; preserve existing passwords of 8+ characters.
  return password.length < 8
    ? `KF-short-v1:${createHash('sha256').update(password).digest('hex')}`
    : password
}
function integer(v: unknown, min = 0, max = 100000000) {
  const n = Number(v)
  if (!Number.isSafeInteger(n) || n < min || n > max) fail('Angka tidak valid.')
  return n
}
function text(v: unknown, max = 1000) {
  return String(v || '')
    .trim()
    .slice(0, max)
}
const sessionCookie = 'kf_shopping'
function sessionHash(req: Request) {
  const token = req.headers
    .get('cookie')
    ?.split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${sessionCookie}=`))
    ?.slice(sessionCookie.length + 1)
  return token && /^[a-f0-9]{64}$/.test(token)
    ? createHash('sha256').update(token).digest('hex')
    : null
}
function cookie(req: Request, value: string, maxAge: number) {
  return `${sessionCookie}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`
}
async function handleRequest(req: Request) {
  const db = database()
  const url = new URL(req.url)
  const action = url.searchParams.get('action') || 'catalog'
  try {
    if (req.method !== 'GET' && req.headers.get('origin') !== url.origin)
      return Response.json(
        { error: 'Permintaan tidak diizinkan.' },
        { status: 403 },
      )
    const readActions = ['catalog', 'me', 'orders', 'admin', 'reviews']
    if (
      !['GET', 'POST'].includes(req.method) ||
      (req.method === 'GET' && !readActions.includes(action))
    )
      return Response.json(
        { error: 'Metode tidak diizinkan.' },
        { status: 405 },
      )
    const b = req.method === 'GET' ? {} : await req.json()
    if (action === 'catalog') {
      const [products, categories, promos] = await Promise.all([
        db
          .select()
          .from(s.products)
          .where(eq(s.products.active, true))
          .orderBy(s.products.id),
        db.select().from(s.categories).orderBy(s.categories.id),
        db.select().from(s.promos).where(eq(s.promos.active, true)),
      ])
      return Response.json({ products, categories, promos })
    }
    const tokenHash = sessionHash(req)
    const [session] = tokenHash
      ? await db
          .select()
          .from(s.shoppingSessions)
          .where(
            and(
              eq(s.shoppingSessions.tokenHash, tokenHash),
              gt(s.shoppingSessions.expiresAt, new Date()),
            ),
          )
      : []
    if (action === 'guest') {
      const name = text(b.name, 41)
      if (!name || name.length > 40) fail('Nama harus 1–40 karakter.')
      if (session) {
        const [current] = await db
          .update(s.accounts)
          .set({ name })
          .where(
            and(
              eq(s.accounts.id, session.accountId),
              eq(s.accounts.isAdmin, false),
            ),
          )
          .returning()
        if (current) return Response.json(current)
      }
      const token = randomBytes(32).toString('hex')
      const id = `guest-${randomBytes(16).toString('hex')}`
      const expiresAt = new Date(Date.now() + 30 * 86400 * 1000)
      const client = await getDatabase().pool.connect()
      let account
      try {
        await client.query('BEGIN')
        const result = await client.query(
          'INSERT INTO accounts (id, name, is_admin) VALUES ($1, $2, false) RETURNING *',
          [id, name],
        )
        account = result.rows[0]
        await client.query(
          'INSERT INTO shopping_sessions (token_hash, account_id, expires_at) VALUES ($1, $2, $3)',
          [createHash('sha256').update(token).digest('hex'), id, expiresAt],
        )
        await client.query('COMMIT')
      } catch (e) {
        await client.query('ROLLBACK')
        throw e
      } finally {
        client.release()
      }
      return Response.json(
        {
          id: account.id,
          name: account.name,
          isAdmin: false,
          cart: account.cart,
          wishlist: account.wishlist,
        },
        {
          headers: {
            'Set-Cookie': cookie(req, token, 30 * 86400),
            'Cache-Control': 'no-store',
          },
        },
      )
    }
    if (action === 'leave') {
      if (tokenHash)
        await db
          .delete(s.shoppingSessions)
          .where(eq(s.shoppingSessions.tokenHash, tokenHash))
      return Response.json(
        { ok: true },
        { headers: { 'Set-Cookie': cookie(req, '', 0) } },
      )
    }
    if (action === 'register') fail('Silakan mulai belanja dengan nama saja.')
    if (action === 'bootstrap') {
      const name = username(b.name),
        password = String(b.password || '')
      if (!password.length || password.length > 128)
        fail('Password harus diisi, maksimal 128 karakter.')
      const config = await db.select().from(s.settings)
      const setting = Object.fromEntries(config.map((r) => [r.key, r.value]))
      if (name !== setting.admin_name) fail('Nama atau password salah.')
      const [salt, hash] = (setting.admin_hash || '').split(':')
      if (!salt || !hash || !/^[a-f0-9]{128}$/i.test(hash))
        fail('Pengaturan akun Admin belum tersedia.')
      if (
        !timingSafeEqual(
          scryptSync(password, salt, 64),
          Buffer.from(hash, 'hex'),
        )
      )
        fail('Nama atau password salah.')
      const [exists] = await db
        .select()
        .from(s.accounts)
        .where(and(eq(s.accounts.name, name), eq(s.accounts.isAdmin, true)))
      // The database verifier authorizes provisioning/recovery. A partial previous
      // attempt may have created Identity without creating its account row.
      let u
      try {
        if (exists) {
          try {
            u = await admin.updateUser(exists.id, {
              email: email(name),
              password: identityPassword(password),
              confirm: true,
            })
          } catch (e) {
            if (!(e instanceof AuthError) || e.status !== 404) throw e
          }
        }
        if (!u) {
          try {
            u = await admin.createUser({
              email: email(name),
              password: identityPassword(password),
              data: {
                user_metadata: { full_name: name },
                app_metadata: { roles: ['admin'] },
              },
            })
          } catch (e) {
            if (
              !(e instanceof AuthError) ||
              ![400, 422].includes(e.status || 0)
            )
              throw e
            // Search all pages: the orphan need not be among the first users.
            for (let page = 1; ; page++) {
              const users = await admin.listUsers({ page, perPage: 100 })
              const found = users.find(
                (candidate) => candidate.email === email(name),
              )
              if (found) {
                u = await admin.updateUser(found.id, {
                  password: identityPassword(password),
                  confirm: true,
                })
                break
              }
              if (users.length < 100) throw e
            }
          }
        }
      } catch {
        fail(
          'Layanan login Admin belum tersedia. Silakan coba kembali sebentar lagi.',
        )
      }
      if (!u) fail('Akun Admin belum dapat disiapkan.')
      await db
        .insert(s.accounts)
        .values({ id: u.id, name, isAdmin: true })
        .onConflictDoUpdate({
          target: s.accounts.id,
          set: { name, isAdmin: true },
        })
      return Response.json({ ok: true })
    }
    const identityUser = await getUser()
    const user = identityUser || (session ? { id: session.accountId } : null)
    if (!user)
      return Response.json(
        { error: 'Silakan login terlebih dahulu.' },
        { status: 401 },
      )
    const [account] = await db
      .select()
      .from(s.accounts)
      .where(eq(s.accounts.id, user.id))
    if (!account)
      return Response.json({ error: 'Akun tidak ditemukan.' }, { status: 401 })
    const requireAdmin = () => {
      if (!account.isAdmin) fail('Akses Admin diperlukan.')
    }
    const log = async (message: string) => {
      await db.insert(s.activity).values({ actor: account.name, message })
    }
    if (action === 'me') return Response.json(account)
    if (action === 'state') {
      await db
        .update(s.accounts)
        .set({
          cart: Array.isArray(b.cart) ? b.cart.slice(0, 100) : [],
          wishlist: Array.isArray(b.wishlist)
            ? b.wishlist
                .filter((v: unknown) => Number.isSafeInteger(v))
                .slice(0, 500)
            : [],
        })
        .where(eq(s.accounts.id, user.id))
      return Response.json({ ok: true })
    }
    if (action === 'orders') {
      const orders = account.isAdmin
        ? await db.select().from(s.orders).orderBy(desc(s.orders.id))
        : await db
            .select()
            .from(s.orders)
            .where(eq(s.orders.customerId, user.id))
            .orderBy(desc(s.orders.id))
      const items = account.isAdmin
        ? await db.select().from(s.orderItems)
        : await db
            .select({
              id: s.orderItems.id,
              orderId: s.orderItems.orderId,
              productId: s.orderItems.productId,
              name: s.orderItems.name,
              quantity: s.orderItems.quantity,
              price: s.orderItems.price,
            })
            .from(s.orderItems)
            .innerJoin(s.orders, eq(s.orderItems.orderId, s.orders.id))
            .where(eq(s.orders.customerId, user.id))
      return Response.json(
        orders.map((o) => ({
          ...o,
          number: `KF-${String(o.id).padStart(3, '0')}`,
          items: items.filter((i) => i.orderId === o.id),
        })),
      )
    }
    if (action === 'checkout') {
      const offline = b.type === 'OFFLINE'
      if (offline) requireAdmin()
      const fulfillment = offline
        ? 'Ambil di toko'
        : b.fulfillment === 'Online'
          ? 'Online'
          : 'Ambil di toko'
      const address = text(b.address, 1500)
      if (fulfillment === 'Online' && address.length < 10)
        fail('Lengkapi alamat rumah, minimal 10 karakter.')
      const customerName = offline ? text(b.customerName, 80) : account.name
      if (!customerName) fail('Nama pelanggan diperlukan.')
      const payment = text(b.payment)
      if (!['Cash', 'Transfer', 'E-wallet', 'QRIS', 'COD'].includes(payment))
        fail('Pilih metode pembayaran.')
      if (!Array.isArray(b.items) || !b.items.length || b.items.length > 100)
        fail('Keranjang masih kosong.')
      const grouped = new Map<number, number>()
      for (const item of b.items) {
        const id = integer(item.id, 1),
          qty = integer(item.quantity, 1, 999)
        if (grouped.has(id))
          fail('Produk duplikat. Gabungkan jumlah sebelum checkout.')
        quoteBouquet(item.custom)
        grouped.set(id, qty)
      }
      const key = text(b.requestKey, 100)
      if (!key || key.length < 16) fail('Silakan ulangi checkout.')
      const client = await getDatabase().pool.connect()
      try {
        await client.query('BEGIN')
        // Serialize identical retries before stock locks; the unique key also protects concurrent requests.
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key])
        const previous = await client.query(
          'SELECT id, customer_id FROM orders WHERE request_key=$1',
          [key],
        )
        if (previous.rows.length) {
          if (previous.rows[0].customer_id !== user.id)
            fail('Permintaan tidak valid.')
          await client.query('COMMIT')
          return Response.json({
            id: previous.rows[0].id,
            number: `KF-${String(previous.rows[0].id).padStart(3, '0')}`,
          })
        }
        const lines = []
        let subtotal = 0
        for (const [id, quantity] of [...grouped.entries()].sort(
          (a, c) => a[0] - c[0],
        )) {
          const result = await client.query(
            'SELECT * FROM products WHERE id=$1 FOR UPDATE',
            [id],
          )
          const p = result.rows[0]
          if (!p || !p.active) fail('Produk tidak tersedia.')
          if (p.stock < quantity) fail(`Stok ${p.name} tidak mencukupi.`)
          const custom = quoteBouquet(
            b.items.find((i: { id: number }) => Number(i.id) === id)?.custom,
          )
          const basePrice = offline
            ? integer(
                b.items.find((i: { id: number }) => Number(i.id) === id)
                  ?.price ?? p.price,
                1,
              )
            : p.price
          const price = basePrice + custom.total
          subtotal += price * quantity
          lines.push({
            id,
            name: p.name + (custom.detail ? ` — Custom: ${custom.detail}` : ''),
            price,
            quantity,
          })
        }
        let discount = 0
        if (b.promo) {
          const promo = await client.query(
            'SELECT * FROM promos WHERE code=$1 AND active=true FOR SHARE',
            [text(b.promo, 40).toUpperCase()],
          )
          if (!promo.rows.length)
            fail('Kode promo tidak aktif atau tidak ditemukan.')
          discount = Math.floor((subtotal * promo.rows[0].percent) / 100)
        }
        const saved = await client.query(
          `INSERT INTO orders (customer_id,customer_name,type,fulfillment,address,courier_note,note,payment,payment_status,status,subtotal,discount,total,request_key) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Lunas',$9,$10,$11,$12,$13) RETURNING id`,
          [
            user.id,
            customerName,
            offline ? 'OFFLINE' : 'ONLINE',
            fulfillment,
            address,
            text(b.courierNote),
            text(b.note),
            payment,
            'Selesai',
            subtotal,
            discount,
            subtotal - discount,
            key,
          ],
        )
        const id = saved.rows[0].id,
          number = `KF-${String(id).padStart(3, '0')}`
        for (const line of lines) {
          await client.query('UPDATE products SET stock=stock-$1 WHERE id=$2', [
            line.quantity,
            line.id,
          ])
          await client.query(
            'INSERT INTO order_items (order_id,product_id,name,quantity,price) VALUES ($1,$2,$3,$4,$5)',
            [id, line.id, line.name, line.quantity, line.price],
          )
        }
        await client.query(
          'INSERT INTO invoices (order_id,number) VALUES ($1,$2)',
          [id, number],
        )
        if (!offline)
          await client.query(
            "UPDATE accounts SET cart='[]'::jsonb WHERE id=$1",
            [user.id],
          )
        await client.query(
          'INSERT INTO activity (actor,message) VALUES ($1,$2)',
          [
            account.name,
            `${offline ? 'Transaksi offline' : 'Pesanan online'} ${number} dibuat; pembayaran tercatat lunas.`,
          ],
        )
        await client.query('COMMIT')
        return Response.json({ id, number })
      } catch (e) {
        await client.query('ROLLBACK')
        throw e
      } finally {
        client.release()
      }
    }
    if (action === 'status') {
      requireAdmin()
      const id = integer(b.id, 1)
      const [o] = await db.select().from(s.orders).where(eq(s.orders.id, id))
      if (!o) fail('Pesanan tidak ditemukan.')
      if (b.status !== 'Selesai')
        fail('Pesanan langsung berhasil dengan status Selesai.')
      await db
        .update(s.orders)
        .set({ status: b.status, updatedAt: new Date() })
        .where(and(eq(s.orders.id, id), eq(s.orders.status, o.status)))
      await log(`Status KF-${String(id).padStart(3, '0')} → ${b.status}`)
      return Response.json({ ok: true })
    }
    if (action === 'admin') {
      requireAdmin()
      const [products, customers, activity, promos] = await Promise.all([
        db.select().from(s.products).orderBy(s.products.id),
        db
          .select({ id: s.accounts.id, name: s.accounts.name })
          .from(s.accounts)
          .where(eq(s.accounts.isAdmin, false)),
        db.select().from(s.activity).orderBy(desc(s.activity.id)).limit(200),
        db.select().from(s.promos),
      ])
      return Response.json({ products, customers, activity, promos })
    }
    if (action === 'product') {
      requireAdmin()
      const values = {
        name: text(b.name, 120),
        description: text(b.description, 2000),
        price: integer(b.price, 1),
        stock: integer(b.stock),
        category: text(b.category, 80),
        image: text(b.image, 2000),
        tag: text(b.tag, 30),
        active: b.active !== false,
      }
      if (!values.name || !values.category || !values.image)
        fail('Lengkapi nama, kategori, dan foto produk.')
      if (
        !/^\/(img|api\/flower-photo)\//.test(values.image) &&
        !/^https:\/\/(images\.unsplash\.com|images\.pexels\.com)\//.test(
          values.image,
        )
      )
        fail('Gunakan foto upload atau URL foto Unsplash/Pexels.')
      if (b.id)
        await db
          .update(s.products)
          .set(values)
          .where(eq(s.products.id, integer(b.id, 1)))
      else await db.insert(s.products).values(values)
      await log(`Produk ${values.name} disimpan`)
      return Response.json({ ok: true })
    }
    if (action === 'delete-product') {
      requireAdmin()
      await db
        .update(s.products)
        .set({ active: false })
        .where(eq(s.products.id, integer(b.id, 1)))
      await log(`Produk #${b.id} diarsipkan`)
      return Response.json({ ok: true })
    }
    if (action === 'category') {
      requireAdmin()
      const name = text(b.name, 80)
      if (!name) fail('Nama kategori diperlukan.')
      if (b.id) {
        const [old] = await db
          .select()
          .from(s.categories)
          .where(eq(s.categories.id, integer(b.id, 1)))
        await db
          .update(s.categories)
          .set({ name })
          .where(eq(s.categories.id, b.id))
        if (old)
          await db
            .update(s.products)
            .set({ category: name })
            .where(eq(s.products.category, old.name))
      } else
        await db.insert(s.categories).values({ name }).onConflictDoNothing()
      await log(`Kategori ${name} disimpan`)
      return Response.json({ ok: true })
    }
    if (action === 'promo') {
      requireAdmin()
      const code = text(b.code, 40).toUpperCase()
      if (!/^[A-Z0-9_-]{3,40}$/.test(code))
        fail('Kode promo harus 3–40 huruf/angka.')
      await db
        .insert(s.promos)
        .values({
          code,
          percent: integer(b.percent, 1, 90),
          active: !!b.active,
        })
        .onConflictDoUpdate({
          target: s.promos.code,
          set: { percent: integer(b.percent, 1, 90), active: !!b.active },
        })
      await log(`Promo ${code} diperbarui`)
      return Response.json({ ok: true })
    }
    if (action === 'upload') {
      requireAdmin()
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(b.mime))
        fail('Gunakan JPG, PNG, atau WebP.')
      const bytes = Buffer.from(String(b.data || ''), 'base64')
      if (bytes.length > 3 * 1024 * 1024) fail('Foto maksimal 3 MB.')
      const id = randomBytes(16).toString('hex')
      await getStore('flower-photos').set(id, bytes, {
        metadata: { contentType: b.mime },
      })
      return Response.json({ url: `/api/flower-photo/${id}` })
    }
    if (action === 'profile') {
      if (account.isAdmin) fail('Gunakan pengaturan Admin.')
      const name = text(b.name, 41)
      if (!name || name.length > 40) fail('Nama harus 1–40 karakter.')
      await db
        .update(s.accounts)
        .set({ name })
        .where(eq(s.accounts.id, user.id))
      return Response.json({ ok: true })
    }
    if (action === 'password') {
      if (!identityUser) fail('Akses Admin diperlukan.')
      const password = String(b.password || '')
      if (!password.length || password.length > 128)
        fail('Password harus diisi, maksimal 128 karakter.')
      const name = b.name ? username(b.name) : account.name
      if (!account.isAdmin) {
        const [reserved] = await db
          .select()
          .from(s.settings)
          .where(eq(s.settings.key, 'admin_name'))
        if (name === reserved?.value) fail('Nama ini tidak tersedia.')
      }
      if (name !== account.name) {
        const [used] = await db
          .select()
          .from(s.accounts)
          .where(eq(s.accounts.name, name))
        if (used) fail('Nama sudah digunakan.')
      }
      await admin.updateUser(user.id, {
        password: identityPassword(password),
        email: email(name),
        user_metadata: { full_name: name },
      })
      await db
        .update(s.accounts)
        .set({ name })
        .where(eq(s.accounts.id, user.id))
      if (account.isAdmin) {
        const salt = randomBytes(16).toString('hex')
        await db
          .update(s.settings)
          .set({ value: name })
          .where(eq(s.settings.key, 'admin_name'))
        await db
          .update(s.settings)
          .set({
            value: `${salt}:${scryptSync(password, salt, 64).toString('hex')}`,
          })
          .where(eq(s.settings.key, 'admin_hash'))
        await log('Pengaturan akun Admin diperbarui')
      }
      return Response.json({ ok: true })
    }
    if (action === 'reviews') {
      if (req.method === 'GET')
        return Response.json(
          await db
            .select({
              id: s.reviews.id,
              name: s.accounts.name,
              rating: s.reviews.rating,
              comment: s.reviews.comment,
              productId: s.reviews.productId,
            })
            .from(s.reviews)
            .innerJoin(s.accounts, eq(s.reviews.customerId, s.accounts.id))
            .where(
              eq(
                s.reviews.productId,
                integer(url.searchParams.get('product'), 1),
              ),
            ),
        )
      const productId = integer(b.productId, 1)
      const bought = await db
        .select({ id: s.orderItems.id })
        .from(s.orderItems)
        .innerJoin(s.orders, eq(s.orderItems.orderId, s.orders.id))
        .where(
          and(
            eq(s.orders.customerId, user.id),
            eq(s.orderItems.productId, productId),
            eq(s.orders.status, 'Selesai'),
          ),
        )
      if (!bought.length)
        fail('Ulasan tersedia setelah pesanan produk selesai.')
      const comment = text(b.comment, 500)
      if (!comment) fail('Tulis ulasan terlebih dahulu.')
      await db.insert(s.reviews).values({
        customerId: user.id,
        productId,
        rating: integer(b.rating, 1, 5),
        comment,
      })
      return Response.json({ ok: true })
    }
    return Response.json({ error: 'Menu tidak ditemukan.' }, { status: 404 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Permintaan gagal.'
    const safe =
      /Nama|nama|Password|password|Stok|stok|Produk|produk|Pesanan|pesanan|Silakan|Silah|Kode|promo|Pilih|Lengkapi|Angka|alamat|Akun|akun|Kategori|kategori|Status|Status|Foto|foto|Gunakan|Gunakan|URL|Ulasan|ulasan|Keranjang|Permintaan|Permintaan|Akses|Tulis/.test(
        message,
      ) && message.length < 220
    return Response.json(
      {
        error: safe
          ? message
          : 'Layanan belum dapat memproses permintaan. Silakan coba kembali.',
      },
      { status: 400 },
    )
  }
}
export const config: Config = { path: '/api/store' }

export default async (req: Request) => {
  const response = await handleRequest(req)
  response.headers.set('Cache-Control', 'no-store')
  return response
}
