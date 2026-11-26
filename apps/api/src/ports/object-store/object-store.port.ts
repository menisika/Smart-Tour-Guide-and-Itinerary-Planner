/**
 * The `ObjectStore` port (ADR-0010, points 3 and 5): every file the system
 * writes or serves goes through it.
 *
 * - **Two buckets.** The public one holds what anyone may fetch — maps,
 *   glyphs, sprites, photos; the private one holds what is gated or ours alone —
 *   Narrations, database dumps — and answers only to a signed link.
 * - **Content-addressed, immutable.** The store, not the caller, names an
 *   object: `<prefix>/<SHA-256 of the content>[.<extension>]`. The same content
 *   under the same prefix is the same object, so writing it again writes
 *   nothing, and an object never changes once written.
 *
 * The adapter speaks the S3 interface; which server answers — the local
 * emulator, Cloudflare R2 or another — is configuration (`NFR-23`).
 */
export const OBJECT_STORE = Symbol('ObjectStore');

export type Bucket = 'public' | 'private';

/** Where one object lives. */
export interface ObjectRef {
  readonly bucket: Bucket;
  readonly key: string;
}

export interface ObjectInfo extends ObjectRef {
  /** Size in bytes. */
  readonly size: number;
  readonly mediaType: string;
  readonly lastModified: Date;
}

export interface PutRequest {
  readonly bucket: Bucket;
  /**
   * What kind of file this is, as a path: `narrations`, `photos/places`,
   * `dumps`. Lower-case segments separated by `/`.
   */
  readonly prefix: string;
  readonly content: Uint8Array;
  readonly mediaType: string;
  /** Without the dot: `m4a`, `pmtiles`. For servers and people that judge a file by its name. */
  readonly extension?: string;
}

export interface PutOutcome extends ObjectRef {
  /** Lower-case hexadecimal SHA-256 of the content: what a device verifies after download. */
  readonly sha256: string;
  readonly size: number;
  /** `false` when the object was already there and nothing was written. */
  readonly written: boolean;
}

/** Bytes `start` to `end`, both inclusive, as in HTTP; without `end`, to the end of the object. */
export interface ByteRange {
  readonly start: number;
  readonly end?: number;
}

export interface ObjectContent extends ObjectInfo {
  readonly content: Uint8Array;
  /** The bytes returned, when a range was asked for; `size` is always that of the whole object. */
  readonly range: { readonly start: number; readonly end: number } | null;
}

export interface ListOptions {
  /** At most this many objects; the store may return fewer. */
  readonly limit?: number;
  /** `next` of the previous page. */
  readonly after?: string;
}

export interface ObjectPage {
  /** In ascending order of key. */
  readonly objects: readonly ObjectInfo[];
  /** Pass as `after` to get the following page; `null` on the last one. */
  readonly next: string | null;
}

/** About a day (ADR-0010, point 3). */
export const DEFAULT_SIGNED_LINK_LIFETIME_SECONDS = 24 * 60 * 60;

export interface ObjectStore {
  /** Stores the content under its hash. Idempotent: an existing object is not rewritten. */
  put(request: PutRequest): Promise<PutOutcome>;

  /** What is known about an object without fetching it, or `null` when there is none. */
  head(object: ObjectRef): Promise<ObjectInfo | null>;

  /** The object, or the given range of its bytes; `null` when there is none. */
  get(object: ObjectRef, range?: ByteRange): Promise<ObjectContent | null>;

  /**
   * Removes an object — for the deletion of an account and the retention of
   * dumps. Removing what is not there is not an error.
   */
  delete(object: ObjectRef): Promise<void>;

  list(bucket: Bucket, prefix: string, options?: ListOptions): Promise<ObjectPage>;

  /** The permanent address of an object of the public bucket. Asks no server. */
  publicLink(key: string): string;

  /**
   * A link to an object of the private bucket that works without credentials
   * until it expires. Each call issues a fresh one, which is how a download
   * that outlived its link resumes. Asks no server: the link is computed.
   */
  signedLink(key: string, lifetimeSeconds?: number): Promise<string>;
}

/** The store could not be reached or refused the operation; `cause` holds what it said. */
export class ObjectStoreError extends Error {
  constructor(operation: string, cause: unknown) {
    super(
      `The object store failed to ${operation}: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
    this.name = 'ObjectStoreError';
  }
}

/** The store did not answer in time. */
export class ObjectStoreTimeoutError extends ObjectStoreError {
  constructor(operation: string) {
    super(operation, new Error('no answer in time'));
    this.name = 'ObjectStoreTimeoutError';
  }
}
