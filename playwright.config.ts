import { readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';
import { parse } from 'dotenv';

const env = parse(readFileSync('.env.test'));
if (
  !env.DATABASE_URL ||
  new URL(env.DATABASE_URL).pathname !== '/storage_controller_test'
) {
  throw new Error('E2E tests require storage_controller_test in .env.test');
}
process.env.DATABASE_URL = env.DATABASE_URL;

const baseURL = 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node dist/index.js',
      url: 'http://127.0.0.1:3000/health',
      env: {
        ...env,
        DATA_SOURCE: 'postgres',
        APP_ORIGIN: baseURL,
        LOG_LEVEL: 'warn',
      },
      reuseExistingServer: false,
    },
    {
      command: 'npm --prefix frontend run preview -- --port 4173',
      url: baseURL,
      env: { API_TARGET: 'http://127.0.0.1:3000' },
      reuseExistingServer: false,
    },
  ],
});
