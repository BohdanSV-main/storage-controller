import { randomUUID } from 'node:crypto';
import { beforeEach, afterEach, afterAll, expect, test, vi } from 'vitest';
import { withLog } from '../../log.js';
import { createPrismaClient } from './prisma-client.js';
import { createPrismaReservationRepo } from './reservation.prisma-repository.js';

const logs = vi.hoisted(
  () =>
    [] as {
      msg: string;
      processId: string;
      result?: string;
      reservationId?: number;
    }[],
);
vi.mock('../../log.js', async (original) => {
  const mod = await original<typeof import('../../log.js')>();
  const log = mod.createLog({
    write: (line: string) => {
      logs.push(JSON.parse(line));
    },
  });
  log.level = 'debug';
  return { ...mod, log };
});

const url = process.env['DATABASE_URL'];
if (!url) throw new Error('DATABASE_URL is required. Run npm run test:db.');
const db = createPrismaClient(url);
const repo = createPrismaReservationRepo(db);
let userId: number;
let workerId: number;
let productId: number;

beforeEach(async () => {
  logs.length = 0;
  const token = randomUUID();
  const data = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: 'Test user',
        email: token + '@example.com',
        passwordHash: 'unused',
        role: 'USER',
      },
    });
    const worker = await tx.user.create({
      data: {
        name: 'Test worker',
        email: 'worker-' + token + '@example.com',
        passwordHash: 'unused',
        role: 'WORKER',
      },
    });
    const product = await tx.product.create({
      data: {
        articleCode: token,
        name: 'Test product',
        desc: '',
        stock: { create: { onHand: 5, reserved: 0 } },
      },
    });
    return { user, worker, product };
  });
  userId = data.user.id;
  workerId = data.worker.id;
  productId = data.product.id;
});
afterEach(async () => {
  if (!productId) return;
  await db.$transaction(async (tx) => {
    await tx.reservationIdempotencyKey.deleteMany({ where: { productId } });
    await tx.reservation.deleteMany({ where: { productId } });
    await tx.stock.delete({ where: { productId } });
    await tx.product.delete({ where: { id: productId } });
    await tx.user.deleteMany({ where: { id: { in: [userId, workerId] } } });
  });
  productId = 0;
});
afterAll(async () => {
  await db.$disconnect();
});
const input = (key = 'first') => ({
  userId,
  productId,
  quantity: 3,
  idempotencyKey: key,
});
const stock = () => db.stock.findUniqueOrThrow({ where: { productId } });
async function create(key = 'first') {
  const result = await repo.create(input(key));
  if (result.kind !== 'created')
    throw new Error('Expected a created reservation');
  return result.reservation;
}

test('retries return the same reservation and conflicting payload is rejected', async () => {
  const reservation = await create();
  expect(await repo.create(input())).toEqual({ kind: 'replayed', reservation });
  expect(await repo.create({ ...input(), quantity: 1 })).toEqual({
    kind: 'idempotency-conflict',
  });
  expect(await stock()).toMatchObject({ onHand: 5, reserved: 3 });
  expect(await db.reservation.count({ where: { productId } })).toBe(1);
});

test('cancel and issue update stock only once', async () => {
  const first = await create();
  const cancel = { reservationId: first.id, userId };
  const cancelled = await withLog(() => repo.cancel(cancel), 'cancel-test');
  expect(logs.filter((row) => row.processId === 'cancel-test')).toEqual([
    expect.objectContaining({
      msg: 'Reservation cancellation finished',
      reservationId: first.id,
      result: 'cancelled',
    }),
  ]);
  expect(cancelled.kind).toBe('cancelled');
  expect(await repo.cancel(cancel)).toEqual({ ...cancelled, kind: 'replayed' });
  expect(await stock()).toMatchObject({ onHand: 5, reserved: 0 });
  expect(await repo.issue({ reservationId: first.id, workerId })).toEqual({
    kind: 'invalid-status',
  });
  const second = await create('second');
  const issue = { reservationId: second.id, workerId };
  const issued = await withLog(() => repo.issue(issue), 'issue-test');
  expect(logs.filter((row) => row.processId === 'issue-test')).toEqual([
    expect.objectContaining({
      msg: 'Reservation issuance finished',
      reservationId: second.id,
      result: 'issued',
    }),
  ]);
  expect(issued.kind).toBe('issued');
  expect(await repo.issue(issue)).toEqual({ ...issued, kind: 'replayed' });
  expect(await stock()).toMatchObject({ onHand: 2, reserved: 0 });
  expect(
    logs
      .filter((row) => row.msg === 'Reservation cancellation finished')
      .map((row) => row.result),
  ).toEqual(['cancelled', 'replayed']);
  expect(
    logs
      .filter((row) => row.msg === 'Reservation issuance finished')
      .map((row) => row.result),
  ).toEqual(['invalid-status', 'issued', 'replayed']);
});

test('does not log when the transaction rolls back', async () => {
  const reservation = await create();
  logs.length = 0;
  await expect(
    repo.issue({ reservationId: reservation.id, workerId: -1 }),
  ).rejects.toMatchObject({ code: 'P2003' });
  expect(logs).toEqual([]);
  expect(await stock()).toMatchObject({ onHand: 5, reserved: 3 });
  expect(
    await db.reservation.findUniqueOrThrow({ where: { id: reservation.id } }),
  ).toMatchObject({ status: 'ACTIVE', issuedById: null });
});

test('concurrent reservations cannot exceed stock', async () => {
  const results = await Promise.allSettled([
    repo.create(input()),
    repo.create(input('second')),
  ]);
  const kinds = results.map((result) => {
    if (result.status === 'rejected') throw result.reason;
    return result.value.kind;
  });
  expect(kinds.sort()).toEqual(['created', 'insufficient-stock']);
  expect(await stock()).toMatchObject({ onHand: 5, reserved: 3 });
  expect(await db.reservation.count({ where: { productId } })).toBe(1);
});

test('a foreign key failure rolls back stock and reservation writes', async () => {
  expect(await db.user.findUnique({ where: { id: -1 } })).toBeNull();
  await expect(repo.create({ ...input(), userId: -1 })).rejects.toMatchObject({
    code: 'P2003',
  });
  expect(await stock()).toMatchObject({ onHand: 5, reserved: 0 });
  expect(await db.reservation.count({ where: { productId } })).toBe(0);
  expect(
    await db.reservationIdempotencyKey.count({ where: { productId } }),
  ).toBe(0);
});
