import { buildApp } from './app.js';
import { readFileSync } from 'node:fs';
import { readConfig } from './config.js';
import { createPrismaClient } from './infrastructure/database/prisma-client.js';
import { createPrismaUserRepo } from './infrastructure/database/user.prisma-repository.js';
import { argon2Hasher } from './infrastructure/security/argon2-password-hasher.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { registerAuthRoutes } from './modules/auth/auth.routes.js';
import { createCatalogService } from './modules/catalog/catalog.service.js';
import { registerCatalogRoutes } from './modules/catalog/catalog.routes.js';
import { createReservationService } from './modules/reservations/reservation.service.js';
import { registerReservationRoutes } from './modules/reservations/reservation.routes.js';
import { createReservationReadService } from './modules/reservations/reservation-read.service.js';
import { registerReservationReadRoutes } from './modules/reservations/reservation-read.routes.js';
import { createPrismaCatalogRepo } from './infrastructure/database/catalog.prisma-repository.js';
import { createPrismaReservationRepo } from './infrastructure/database/reservation.prisma-repository.js';
import { createPrismaReservationReadRepo } from './infrastructure/database/reservation-read.prisma-repository.js';
import { createPrismaSessionStore } from './infrastructure/database/session.prisma-store.js';
import { startSessionCleanup } from './infrastructure/database/session-cleanup.js';

const versionFile = new URL('./version.txt', import.meta.url);
const sha = readFileSync(versionFile, 'utf8').trim();

const config = readConfig();

const connectionString = process.env['DATABASE_URL'];

if (!connectionString) {
  throw new Error('DATABASE_URL is required.');
}

const prisma = createPrismaClient(connectionString);
const sessionStore = createPrismaSessionStore(prisma);

const app = buildApp(sha, config, {
  sessionStore,
});

let stopSessionCleanup: (() => Promise<void>) | undefined;

app.addHook('onClose', async () => {
  try {
    await stopSessionCleanup?.();
  } finally {
    await prisma.$disconnect();
  }
});

try {
  await prisma.$connect();
  stopSessionCleanup = startSessionCleanup(prisma, app.log);

  const userRepo = createPrismaUserRepo(prisma);
  const authService = createAuthService({
    userRepo,
    passwordHasher: argon2Hasher,
  });
  registerAuthRoutes(app, authService);

  const catalogRepo = createPrismaCatalogRepo(prisma);
  const catalogService = createCatalogService(catalogRepo);

  registerCatalogRoutes(app, {
    authService,
    catalogService,
  });
  const reservationRepo = createPrismaReservationRepo(prisma);
  const reservationService = createReservationService(reservationRepo);

  registerReservationRoutes(app, {
    authService,
    reservationService,
  });

  const reservationReadRepo = createPrismaReservationReadRepo(prisma);

  const reservationReadService =
    createReservationReadService(reservationReadRepo);

  registerReservationReadRoutes(app, {
    authService,
    reservationReadService,
  });

  await app.listen({ port: 3000, host: '127.0.0.1' });

  const shutdown = (): void => {
    app.close().catch((error: unknown) => {
      app.log.error(error);
      process.exitCode = 1;
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
} catch (err) {
  app.log.error(err);
  process.exitCode = 1;

  try {
    await app.close();
  } finally {
    await prisma.$disconnect();
  }
}
