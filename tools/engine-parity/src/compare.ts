/** The first request on which two engines disagree. */
export interface Mismatch {
  /** Position of the request in the corpus, from zero. */
  readonly index: number;
  /** The request's identifier, read from either line when one can be read. */
  readonly id: string | null;
  /** What each engine wrote for it; `null` when it wrote nothing. */
  readonly first: string | null;
  readonly second: string | null;
}

function idOf(line: string | null): string | null {
  if (line === null) return null;
  try {
    const value: unknown = JSON.parse(line);
    if (typeof value === 'object' && value !== null && 'id' in value) {
      return typeof value.id === 'string' ? value.id : null;
    }
  } catch {
    // Not JSON: the line itself is the finding.
  }
  return null;
}

/**
 * Compares what two engines wrote, byte for byte, line by line. Returns the
 * first request on which they differ, or `null` when the outputs are the same.
 */
export function firstMismatch(first: string, second: string): Mismatch | null {
  if (first === second) return null;

  const a = first.split('\n');
  const b = second.split('\n');
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const lineA = a[index] ?? null;
    const lineB = b[index] ?? null;
    if (lineA === lineB) continue;
    return { index, id: idOf(lineA) ?? idOf(lineB), first: lineA, second: lineB };
  }
  return null;
}

/** The message the job prints for a mismatch. */
export function describeMismatch(
  mismatch: Mismatch,
  firstName: string,
  secondName: string,
): string {
  return [
    `The engines disagree on request ${mismatch.id ?? '(unnamed)'} (number ${mismatch.index + 1} of the corpus).`,
    `${firstName}: ${mismatch.first ?? '(nothing)'}`,
    `${secondName}: ${mismatch.second ?? '(nothing)'}`,
  ].join('\n');
}
