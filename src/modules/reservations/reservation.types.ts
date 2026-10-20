export type ReservationStatus = 'ACTIVE' | 'CANCELLED' | 'ISSUED';
import type { Product } from '../catalog/product.types.js';

export interface Reservation {
  id: number;
  userId: number;
  productId: number;
  quantity: number;
  status: ReservationStatus;
  createdAt: Date;
  closedAt: Date | null;
  issuedById: number | null;
}

export interface ReservationWithProduct extends Reservation {
  product: Pick<Product, 'id' | 'articleCode' | 'name'>;
}
