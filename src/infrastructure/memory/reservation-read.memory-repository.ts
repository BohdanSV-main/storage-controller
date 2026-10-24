import type { ReservationReadRepo } from '../../modules/reservations/reservation-read.repository.js';
import type {
  Reservation,
  ReservationWithProduct,
} from '../../modules/reservations/reservation.types.js';
import type { MemoryStore } from './memory-store.js';

export function createMemoryReservationReadRepo(
  store: MemoryStore,
): ReservationReadRepo {
  function readReservations(
    predicate: (reservation: Reservation) => boolean,
  ): ReservationWithProduct[] {
    return [...store.reservations.values()]
      .filter(predicate)
      .sort((first, second) => {
        const dateDifference =
          second.createdAt.getTime() - first.createdAt.getTime();

        return dateDifference || second.id - first.id;
      })
      .map((reservation) => {
        const product = store.products.get(reservation.productId);

        if (!product) {
          throw new Error('Reservation references a missing product');
        }

        return structuredClone({
          ...reservation,
          product: {
            id: product.id,
            articleCode: product.articleCode,
            name: product.name,
          },
        });
      });
  }

  return {
    async findByUserId(userId) {
      return readReservations((reservation) => reservation.userId === userId);
    },

    async findActive() {
      return readReservations((reservation) => reservation.status === 'ACTIVE');
    },
    async findById(id) {
      const reservation = store.reservations.get(id);

      if (!reservation) {
        return null;
      }

      const product = store.products.get(reservation.productId);

      if (!product) {
        throw new Error('Reservation references a missing product');
      }

      return structuredClone({
        ...reservation,
        product: {
          id: product.id,
          articleCode: product.articleCode,
          name: product.name,
        },
      });
    },
  };
}
