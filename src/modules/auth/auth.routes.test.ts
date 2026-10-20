import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { setupApp, config, password } from '../../testing/app.js';
import { SESSION_TTL_MS } from '../../plugins/session.js';
let ctx: Awaited<ReturnType<typeof setupApp>>;
beforeEach(async () => {
  ctx = await setupApp();
});
afterEach(async () => {
  vi.restoreAllMocks();
  await ctx.app.close();
});

test('login returns public data; logout revokes the session', async () => {
  const cookies = await ctx.login();
  const response = await ctx.app.inject({ url: '/auth/me', cookies });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({
    id: 1,
    name: 'User 1',
    email: 'user1@example.com',
    role: 'USER',
  });
  const logout = await ctx.app.inject({
    method: 'POST',
    url: '/auth/logout',
    cookies,
    headers: { origin: config.appOrigin },
  });
  expect(logout.statusCode).toBe(204);
  expect(logout.body).toBe('');
  expect((await ctx.app.inject({ url: '/auth/me', cookies })).statusCode).toBe(
    401,
  );
});

test('wrong credentials do not create a session', async () => {
  const result = await ctx.app.inject({
    method: 'POST',
    url: '/auth/login',
    headers: { origin: config.appOrigin },
    payload: { email: 'user1@example.com', password: 'wrong' },
  });
  expect(result.statusCode).toBe(401);
  expect(
    result.cookies.filter(
      (cookie) => cookie.name === 'sessionId' && cookie.value,
    ),
  ).toEqual([]);
});

test('expired sessions lose access', async () => {
  const cookies = await ctx.login();
  const now = Date.now();
  vi.spyOn(Date, 'now').mockReturnValue(now + SESSION_TTL_MS + 1);
  expect((await ctx.app.inject({ url: '/auth/me', cookies })).statusCode).toBe(
    401,
  );
});

test('successful login replaces the old session', async () => {
  const old = await ctx.login();
  const response = await ctx.app.inject({
    method: 'POST',
    url: '/auth/login',
    cookies: old,
    headers: { origin: config.appOrigin },
    payload: { email: 'user1@example.com', password },
  });
  expect(response.statusCode).toBe(200);
  const current = response.cookies.findLast(
    (cookie) => cookie.name === 'sessionId',
  )!;
  expect(current.value).not.toBe(old.sessionId);
  expect(
    (await ctx.app.inject({ url: '/auth/me', cookies: old })).statusCode,
  ).toBe(401);
  expect(
    (
      await ctx.app.inject({
        url: '/auth/me',
        cookies: { sessionId: current.value },
      })
    ).statusCode,
  ).toBe(200);
});
