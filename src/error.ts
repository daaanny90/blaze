import type { FastifyInstance } from 'fastify'

export class BlazeError extends Error {
  constructor(public code: number, message: string) {
    super(message)
  }
}

export function init(app: FastifyInstance) {
  app.setErrorHandler((err, req, reply) => {
    let code = 500
    let message = 'Internal server error'
    if (err instanceof BlazeError) {
      code = err.code
      message = err.message
    } else {
      req.log.error(err)
    }
    return reply.code(code).view('error', { title: 'Error', code, message })
  })
}
