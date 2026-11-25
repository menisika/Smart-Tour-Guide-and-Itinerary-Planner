// @ts-check
import js from '@eslint/js';
import promenade from '@promenade/eslint-plugin';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Packages whose results must be identical on every JavaScript engine
 * (ADR-0006, point 2). Tests are exempt: they do not ship.
 */
const INTEGER_ONLY_SOURCES = [
  'packages/planner/src/**/*.ts',
  'packages/verifier/src/**/*.ts',
  'packages/routing/src/**/*.ts',
];

export default defineConfig(
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**',
    '**/.expo/**',
    '**/expo-env.d.ts',
    // Deliberately wrong code that the architecture tests feed to the checks.
    'tools/architecture-tests/fixtures/**',
    // Not part of the workspace, and not ours to lint.
    'spikes/**',
    'docs/**',
    'infra/.terraform/**',
  ]),

  { linterOptions: { reportUnusedDisableDirectives: 'error' } },

  js.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Numbers and booleans in a template are unambiguous.
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // A NestJS module is an empty class that carries a decorator.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
    },
  },

  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.node },
  },

  {
    files: ['apps/mobile/**/*.{ts,tsx}', 'apps/console/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
  },

  // ADR-0006, point 2 — no floating-point code where results must be
  // reproducible. `noInlineConfig` means the rule cannot be switched off with a
  // comment inside these files; an exception has to be made here, in review.
  {
    files: INTEGER_ONLY_SOURCES,
    ignores: ['**/*.test.ts'],
    plugins: { promenade },
    linterOptions: { noInlineConfig: true },
    rules: {
      'promenade/no-floating-point': 'error',
    },
  },

  // ADR-0006, point 7 — the verifier may not import the planner. This gives
  // the message in the editor; `.dependency-cruiser.cjs` holds the full rule,
  // which also follows imports through other packages.
  {
    files: ['packages/verifier/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@promenade/planner', '@promenade/planner/*', '**/planner/**'],
              message:
                'The verifier may not import the planner: it must share no code with it (ADR-0006, point 7).',
            },
          ],
        },
      ],
    },
  },
);
