import { readFileSync } from 'node:fs';
import { log, withLog } from './log.js';
import { readConfig } from './config.js';
import { createApp } from './create-app.js';
import { registerFrontend } from './plugins/frontend.js';

await withLog(async () => {
  const file = new URL('./version.txt', import.meta.url);
  const sha = readFileSync(file, 'utf8').trim();
  const app = await createApp(sha, readConfig());
  try {
    registerFrontend(app);
    const host = process.env.HOST ?? '127.0.0.1';
    const port = Number(process.env.PORT ?? 3000);

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid port number: ${port}`);
    }

    await app.listen({ host, port });
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
