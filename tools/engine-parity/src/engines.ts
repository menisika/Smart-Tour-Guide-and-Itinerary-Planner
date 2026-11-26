import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { rolldown } from 'rolldown';

/** Absolute path of this package. */
export const packageRoot = fileURLToPath(new URL('../', import.meta.url));

/** The driver that answers the committed corpus. */
export const defaultDriver = join(packageRoot, 'src/driver.ts');

/** Where the corpus and the hashes of its expected answers are kept. */
export const corpusFile = join(packageRoot, 'corpus/problems.jsonl');
export const expectedHashesFile = join(packageRoot, 'corpus/expected.sha256');

/** The two engines the planner must agree on (ADR-0006, point 9). */
export const engines = ['node', 'hermes'] as const;
export type Engine = (typeof engines)[number];

/**
 * Bundles a driver with `planner`, `verifier`, `routing` and the corpus into
 * one script for an engine. Both scripts come from the same sources, read as
 * TypeScript through the `@promenade/source` condition; nothing is built first.
 */
export async function bundleDriver(
  driver: string,
  engine: Engine,
  outDir: string,
): Promise<string> {
  const file = join(outDir, `driver.${engine}.js`);
  mkdirSync(dirname(file), { recursive: true });

  const bundle = await rolldown({
    input: driver,
    // Neither engine's own modules may be used: the script must run on both.
    platform: 'neutral',
    resolve: { conditionNames: ['@promenade/source', 'import', 'default'] },
    moduleTypes: { '.jsonl': 'text' },
    logLevel: 'warn',
  });
  try {
    await bundle.write({ file, format: 'iife', minify: false, sourcemap: false });
  } finally {
    await bundle.close();
  }
  return file;
}

/** The command that runs a script on an engine from the command line. */
export function engineCommand(engine: Engine): string {
  if (engine === 'node') return process.execPath;

  const hermes = process.env['HERMES_BIN'];
  if (hermes === undefined || hermes === '') {
    throw new Error(
      "HERMES_BIN is not set. Build the phone's engine with tools/engine-parity/scripts/build-hermes.sh <directory> and point HERMES_BIN at <directory>/hermes.",
    );
  }
  return hermes;
}

/** Runs a bundled script on an engine and returns what it wrote. */
export function runOn(engine: Engine, script: string): string {
  const result = spawnSync(engineCommand(engine), [script], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${engine} failed on ${script} (exit ${String(result.status)}):\n${result.stderr}`,
    );
  }
  return result.stdout;
}

/** Bundles the driver for an engine, runs it there and returns its output. */
export async function answersOn(engine: Engine, driver: string, outDir: string): Promise<string> {
  return runOn(engine, await bundleDriver(driver, engine, outDir));
}
