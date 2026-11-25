import { defaultClientConditions, defaultServerConditions } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * One `pnpm test` for the whole workspace.
 *
 * Workspace packages are resolved to their TypeScript sources through the
 * `@promenade/source` export condition, so no build is needed before testing.
 */
const SOURCE_CONDITION = '@promenade/source';

export default defineConfig({
  resolve: {
    conditions: [SOURCE_CONDITION, ...defaultClientConditions],
  },
  ssr: {
    resolve: {
      conditions: [SOURCE_CONDITION, ...defaultServerConditions],
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'packages',
          include: ['packages/*/src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'tools',
          include: ['tools/*/src/**/*.test.{ts,js}'],
          // The architecture tests start ESLint and dependency-cruiser.
          testTimeout: 60_000,
        },
      },
      // The API needs a transformer that emits decorator metadata for NestJS.
      'apps/api/vitest.config.ts',
    ],
  },
});
