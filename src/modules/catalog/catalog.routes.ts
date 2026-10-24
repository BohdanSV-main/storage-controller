import type { FastifyInstance } from 'fastify';
import type { CatalogService } from './catalog.service.js';
import type { AuthService } from '../auth/auth.service.js';
import { getSessionUser } from '../auth/auth.session.js';

interface CatalogRoutesDeps {
  authService: AuthService;
  catalogService: CatalogService;
}

export function registerCatalogRoutes(
  app: FastifyInstance,
  deps: CatalogRoutesDeps,
): void {
  app.get('/products', async (request, reply) => {
    const user = await getSessionUser(request, deps.authService);

    if (!user) {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'User is not authenticated.',
        },
      });
    }

    const products = await deps.catalogService.getCatalog();
    return reply.code(200).send(products);
  });
}
