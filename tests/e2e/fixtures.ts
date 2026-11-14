import { randomUUID } from 'node:crypto';
import { test as base, expect } from '@playwright/test';
import { createPrismaClient } from '../../src/infrastructure/database/prisma-client.js';
import { argon2Hasher } from '../../src/infrastructure/security/argon2-password-hasher.js';

type Account = { id: number; name: string; email: string; password: string };
type Product = { id: number; name: string; articleCode: string };

export const test = base.extend<{
  db: ReturnType<typeof createPrismaClient>;
  accounts: {
    user: Account;
    worker: Account;
  };
  account: Account;
  worker: Account;
  product: Product;
}>({
  db: async ({}, use) => {
    const url = process.env.DATABASE_URL;
    if (!url || new URL(url).pathname !== '/storage_controller_test') {
      throw new Error('E2E tests require storage_controller_test');
    }
    const db = createPrismaClient(url);
    try {
      await use(db);
    } finally {
      await db.$disconnect();
    }
  },
  accounts: async ({ db }, use) => {
    const password = randomUUID();
    const passwordHash = await argon2Hasher.hash(password);

    const [user, worker] = await db.$transaction([
      db.user.create({
        data: {
          name: 'Біба Тестувальник',
          email: `${randomUUID()}@example.com`,
          passwordHash,
          role: 'USER',
        },
      }),
      db.user.create({
        data: {
          name: 'Андрій Работяга',
          email: `${randomUUID()}@example.com`,
          passwordHash,
          role: 'WORKER',
        },
      }),
    ]);

    try {
      await use({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          password,
        },
        worker: {
          id: worker.id,
          name: worker.name,
          email: worker.email,
          password,
        },
      });
    } finally {
      await db.$transaction(async (tx) => {
        await tx.session.deleteMany({
          where: {
            OR: [
              { data: { path: ['userId'], equals: user.id } },
              { data: { path: ['userId'], equals: worker.id } },
            ],
          },
        });
        await tx.user.deleteMany({
          where: { id: { in: [user.id, worker.id] } },
        });
      });
    }
  },
  account: async ({ accounts }, use) => {
    await use(accounts.user);
  },
  worker: async ({ accounts }, use) => {
    await use(accounts.worker);
  },
  product: async ({ db, account }, use) => {
    const product = await db.product.create({
      data: {
        name: 'Клавіатура Logitech K120',
        articleCode: randomUUID(),
        desc: 'Дротова USB-клавіатура',
        stock: { create: { onHand: 5, reserved: 0 } },
      },
    });
    try {
      await use(product);
    } finally {
      await db.$transaction(async (tx) => {
        const where = { productId: product.id, userId: account.id };
        await tx.reservationIdempotencyKey.deleteMany({ where });
        await tx.reservation.deleteMany({ where });
        await tx.stock.delete({ where: { productId: product.id } });
        await tx.product.delete({ where: { id: product.id } });
      });
    }
  },
});

export { expect };
