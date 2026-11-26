import { createHash } from 'node:crypto';

const PREFIX = /^[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)*$/;
const EXTENSION = /^[a-z0-9]+$/;

/** Lower-case hexadecimal SHA-256. */
export function sha256Hex(content: Uint8Array): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * The key of a content-addressed object (ADR-0010, point 5):
 * `<prefix>/<sha256>[.<extension>]`.
 */
export function contentKey(prefix: string, sha256: string, extension?: string): string {
  if (!PREFIX.test(prefix)) {
    throw new Error(
      `An object prefix is lower-case segments of letters, digits and hyphens separated by "/"; got "${prefix}".`,
    );
  }
  if (extension !== undefined && !EXTENSION.test(extension)) {
    throw new Error(
      `An object extension is lower-case letters and digits without a dot; got "${extension}".`,
    );
  }

  return `${prefix}/${sha256}${extension === undefined ? '' : `.${extension}`}`;
}
