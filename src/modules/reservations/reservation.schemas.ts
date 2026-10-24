import { MAX_INT32 } from './reservation.limits.js';

export interface CreateReservationBody {
  productId: number;
  quantity: number;
}

export interface CreateReservationHeaders {
  'idempotency-key': string;
}

export const createReservationBodySchema = {
  type: 'object',
  required: ['productId', 'quantity'],
  additionalProperties: false,
  properties: {
    productId: {
      type: 'integer',
      minimum: 1,
      maximum: MAX_INT32,
    },
    quantity: {
      type: 'integer',
      minimum: 1,
      maximum: MAX_INT32,
    },
  },
};

export const createReservationHeadersSchema = {
  type: 'object',
  required: ['idempotency-key'],
  properties: {
    'idempotency-key': {
      type: 'string',
      minLength: 1,
      maxLength: 128,
      pattern: '\\S',
    },
  },
};

export interface ReservationIdParams {
  id: string;
}

export const reservationIdParamsSchema = {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: {
      type: 'string',
      pattern: '^[1-9][0-9]*$',
    },
  },
};
