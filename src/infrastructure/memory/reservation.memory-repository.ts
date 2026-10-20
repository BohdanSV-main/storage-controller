import type {
  CancelReservationInput,
  CancelReservationResult,
  CreateReservationInput,
  CreateReservationResult,
  IssueReservationInput,
  IssueReservationResult,
  ReservationRepo,
} from '../../modules/reservations/reservation.repository.js';
import type { MemoryStore, IdempotencyRecord } from './memory-store.js';
import type { Reservation } from '../../modules/reservations/reservation.types.js';

export function createMemoryReservationRepo(
  store: MemoryStore,
): ReservationRepo {
  return {
    async create(
      input: CreateReservationInput,
    ): Promise<CreateReservationResult> {
      if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) {
        throw new Error('Quantity must be a positive integer');
      }

      const existing = store.reservationKeys
        .get(input.userId)
        ?.get(input.idempotencyKey);

      if (existing) {
        if (
          existing.productId !== input.productId ||
          existing.quantity !== input.quantity
        ) {
          return { kind: 'idempotency-conflict' };
        }

        const reservation = store.reservations.get(existing.reservationId);

        if (!reservation) {
          throw new Error(
            'Inconsistent state: reservation not found for existing idempotency record',
          );
        }

        return { kind: 'replayed', reservation: structuredClone(reservation) };
      }

      const product = store.products.get(input.productId);

      if (!product) {
        return { kind: 'product-not-found' };
      }

      const available = product.stock.onHand - product.stock.reserved;

      if (input.quantity > available) {
        return { kind: 'insufficient-stock' };
      }

      const reservation: Reservation = {
        id: store.nextReservationId,
        userId: input.userId,
        productId: input.productId,
        quantity: input.quantity,
        status: 'ACTIVE',
        createdAt: new Date(),
        closedAt: null,
        issuedById: null,
      };

      const userKeys =
        store.reservationKeys.get(input.userId) ??
        new Map<string, IdempotencyRecord>();

      const operation: IdempotencyRecord = {
        productId: input.productId,
        quantity: input.quantity,
        reservationId: reservation.id,
      };

      const result: CreateReservationResult = {
        kind: 'created',
        reservation: structuredClone(reservation),
      };

      store.reservations.set(reservation.id, reservation);
      product.stock.reserved += input.quantity;
      userKeys.set(input.idempotencyKey, operation);
      store.reservationKeys.set(input.userId, userKeys);
      store.nextReservationId += 1;

      return result;
    },

    async cancel(
      input: CancelReservationInput,
    ): Promise<CancelReservationResult> {
      const reservation = store.reservations.get(input.reservationId);

      if (!reservation) {
        return { kind: 'not-found' };
      }

      if (reservation.userId !== input.userId) {
        return { kind: 'forbidden' };
      }

      if (reservation.status === 'CANCELLED') {
        return {
          kind: 'replayed',
          reservation: structuredClone(reservation),
        };
      }

      if (reservation.status !== 'ACTIVE') {
        return { kind: 'invalid-status' };
      }

      const product = store.products.get(reservation.productId);

      if (!product) {
        throw new Error('Reservation references a missing product');
      }

      if (product.stock.reserved < reservation.quantity) {
        throw new Error('Reserved stock is inconsistent with the reservation');
      }

      const cancelled: Reservation = {
        ...reservation,
        status: 'CANCELLED',
        closedAt: new Date(),
      };

      const result: CancelReservationResult = {
        kind: 'cancelled',
        reservation: structuredClone(cancelled),
      };

      store.reservations.set(reservation.id, cancelled);
      product.stock.reserved -= reservation.quantity;

      return result;
    },
    async issue(input: IssueReservationInput): Promise<IssueReservationResult> {
      const reservation = store.reservations.get(input.reservationId);

      if (!reservation) {
        return { kind: 'not-found' };
      }

      if (reservation.status === 'ISSUED') {
        return {
          kind: 'replayed',
          reservation: structuredClone(reservation),
        };
      }

      if (reservation.status !== 'ACTIVE') {
        return { kind: 'invalid-status' };
      }

      const product = store.products.get(reservation.productId);

      if (!product) {
        throw new Error('Reservation references a missing product');
      }

      if (
        product.stock.reserved < reservation.quantity ||
        product.stock.onHand < reservation.quantity
      ) {
        throw new Error('Stock is inconsistent with the reservation');
      }

      const issued: Reservation = {
        ...reservation,
        status: 'ISSUED',
        closedAt: new Date(),
        issuedById: input.workerId,
      };

      const result: IssueReservationResult = {
        kind: 'issued',
        reservation: structuredClone(issued),
      };

      store.reservations.set(reservation.id, issued);
      product.stock.onHand -= reservation.quantity;
      product.stock.reserved -= reservation.quantity;

      return result;
    },
  };
}
