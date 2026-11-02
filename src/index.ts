import { readFileSync } from 'node:fs';
import { log, withLog } from './log.js';
import { readConfig } from './config.js';
import { createApp } from './create-app.js';

await withLog(async () => {
  const file = new URL('./version.txt', import.meta.url);
  const sha = readFileSync(file, 'utf8').trim();
  const app = await createApp(sha, readConfig());
  try {
    await app.listen({ port: 3000, host: '127.0.0.1' });
  } catch (err) {
    await app.close();
    throw err;
  }
  const shutdown = () => {
    void withLog(() =>
      app.close().catch((err: unknown) => {
        log.error(err);
        process.exitCode = 1;
      }),
    );
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}).catch((err: unknown) => {
  log.error(err);
  process.exitCode = 1;
});
