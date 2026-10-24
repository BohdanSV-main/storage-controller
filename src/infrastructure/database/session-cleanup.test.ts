import { afterEach, expect, test, vi } from 'vitest';
import { startSessionCleanup } from './session-cleanup.js';

afterEach(() => {
  vi.useRealTimers();
});

test('cleans expired sessions at startup and every minute, then stops', async () => {
  vi.useFakeTimers();
  const now = new Date('2026-10-20T12:00:00.000Z');
  vi.setSystemTime(now);
  const deleteMany = vi.fn().mockResolvedValue({ count: 2 });
  const logger = { error: vi.fn() };

  const stop = startSessionCleanup({ session: { deleteMany } }, logger);

  expect(deleteMany).toHaveBeenCalledWith({
    where: { expiresAt: { lte: now } },
  });
  await vi.advanceTimersByTimeAsync(60_000);
  expect(deleteMany).toHaveBeenCalledTimes(2);
  expect(deleteMany).toHaveBeenLastCalledWith({
    where: { expiresAt: { lte: new Date(now.getTime() + 60_000) } },
  });

  await stop();
  await vi.advanceTimersByTimeAsync(120_000);
  expect(deleteMany).toHaveBeenCalledTimes(2);
  expect(logger.error).not.toHaveBeenCalled();
});

test('does not overlap queries and waits for cleanup when stopping', async () => {
  vi.useFakeTimers();
  let finish!: (result: { count: number }) => void;
  const pending = new Promise<{ count: number }>((resolve) => {
    finish = resolve;
  });
  const deleteMany = vi.fn().mockReturnValue(pending);
  const stop = startSessionCleanup(
    { session: { deleteMany } },
    { error: vi.fn() },
  );

  await vi.advanceTimersByTimeAsync(120_000);
  expect(deleteMany).toHaveBeenCalledTimes(1);

  let stopped = false;
  const stopping = stop().then(() => {
    stopped = true;
  });
  await Promise.resolve();
  expect(stopped).toBe(false);

  finish({ count: 1 });
  await stopping;
  expect(stopped).toBe(true);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(deleteMany).toHaveBeenCalledTimes(1);
});

test('logs a database failure and tries again at the next interval', async () => {
  vi.useFakeTimers();
  const error = new Error('Database unavailable');
  const deleteMany = vi
    .fn()
    .mockRejectedValueOnce(error)
    .mockResolvedValue({ count: 0 });
  const logger = { error: vi.fn() };
  const stop = startSessionCleanup({ session: { deleteMany } }, logger);

  await vi.advanceTimersByTimeAsync(60_000);
  expect(logger.error).toHaveBeenCalledWith(
    { err: error },
    'Failed to remove expired sessions',
  );
  expect(deleteMany).toHaveBeenCalledTimes(2);
  await stop();
});
