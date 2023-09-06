import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { BlazeError } from './error.js'
import { cleanContent } from './html.js'
import { Brave, SearchEngine } from './search/index.js'

export function init(app: FastifyInstance) {
  const engine: SearchEngine = new Brave(app.config.BRAVE_KEY)

  const SearchSchema = z.strictObject({ q: z.string().min(1) })
  app.get('/search', async (req, reply) => {
    const query = SearchSchema.safeParse(req.query)
    if (query.success) {
      const { q } = query.data
      const results = await engine.search(q)
      return reply.view('results', { results, title: `Blaze - ${q}`, needle: q })
    } else {
      throw new BlazeError(401, query.error.message)
    }
  })

  const BrowseSchema = z.strictObject({ url: z.string().url() })
  app.get('/browse', async (req, reply) => {
    const query = BrowseSchema.safeParse(req.query)
    if (query.success) {
      const { url } = query.data
      const raw = await fetch(url).then((r) => r.text())
      return reply.view('browse', { title: 'Blaze', content: cleanContent(raw, url), needle: '' })
    } else {
      throw new BlazeError(401, query.error.message)
    }
  })

  app.get('/', (req, reply) => {
    return reply.view('home', { title: 'Blaze', needle: '' })
  })
}
