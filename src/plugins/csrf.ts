import type { FastifyInstance } from 'fastify';

export function registerCsrfProtection(
  app: FastifyInstance,
  allowedOrigin: string,
): void {
  app.addHook('onRequest', async (request, reply) => {
    if (request.method !== 'POST') {
      return;
    }
    if (request.headers.origin !== allowedOrigin) {
      return reply.status(403).send({
        error: {
          code: 'CSRF_ORIGIN_REJECTED',
          message: 'Request origin is not allowed.',
        },
      });
    }
  });
}
