import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.js'],
    environment: 'jsdom',
    globals: true,
  },
});
