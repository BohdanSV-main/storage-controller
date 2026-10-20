import type { FastifyInstance } from 'fastify';
import type { AuthService } from '../auth/auth.service.js';
import { getSessionUser } from '../auth/auth.session.js';
import type { ReservationReadService } from './reservation-read.service.js';
import { reservationIdParamsSchema } from './reservation.schemas.js';
import type { ReservationIdParams } from './reservation.schemas.js';

interface ReservationReadRoutesDeps {
  authService: AuthService;
  reservationReadService: ReservationReadService;
}

export function registerReservationReadRoutes(
  app: FastifyInstance,
  deps: ReservationReadRoutesDeps,
): void {
  app.get('/reservations', async (request, reply) => {
    const user = await getSessionUser(request, deps.authService);

    if (!user) {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'User is not authenticated.',
        },
      });
    }

    const reservations = await deps.reservationReadService.list(user);

    return reply.code(200).send(reservations);
  });
  app.get<{ Params: ReservationIdParams }>(
    '/reservations/:id',
    {
      schema: {
        params: reservationIdParamsSchema,
      },
      attachValidation: true,
    },
    async (request, reply) => {
      const user = await getSessionUser(request, deps.authService);

      if (!user) {
        return reply.code(401).send({
          error: {
            code: 'UNAUTHENTICATED',
            message: 'User is not authenticated.',
          },
        });
      }

      if (request.validationError) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid reservation ID.',
          },
        });
      }

      const result = await deps.reservationReadService.getById(
        user,
        Number(request.params.id),
      );

      switch (result.kind) {
        case 'found':
          return reply.code(200).send(result.reservation);

        case 'not-found':
          return reply.code(404).send({
            error: {
              code: 'RESERVATION_NOT_FOUND',
              message: 'Reservation was not found.',
            },
          });

        case 'forbidden':
          return reply.code(403).send({
            error: {
              code: 'FORBIDDEN',
              message: 'Access to this reservation is forbidden.',
            },
          });

        case 'validation-error':
          return reply.code(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid reservation ID.',
            },
          });
      }
    },
  );
}
