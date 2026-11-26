import { defaultClientConditions } from 'vite';
import { defineProject } from 'vitest/config';

/**
 * The Expo application under test is its web target: `react-native` is
 * `react-native-web`, as Metro resolves it for the browser, and a file with a
 * `.web` twin gives way to the twin. A test of screens asks for a DOM with
 * `// @vitest-environment jsdom`; the tests of the device's data layer run in
 * Node.js, against the SQLite built into it.
 */
export default defineProject({
  resolve: {
    alias: [{ find: /^react-native$/, replacement: 'react-native-web' }],
    conditions: ['@promenade/source', ...defaultClientConditions],
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.js', '.mjs', '.js', '.json'],
  },
  oxc: {
    jsx: { runtime: 'automatic' },
  },
  test: {
    name: 'mobile',
    root: import.meta.dirname,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
