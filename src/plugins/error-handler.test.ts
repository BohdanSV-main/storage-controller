import { expect, test } from 'vitest';
import { Prisma } from '../generated/prisma/client.js';
import { buildApp } from '../app.js';
import { registerAuthRoutes } from '../modules/auth/auth.routes.js';
import type { Session } from 'fastify';

const config = {
  sessionSecret: 'test-only-secret-with-at-least-32-characters',
  appOrigin: 'http://localhost:3000',
  secureCookie: false,
};
const unavailable = {
  error: {
    code: 'SERVICE_UNAVAILABLE',
    message: 'Required storage is temporarily unavailable.',
  },
};

function databaseError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(
    'Internal SQL and connection details',
    {
      code,
      clientVersion: '7.10.1',
    },
  );
}

test.each([
  new Prisma.PrismaClientInitializationError(
    'Internal connection details',
    '7.10.1',
    'P1001',
  ),
  ...['DatabaseNotReachable', 'ConnectionClosed', 'SocketTimeout'].map((kind) =>
    Object.assign(new Error('Internal adapter details', { cause: { kind } }), {
      name: 'DriverAdapterError',
    }),
  ),
])(
  'handles connection failures outside regular Prisma queries',
  async (error) => {
    const app = buildApp('test', config);
    app.get('/failure', async () => {
      throw error;
    });
    try {
      const response = await app.inject('/failure');
      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual(unavailable);
    } finally {
      await app.close();
    }
  },
);

test('preserves HTTP client errors', async () => {
  const app = buildApp('test', config);
  app.post('/json', async () => ({ ok: true }));
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/json',
      headers: { origin: config.appOrigin, 'content-type': 'application/json' },
      payload: '{invalid',
    });
    expect(response.statusCode).toBe(400);
  } finally {
    await app.close();
  }
});

test.each(['P1001', 'P1002', 'P1008', 'P1017', 'P2024', 'P2034', 'P2037'])(
  'returns a safe 503 for %s and serves the next request after recovery',
  async (code) => {
    const app = buildApp('test', config);
    let failing = true;
    app.get('/storage-check', async () => {
      if (failing) throw databaseError(code);
      return { ok: true };
    });
    try {
      const failed = await app.inject('/storage-check');
      expect(failed.statusCode).toBe(503);
      expect(failed.json()).toEqual(unavailable);
      failing = false;
      expect((await app.inject('/storage-check')).json()).toEqual({ ok: true });
    } finally {
      await app.close();
    }
  },
);

test.each([
  new Error('Internal secret'),
  databaseError('P2002'),
  databaseError('P2028'),
])(
  'does not classify unrelated failures as storage unavailability',
  async (error) => {
    const app = buildApp('test', config);
    app.get('/failure', async () => {
      throw error;
    });
    try {
      const response = await app.inject('/failure');
      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error.' },
      });
    } finally {
      await app.close();
    }
  },
);

test.each(['get', 'set', 'destroy'] as const)(
  'returns 503 when session %s fails and recovers without losing the stored session',
  async (operation) => {
    const sessions = new Map<string, Session>();
    let failing: string | undefined;
    const app = buildApp('test', config, {
      sessionStore: {
        get(id, callback) {
          if (failing === 'get') return callback(databaseError('P1001'));
          callback(null, sessions.get(id) ?? null);
        },
        set(id, session, callback) {
          if (failing === 'set') return callback(databaseError('P1001'));
          sessions.set(id, session);
          callback();
        },
        destroy(id, callback) {
          if (failing === 'destroy') return callback(databaseError('P1001'));
          sessions.delete(id);
          callback();
        },
      },
    });
    const user = {
      id: 1,
      name: 'Test',
      email: 'test@example.com',
      role: 'USER' as const,
    };
    registerAuthRoutes(app, {
      authenticate: async () => user,
      findUserById: async () => user,
    });
    const login = () =>
      app.inject({
        method: 'POST',
        url: '/auth/login',
        headers: { origin: config.appOrigin },
        payload: { email: user.email, password: 'password' },
      });
    try {
      const loggedIn = await login();
      expect(loggedIn.statusCode).toBe(200);
      const cookie = loggedIn.cookies.find(
        (cookie) => cookie.name === 'sessionId',
      );
      expect(cookie).toBeDefined();
      const cookies = { sessionId: cookie!.value };
      failing = operation;
      const failed =
        operation === 'set'
          ? await login()
          : await app.inject({
              method: operation === 'get' ? 'GET' : 'POST',
              url: operation === 'get' ? '/auth/me' : '/auth/logout',
              headers: { origin: config.appOrigin },
              cookies,
            });
      expect(failed.statusCode).toBe(503);
      expect(failed.json()).toEqual(unavailable);
      failing = undefined;
      expect((await app.inject({ url: '/auth/me', cookies })).statusCode).toBe(
        200,
      );
    } finally {
      await app.close();
    }
  },
);
