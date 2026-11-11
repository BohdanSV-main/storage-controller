import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import type { InjectOptions } from 'fastify';
import { readConfig } from './config.js';
import { createApp } from './create-app.js';

afterEach(() => vi.unstubAllEnvs());

beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', 'test-secret'.repeat(3));
  vi.stubEnv('APP_ORIGIN', 'http://localhost');
  vi.stubEnv('DATABASE_URL', undefined);
});

test('uses postgres by default and rejects unknown sources', () => {
  vi.stubEnv('DATA_SOURCE', undefined);
  expect(readConfig().dataSource).toBe('postgres');
  vi.stubEnv('DATA_SOURCE', 'other');
  expect(() => readConfig()).toThrow('DATA_SOURCE');
});

test('runs the reservation flow without a database', async () => {
  vi.stubEnv('DATA_SOURCE', 'memory');
  const app = await createApp('test', readConfig());
  const get = async (url: string, cookies: Record<string, string>) =>
    (await send({ url, cookies })).json();

  async function send(opts: InjectOptions, status = 200) {
    const res = await app.inject({
      ...opts,
      headers: { origin: 'http://localhost', ...opts.headers },
    });
    expect(res.statusCode, res.body).toBe(status);
    return res;
  }
  async function login(email: string, password: string) {
    const res = await send({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    });
    const cookie = res.cookies.find((item) => item.name === 'sessionId');
    if (!cookie) throw new Error('Login did not return a session cookie');
    return { sessionId: cookie.value };
  }
  try {
    await send({ url: '/products' }, 401);
    const user = await login('biba@example.com', 'User-one-123!');
    const worker = await login('worker@example.com', 'Worker-123!');
    const stock = async (qty: number) => {
      const products: { id: number; available: number }[] = await get(
        '/products',
        user,
      );
      expect(products.find((item) => item.id === 1)?.available).toBe(qty);
    };
    const order = {
      method: 'POST' as const,
      url: '/reservations',
      cookies: user,
      headers: { 'idempotency-key': 'first' },
      payload: { productId: 1, quantity: 2 },
    };
    await stock(10);
    const first = (await send(order, 201)).json();
    expect((await send(order)).json()).toEqual(first);
    await stock(8);
    await send({ ...order, payload: { productId: 1, quantity: 3 } }, 409);
    await send({ ...order, cookies: worker }, 403);
    expect(await get('/reservations', user)).toMatchObject([
      { id: first.id, status: 'ACTIVE' },
    ]);
    await send(
      { method: 'POST', url: `/reservations/${first.id}/issue`, cookies: user },
      403,
    );
    const cancelled = await send({
      method: 'POST',
      url: `/reservations/${first.id}/cancel`,
      cookies: user,
    });
    expect(cancelled.json().status).toBe('CANCELLED');
    await stock(10);
    const second = (
      await send({ ...order, headers: { 'idempotency-key': 'second' } }, 201)
    ).json();
    expect(await get('/reservations', worker)).toMatchObject([
      { id: second.id, status: 'ACTIVE' },
    ]);
    const issue = {
      method: 'POST' as const,
      url: `/reservations/${second.id}/issue`,
      cookies: worker,
    };
    const issued = (await send(issue)).json();
    expect(issued).toMatchObject({ status: 'ISSUED', issuedById: 3 });
    expect((await send(issue)).json()).toEqual(issued);
    await stock(8);
    expect(await get(`/reservations/${second.id}`, user)).toMatchObject({
      status: 'ISSUED',
    });
    await send({ method: 'POST', url: '/auth/logout', cookies: user }, 204);
    await send({ url: '/auth/me', cookies: user }, 401);
  } finally {
    await app.close();
  }
});
