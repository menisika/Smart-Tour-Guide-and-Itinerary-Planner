import { join } from 'node:path';

import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';

import { repositoryRoot } from './repository.ts';

/**
 * Lints deliberately wrong code with the real `eslint.config.mjs` — the one
 * `pnpm lint` uses — as if it were a file of a given package, and checks that
 * the rule fires there and nowhere else.
 *
 * The files do not exist on disk, so rules that need type information are
 * switched off for these runs. The rules under test do not need it.
 */
const eslint = new ESLint({
  cwd: repositoryRoot,
  overrideConfig: [tseslint.configs.disableTypeChecked],
});

async function ruleIdsFor(repositoryPath: string, code: string): Promise<readonly string[]> {
  const [result] = await eslint.lintText(code, {
    filePath: join(repositoryRoot, repositoryPath),
  });
  if (!result) throw new Error(`ESLint ignored ${repositoryPath}`);
  return result.messages.map((message) => message.ruleId ?? '(no rule)');
}

const FLOAT_RULE = 'promenade/no-floating-point';

describe('floating-point code fails in planner, verifier and routing (ADR-0006)', () => {
  it.each(['planner', 'verifier', 'routing'])('catches a float literal in %s', async (name) => {
    const ruleIds = await ruleIdsFor(
      `packages/${name}/src/violation.ts`,
      'export const weight = 0.5;\n',
    );

    expect(ruleIds).toEqual([FLOAT_RULE]);
  });

  it.each(['planner', 'verifier', 'routing'])(
    'catches a transcendental Math function in %s',
    async (name) => {
      const ruleIds = await ruleIdsFor(
        `packages/${name}/src/violation.ts`,
        'export const distance = (dx: number, dy: number): number => Math.hypot(dx, dy);\n',
      );

      expect(ruleIds).toEqual([FLOAT_RULE]);
    },
  );

  it('catches a division that is not rounded', async () => {
    const ruleIds = await ruleIdsFor(
      'packages/planner/src/violation.ts',
      'export const share = (part: number, total: number): number => part / total;\n',
    );

    expect(ruleIds).toEqual([FLOAT_RULE]);
  });

  it('cannot be switched off with a comment inside the file', async () => {
    const ruleIds = await ruleIdsFor(
      'packages/planner/src/violation.ts',
      '// eslint-disable-next-line promenade/no-floating-point\nexport const weight = 0.5;\n',
    );

    expect(ruleIds).toContain(FLOAT_RULE);
  });

  it('accepts integer arithmetic', async () => {
    const ruleIds = await ruleIdsFor(
      'packages/planner/src/violation.ts',
      'export const half = (seconds: number): number => Math.trunc(seconds / 2);\n',
    );

    expect(ruleIds).toEqual([]);
  });

  it('does not apply to packages that may use floats', async () => {
    const ruleIds = await ruleIdsFor(
      'packages/triggers/src/violation.ts',
      'export const accuracyMeters = 7.5;\n',
    );

    expect(ruleIds).toEqual([]);
  });

  it('does not apply to tests of the integer-only packages', async () => {
    const ruleIds = await ruleIdsFor(
      'packages/planner/src/violation.test.ts',
      'export const tolerance = 0.5;\n',
    );

    expect(ruleIds).toEqual([]);
  });
});

describe('the verifier may not import the planner (ADR-0006)', () => {
  it('catches an import by package name', async () => {
    const ruleIds = await ruleIdsFor(
      'packages/verifier/src/violation.ts',
      "import { planRoute } from '@promenade/planner';\n\nexport const stolen = planRoute;\n",
    );

    expect(ruleIds).toEqual(['no-restricted-imports']);
  });

  it('catches a relative import', async () => {
    const ruleIds = await ruleIdsFor(
      'packages/verifier/src/violation.ts',
      "import { planRoute } from '../../planner/src/index.ts';\n\nexport const stolen = planRoute;\n",
    );

    expect(ruleIds).toEqual(['no-restricted-imports']);
  });

  it('lets the planner import the verifier, as its tests do', async () => {
    const ruleIds = await ruleIdsFor(
      'packages/planner/src/violation.test.ts',
      "import { verifyRoute } from '@promenade/verifier';\n\nexport const check = verifyRoute;\n",
    );

    expect(ruleIds).toEqual([]);
  });
});
