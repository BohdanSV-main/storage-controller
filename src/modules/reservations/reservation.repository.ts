import type { Reservation } from './reservation.types.js';

export interface CreateReservationInput {
  userId: number;
  productId: number;
  quantity: number;
  idempotencyKey: string;
}

export type CreateReservationResult =
  | { kind: 'created'; reservation: Reservation }
  | { kind: 'replayed'; reservation: Reservation }
  | {
      kind: 'product-not-found';
    }
  | {
      kind: 'insufficient-stock';
    }
  | {
      kind: 'idempotency-conflict';
    };

export interface CancelReservationInput {
  reservationId: number;
  userId: number;
}

export type CancelReservationResult =
  | { kind: 'cancelled'; reservation: Reservation }
  | { kind: 'replayed'; reservation: Reservation }
  | { kind: 'not-found' }
  | { kind: 'forbidden' }
  | { kind: 'invalid-status' };

export interface IssueReservationInput {
  reservationId: number;
  workerId: number;
}

export type IssueReservationResult =
  | { kind: 'issued'; reservation: Reservation }
  | { kind: 'replayed'; reservation: Reservation }
  | { kind: 'not-found' }
  | { kind: 'invalid-status' };

export interface ReservationRepo {
  create(input: CreateReservationInput): Promise<CreateReservationResult>;

  cancel(input: CancelReservationInput): Promise<CancelReservationResult>;

  issue(input: IssueReservationInput): Promise<IssueReservationResult>;
}
