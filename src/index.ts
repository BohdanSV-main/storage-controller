import { buildApp } from './app.js';
import { readFileSync } from 'node:fs';

const versionFile = new URL('./version.txt', import.meta.url);
const sha = readFileSync(versionFile, 'utf8').trim();

const app = buildApp(sha);

try {
  await app.listen({ port: 3000, host: '127.0.0.1' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
