import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

import { repositoryRoot } from './repository.ts';

/**
 * A session works in a worktree under `.claude/worktrees/`: a whole copy of
 * the repository inside the checkout, on another branch. `pnpm lint` in the
 * checkout must leave the copies alone. When it did not, ESLint ran out of
 * memory over them and Prettier reported the files of other branches.
 *
 * The paths below do not exist on disk: both tools answer from their
 * configuration, the one `pnpm lint` uses.
 */
const SOURCE_FILE = 'packages/planner/src/plan-route.ts';
const SAME_FILE_IN_A_COPY = join('.claude/worktrees/some-session', SOURCE_FILE);

const eslint = new ESLint({ cwd: repositoryRoot });

interface PrettierFileInfo {
  readonly ignored: boolean;
}

function prettierIgnores(repositoryPath: string): boolean {
  const result = spawnSync(
    join(repositoryRoot, 'node_modules/.bin/prettier'),
    ['--file-info', repositoryPath],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );
  if (result.error) throw result.error;
  return (JSON.parse(result.stdout) as PrettierFileInfo).ignored;
}

describe('the copies of the repository under .claude/worktrees are left alone', () => {
  it('ESLint ignores a file of a copy', async () => {
    expect(await eslint.isPathIgnored(join(repositoryRoot, SAME_FILE_IN_A_COPY))).toBe(true);
  });

  it('ESLint lints the same file of the checkout', async () => {
    expect(await eslint.isPathIgnored(join(repositoryRoot, SOURCE_FILE))).toBe(false);
  });

  it('Prettier ignores a file of a copy', () => {
    expect(prettierIgnores(SAME_FILE_IN_A_COPY)).toBe(true);
  });

  it('Prettier checks the same file of the checkout', () => {
    expect(prettierIgnores(SOURCE_FILE)).toBe(false);
  });
});
