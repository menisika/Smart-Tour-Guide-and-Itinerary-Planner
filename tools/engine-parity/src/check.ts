/**
 * Runs the committed corpus of planning requests on the server's JavaScript
 * engine and on the phone's, and fails unless the outputs are the same bytes
 * (ADR-0006, point 9; ADR-0027, point 2).
 *
 *     node tools/engine-parity/src/check.ts                  the check of the pipeline
 *     node tools/engine-parity/src/check.ts --update-hashes  accept changed answers
 *     node tools/engine-parity/src/check.ts --driver <file>  another driver; hashes are not checked
 *
 * `HERMES_BIN` names the phone's engine: see `scripts/build-hermes.sh`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describeMismatch, firstMismatch } from './compare.ts';
import { answersOn, defaultDriver, expectedHashesFile, packageRoot } from './engines.ts';
import { firstChangedAnswer, hashAnswers } from './hashes.ts';

const args = process.argv.slice(2);
const driverArgument = args.includes('--driver') ? args[args.indexOf('--driver') + 1] : undefined;
const driver = driverArgument === undefined ? defaultDriver : resolve(driverArgument);
const outDir = join(packageRoot, 'dist');

const onNode = await answersOn('node', driver, outDir);
const onHermes = await answersOn('hermes', driver, outDir);
const requests = onNode.split('\n').filter((line) => line !== '').length;

const mismatch = firstMismatch(onNode, onHermes);
if (mismatch !== null) {
  console.error(
    describeMismatch(mismatch, "The server's engine (Node.js)", "The phone's engine (Hermes)"),
  );
  process.exit(1);
}
console.log(`Both engines gave the same ${requests} answers, byte for byte.`);

if (driver === defaultDriver) {
  const hashes = hashAnswers(onNode);

  if (args.includes('--update-hashes')) {
    writeFileSync(expectedHashesFile, hashes);
    console.log(`Wrote the hashes of ${requests} answers to corpus/expected.sha256.`);
  } else {
    const changed = firstChangedAnswer(readFileSync(expectedHashesFile, 'utf8'), hashes);
    if (changed !== null) {
      console.error(
        `The answer to request ${changed} is not the expected one. If the planner was meant to change, run the check with --update-hashes and commit corpus/expected.sha256.`,
      );
      process.exit(1);
    }
    console.log('Every answer has its expected hash.');
  }
}
