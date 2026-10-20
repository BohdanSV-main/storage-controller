import { beforeEach, afterEach, expect, test } from 'vitest';
import { setupApp, config } from '../../testing/app.js';
let ctx: Awaited<ReturnType<typeof setupApp>>;
let cookies: { sessionId: string };
beforeEach(async () => {
  ctx = await setupApp();
  cookies = await ctx.login();
});
afterEach(async () => {
  await ctx?.app.close();
});
function create(quantity = 2, key = 'first', session = cookies) {
  return ctx.app.inject({
    method: 'POST',
    url: '/reservations',
    cookies: session,
    headers: { origin: config.appOrigin, 'idempotency-key': key },
    payload: { productId: 1, quantity },
  });
}
function action(id: number, name: string, session = cookies) {
  return ctx.app.inject({
    method: 'POST',
    url: '/reservations/' + id + '/' + name,
    cookies: session,
    headers: { origin: config.appOrigin },
  });
}

test('create and cancel update stock once, including retries', async () => {
  const first = await create();
  expect(first.statusCode).toBe(201);
  const replay = await create();
  expect(replay.statusCode).toBe(200);
  expect(replay.json()).toEqual(first.json());
  const catalog = await ctx.app.inject({ url: '/products', cookies });
  expect(catalog.json()[0].available).toBe(3);
  const cancelled = await action(first.json().id, 'cancel');
  expect(cancelled.json().status).toBe('CANCELLED');
  expect((await action(first.json().id, 'cancel')).json()).toEqual(
    cancelled.json(),
  );
  expect(ctx.store.products.get(1)?.stock).toMatchObject({
    onHand: 5,
    reserved: 0,
  });
});

test('only a worker can issue stock; repeated issue is safe', async () => {
  const id = (await create()).json().id;
  expect((await action(id, 'issue')).statusCode).toBe(403);
  const worker = await ctx.login(3);
  expect((await create(1, 'worker', worker)).statusCode).toBe(403);
  const issued = await action(id, 'issue', worker);
  expect(issued.statusCode).toBe(200);
  expect(issued.json()).toMatchObject({ status: 'ISSUED', issuedById: 3 });
  expect((await action(id, 'issue', worker)).json()).toEqual(issued.json());
  expect(ctx.store.products.get(1)?.stock).toMatchObject({
    onHand: 3,
    reserved: 0,
  });
  expect((await action(id, 'cancel')).statusCode).toBe(409);
});

test('users cannot read or cancel another user reservation', async () => {
  const id = (await create()).json().id;
  const other = await ctx.login(2);
  expect(
    (await ctx.app.inject({ url: '/reservations', cookies: other })).json(),
  ).toEqual([]);
  expect(
    (await ctx.app.inject({ url: '/reservations/' + id, cookies: other }))
      .statusCode,
  ).toBe(403);
  expect((await action(id, 'cancel', other)).statusCode).toBe(403);
  expect(ctx.store.products.get(1)?.stock.reserved).toBe(2);
  const worker = await ctx.login(3);
  expect(
    (await ctx.app.inject({ url: '/reservations', cookies: worker })).json(),
  ).toHaveLength(1);
  await action(id, 'cancel');
  expect(
    (await ctx.app.inject({ url: '/reservations', cookies: worker })).json(),
  ).toEqual([]);
  expect((await action(id, 'issue', worker)).statusCode).toBe(409);
});

test('invalid input, stock shortage and conflicting keys do not write data', async () => {
  expect((await create(0)).statusCode).toBe(400);
  expect((await create(2147483648)).statusCode).toBe(400);
  expect((await create(6)).statusCode).toBe(409);
  expect(ctx.store.reservations.size).toBe(0);
  await create();
  expect((await create(3)).statusCode).toBe(409);
  expect(ctx.store.reservations.size).toBe(1);
  expect(ctx.store.products.get(1)?.stock.reserved).toBe(2);
});

test('protected endpoints reject missing sessions without changes', async () => {
  for (const url of ['/products', '/reservations', '/reservations/1']) {
    expect((await ctx.app.inject(url)).statusCode).toBe(401);
  }
  expect((await create(1, 'anonymous', { sessionId: '' })).statusCode).toBe(
    401,
  );
  expect(ctx.store.reservations.size).toBe(0);
});
