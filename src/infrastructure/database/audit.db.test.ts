import { randomUUID } from 'node:crypto';
import { createServer, connect, type Socket } from 'node:net';
import { once } from 'node:events';
import { expect, test } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { buildApp } from '../../app.js';
import { createLog } from '../../log.js';
import { createPrismaCatalogRepo } from './catalog.prisma-repository.js';
import { createPrismaReservationReadRepo } from './reservation-read.prisma-repository.js';

const url = process.env['DATABASE_URL'];
if (!url) throw new Error('Run npm run test:db.');

test('list queries stay constant as data grows', async () => {
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
    log: [{ emit: 'event', level: 'query' }],
  });
  let count = 0;
  db.$on('query', () => count++);
  const tag = randomUUID();
  const catalog = createPrismaCatalogRepo(db);
  const repo = createPrismaReservationReadRepo(db);
  const ids: number[] = [];
  let userId: number | undefined;
  try {
    const user = await db.user.create({
      data: {
        name: 'Test',
        email: tag + '@example.com',
        passwordHash: 'unused',
        role: 'USER',
      },
    });
    userId = user.id;
    const base: number[] = [];
    for (const size of [1, 25]) {
      while (ids.length < size) {
        const item = await db.product.create({
          data: {
            articleCode: tag + '-' + ids.length,
            name: 'Test',
            desc: '',
            stock: { create: { onHand: 5, reserved: 1 } },
            reservations: { create: { userId, quantity: 1 } },
          },
        });
        ids.push(item.id);
      }
      const reads = [
        () => catalog.findAllWithStock(),
        () => repo.findByUserId(user.id),
        () => repo.findActive(),
      ];
      for (const [i, read] of reads.entries()) {
        count = 0;
        const rows = await read();
        const found = rows.filter((row) =>
          ids.includes('productId' in row ? row.productId : row.id),
        );
        expect(found).toHaveLength(size);
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThanOrEqual(2);
        if (size === 1) base[i] = count;
        else expect(count).toBe(base[i]);
      }
    }
  } finally {
    try {
      await db.$transaction([
        db.reservation.deleteMany({ where: { productId: { in: ids } } }),
        db.stock.deleteMany({ where: { productId: { in: ids } } }),
        db.product.deleteMany({ where: { id: { in: ids } } }),
        db.user.deleteMany({ where: { email: tag + '@example.com' } }),
      ]);
    } finally {
      await db.$disconnect();
    }
  }
}, 20_000);

test('returns 503 on connection loss and recovers', async () => {
  const target = new URL(url);
  const host = target.hostname;
  const port = Number(target.port || 5432);
  const sockets = new Set<Socket>();
  let online = true;
  const proxy = createServer((client) => {
    if (!online) {
      client.destroy();
      return;
    }
    const server = connect(port, host);
    for (const socket of [client, server]) {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
      socket.on('error', () => {
        client.destroy();
        server.destroy();
      });
    }
    client.on('close', () => server.destroy());
    server.on('close', () => client.destroy());
    client.pipe(server).pipe(client);
  });
  proxy.listen(0, '127.0.0.1');
  await once(proxy, 'listening');
  const addr = proxy.address();
  if (!addr || typeof addr === 'string') throw new Error('Missing proxy port');
  target.hostname = '127.0.0.1';
  target.port = String(addr.port);
  const db = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: target.toString(),
      connectionTimeoutMillis: 1000,
    }),
  });
  const app = buildApp(
    'test',
    {
      sessionSecret: 'test-secret-with-at-least-32-characters',
      appOrigin: 'http://localhost',
      secureCookie: false,
    },
    { log: createLog({ write() {} }) },
  );
  const repo = createPrismaCatalogRepo(db);
  app.get('/db', () => repo.findAllWithStock());
  try {
    expect((await app.inject('/db')).statusCode).toBe(200);
    online = false;
    for (const socket of sockets) socket.destroy();
    const res = await app.inject('/db');
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Required storage is temporarily unavailable.',
      },
    });
    online = true;
    expect((await app.inject('/db')).statusCode).toBe(200);
  } finally {
    await app.close();
    await db.$disconnect();
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve, reject) =>
      proxy.close((err) => (err ? reject(err) : resolve())),
    );
  }
}, 15_000);
