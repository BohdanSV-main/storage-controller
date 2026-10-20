import type { ReservationWithProduct } from './reservation.types.js';

export interface ReservationReadRepo {
  findByUserId(userId: number): Promise<ReservationWithProduct[]>;

  findActive(): Promise<ReservationWithProduct[]>;

  findById(id: number): Promise<ReservationWithProduct | null>;
}
