import { expect, test } from 'vitest';
import { buildApp } from './app.js';

const testConfig = {
  sessionSecret: 'test-only-secret-with-at-least-32-characters',
  appOrigin: 'http://localhost:3000',
  secureCookie: false,
};

test('GET /health returns status ok', async () => {
  const app = buildApp('test-version', testConfig);

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  } finally {
    await app.close();
  }
});

test('GET /version returns the supplied commit SHA', async () => {
  const sha = '0123456789abcdef0123456789abcdef01234567';
  const app = buildApp(sha, testConfig);

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/version',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ sha });
  } finally {
    await app.close();
  }
});

test.each([
  { name: 'missing Origin', origin: undefined },
  { name: 'null Origin', origin: 'null' },
  { name: 'foreign origin', origin: 'https://foreign.example' },
  { name: 'different port', origin: 'http://localhost:3001' },
  { name: 'different protocol', origin: 'https://localhost:3000' },
])(
  'rejects POST with $name before executing the handler',
  async ({ origin }) => {
    const app = buildApp('test-version', testConfig);
    let handlerCalled = false;

    app.post('/test-action', async () => {
      handlerCalled = true;
      return { success: true };
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/test-action',
        headers: origin === undefined ? {} : { origin },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({
        error: {
          code: 'CSRF_ORIGIN_REJECTED',
        },
      });
      expect(handlerCalled).toBe(false);
    } finally {
      await app.close();
    }
  },
);

test('allows POST from the configured origin', async () => {
  const app = buildApp('test-version', testConfig);

  app.post('/test-action', async () => {
    return { success: true };
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/test-action',
      headers: {
        origin: testConfig.appOrigin,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ success: true });
  } finally {
    await app.close();
  }
});
