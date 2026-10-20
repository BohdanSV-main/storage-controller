import type { SessionStore } from '@fastify/session';
import type { Session } from 'fastify';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';

export function createPrismaSessionStore(prisma: PrismaClient): SessionStore {
  async function saveSession(
    sessionId: string,
    session: Session,
  ): Promise<void> {
    const expiresAtMs = session.expiresAt ?? session.cookie.expires?.getTime();

    if (expiresAtMs === undefined || !Number.isFinite(expiresAtMs)) {
      throw new Error('Session expiration is missing or invalid.');
    }

    const expiresAt = new Date(expiresAtMs);

    if (Number.isNaN(expiresAt.getTime())) {
      throw new Error('Session expiration is invalid.');
    }

    const data = JSON.parse(JSON.stringify(session)) as Prisma.InputJsonObject;

    await prisma.session.upsert({
      where: { id: sessionId },
      create: {
        id: sessionId,
        data,
        expiresAt,
      },
      update: {
        data,
        expiresAt,
      },
    });
  }

  async function loadSession(sessionId: string): Promise<Session | null> {
    const stored = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!stored) {
      return null;
    }

    const now = new Date();

    if (stored.expiresAt.getTime() <= now.getTime()) {
      await prisma.session.deleteMany({
        where: {
          id: sessionId,
          expiresAt: { lte: now },
        },
      });

      return null;
    }

    if (
      stored.data === null ||
      typeof stored.data !== 'object' ||
      Array.isArray(stored.data)
    ) {
      throw new Error('Stored session data is invalid.');
    }

    const session = stored.data as unknown as Session;

    if (
      !session.cookie ||
      typeof session.cookie !== 'object' ||
      Array.isArray(session.cookie)
    ) {
      throw new Error('Stored session cookie is invalid.');
    }

    session.cookie.expires = stored.expiresAt;
    session.expiresAt = stored.expiresAt.getTime();

    return session;
  }

  async function destroySession(sessionId: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { id: sessionId },
    });
  }

  return {
    set(sessionId, session, callback) {
      saveSession(sessionId, session).then(
        () => callback(),
        (error: unknown) => callback(error),
      );
    },

    get(sessionId, callback) {
      loadSession(sessionId).then(
        (session) => callback(null, session),
        (error: unknown) => callback(error),
      );
    },

    destroy(sessionId, callback) {
      destroySession(sessionId).then(
        () => callback(),
        (error: unknown) => callback(error),
      );
    },
  };
}
