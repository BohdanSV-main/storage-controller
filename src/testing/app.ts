import { buildApp } from '../app.js';
import { createAuthService } from '../modules/auth/auth.service.js';
import { registerAuthRoutes } from '../modules/auth/auth.routes.js';
import { createCatalogService } from '../modules/catalog/catalog.service.js';
import { registerCatalogRoutes } from '../modules/catalog/catalog.routes.js';
import { createReservationService } from '../modules/reservations/reservation.service.js';
import { registerReservationRoutes } from '../modules/reservations/reservation.routes.js';
import { createReservationReadService } from '../modules/reservations/reservation-read.service.js';
import { registerReservationReadRoutes } from '../modules/reservations/reservation-read.routes.js';
import { createMemoryStore } from '../infrastructure/memory/memory-store.js';
import { createMemoryUserRepo } from '../infrastructure/memory/user.memory-repository.js';
import { createMemoryCatalogRepo } from '../infrastructure/memory/catalog.memory-repository.js';
import { createMemoryReservationRepo } from '../infrastructure/memory/reservation.memory-repository.js';
import { createMemoryReservationReadRepo } from '../infrastructure/memory/reservation-read.memory-repository.js';
import { argon2Hasher } from '../infrastructure/security/argon2-password-hasher.js';
import type { Role } from '../modules/auth/user.types.js';

export const config = {
  appOrigin: 'http://localhost:3000',
  sessionSecret: 'test-only-secret-with-at-least-32-characters',
  secureCookie: false,
};
export const product = {
  id: 1,
  articleCode: 'KB-001',
  name: 'Keyboard',
  desc: 'USB keyboard',
  stock: { productId: 1, onHand: 5, reserved: 0 },
};
export const password = 'Test-password-123!';
const hash = argon2Hasher.hash(password);

export async function setupApp() {
  const store = createMemoryStore([product]);
  const users = [1, 2, 3].map((id) => ({
    id,
    name: 'User ' + id,
    email: 'user' + id + '@example.com',
    passwordHash: '',
    role: (id === 3 ? 'WORKER' : 'USER') as Role,
  }));
  for (const user of users) user.passwordHash = await hash;
  const authService = createAuthService({
    userRepo: createMemoryUserRepo(users),
    passwordHasher: argon2Hasher,
  });
  const app = buildApp('test', config);
  registerAuthRoutes(app, authService);
  registerCatalogRoutes(app, {
    authService,
    catalogService: createCatalogService(createMemoryCatalogRepo(store)),
  });
  registerReservationRoutes(app, {
    authService,
    reservationService: createReservationService(
      createMemoryReservationRepo(store),
    ),
  });
  registerReservationReadRoutes(app, {
    authService,
    reservationReadService: createReservationReadService(
      createMemoryReservationReadRepo(store),
    ),
  });
  async function login(id = 1) {
    const result = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { origin: config.appOrigin },
      payload: { email: 'user' + id + '@example.com', password },
    });
    const cookie = result.cookies.findLast((item) => item.name === 'sessionId');
    if (result.statusCode !== 200 || !cookie?.value)
      throw new Error('Test login failed');
    return { sessionId: cookie.value };
  }
  return { app, store, login };
}
