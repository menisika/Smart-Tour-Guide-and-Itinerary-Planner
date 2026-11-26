/**
 * JSON with one spelling: object keys in the order of their UTF-16 code
 * units, no white space. Two engines that computed the same value write the
 * same bytes, whatever order they created the keys in.
 *
 * Only what a planning answer holds is accepted — strings, booleans, `null`,
 * whole numbers, lists and plain objects. A fraction, `undefined` or anything
 * else is an error: it would be a defect of the answer, not of the writer.
 */
export function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error(`Not a whole number: ${String(value)}`);
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
  }
  throw new Error(`A planning answer cannot hold a value of type ${typeof value}.`);
}
