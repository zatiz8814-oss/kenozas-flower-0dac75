// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { scryptSync, createHash } from 'node:crypto'
const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  listUsers: vi.fn(),
}))
vi.mock('../../db/index', () => ({
  database: () => ({ select: mocks.select, insert: mocks.insert }),
}))
vi.mock('@netlify/identity', () => ({
  getUser: vi.fn(),
  admin: {
    createUser: mocks.createUser,
    updateUser: mocks.updateUser,
    listUsers: mocks.listUsers,
  },
  AuthError: class extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))
import { AuthError } from '@netlify/identity'
import handle from '../../netlify/functions/store.mts'
const password = 'fixture-only-password'
function request(secret = password) {
  return new Request('https://flowers.example/api/store?action=bootstrap', {
    method: 'POST',
    headers: { origin: 'https://flowers.example' },
    body: JSON.stringify({ name: 'test-admin', password: secret }),
  })
}
beforeEach(() => {
  vi.resetAllMocks()
  const settings = [
    { key: 'admin_name', value: 'test-admin' },
    {
      key: 'admin_hash',
      value: `test-salt:${scryptSync(password, 'test-salt', 64).toString('hex')}`,
    },
  ]
  mocks.select.mockReturnValueOnce({ from: async () => settings })
  mocks.insert.mockReturnValue({
    values: () => ({ onConflictDoUpdate: async () => undefined }),
  })
})
it('repairs a partially provisioned Identity account after verifying the password', async () => {
  mocks.select.mockReturnValueOnce({ from: () => ({ where: async () => [] }) })
  mocks.createUser.mockRejectedValue(new AuthError('Already exists', 422))
  mocks.listUsers.mockResolvedValue([
    {
      id: 'existing-id',
      email:
        createHash('sha256').update('test-admin').digest('hex') +
        '@accounts.kenozas-flower.invalid',
    },
  ])
  mocks.updateUser.mockResolvedValue({ id: 'existing-id' })
  const response = await handle(request())
  expect(response.status).toBe(200)
  expect(mocks.updateUser).toHaveBeenCalledWith(
    'existing-id',
    expect.objectContaining({ confirm: true }),
  )
  expect(mocks.insert).toHaveBeenCalled()
})
it('repairs an existing Admin Identity password instead of skipping provisioning', async () => {
  mocks.select.mockReturnValueOnce({
    from: () => ({ where: async () => [{ id: 'existing-id' }] }),
  })
  mocks.updateUser.mockResolvedValue({ id: 'existing-id' })
  expect((await handle(request())).status).toBe(200)
  expect(mocks.updateUser).toHaveBeenCalled()
  expect(mocks.createUser).not.toHaveBeenCalled()
})
it('rejects an incorrect password before accessing Identity or granting Admin', async () => {
  expect((await handle(request('incorrect'))).status).toBe(400)
  expect(mocks.createUser).not.toHaveBeenCalled()
  expect(mocks.updateUser).not.toHaveBeenCalled()
  expect(mocks.insert).not.toHaveBeenCalled()
})
