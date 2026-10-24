import { Prisma } from '../../generated/prisma/client.js';

const unavailableCodes = new Set([
  'P1001', // Cannot reach the database.
  'P1002', // Connection timed out.
  'P1008', // Operation timed out.
  'P1017', // Connection closed.
  'P2024', // Connection pool timed out.
  'P2034', // Transaction retries were exhausted.
  'P2037', // Too many connections.
]);

export function isDbUnavailable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return unavailableCodes.has(error.code);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return (
      error.errorCode !== undefined && unavailableCodes.has(error.errorCode)
    );
  }

  if (error instanceof Error && error.name === 'DriverAdapterError') {
    const cause = error.cause;
    if (cause && typeof cause === 'object' && 'kind' in cause) {
      return [
        'DatabaseNotReachable',
        'ConnectionClosed',
        'SocketTimeout',
      ].includes(String(cause.kind));
    }
  }

  return false;
}
