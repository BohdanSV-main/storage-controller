import type { FastifyInstance } from 'fastify';
import type { AuthService } from './auth.service.js';
import type { LoginBody } from './auth.schemas.js';
import { loginBodySchema } from './auth.schemas.js';
import { SESSION_TTL_MS } from '../../plugins/session.js';
import { getSessionUser } from './auth.session.js';

export function registerAuthRoutes(
  app: FastifyInstance,
  authService: AuthService,
): void {
  app.post<{ Body: LoginBody }>(
    '/auth/login',
    {
      schema: {
        body: loginBodySchema,
      },
      attachValidation: true,
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: request.validationError.message,
          },
        });
      }

      const { email, password } = request.body;

      const user = await authService.authenticate(email, password);

      if (!user) {
        return reply.code(401).send({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password.',
          },
        });
      }

      await request.session.regenerate();

      request.session.userId = user.id;
      request.session.expiresAt = Date.now() + SESSION_TTL_MS;

      await request.session.save();

      return reply.code(200).send(user);
    },
  );

  app.get('/auth/me', async (request, reply) => {
    const user = await getSessionUser(request, authService);

    if (!user) {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'User is not authenticated.',
        },
      });
    }

    return reply.code(200).send(user);
  });

  app.post('/auth/logout', async (request, reply) => {
    await request.session.destroy();

    reply.clearCookie('sessionId', {
      path: '/',
    });

    return reply.code(204).send();
  });
}
