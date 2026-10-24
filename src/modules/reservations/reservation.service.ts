import type { PublicUser } from '../auth/user.types.js';
import { isPositiveInt32 } from './reservation.limits.js';
import type {
  CancelReservationResult,
  CreateReservationInput,
  CreateReservationResult,
  IssueReservationResult,
  ReservationRepo,
} from './reservation.repository.js';

export type CreateReservationCommand = Omit<CreateReservationInput, 'userId'>;

export type CreateResult =
  | CreateReservationResult
  | { kind: 'forbidden' }
  | { kind: 'validation-error' };

export type CancelResult =
  CancelReservationResult | { kind: 'validation-error' };

export type IssueResult =
  IssueReservationResult | { kind: 'forbidden' } | { kind: 'validation-error' };

export interface ReservationService {
  create(
    user: PublicUser,
    command: CreateReservationCommand,
  ): Promise<CreateResult>;

  cancel(user: PublicUser, reservationId: number): Promise<CancelResult>;
  issue(user: PublicUser, reservationId: number): Promise<IssueResult>;
}

export function createReservationService(
  repo: ReservationRepo,
): ReservationService {
  return {
    async create(user, command) {
      if (user.role !== 'USER') {
        return { kind: 'forbidden' };
      }

      const { productId, quantity, idempotencyKey } = command;

      if (
        !isPositiveInt32(productId) ||
        !isPositiveInt32(quantity) ||
        typeof idempotencyKey !== 'string' ||
        idempotencyKey.trim().length === 0 ||
        idempotencyKey.length > 128
      ) {
        return { kind: 'validation-error' };
      }

      return repo.create({
        userId: user.id,
        productId,
        quantity,
        idempotencyKey,
      });
    },
    async cancel(user, reservationId) {
      if (user.role !== 'USER') {
        return { kind: 'forbidden' };
      }

      if (!isPositiveInt32(reservationId)) {
        return { kind: 'validation-error' };
      }

      return repo.cancel({
        reservationId,
        userId: user.id,
      });
    },
    async issue(user, reservationId) {
      if (user.role !== 'WORKER') {
        return { kind: 'forbidden' };
      }

      if (!isPositiveInt32(reservationId)) {
        return { kind: 'validation-error' };
      }

      return repo.issue({
        reservationId,
        workerId: user.id,
      });
    },
  };
}
