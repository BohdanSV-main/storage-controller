import { fastifyCookie } from '@fastify/cookie';
import { fastifySession, type SessionStore } from '@fastify/session';
import type { FastifyInstance } from 'fastify';

export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export interface SessionOptions {
  secret: string;
  secureCookie: boolean;
  store?: SessionStore;
}

declare module 'fastify' {
  interface Session {
    userId?: number;
    expiresAt?: number;
  }
}

export function registerSession(
  app: FastifyInstance,
  options: SessionOptions,
): void {
  app.register(fastifyCookie);

  app.register(fastifySession, {
    secret: options.secret,
    ...(options.store ? { store: options.store } : {}),
    cookieName: 'sessionId',
    saveUninitialized: false,
    rolling: false,
    cookie: {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: options.secureCookie,
      maxAge: SESSION_TTL_MS,
    },
  });
}
