import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import pino, { type DestinationStream } from 'pino';

const ctx = new AsyncLocalStorage<string>();
const bootId = randomUUID();

export function withLog<T>(fn: () => T, id: string = randomUUID()): T {
  return ctx.run(id, fn);
}

export function createLog(stream?: DestinationStream) {
  return pino(
    {
      mixin(_data, _level, logger) {
        return {
          processId: logger.bindings().reqId ?? ctx.getStore() ?? bootId,
        };
      },
    },
    stream,
  );
}

export const log = createLog();
