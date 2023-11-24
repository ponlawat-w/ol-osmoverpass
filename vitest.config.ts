import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**\/tests\/*.test.ts'],
    environment: 'happy-dom',
    testTimeout: 60000
  }
});
