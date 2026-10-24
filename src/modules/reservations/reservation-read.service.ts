import type { PublicUser } from '../auth/user.types.js';
import { isPositiveInt32 } from './reservation.limits.js';
import type { ReservationReadRepo } from './reservation-read.repository.js';
import type { ReservationWithProduct } from './reservation.types.js';

export type GetReservationResult =
  | { kind: 'found'; reservation: ReservationWithProduct }
  | { kind: 'not-found' }
  | { kind: 'forbidden' }
  | { kind: 'validation-error' };

export interface ReservationReadService {
  list(user: PublicUser): Promise<ReservationWithProduct[]>;

  getById(user: PublicUser, id: number): Promise<GetReservationResult>;
}

export function createReservationReadService(
  repo: ReservationReadRepo,
): ReservationReadService {
  return {
    async list(user) {
      if (user.role === 'WORKER') {
        return repo.findActive();
      }

      return repo.findByUserId(user.id);
    },

    async getById(user, id) {
      if (!isPositiveInt32(id)) {
        return { kind: 'validation-error' };
      }

      const reservation = await repo.findById(id);

      if (!reservation) {
        return { kind: 'not-found' };
      }

      if (user.role !== 'WORKER' && reservation.userId !== user.id) {
        return { kind: 'forbidden' };
      }

      return { kind: 'found', reservation };
    },
  };
}
