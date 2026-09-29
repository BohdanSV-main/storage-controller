import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim();
const versionFile = new URL('../dist/version.txt', import.meta.url);

writeFileSync(versionFile, `${sha}\n`, 'utf8');
