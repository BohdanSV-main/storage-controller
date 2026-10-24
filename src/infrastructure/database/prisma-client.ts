import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

export function createPrismaClient(connectionString: string): PrismaClient {
  const adapter = new PrismaPg({
    connectionString,
    connectionTimeoutMillis: 5_000,
  });

  return new PrismaClient({ adapter });
}
