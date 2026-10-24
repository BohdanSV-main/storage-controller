import type { ProductWithStock } from '../../modules/catalog/product.types.js';
import type { Reservation } from '../../modules/reservations/reservation.types.js';

export interface IdempotencyRecord {
  productId: number;
  quantity: number;
  reservationId: number;
}

export interface MemoryStore {
  products: Map<number, ProductWithStock>;
  reservations: Map<number, Reservation>;
  reservationKeys: Map<number, Map<string, IdempotencyRecord>>;
  nextReservationId: number;
}
export function createMemoryStore(
  initialProducts: readonly ProductWithStock[],
): MemoryStore {
  const products = new Map<number, ProductWithStock>();

  for (const product of initialProducts) {
    products.set(product.id, { ...product, stock: { ...product.stock } });
  }

  return {
    products,
    reservations: new Map<number, Reservation>(),
    reservationKeys: new Map<number, Map<string, IdempotencyRecord>>(),
    nextReservationId: 1,
  };
}
