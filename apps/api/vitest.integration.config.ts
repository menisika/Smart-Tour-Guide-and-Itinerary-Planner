import { defaultServerConditions } from 'vite';
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
      conditions: ['@promenade/source', ...defaultServerConditions],
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
