import { setTimeout as delay } from 'node:timers/promises';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';

const MAX_ATTEMPTS = 3;

export async function runSerializableTx<T>(
  prisma: PrismaClient,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 5_000,
      });
    } catch (error: unknown) {
      const isTxConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034';

      if (!isTxConflict || attempt === MAX_ATTEMPTS) {
        throw error;
      }

      const backoffMs = 25 * 2 ** (attempt - 1);
      const jitterMs = Math.floor(Math.random() * 25);

      await delay(backoffMs + jitterMs);
    }
  }

  throw new Error('Transaction attempt limit was exceeded.');
}
