import { expect, test } from 'vitest';
import { setTimeout as delay } from 'node:timers/promises';
import { buildApp } from './app.js';
import { createLog, withLog } from './log.js';

test('keeps request IDs in HTTP', async () => {
  const rows: { processId: string; msg: string }[] = [];
  const log = createLog({
    write: (line: string) => {
      rows.push(JSON.parse(line));
    },
  });
  const app = buildApp(
    'test',
    {
      sessionSecret: 'test-secret'.repeat(3),
      appOrigin: 'http://localhost',
      secureCookie: false,
    },
    { log },
  );
  app.get<{ Params: { name: string } }>('/test/:name', async (req) => {
    await delay(req.params.name === 'fail' ? 15 : 1);
    log.info(req.params.name);
    if (req.params.name === 'fail') throw new Error('test failure');
    return { id: req.id };
  });
  try {
    const [ok, fail] = await Promise.all([
      app.inject('/test/ok'),
      app.inject('/test/fail'),
    ]);
    expect(ok.statusCode).toBe(200);
    expect(fail.statusCode).toBe(500);
    const okId = ok.json().id;
    const failId = rows.find((row) => row.msg === 'fail')?.processId;
    expect(failId).toBeTruthy();
    expect(failId).not.toBe(okId);
    expect(rows.find((row) => row.msg === 'ok')?.processId).toBe(okId);
    expect(
      rows.filter((row) => row.processId === okId).map((row) => row.msg),
    ).toEqual(['incoming request', 'ok', 'request completed']);
    expect(rows.filter((row) => row.processId === failId)).toHaveLength(4);
    expect(rows.every((row) => Boolean(row.processId))).toBe(true);
  } finally {
    await app.close();
  }
});

test('gives background runs and restores context', async () => {
  const ids: string[] = [];
  const log = createLog({
    write: (line: string) => {
      ids.push(JSON.parse(line).processId);
    },
  });
  await withLog(async () => {
    log.info('before');
    await withLog(async () => {
      await delay(1);
      log.info('job');
    });
    log.info('after');
  });
  expect(ids[0]).toBeTruthy();
  expect(ids[1]).toBeTruthy();
  expect(ids[0]).toBe(ids[2]);
  expect(ids[1]).not.toBe(ids[0]);
});
