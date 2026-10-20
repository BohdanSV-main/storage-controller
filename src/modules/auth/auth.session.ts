import type { FastifyRequest } from 'fastify';
import type { AuthService } from './auth.service.js';
import type { PublicUser } from './user.types.js';

export async function getSessionUser(
  request: FastifyRequest,
  authService: AuthService,
): Promise<PublicUser | null> {
  const { userId, expiresAt } = request.session;

  if (
    userId === undefined ||
    expiresAt === undefined ||
    expiresAt <= Date.now()
  ) {
    return null;
  }

  return authService.findUserById(userId);
}
