import { Eta } from 'eta'
import Fastify from 'fastify'
import path from 'node:path'

import { replaceLinks } from './html.js'
import { init as initRoutes } from './routes.js'
import { init as initError } from './error.js'

const app = Fastify({
  logger:
    process.env.NODE_ENV === 'production'
      ? true
      : {
          level: 'debug',
          transport: {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname,remoteAddress',
            },
          },
        },
})

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      BRAVE_KEY: string
    }
  }
}

await app
  .register(import('@fastify/compress'))
  .register(import('@fastify/etag'))
  .register(import('fastify-minify'), { global: true })
  .register(import('@fastify/view'), {
    engine: {
      eta: new Eta({ tags: ['{{', '}}'] }),
    },
    layout: 'layout',
    templates: path.resolve('templates'),
  })
  .register(import('@fastify/env'), {
    dotenv: true,
    schema: {
      type: 'object',
      required: ['BRAVE_KEY'],
      properties: {
        BRAVE_KEY: {
          type: 'string',
        },
      },
    } as any,
  })

// Redirect to blaze
app.addHook('onSend', async (req, reply, payload) => {
  if (reply.getHeader('content-type')?.toString().startsWith('text/html')) {
    return replaceLinks(payload as string)
  }
  return payload
})

initError(app)
initRoutes(app)

// START
try {
  await app.listen({ port: 8000, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
