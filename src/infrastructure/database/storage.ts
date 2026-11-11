import { createPrismaClient } from './prisma-client.js';
import { createPrismaUserRepo } from './user.prisma-repository.js';
import { createPrismaCatalogRepo } from './catalog.prisma-repository.js';
import { createPrismaReservationRepo } from './reservation.prisma-repository.js';
import { createPrismaReservationReadRepo } from './reservation-read.prisma-repository.js';
import { createPrismaSessionStore } from './session.prisma-store.js';
import { startSessionCleanup } from './session-cleanup.js';
import { log } from '../../log.js';

export async function createDbStorage() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required.');
  const db = createPrismaClient(url);
  try {
    await db.$connect();
  } catch (err) {
    await db.$disconnect();
    throw err;
  }
  const stop = startSessionCleanup(db, log);
  return {
    userRepo: createPrismaUserRepo(db),
    catalogRepo: createPrismaCatalogRepo(db),
    reservationRepo: createPrismaReservationRepo(db),
    readRepo: createPrismaReservationReadRepo(db),
    sessionStore: createPrismaSessionStore(db),
    async close() {
      try {
        await stop();
      } finally {
        await db.$disconnect();
      }
    },
  };
}
