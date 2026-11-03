import {defineConfig, devices} from '@playwright/test';

/**
 * End-to-end: real browser → Next.js (production build) → Express API → a throwaway MySQL database (commerce_e2e)
 * created, migrated and seeded with DEMO fixtures in global setup and dropped in global teardown.
 */
const E2E_DB = 'mysql://root:root@127.0.0.1:3316/commerce_e2e';
const apiEnv = {
  NODE_ENV: 'development', PORT: '4000', DATABASE_URL: E2E_DB, DEV_TOOLS: 'true', MAIL_DRIVER: 'log', LOG_LEVEL: 'warn',
  APP_BASE_URL: 'http://localhost:3000', API_BASE_URL: 'http://localhost:4000', CORS_ORIGINS: 'http://localhost:3000',
  SESSION_SECRET: 'e2e-session-secret-0123456789abcdefghijklmnopqrstuvwxyz', ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
  CRON_JOB_SECRET: 'e2e-cron-secret-0123456789abcdefghijklmnopqrstuvwxyz', STORAGE_DRIVER: 'local', STORAGE_LOCAL_DIR: '.storage-e2e',
  SHIPPING_WEBHOOK_SECRET: 'e2e-shipping-webhook-secret', WEB_REVALIDATE_SECRET: 'e2e-revalidate-secret',
};

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: {timeout: 15_000},
  reporter: [['list']],
  use: {baseURL: 'http://localhost:3000', trace: 'retain-on-failure', actionTimeout: 20_000, navigationTimeout: 30_000},
  projects: [
    {name: 'desktop', use: {...devices['Desktop Chrome']}},
    {name: 'mobile', use: {...devices['Pixel 7']}, testMatch: /shopper\.spec/, dependencies: ['desktop']},
  ],
  webServer: [
    {command: 'npx tsx src/server.ts', cwd: '../api', port: 4000, reuseExistingServer: false, env: apiEnv, timeout: 60_000},
    {command: 'rm -rf .next/cache/fetch-cache && npx next start -p 3000', port: 3000, reuseExistingServer: false, env: {API_INTERNAL_URL: 'http://localhost:4000', WEB_REVALIDATE_SECRET: 'e2e-revalidate-secret', NEXT_PUBLIC_SITE_URL: 'http://localhost:3000'}, timeout: 60_000},
  ],
});
export {apiEnv, E2E_DB};
