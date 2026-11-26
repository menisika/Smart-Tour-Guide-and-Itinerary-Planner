import {
  type Bucket,
  type ByteRange,
  type ListOptions,
  type ObjectContent,
  type ObjectInfo,
  type ObjectPage,
  type ObjectRef,
  type ObjectStore,
  ObjectStoreError,
  ObjectStoreTimeoutError,
  type PutOutcome,
  type PutRequest,
} from '../object-store.port.ts';

export type ObjectStoreOperation = 'put' | 'head' | 'get' | 'delete' | 'list' | 'signedLink';

/** What the double does to an operation instead of, or before, passing it on. */
export type Fault =
  /** Reject with an `ObjectStoreError`, as when the store is down or refuses. */
  | { readonly kind: 'fail'; readonly error?: Error }
  /** Reject with an `ObjectStoreTimeoutError` after `afterMs`: the store never answered. */
  | { readonly kind: 'time-out'; readonly afterMs?: number }
  /** Answer correctly, `delayMs` late. */
  | { readonly kind: 'slow'; readonly delayMs: number };

interface Planted {
  readonly fault: Fault;
  /** How many more calls it applies to; `Infinity` until cleared. */
  remaining: number;
}

/**
 * A fault-injecting double of the `ObjectStore` (ADR-0027): it wraps another
 * store — usually `InMemoryObjectStore` — and can be told to fail, to time out
 * or to answer slowly, for one call or until told otherwise.
 *
 * ```ts
 * const store = new FaultyObjectStore(new InMemoryObjectStore());
 * store.inject('put', { kind: 'fail' });                // the next put fails
 * store.inject('get', { kind: 'slow', delayMs: 200 }, Infinity);
 * store.clear();
 * ```
 *
 * `publicLink` asks no server and so has nothing to fail with.
 * Delays use `setTimeout`, so a test can drive them with fake timers.
 */
export class FaultyObjectStore implements ObjectStore {
  private readonly planted = new Map<ObjectStoreOperation, Planted[]>();
  /** Every operation attempted, in order, whether or not it was let through. */
  readonly calls: ObjectStoreOperation[] = [];

  constructor(private readonly inner: ObjectStore) {}

  /** Applies `fault` to the next `times` calls of `operation` (once by default). */
  inject(operation: ObjectStoreOperation, fault: Fault, times = 1): void {
    const queue = this.planted.get(operation) ?? [];
    queue.push({ fault, remaining: times });
    this.planted.set(operation, queue);
  }

  /** Applies `fault` to every operation until `clear`: the store as a whole is down or slow. */
  injectAll(fault: Fault): void {
    for (const operation of ['put', 'head', 'get', 'delete', 'list', 'signedLink'] as const) {
      this.inject(operation, fault, Infinity);
    }
  }

  clear(): void {
    this.planted.clear();
  }

  put(request: PutRequest): Promise<PutOutcome> {
    return this.through('put', () => this.inner.put(request));
  }

  head(object: ObjectRef): Promise<ObjectInfo | null> {
    return this.through('head', () => this.inner.head(object));
  }

  get(object: ObjectRef, range?: ByteRange): Promise<ObjectContent | null> {
    return this.through('get', () => this.inner.get(object, range));
  }

  delete(object: ObjectRef): Promise<void> {
    return this.through('delete', () => this.inner.delete(object));
  }

  list(bucket: Bucket, prefix: string, options?: ListOptions): Promise<ObjectPage> {
    return this.through('list', () => this.inner.list(bucket, prefix, options));
  }

  publicLink(key: string): string {
    return this.inner.publicLink(key);
  }

  signedLink(key: string, lifetimeSeconds?: number): Promise<string> {
    return this.through('signedLink', () => this.inner.signedLink(key, lifetimeSeconds));
  }

  private async through<Answer>(
    operation: ObjectStoreOperation,
    pass: () => Promise<Answer>,
  ): Promise<Answer> {
    this.calls.push(operation);

    const fault = this.next(operation);
    if (fault === undefined) return pass();

    switch (fault.kind) {
      case 'fail':
        throw new ObjectStoreError(
          operation,
          fault.error ?? new Error('injected failure: the store is unavailable'),
        );
      case 'time-out':
        await wait(fault.afterMs ?? 0);
        throw new ObjectStoreTimeoutError(operation);
      case 'slow':
        await wait(fault.delayMs);
        return pass();
    }
  }

  private next(operation: ObjectStoreOperation): Fault | undefined {
    const queue = this.planted.get(operation);
    const planted = queue?.[0];
    if (queue === undefined || planted === undefined) return undefined;

    planted.remaining -= 1;
    if (planted.remaining <= 0) queue.shift();
    return planted.fault;
  }
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
