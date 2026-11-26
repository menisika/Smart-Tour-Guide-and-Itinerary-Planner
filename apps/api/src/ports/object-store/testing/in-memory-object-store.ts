import { contentKey, sha256Hex } from '../content-key.ts';
import {
  type Bucket,
  type ByteRange,
  DEFAULT_SIGNED_LINK_LIFETIME_SECONDS,
  type ListOptions,
  type ObjectContent,
  type ObjectInfo,
  type ObjectPage,
  type ObjectRef,
  type ObjectStore,
  type PutOutcome,
  type PutRequest,
} from '../object-store.port.ts';

interface Stored {
  readonly content: Uint8Array;
  readonly mediaType: string;
  readonly lastModified: Date;
}

/**
 * An `ObjectStore` that keeps everything in memory, for tests that must run
 * with nothing started. It keeps the promises of the port — the same suite
 * runs against it and against the S3 adapter (`object-store.contract.ts`) —
 * except that its links lead nowhere: they only show which object and which
 * lifetime were asked for.
 */
export class InMemoryObjectStore implements ObjectStore {
  private readonly buckets: Record<Bucket, Map<string, Stored>> = {
    public: new Map(),
    private: new Map(),
  };
  /** How many objects were really written, as opposed to found in place. */
  writes = 0;

  put(request: PutRequest): Promise<PutOutcome> {
    // Inside a promise, so that a refused prefix rejects as it does with a real store.
    return new Promise((resolve) => {
      resolve(this.putNow(request));
    });
  }

  private putNow(request: PutRequest): PutOutcome {
    const sha256 = sha256Hex(request.content);
    const key = contentKey(request.prefix, sha256, request.extension);
    const bucket = this.buckets[request.bucket];
    const written = !bucket.has(key);

    if (written) {
      this.writes += 1;
      bucket.set(key, {
        content: request.content.slice(),
        mediaType: request.mediaType,
        lastModified: new Date(),
      });
    }

    return { bucket: request.bucket, key, sha256, size: request.content.byteLength, written };
  }

  head(object: ObjectRef): Promise<ObjectInfo | null> {
    const stored = this.buckets[object.bucket].get(object.key);
    return Promise.resolve(stored === undefined ? null : this.info(object, stored));
  }

  get(object: ObjectRef, range?: ByteRange): Promise<ObjectContent | null> {
    const stored = this.buckets[object.bucket].get(object.key);
    if (stored === undefined) return Promise.resolve(null);

    const info = this.info(object, stored);
    if (range === undefined) {
      return Promise.resolve({ ...info, content: stored.content.slice(), range: null });
    }

    const end = Math.min(range.end ?? info.size - 1, info.size - 1);
    return Promise.resolve({
      ...info,
      content: stored.content.slice(range.start, end + 1),
      range: { start: range.start, end },
    });
  }

  delete(object: ObjectRef): Promise<void> {
    this.buckets[object.bucket].delete(object.key);
    return Promise.resolve();
  }

  list(bucket: Bucket, prefix: string, options: ListOptions = {}): Promise<ObjectPage> {
    const wanted = prefix.endsWith('/') ? prefix : `${prefix}/`;
    const keys = [...this.buckets[bucket].keys()]
      .filter(
        (key) => key.startsWith(wanted) && (options.after === undefined || key > options.after),
      )
      .sort();
    const page = options.limit === undefined ? keys : keys.slice(0, options.limit);

    return Promise.resolve({
      objects: page.flatMap((key) => {
        const stored = this.buckets[bucket].get(key);
        return stored === undefined ? [] : [this.info({ bucket, key }, stored)];
      }),
      next: page.length < keys.length ? (page.at(-1) ?? null) : null,
    });
  }

  publicLink(key: string): string {
    return `memory://public/${key}`;
  }

  signedLink(
    key: string,
    lifetimeSeconds: number = DEFAULT_SIGNED_LINK_LIFETIME_SECONDS,
  ): Promise<string> {
    return Promise.resolve(`memory://private/${key}?expires-in=${lifetimeSeconds}`);
  }

  private info(object: ObjectRef, stored: Stored): ObjectInfo {
    return {
      bucket: object.bucket,
      key: object.key,
      size: stored.content.byteLength,
      mediaType: stored.mediaType,
      lastModified: stored.lastModified,
    };
  }
}
