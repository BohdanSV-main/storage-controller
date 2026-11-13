import { setTimeout as delay } from 'node:timers/promises';
import { beforeEach, expect, test, vi } from 'vitest';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { runSerializableTx } from './serializable-transaction.js';

vi.mock('node:timers/promises', () => ({
  setTimeout: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function dbError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('Transaction failed', {
    code,
    clientVersion: 'test',
  });
}

function setup() {
  const tx = vi.fn();
  const db = { $transaction: tx } as unknown as PrismaClient;
  const run = async () => 7;

  return { db, tx, run };
}

test('runs once on success', async () => {
  const { db, tx, run } = setup();
  tx.mockResolvedValue(7);

  expect(await runSerializableTx(db, run)).toBe(7);
  expect(tx).toHaveBeenCalledTimes(1);
  expect(tx).toHaveBeenCalledWith(run, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 5_000,
    timeout: 5_000,
  });
  expect(delay).not.toHaveBeenCalled();
});

test('retries a conflict', async () => {
  const { db, tx, run } = setup();
  tx.mockRejectedValueOnce(dbError('P2034')).mockResolvedValue(7);

  expect(await runSerializableTx(db, run)).toBe(7);
  expect(tx).toHaveBeenCalledTimes(2);
  expect(delay).toHaveBeenCalledTimes(1);

  const [ms] = vi.mocked(delay).mock.calls[0]!;
  expect(ms).toBeGreaterThanOrEqual(25);
  expect(ms).toBeLessThan(50);
});

test('throws the last error after three conflicts', async () => {
  const { db, tx, run } = setup();
  const last = dbError('P2034');

  tx.mockRejectedValueOnce(dbError('P2034'))
    .mockRejectedValueOnce(dbError('P2034'))
    .mockRejectedValue(last);

  await expect(runSerializableTx(db, run)).rejects.toBe(last);
  expect(tx).toHaveBeenCalledTimes(3);
  expect(delay).toHaveBeenCalledTimes(2);

  const [ms] = vi.mocked(delay).mock.calls[1]!;
  expect(ms).toBeGreaterThanOrEqual(50);
  expect(ms).toBeLessThan(75);
});

test.each([dbError('P2002'), new Error('Connection lost')])(
  'does not retry %s',
  async (error) => {
    const { db, tx, run } = setup();
    tx.mockRejectedValue(error);

    await expect(runSerializableTx(db, run)).rejects.toBe(error);
    expect(tx).toHaveBeenCalledTimes(1);
    expect(delay).not.toHaveBeenCalled();
  },
);
