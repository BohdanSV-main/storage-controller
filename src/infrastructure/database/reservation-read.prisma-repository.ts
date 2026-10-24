import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import type { ReservationReadRepo } from '../../modules/reservations/reservation-read.repository.js';

const reservationSelect = {
  id: true,
  userId: true,
  productId: true,
  quantity: true,
  status: true,
  createdAt: true,
  closedAt: true,
  issuedById: true,
  product: {
    select: {
      id: true,
      articleCode: true,
      name: true,
    },
  },
} satisfies Prisma.ReservationSelect;

export function createPrismaReservationReadRepo(
  prisma: PrismaClient,
): ReservationReadRepo {
  return {
    async findByUserId(userId) {
      return prisma.reservation.findMany({
        where: { userId },
        select: reservationSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
    },

    async findActive() {
      return prisma.reservation.findMany({
        where: { status: 'ACTIVE' },
        select: reservationSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
    },

    async findById(id) {
      return prisma.reservation.findUnique({
        where: { id },
        select: reservationSelect,
      });
    },
  };
}
