import type { FastifyInstance } from 'fastify';
import { isDbUnavailable } from '../infrastructure/database/database-errors.js';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (isDbUnavailable(error)) {
      request.log.error({ err: error }, 'Required storage is unavailable');
      return reply.code(503).send({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Required storage is temporarily unavailable.',
        },
      });
    }

    if (
      error instanceof Error &&
      'statusCode' in error &&
      typeof error.statusCode === 'number' &&
      error.statusCode >= 400 &&
      error.statusCode < 500
    ) {
      return reply.send(error);
    }

    request.log.error({ err: error }, 'Unhandled request error');
    return reply.code(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error.' },
    });
  });
}
