import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';
import { fileURLToPath } from 'node:url';

export function registerFrontend(app: FastifyInstance) {
  const root = fileURLToPath(new URL('../../frontend/dist/', import.meta.url));
  app.register(fastifyStatic, { root, prefix: '/app/', wildcard: false });
  app.get('/', (_req, reply) => reply.redirect('/app/'));
  app.get('/app/*', (req, reply) => {
    if (
      !req.headers.accept?.includes('text/html') ||
      req.url.startsWith('/app/assets/')
    ) {
      return reply.callNotFound();
    }
    return reply.sendFile('index.html', root);
  });
}
