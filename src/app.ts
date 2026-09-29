import Fastify from 'fastify';

export function buildApp(sha: string) {
  const app = Fastify({ logger: true });

  app.get('/health', async () => {
    return { status: 'ok' };
  });

  app.get('/version', async () => {
    return { sha };
  });

  return app;
}
