// Test configuration. The database is a throwaway schema created by global-setup; secrets are random per run.
import {randomBytes} from 'node:crypto';

const base = process.env['TEST_DATABASE_URL'] ?? 'mysql://root:root@127.0.0.1:3316/commerce_test';
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: base,
  DATABASE_POOL_SIZE: '10',
  SESSION_SECRET: process.env['TEST_SESSION_SECRET'] ?? 'test-session-secret-0123456789abcdefghijklmnop',
  ENCRYPTION_KEY: process.env['TEST_ENCRYPTION_KEY'] ?? randomBytes(32).toString('base64'),
  CRON_JOB_SECRET: 'test-cron-secret-0123456789abcdefghijklmnopqrstuv',
  SITE_BOOKINGS_SECRET: 'test-site-bookings-secret-0123456789abcdefghij',
  CORS_ORIGINS: 'http://localhost:3000',
  APP_BASE_URL: 'http://localhost:3000',
  API_BASE_URL: 'http://localhost:4000',
  MAIL_DRIVER: 'log',
  STORAGE_DRIVER: 'local',
  STORAGE_LOCAL_DIR: process.env['TEST_STORAGE_DIR'] ?? '.storage-test',
  ALLOW_LIVE_PAYMENTS: 'false',
  SHIPPING_WEBHOOK_SECRET: 'test-shipping-webhook-secret',
});
