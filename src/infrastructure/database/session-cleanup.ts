import { withLog } from '../../log.js';
import type { FastifyBaseLogger } from 'fastify';
import type { PrismaClient } from '../../generated/prisma/client.js';

type CleanupDb = {
  session: Pick<PrismaClient['session'], 'deleteMany'>;
};

export function startSessionCleanup(
  prisma: CleanupDb,
  logger: Pick<FastifyBaseLogger, 'error'>,
): () => Promise<void> {
  let running: Promise<void> | undefined;

  async function removeExpiredSessions(): Promise<void> {
    try {
      await prisma.session.deleteMany({
        where: { expiresAt: { lte: new Date() } },
      });
    } catch (error: unknown) {
      logger.error({ err: error }, 'Failed to remove expired sessions');
    }
  }

  function cleanup(): void {
    if (running) return;

    running = withLog(removeExpiredSessions).finally(() => {
      running = undefined;
    });
  }

  cleanup();
  const timer = setInterval(cleanup, 60_000);
  timer.unref();

  return async () => {
    clearInterval(timer);
    await running;
  };
}
