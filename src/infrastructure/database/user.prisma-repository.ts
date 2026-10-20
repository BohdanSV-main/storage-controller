import type { PrismaClient } from '../../generated/prisma/client.js';
import type { UserRepo } from '../../modules/auth/user.repository.js';

export function createPrismaUserRepo(prisma: PrismaClient): UserRepo {
  return {
    async findById(id) {
      return prisma.user.findUnique({
        where: { id },
      });
    },

    async findByEmail(email) {
      return prisma.user.findUnique({
        where: { email },
      });
    },
  };
}
