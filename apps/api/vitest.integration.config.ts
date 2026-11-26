import { defineConfig } from 'vitest/config';

/**
 * `pnpm test:integration` — tests that need the services of the compose
 * environment (`docker compose up`): a real Postgres, the object storage.
 *
 * They are kept out of `pnpm test`, which must pass on a fresh clone with
 * nothing running. The pipeline runs them in the job that starts the compose
 * environment.
 */
export default defineConfig({
  ssr: {
    resolve: {
      // As Node.js resolves at run time, plus our sources. Vite's default list
      // adds `module`, a bundler's condition: under it the S3 client resolves
      // to a build that only a bundler can load.
      conditions: ['@promenade/source', 'node'],
    },
  },
  test: {
    name: 'api-integration',
    root: import.meta.dirname,
    include: ['integration/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
