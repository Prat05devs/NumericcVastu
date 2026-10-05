import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://localhost:3001', headless: true },
  webServer: { command: 'npm run dev -- --port 3001', url: 'http://localhost:3001', reuseExistingServer: true },
  workers: 2,
  reporter: 'list',
});
