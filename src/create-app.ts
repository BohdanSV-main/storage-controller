import { buildApp } from './app.js';
import type { ServerConfig } from './config.js';
import { argon2Hasher } from './infrastructure/security/argon2-password-hasher.js';
import { createMemoryStore } from './infrastructure/memory/memory-store.js';
import { createSeedUsers } from './infrastructure/memory/seed-users.js';
import { createSeedProducts } from './infrastructure/memory/seed-products.js';
import { createMemoryUserRepo } from './infrastructure/memory/user.memory-repository.js';
import { createMemoryCatalogRepo } from './infrastructure/memory/catalog.memory-repository.js';
import { createMemoryReservationRepo } from './infrastructure/memory/reservation.memory-repository.js';
import { createMemoryReservationReadRepo } from './infrastructure/memory/reservation-read.memory-repository.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { registerAuthRoutes } from './modules/auth/auth.routes.js';
import { createCatalogService } from './modules/catalog/catalog.service.js';
import { registerCatalogRoutes } from './modules/catalog/catalog.routes.js';
import { createReservationService } from './modules/reservations/reservation.service.js';
import { registerReservationRoutes } from './modules/reservations/reservation.routes.js';
import { createReservationReadService } from './modules/reservations/reservation-read.service.js';
import { registerReservationReadRoutes } from './modules/reservations/reservation-read.routes.js';

async function createStorage(source: ServerConfig['dataSource']) {
  if (source === 'postgres') {
    const { createDbStorage } =
      await import('./infrastructure/database/storage.js');
    return createDbStorage();
  }
  const store = createMemoryStore(createSeedProducts());
  const users = await createSeedUsers(argon2Hasher);
  return {
    userRepo: createMemoryUserRepo(users),
    catalogRepo: createMemoryCatalogRepo(store),
    reservationRepo: createMemoryReservationRepo(store),
    readRepo: createMemoryReservationReadRepo(store),
    sessionStore: undefined,
    close: undefined,
  };
}

export async function createApp(sha: string, config: ServerConfig) {
  const storage = await createStorage(config.dataSource);
  const app = buildApp(
    sha,
    config,
    storage.sessionStore ? { sessionStore: storage.sessionStore } : {},
  );
  if (storage.close) app.addHook('onClose', storage.close);
  const authService = createAuthService({
    userRepo: storage.userRepo,
    passwordHasher: argon2Hasher,
  });
  registerAuthRoutes(app, authService);
  registerCatalogRoutes(app, {
    authService,
    catalogService: createCatalogService(storage.catalogRepo),
  });
  registerReservationRoutes(app, {
    authService,
    reservationService: createReservationService(storage.reservationRepo),
  });
  registerReservationReadRoutes(app, {
    authService,
    reservationReadService: createReservationReadService(storage.readRepo),
  });
  return app;
}
