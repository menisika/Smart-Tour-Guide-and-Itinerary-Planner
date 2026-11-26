import { afterEach, describe, expect, it, vi } from 'vitest';

import { contentKey, sha256Hex } from './content-key.ts';
import {
  DEFAULT_SIGNED_LINK_LIFETIME_SECONDS,
  ObjectStoreError,
  ObjectStoreTimeoutError,
} from './object-store.port.ts';
import { S3ObjectStore } from './s3-object-store.adapter.ts';
import { FaultyObjectStore } from './testing/faulty-object-store.ts';
import { InMemoryObjectStore } from './testing/in-memory-object-store.ts';
import { describeObjectStoreContract } from './testing/object-store.contract.ts';

const bytes = (text: string) => new TextEncoder().encode(text);

describe('content-addressed keys (ADR-0010, point 5)', () => {
  it('are <prefix>/<sha256>[.<extension>]', () => {
    const hash = sha256Hex(bytes('abc'));

    expect(hash).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(contentKey('narrations', hash)).toBe(`narrations/${hash}`);
    expect(contentKey('photos/places', hash, 'webp')).toBe(`photos/places/${hash}.webp`);
  });

  it.each(['', '/narrations', 'narrations/', 'Narrations', '../dumps', 'a//b', 'a b'])(
    'refuse the prefix "%s"',
    (prefix) => {
      expect(() => contentKey(prefix, 'abc')).toThrow(/prefix/);
    },
  );
});

describe('the in-memory store', () => {
  describeObjectStoreContract(() => new InMemoryObjectStore());

  it('counts what was really written', async () => {
    const store = new InMemoryObjectStore();
    const request = { bucket: 'public' as const, prefix: 'photos', mediaType: 'image/webp' };

    await store.put({ ...request, content: bytes('one') });
    await store.put({ ...request, content: bytes('one') });
    await store.put({ ...request, content: bytes('two') });

    expect(store.writes).toBe(2);
  });
});

/** No server is asked: links are computed from the configuration alone. */
describe('links of the S3 adapter', () => {
  const store = new S3ObjectStore({
    endpoint: 'http://object-storage:8333',
    linkEndpoint: 'https://files.example.test',
    region: 'auto',
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
    publicBucket: 'promenade-public',
    privateBucket: 'promenade-private',
    publicBaseUrl: 'https://cdn.example.test',
  });

  it('a public link is the public address and the key', () => {
    expect(store.publicLink('photos/places/abc.webp')).toBe(
      'https://cdn.example.test/photos/places/abc.webp',
    );
  });

  it('a signed link is made for the address devices use, for about a day by default', async () => {
    const link = new URL(await store.signedLink('narrations/abc.m4a'));

    expect(link.origin).toBe('https://files.example.test');
    expect(link.pathname).toBe('/promenade-private/narrations/abc.m4a');
    expect(link.searchParams.get('X-Amz-Expires')).toBe(
      String(DEFAULT_SIGNED_LINK_LIFETIME_SECONDS),
    );
    expect(link.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
    expect(link.href).not.toContain('test-secret');
  });

  it('issues a fresh link on every request, with the lifetime asked for', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-26T10:00:00Z') });
    const first = new URL(await store.signedLink('narrations/abc.m4a', 600));
    vi.setSystemTime(new Date('2026-11-26T10:00:05Z'));
    const second = new URL(await store.signedLink('narrations/abc.m4a', 600));
    vi.useRealTimers();

    expect(first.searchParams.get('X-Amz-Expires')).toBe('600');
    expect(second.searchParams.get('X-Amz-Date')).not.toBe(first.searchParams.get('X-Amz-Date'));
    expect(second.searchParams.get('X-Amz-Signature')).not.toBe(
      first.searchParams.get('X-Amz-Signature'),
    );
  });
});

describe('the fault-injecting double', () => {
  const request = {
    bucket: 'private' as const,
    prefix: 'narrations',
    content: bytes('a narration'),
    mediaType: 'audio/mp4',
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  it('passes everything through when nothing is injected', async () => {
    const store = new FaultyObjectStore(new InMemoryObjectStore());

    const stored = await store.put(request);

    expect((await store.get(stored))?.content).toEqual(request.content);
    expect(store.calls).toEqual(['put', 'get']);
  });

  it('fails the next call only, and the store behind it is not touched', async () => {
    const inner = new InMemoryObjectStore();
    const store = new FaultyObjectStore(inner);
    store.inject('put', { kind: 'fail' });

    await expect(store.put(request)).rejects.toBeInstanceOf(ObjectStoreError);
    expect(inner.writes).toBe(0);

    expect((await store.put(request)).written).toBe(true);
  });

  it('fails with the error it was given, as the cause', async () => {
    const store = new FaultyObjectStore(new InMemoryObjectStore());
    const refused = new Error('SlowDown: reduce your request rate');
    store.inject('list', { kind: 'fail', error: refused });

    await expect(store.list('private', 'narrations')).rejects.toMatchObject({ cause: refused });
  });

  it('times out: no answer, then a timeout error', async () => {
    vi.useFakeTimers();
    const inner = new InMemoryObjectStore();
    const store = new FaultyObjectStore(inner);
    store.inject('put', { kind: 'time-out', afterMs: 30_000 });

    const outcome = store.put(request).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(29_999);
    expect(inner.writes).toBe(0);
    await vi.advanceTimersByTimeAsync(1);

    expect(await outcome).toBeInstanceOf(ObjectStoreTimeoutError);
    expect(inner.writes).toBe(0);
  });

  it('answers slowly: the right answer, late', async () => {
    vi.useFakeTimers();
    const store = new FaultyObjectStore(new InMemoryObjectStore());
    const stored = await store.put(request);
    store.inject('get', { kind: 'slow', delayMs: 2_000 });

    let answered = false;
    const fetched = store.get(stored).then((content) => {
      answered = true;
      return content;
    });
    await vi.advanceTimersByTimeAsync(1_999);
    expect(answered).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    expect((await fetched)?.content).toEqual(request.content);
  });

  it('keeps a fault for as many calls as asked, or for all operations until cleared', async () => {
    const store = new FaultyObjectStore(new InMemoryObjectStore());

    store.inject('head', { kind: 'fail' }, 2);
    await expect(store.head({ bucket: 'private', key: 'k' })).rejects.toThrow(ObjectStoreError);
    await expect(store.head({ bucket: 'private', key: 'k' })).rejects.toThrow(ObjectStoreError);
    expect(await store.head({ bucket: 'private', key: 'k' })).toBeNull();

    store.injectAll({ kind: 'fail' });
    await expect(store.put(request)).rejects.toThrow(ObjectStoreError);
    await expect(store.signedLink('k')).rejects.toThrow(ObjectStoreError);
    await expect(store.put(request)).rejects.toThrow(ObjectStoreError);

    store.clear();
    expect((await store.put(request)).written).toBe(true);
  });
});
