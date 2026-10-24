import type { FastifyInstance } from 'fastify';
import type { AuthService } from '../auth/auth.service.js';
import { getSessionUser } from '../auth/auth.session.js';
import type { ReservationService } from './reservation.service.js';
import type {
  CreateReservationBody,
  CreateReservationHeaders,
  ReservationIdParams,
} from './reservation.schemas.js';
import {
  createReservationBodySchema,
  createReservationHeadersSchema,
  reservationIdParamsSchema,
} from './reservation.schemas.js';

interface ReservationRoutesDeps {
  authService: AuthService;
  reservationService: ReservationService;
}

const creationErrors = {
  forbidden: {
    status: 403,
    code: 'FORBIDDEN',
    message: 'Only users can create reservations.',
  },
  'validation-error': {
    status: 400,
    code: 'VALIDATION_ERROR',
    message: 'Invalid reservation data.',
  },
  'product-not-found': {
    status: 404,
    code: 'PRODUCT_NOT_FOUND',
    message: 'Product not found.',
  },
  'insufficient-stock': {
    status: 409,
    code: 'INSUFFICIENT_STOCK',
    message: 'Not enough available stock.',
  },
  'idempotency-conflict': {
    status: 409,
    code: 'IDEMPOTENCY_CONFLICT',
    message: 'Idempotency key was already used with different data.',
  },
};

export function registerReservationRoutes(
  app: FastifyInstance,
  deps: ReservationRoutesDeps,
): void {
  app.post<{
    Body: CreateReservationBody;
    Headers: CreateReservationHeaders;
  }>(
    '/reservations',
    {
      schema: {
        body: createReservationBodySchema,
        headers: createReservationHeadersSchema,
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
            message: request.validationError.message,
          },
        });
      }

      const result = await deps.reservationService.create(user, {
        productId: request.body.productId,
        quantity: request.body.quantity,
        idempotencyKey: request.headers['idempotency-key'],
      });

      if (result.kind === 'created' || result.kind === 'replayed') {
        return reply
          .code(result.kind === 'created' ? 201 : 200)
          .send(result.reservation);
      }

      const error = creationErrors[result.kind];

      return reply.code(error.status).send({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    },
  );
  app.post<{ Params: ReservationIdParams }>(
    '/reservations/:id/cancel',
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

      const result = await deps.reservationService.cancel(
        user,
        Number(request.params.id),
      );

      switch (result.kind) {
        case 'cancelled':
        case 'replayed':
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
              message: 'Cancellation of this reservation is forbidden.',
            },
          });

        case 'invalid-status':
          return reply.code(409).send({
            error: {
              code: 'INVALID_RESERVATION_STATUS',
              message: 'An issued reservation cannot be cancelled.',
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
  app.post<{ Params: ReservationIdParams }>(
    '/reservations/:id/issue',
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

      const result = await deps.reservationService.issue(
        user,
        Number(request.params.id),
      );

      switch (result.kind) {
        case 'issued':
        case 'replayed':
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
              message: 'Only workers can issue reservations.',
            },
          });

        case 'invalid-status':
          return reply.code(409).send({
            error: {
              code: 'INVALID_RESERVATION_STATUS',
              message: 'A cancelled reservation cannot be issued.',
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
