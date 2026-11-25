import swc from 'unplugin-swc';
import { defaultServerConditions } from 'vite';
import { defineProject } from 'vitest/config';

/**
 * NestJS injects by the constructor parameter types that the compiler writes
 * into decorator metadata. Vite's own transformer does not emit that metadata,
 * so the API's tests are transformed by SWC, as the NestJS documentation
 * prescribes for Vitest.
 */
export default defineProject({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2023',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        keepClassNames: true,
      },
    }),
  ],
  ssr: {
    resolve: {
      conditions: ['@promenade/source', ...defaultServerConditions],
    },
  },
  test: {
    name: 'api',
    root: import.meta.dirname,
    include: ['src/**/*.test.ts'],
  },
});
