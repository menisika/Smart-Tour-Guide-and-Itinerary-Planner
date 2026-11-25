import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Recorded responses of the paid services, replayed instead of calling them
 * (ADR-0002, point 3; ADR-0004, points 6 and 11; ADR-0027, point 12).
 *
 * Layout: `<recordings>/<port>/<key>.json`, where the key is the SHA-256 of
 * the request in canonical JSON. A response that carries audio keeps it in a
 * file next to the JSON. `docs/development.md` describes the files.
 */
export type RecordedPort = 'language-model' | 'speech-synthesis' | 'speech-recognition';

/** No recording exists for a request. The message says which file would answer it. */
export class RecordingNotFoundError extends Error {
  constructor(
    readonly port: RecordedPort,
    readonly key: string,
    readonly expectedPath: string,
  ) {
    super(
      `No recorded response of ${port} for this request. ` +
        `The replay adapter looked for ${expectedPath}. ` +
        'Recordings are made on purpose, with a real adapter and a key of your own; ' +
        'nothing calls a paid service by itself.',
    );
    this.name = 'RecordingNotFoundError';
  }
}

/** JSON with object keys in sorted order, so that equal requests give equal text. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, nested: unknown) => {
    if (nested === null || typeof nested !== 'object' || Array.isArray(nested)) return nested;
    return Object.fromEntries(
      Object.entries(nested).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    );
  });
}

export function sha256Hex(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

/** The key under which the response to `request` is recorded. */
export function recordingKey(request: unknown): string {
  return sha256Hex(canonicalJson(request));
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

export class RecordingStore {
  constructor(private readonly directory: string) {}

  /** Reads and parses `<port>/<key>.json`. */
  async readRecording(port: RecordedPort, key: string): Promise<unknown> {
    const path = join(this.directory, port, `${key}.json`);
    try {
      return JSON.parse(await readFile(path, 'utf8')) as unknown;
    } catch (error) {
      if (isMissingFile(error)) throw new RecordingNotFoundError(port, key, path);
      throw error;
    }
  }

  /** Reads a binary file that a recording refers to by name. */
  async readAttachment(port: RecordedPort, key: string, fileName: string): Promise<Uint8Array> {
    if (fileName.includes('/') || fileName.includes('\\') || fileName.startsWith('.')) {
      throw new Error(`Recording ${port}/${key} refers to a file outside its folder: ${fileName}`);
    }
    return new Uint8Array(await readFile(join(this.directory, port, fileName)));
  }
}
