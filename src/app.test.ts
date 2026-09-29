import { expect, test } from 'vitest';
import { buildApp } from './app.js';

test('GET /health returns status ok', async () => {
  const app = buildApp('test-version');

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
  const app = buildApp(sha);

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
