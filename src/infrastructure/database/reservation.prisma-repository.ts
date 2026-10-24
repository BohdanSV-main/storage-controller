import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import type {
  CancelReservationInput,
  CancelReservationResult,
  CreateReservationInput,
  CreateReservationResult,
  IssueReservationInput,
  IssueReservationResult,
  ReservationRepo,
} from '../../modules/reservations/reservation.repository.js';
import { runSerializableTx } from './serializable-transaction.js';

async function findReplay(
  client: Pick<PrismaClient, 'reservationIdempotencyKey'>,
  input: CreateReservationInput,
): Promise<CreateReservationResult | null> {
  const existing = await client.reservationIdempotencyKey.findUnique({
    where: {
      userId_key: {
        userId: input.userId,
        key: input.idempotencyKey,
      },
    },
    include: {
      reservation: true,
    },
  });

  if (!existing) {
    return null;
  }

  if (
    existing.productId !== input.productId ||
    existing.quantity !== input.quantity
  ) {
    return { kind: 'idempotency-conflict' };
  }

  return {
    kind: 'replayed',
    reservation: existing.reservation,
  };
}

export function createPrismaReservationRepo(
  prisma: PrismaClient,
): ReservationRepo {
  return {
    async create(
      input: CreateReservationInput,
    ): Promise<CreateReservationResult> {
      if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) {
        throw new Error('Quantity must be a positive integer');
      }

      try {
        return await runSerializableTx<CreateReservationResult>(
          prisma,
          async (tx) => {
            const existing = await findReplay(tx, input);

            if (existing) {
              return existing;
            }

            const product = await tx.product.findUnique({
              where: { id: input.productId },
              include: { stock: true },
            });

            if (!product) {
              return { kind: 'product-not-found' };
            }

            if (!product.stock) {
              throw new Error(
                `Stock record is missing for product ${product.id}.`,
              );
            }

            const available = product.stock.onHand - product.stock.reserved;

            if (input.quantity > available) {
              return { kind: 'insufficient-stock' };
            }

            await tx.stock.update({
              where: { productId: input.productId },
              data: {
                reserved: { increment: input.quantity },
              },
            });

            const reservation = await tx.reservation.create({
              data: {
                userId: input.userId,
                productId: input.productId,
                quantity: input.quantity,
              },
            });

            await tx.reservationIdempotencyKey.create({
              data: {
                userId: input.userId,
                key: input.idempotencyKey,
                productId: input.productId,
                quantity: input.quantity,
                reservationId: reservation.id,
              },
            });

            return {
              kind: 'created',
              reservation,
            };
          },
        );
      } catch (error: unknown) {
        const isUniqueConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002';

        if (!isUniqueConflict) {
          throw error;
        }

        const existing = await findReplay(prisma, input);

        if (existing) {
          return existing;
        }

        throw error;
      }
    },
    async cancel(
      input: CancelReservationInput,
    ): Promise<CancelReservationResult> {
      return runSerializableTx<CancelReservationResult>(prisma, async (tx) => {
        const reservation = await tx.reservation.findUnique({
          where: { id: input.reservationId },
        });

        if (!reservation) {
          return { kind: 'not-found' };
        }

        if (reservation.userId !== input.userId) {
          return { kind: 'forbidden' };
        }

        if (reservation.status === 'CANCELLED') {
          return {
            kind: 'replayed',
            reservation,
          };
        }

        if (reservation.status !== 'ACTIVE') {
          return { kind: 'invalid-status' };
        }

        const stock = await tx.stock.findUnique({
          where: { productId: reservation.productId },
        });

        if (!stock) {
          throw new Error(
            `Stock record is missing for product ${reservation.productId}.`,
          );
        }

        if (stock.reserved < reservation.quantity) {
          throw new Error(
            'Reserved stock is inconsistent with the reservation.',
          );
        }

        await tx.stock.update({
          where: { productId: reservation.productId },
          data: {
            reserved: { decrement: reservation.quantity },
          },
        });

        const cancelled = await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            status: 'CANCELLED',
            closedAt: new Date(),
            issuedById: null,
          },
        });

        return {
          kind: 'cancelled',
          reservation: cancelled,
        };
      });
    },
    async issue(input: IssueReservationInput): Promise<IssueReservationResult> {
      return runSerializableTx<IssueReservationResult>(prisma, async (tx) => {
        const reservation = await tx.reservation.findUnique({
          where: { id: input.reservationId },
        });

        if (!reservation) {
          return { kind: 'not-found' };
        }

        if (reservation.status === 'ISSUED') {
          return {
            kind: 'replayed',
            reservation,
          };
        }

        if (reservation.status !== 'ACTIVE') {
          return { kind: 'invalid-status' };
        }

        const stock = await tx.stock.findUnique({
          where: { productId: reservation.productId },
        });

        if (!stock) {
          throw new Error(
            `Stock record is missing for product ${reservation.productId}.`,
          );
        }

        if (
          stock.onHand < reservation.quantity ||
          stock.reserved < reservation.quantity
        ) {
          throw new Error('Stock is inconsistent with the reservation.');
        }

        await tx.stock.update({
          where: { productId: reservation.productId },
          data: {
            onHand: { decrement: reservation.quantity },
            reserved: { decrement: reservation.quantity },
          },
        });

        const issued = await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            status: 'ISSUED',
            closedAt: new Date(),
            issuedById: input.workerId,
          },
        });

        return {
          kind: 'issued',
          reservation: issued,
        };
      });
    },
  };
}
