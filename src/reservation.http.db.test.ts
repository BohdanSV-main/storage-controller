import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { afterAll, expect, test } from 'vitest';
import { createApp } from './create-app.js';
import { createPrismaClient } from './infrastructure/database/prisma-client.js';
import { argon2Hasher } from './infrastructure/security/argon2-password-hasher.js';

const url = process.env.DATABASE_URL;
if (!url || new URL(url).pathname !== '/storage_controller_test') {
  throw new Error('Use storage_controller_test. Run npm run test:db.');
}
const db = createPrismaClient(url);

afterAll(() => db.$disconnect());

test('reserves, replays and cancels through HTTP and PostgreSQL', async () => {
  const tag = randomUUID();
  const password = 'Test-password-123!';
  const passwordHash = await argon2Hasher.hash(password);
  const { user, product } = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: 'HTTP user',
        email: `${tag}@example.com`,
        passwordHash,
        role: 'USER',
      },
    });
    const product = await tx.product.create({
      data: {
        articleCode: tag,
        name: 'HTTP product',
        desc: '',
        stock: { create: { onHand: 5, reserved: 0 } },
      },
    });
    return { user, product };
  });

  let app: FastifyInstance | undefined;
  try {
    const origin = 'http://localhost';
    app = await createApp('test', {
      dataSource: 'postgres',
      sessionSecret: 'http-test-secret'.repeat(3),
      appOrigin: origin,
      secureCookie: false,
    });
    const base = await app.listen({ host: '127.0.0.1', port: 0 });
    let cookie = '';

    async function send(path: string, options: RequestInit = {}, status = 200) {
      const res = await fetch(base + path, {
        ...options,
        headers: { origin, cookie, ...options.headers },
        signal: AbortSignal.timeout(5_000),
      });
      expect(res.status).toBe(status);
      return res;
    }

    async function stock(available: number) {
      const res = await send('/products');
      const products = (await res.json()) as {
        id: number;
        available: number;
      }[];
      expect(products.find((item) => item.id === product.id)?.available).toBe(
        available,
      );
      expect(
        await db.stock.findUniqueOrThrow({ where: { productId: product.id } }),
      ).toMatchObject({ onHand: 5, reserved: 5 - available });
    }

    const login = await send('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: user.email, password }),
    });
    expect(await login.json()).toEqual({
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'USER',
    });
    cookie =
      login.headers
        .getSetCookie()
        .find((value) => value.startsWith('sessionId='))
        ?.split(';')[0] ?? '';
    expect(cookie).not.toBe('');
    await stock(5);

    const order = {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': tag },
      body: JSON.stringify({ productId: product.id, quantity: 2 }),
    };
    const created = await send('/reservations', order, 201);
    const reservation = (await created.json()) as { id: number };
    expect(reservation).toMatchObject({
      id: expect.any(Number),
      userId: user.id,
      productId: product.id,
      quantity: 2,
      status: 'ACTIVE',
    });
    await stock(3);

    const replay = await send('/reservations', order);
    expect(await replay.json()).toEqual(reservation);
    await stock(3);
    expect(await db.reservation.count({ where: { userId: user.id } })).toBe(1);

    const cancelled = await send(`/reservations/${reservation.id}/cancel`, {
      method: 'POST',
    });
    expect(await cancelled.json()).toMatchObject({
      id: reservation.id,
      status: 'CANCELLED',
      closedAt: expect.any(String),
    });
    expect(
      await db.reservation.findUniqueOrThrow({ where: { id: reservation.id } }),
    ).toMatchObject({ status: 'CANCELLED' });
    await stock(5);

    const logout = await send('/auth/logout', { method: 'POST' }, 204);
    expect(await logout.text()).toBe('');
    const expired = await send('/auth/me', {}, 401);
    expect(await expired.json()).toMatchObject({
      error: { code: 'UNAUTHENTICATED' },
    });
  } finally {
    try {
      await app?.close();
    } finally {
      await db.$transaction(async (tx) => {
        await tx.session.deleteMany({
          where: { data: { path: ['userId'], equals: user.id } },
        });
        await tx.reservationIdempotencyKey.deleteMany({
          where: { userId: user.id },
        });
        await tx.reservation.deleteMany({ where: { userId: user.id } });
        await tx.stock.delete({ where: { productId: product.id } });
        await tx.product.delete({ where: { id: product.id } });
        await tx.user.delete({ where: { id: user.id } });
      });
    }
  }
}, 15_000);
