// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  query: vi.fn(),
  release: vi.fn(),
  getUser: vi.fn(),
  createUser: vi.fn(),
}))
vi.mock('../../db/index', () => ({
  database: () => ({ select: mocks.select }),
}))
vi.mock('@netlify/database', () => ({
  getDatabase: () => ({
    pool: {
      connect: async () => ({ query: mocks.query, release: mocks.release }),
    },
  }),
}))
vi.mock('@netlify/identity', () => ({
  getUser: mocks.getUser,
  admin: { createUser: mocks.createUser },
  AuthError: class extends Error {},
}))
import handle from '../../netlify/functions/store.mts'
function request(action: string, body?: unknown, cookie?: string) {
  return new Request(`https://flowers.example/api/store?action=${action}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      origin: 'https://flowers.example',
      ...(cookie ? { cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.getUser.mockResolvedValue(null)
  mocks.query.mockImplementation(async (sql: string, values?: string[]) => ({
    rows: sql.startsWith('INSERT INTO accounts')
      ? [{ id: values?.[0], name: values?.[1], cart: [], wishlist: [] }]
      : [],
  }))
})
describe('customer shopping sessions', () => {
  it('separates identical names and stores only the session hash', async () => {
    const first = await handle(
      request('guest', { name: 'Admin', isAdmin: true }),
    )
    const second = await handle(request('guest', { name: 'Admin' }))
    expect(first.status).toBe(200)
    const a = await first.json(),
      b = await second.json()
    expect(a.isAdmin).toBe(false)
    expect(a.id).not.toBe(b.id)
    const cookie = first.headers.get('set-cookie')!
    expect(cookie).toContain('HttpOnly; SameSite=Lax')
    expect(cookie).toContain('Secure')
    const token = cookie.split(';')[0].split('=')[1]
    const insertion = mocks.query.mock.calls.find(([sql]) =>
      sql.startsWith('INSERT INTO shopping_sessions'),
    )!
    expect(insertion[1][0]).toBe(
      createHash('sha256').update(token).digest('hex'),
    )
    expect(mocks.createUser).not.toHaveBeenCalled()
  })
  it('rejects an unknown session instead of looking up a customer by name', async () => {
    mocks.select.mockReturnValue({ from: () => ({ where: async () => [] }) })
    const response = await handle(
      request('me', undefined, `kf_shopping=${'a'.repeat(64)}`),
    )
    expect(response.status).toBe(401)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
  it('blocks customer sessions from Admin data', async () => {
    mocks.select
      .mockReturnValueOnce({
        from: () => ({ where: async () => [{ accountId: 'guest-1' }] }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: async () => [{ id: 'guest-1', name: 'Admin', isAdmin: false }],
        }),
      })
    const response = await handle(
      request('admin', undefined, `kf_shopping=${'b'.repeat(64)}`),
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Akses Admin diperlukan.' })
  })
  it('rejects cross-origin session creation', async () => {
    const response = await handle(
      new Request('https://flowers.example/api/store?action=guest', {
        method: 'POST',
        headers: { origin: 'https://elsewhere.example' },
        body: JSON.stringify({ name: 'A' }),
      }),
    )
    expect(response.status).toBe(403)
    expect(mocks.query).not.toHaveBeenCalled()
  })
})
