import { expect, test, vi } from 'vitest';
import { createApp } from './create-app.js';

const rows = vi.hoisted(
  () =>
    [] as {
      msg: string;
      processId: string;
      reqId?: string;
      productId?: number;
      reservationId?: number;
    }[],
);

vi.mock('./log.js', async (original) => {
  const mod = await original<typeof import('./log.js')>();
  const log = mod.createLog({
    write: (line: string) => {
      rows.push(JSON.parse(line));
    },
  });
  log.level = 'debug';
  return { ...mod, log };
});

test('keeps the same ID across layers for parallel POST requests', async () => {
  const app = await createApp('test', {
    dataSource: 'memory',
    sessionSecret: 'test-secret'.repeat(3),
    appOrigin: 'http://localhost',
    secureCookie: false,
  });
  try {
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { origin: 'http://localhost' },
      payload: { email: 'biba@example.com', password: 'User-one-123!' },
    });
    expect(login.statusCode).toBe(200);
    const cookie = login.cookies.find((item) => item.name === 'sessionId');
    if (!cookie) throw new Error('Missing session cookie');
    rows.length = 0;
    const replies = await Promise.all(
      [1, 2].map((id) =>
        app.inject({
          method: 'POST',
          url: '/reservations',
          cookies: { sessionId: cookie.value },
          headers: {
            origin: 'http://localhost',
            'idempotency-key': String(id),
          },
          payload: { productId: id, quantity: 1 },
        }),
      ),
    );
    const ids = new Set<string>();
    for (const res of replies) {
      expect(res.statusCode).toBe(201);
      const item = res.json();
      const start = rows.find(
        (row) =>
          row.msg === 'Creating reservation' &&
          row.productId === item.productId,
      );
      expect(start?.processId).toBeTruthy();
      const id = start!.processId;
      ids.add(id);
      const group = rows.filter((row) => row.processId === id);
      expect(group.map((row) => row.msg)).toEqual([
        'incoming request',
        'Creating reservation',
        'Reservation creation finished',
        'request completed',
      ]);
      expect(
        group.find((row) => row.msg === 'Reservation creation finished')
          ?.reservationId,
      ).toBe(item.id);
      expect(
        group.filter((row) => row.reqId).every((row) => row.reqId === id),
      ).toBe(true);
      console.info(group.map(({ processId, msg }) => ({ processId, msg })));
    }
    expect(ids.size).toBe(2);
  } finally {
    await app.close();
  }
});
