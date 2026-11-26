import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { canonicalJson } from '../../engine-parity/src/canonical-json.ts';
import { describeMismatch, firstMismatch } from '../../engine-parity/src/compare.ts';
import {
  answersOn,
  defaultDriver,
  expectedHashesFile,
  packageRoot as parityRoot,
} from '../../engine-parity/src/engines.ts';
import { firstChangedAnswer, hashAnswers } from '../../engine-parity/src/hashes.ts';
import { packageRoot, repositoryRoot } from './repository.ts';

/**
 * The planner must give the same bytes on the server's JavaScript engine and
 * on the phone's (ADR-0006, point 9; ADR-0027, point 2). The pipeline job
 * "Planner on both engines" proves it on every change; these tests prove that
 * the job can fail.
 *
 * The phone's engine is not on a developer's machine by default. The tests
 * that need it run when `HERMES_BIN` names it — as the pipeline job does — and
 * are reported as skipped otherwise; the rest always run.
 */
const hermes = process.env['HERMES_BIN'];
const engineDependentDriver = join(packageRoot, 'fixtures/engine-dependent/driver.ts');

function check(...args: string[]) {
  const result = spawnSync(process.execPath, [join(parityRoot, 'src/check.ts'), ...args], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return { exitCode: result.status, output: result.stdout + result.stderr };
}

describe('the comparison of two engines', () => {
  const same = '{"id":"a","n":1}\n{"id":"b","n":2}\n';

  it('accepts outputs that are the same bytes', () => {
    expect(firstMismatch(same, same)).toBeNull();
  });

  it('names the first request the engines disagree on, with both results', () => {
    const other = '{"id":"a","n":1}\n{"id":"b","n":3}\n{"id":"c","n":9}\n';
    const mismatch = firstMismatch(same, other);

    expect(mismatch).toEqual({
      index: 1,
      id: 'b',
      first: '{"id":"b","n":2}',
      second: '{"id":"b","n":3}',
    });
    expect(describeMismatch(mismatch ?? never(), 'Node.js', 'Hermes')).toBe(
      [
        'The engines disagree on request b (number 2 of the corpus).',
        'Node.js: {"id":"b","n":2}',
        'Hermes: {"id":"b","n":3}',
      ].join('\n'),
    );
  });

  it('notices an engine that stopped early', () => {
    expect(firstMismatch(same, '{"id":"a","n":1}\n')).toMatchObject({ index: 1, id: 'b' });
  });

  it('writes JSON one way, whatever order the keys were created in', () => {
    expect(canonicalJson({ b: [2, { d: null, c: true }], a: 'x' })).toBe(
      '{"a":"x","b":[2,{"c":true,"d":null}]}',
    );
  });

  it('refuses to write a fraction or a missing value: an answer holds neither', () => {
    expect(() => canonicalJson({ seconds: 0.5 })).toThrow('Not a whole number');
    expect(() => canonicalJson({ seconds: undefined })).toThrow('cannot hold');
  });
});

describe("the phone's engine is the one the application ships", () => {
  const pin = JSON.parse(readFileSync(join(parityRoot, 'hermes.json'), 'utf8')) as {
    reactNative: string;
    tag: string;
    commit: string;
    tree: string;
  };
  // React Native as the mobile application resolves it.
  const fromMobile = createRequire(join(repositoryRoot, 'apps/mobile/package.json'));
  const reactNativeManifest = fromMobile.resolve('react-native/package.json');

  it('is pinned for the React Native version the application depends on', () => {
    const { version } = JSON.parse(readFileSync(reactNativeManifest, 'utf8')) as {
      version: string;
    };

    expect(pin.reactNative).toBe(version);
  });

  it('is pinned at the Hermes tag that React Native names', () => {
    const shipped = readFileSync(join(reactNativeManifest, '../sdks/.hermesv1version'), 'utf8');

    expect(pin.tag).toBe(shipped.trim());
  });

  it('names its sources by the hashes of a commit and of its tree', () => {
    expect(pin.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(pin.tree).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe("the corpus on the server's engine", () => {
  it('gets the expected answers: the committed hashes are those of the planner as it is', async () => {
    const output = await answersOn('node', defaultDriver, mkdtempSync(join(tmpdir(), 'parity-')));

    expect(
      firstChangedAnswer(readFileSync(expectedHashesFile, 'utf8'), hashAnswers(output)),
    ).toBeNull();
    expect(output.split('\n').length).toBeGreaterThan(100);
  });

  it('notices an answer that changed', () => {
    const expected = 'aaa  solo-0001\nbbb  solo-0002\n';

    expect(firstChangedAnswer(expected, 'aaa  solo-0001\nccc  solo-0002\n')).toBe('solo-0002');
    expect(firstChangedAnswer(expected, expected)).toBeNull();
  });
});

describe.skipIf(hermes === undefined || hermes === '')('the job on both engines', () => {
  it('passes on the committed corpus', () => {
    const { exitCode, output } = check();

    expect(output).toContain('byte for byte');
    expect(exitCode).toBe(0);
  });

  it('fails on a deliberately engine-dependent expression, and shows the first differing request', () => {
    const { exitCode, output } = check('--driver', engineDependentDriver);

    expect(exitCode).toBe(1);
    expect(output).toMatch(/The engines disagree on request \S+ \(number \d+ of the corpus\)\./);
    expect(output).toContain("The server's engine (Node.js): {");
    expect(output).toContain("The phone's engine (Hermes): {");
  });
});

function never(): never {
  throw new Error('A mismatch was expected.');
}
