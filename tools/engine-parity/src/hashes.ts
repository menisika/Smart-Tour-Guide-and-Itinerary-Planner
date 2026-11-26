import { createHash } from 'node:crypto';

/** The hash of each answer, as the file of expected hashes spells it. */
export function hashAnswers(output: string): string {
  return output
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => {
      const id = (JSON.parse(line) as { id: string }).id;
      return `${createHash('sha256').update(line).digest('hex')}  ${id}\n`;
    })
    .join('');
}

/** The first line on which the hashes differ from the expected ones, if any. */
export function firstChangedAnswer(expected: string, actual: string): string | null {
  if (expected === actual) return null;

  const wanted = expected.split('\n');
  const got = actual.split('\n');
  for (let index = 0; index < Math.max(wanted.length, got.length); index += 1) {
    if (wanted[index] !== got[index]) {
      const line = got[index] ?? wanted[index] ?? '';
      return line.split('  ')[1] ?? '(the number of requests changed)';
    }
  }
  return null;
}
