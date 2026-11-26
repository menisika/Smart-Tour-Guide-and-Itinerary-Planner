import swc from 'unplugin-swc';
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
      // As Node.js resolves at run time, plus our sources. Vite's default list
      // adds `module`, a bundler's condition: under it the S3 client resolves
      // to a build that only a bundler can load.
      conditions: ['@promenade/source', 'node'],
    },
  },
  test: {
    name: 'api',
    root: import.meta.dirname,
    include: ['src/**/*.test.ts'],
  },
});
