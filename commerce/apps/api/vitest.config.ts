import {defineConfig} from 'vitest/config';

// Integration tests share one migrated MySQL database (commerce_test), so files run one after another.
export default defineConfig({
  test: {
    globalSetup: ['./tests/support/global-setup.ts'],
    setupFiles: ['./tests/support/env.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
    reporters: ['default'],
  },
});
