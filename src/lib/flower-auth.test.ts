import { webcrypto } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { login, AuthError } from '@netlify/identity'
import { identityPassword, signIn } from './flower-store'

vi.mock('@netlify/identity', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  getUser: vi.fn(),
  hydrateSession: vi.fn(),
  AuthError: class extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('crypto', webcrypto)
})

describe('shopping entry', () => {
  it('starts shopping with only a name even when Identity is unavailable', async () => {
    vi.mocked(login).mockRejectedValue(new Error('Identity unavailable'))
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ id: 'guest-1', name: 'A' }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(signIn('A', '', 'login')).resolves.toEqual({
      id: 'guest-1',
      name: 'A',
    })
    expect(fetchMock.mock.calls[0][0]).toContain('action=guest')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ name: 'A' })
    expect(login).not.toHaveBeenCalled()
  })

  it('keeps existing Admin passwords compatible', async () => {
    expect(await identityPassword('example-test-password')).toBe(
      'example-test-password',
    )
  })

  it('never grants Admin access when Identity authentication fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ error: 'Nama atau password salah.' }, { status: 400 }),
      )
    vi.stubGlobal('fetch', fetchMock)
    vi.mocked(login).mockRejectedValueOnce(
      new AuthError('Invalid credentials', 400),
    )
    await expect(signIn('admin', 'wrong', 'admin')).rejects.toThrow(
      'Nama atau password salah.',
    )
    expect(fetchMock.mock.calls[0][0]).toContain('action=bootstrap')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('logs an existing Admin in even when provisioning is unavailable', async () => {
    const account = { id: 'admin-id', isAdmin: true }
    const fetchMock = vi.fn().mockResolvedValue(Response.json(account))
    vi.stubGlobal('fetch', fetchMock)
    await expect(signIn('admin', 'test-password', 'admin')).resolves.toEqual(
      account,
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain('action=me')
  })

  it('recovers provisioning and retries authentication before opening Admin', async () => {
    vi.mocked(login)
      .mockRejectedValueOnce(new AuthError('Invalid credentials', 400))
      .mockResolvedValueOnce({} as never)
    const account = { id: 'admin-id', isAdmin: true }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ ok: true }))
      .mockResolvedValueOnce(Response.json(account))
    vi.stubGlobal('fetch', fetchMock)
    await expect(signIn('admin', 'test-password', 'admin')).resolves.toEqual(
      account,
    )
    expect(login).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toContain('action=bootstrap')
  })

  it('repairs an Identity user missing its database account', async () => {
    const account = { id: 'admin-id', isAdmin: true }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ error: 'Akun tidak ditemukan.' }, { status: 401 }),
      )
      .mockResolvedValueOnce(Response.json({ ok: true }))
      .mockResolvedValueOnce(Response.json(account))
    vi.stubGlobal('fetch', fetchMock)
    await expect(signIn('admin', 'test-password', 'admin')).resolves.toEqual(
      account,
    )
    expect(fetchMock.mock.calls[1][0]).toContain('action=bootstrap')
  })
})
