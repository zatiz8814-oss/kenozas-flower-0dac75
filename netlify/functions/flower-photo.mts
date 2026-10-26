import { getStore } from '@netlify/blobs'
import type { Config, Context } from '@netlify/functions'
export default async (_req: Request, context: Context) => {
  const id = context.params.id
  if (!/^[a-f0-9]{32}$/.test(id))
    return new Response('Not found', { status: 404 })
  const result = await getStore('flower-photos').getWithMetadata(id, {
    type: 'arrayBuffer',
  })
  if (!result) return new Response('Not found', { status: 404 })
  return new Response(result.data, {
    headers: {
      'Content-Type': String(result.metadata.contentType || 'image/jpeg'),
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
export const config: Config = { path: '/api/flower-photo/:id' }
