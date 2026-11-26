import corpus from '../corpus/problems.jsonl';

import type { CorpusEntry } from './answer.ts';
import { canonicalJson } from './canonical-json.ts';

/**
 * The two engines differ in how a script writes a line: the phone's engine has
 * `print` on its command line, the server's has `console.log`.
 */
declare const print: ((line: string) => void) | undefined;
declare const console: { log(line: string): void } | undefined;

function writeLine(line: string): void {
  if (typeof print === 'function') print(line);
  else if (console !== undefined) console.log(line);
}

/**
 * Answers every request of the corpus with `answer` and writes one line of
 * canonical JSON per request, in the order of the corpus.
 */
export function runCorpus(answer: (entry: CorpusEntry) => unknown): void {
  for (const line of corpus.split('\n')) {
    if (line === '') continue;
    writeLine(canonicalJson(answer(JSON.parse(line) as CorpusEntry)));
  }
}
