import { randomUUID } from 'node:crypto';
import type { FastifyBaseLogger } from 'fastify';
import { log, withLog } from './log.js';
import Fastify from 'fastify';
import type { AppConfig } from './config.js';
import { registerSession } from './plugins/session.js';
import { registerCsrfProtection } from './plugins/csrf.js';
import type { SessionStore } from '@fastify/session';
import { registerErrorHandler } from './plugins/error-handler.js';

export interface AppDeps {
  sessionStore?: SessionStore;
  log?: FastifyBaseLogger;
}

export function buildApp(sha: string, config: AppConfig, deps: AppDeps = {}) {
  const app = Fastify({
    loggerInstance: deps.log ?? log,
    genReqId: () => randomUUID(),
    ajv: {
      customOptions: {
        coerceTypes: false,
        removeAdditional: false,
      },
    },
  });

  app.addHook('onRequest', (req, _reply, done) => {
    withLog(done, req.id);
  });

  registerErrorHandler(app);
  registerCsrfProtection(app, config.appOrigin);

  registerSession(app, {
    secret: config.sessionSecret,
    secureCookie: config.secureCookie,
    ...(deps.sessionStore ? { store: deps.sessionStore } : {}),
  });

  app.get('/health', async () => {
    return { status: 'ok' };
  });

  app.get('/version', async () => {
    return { sha };
  });

  return app;
}
