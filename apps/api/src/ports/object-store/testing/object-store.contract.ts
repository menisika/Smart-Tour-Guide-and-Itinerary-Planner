import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { sha256Hex } from '../content-key.ts';
import type { ObjectStore } from '../object-store.port.ts';

const bytes = (text: string) => new TextEncoder().encode(text);
const text = (content: Uint8Array) => new TextDecoder().decode(content);

/**
 * What every `ObjectStore` promises, whichever server is behind it. The same
 * suite runs against the in-memory store in `pnpm test` and against the S3
 * adapter with the compose object storage in `pnpm test:integration`.
 *
 * Each run works under a prefix of its own, so runs do not see each other.
 */
export function describeObjectStoreContract(makeStore: () => ObjectStore): void {
  describe('the promises of the ObjectStore port', () => {
    const store = makeStore();
    const prefix = `contract-test/${randomBytes(6).toString('hex')}`;
    const unique = (label: string) => bytes(`${label} ${randomBytes(8).toString('hex')}`);

    it('names an object by the hash of its content', async () => {
      const content = unique('named by hash');

      const stored = await store.put({
        bucket: 'public',
        prefix,
        content,
        mediaType: 'text/plain',
        extension: 'txt',
      });

      expect(stored).toEqual({
        bucket: 'public',
        key: `${prefix}/${sha256Hex(content)}.txt`,
        sha256: sha256Hex(content),
        size: content.byteLength,
        written: true,
      });
    });

    it('putting the same content twice writes once', async () => {
      const request = {
        bucket: 'private' as const,
        prefix,
        content: unique('written once'),
        mediaType: 'text/plain',
      };

      const first = await store.put(request);
      const before = await store.head(first);
      const second = await store.put(request);

      expect(first.written).toBe(true);
      expect(second).toEqual({ ...first, written: false });
      expect((await store.head(first))?.lastModified).toEqual(before?.lastModified);
    });

    it('head tells the size and the media type without the content', async () => {
      const content = unique('head');
      const stored = await store.put({
        bucket: 'private',
        prefix,
        content,
        mediaType: 'audio/mp4',
      });

      const info = await store.head(stored);

      expect(info).toMatchObject({
        bucket: 'private',
        key: stored.key,
        size: content.byteLength,
        mediaType: 'audio/mp4',
      });
      expect(info?.lastModified).toBeInstanceOf(Date);
    });

    it('get returns the content as it was stored', async () => {
      const content = randomBytes(2048);
      const stored = await store.put({
        bucket: 'private',
        prefix,
        content,
        mediaType: 'application/octet-stream',
      });

      const fetched = await store.get(stored);

      expect(fetched?.range).toBeNull();
      expect(fetched?.size).toBe(2048);
      expect(sha256Hex(fetched?.content ?? new Uint8Array())).toBe(stored.sha256);
    });

    it('a range request returns the range', async () => {
      const stored = await store.put({
        bucket: 'public',
        prefix,
        content: bytes(`0123456789 ${randomBytes(8).toString('hex')}`),
        mediaType: 'text/plain',
      });

      const middle = await store.get(stored, { start: 2, end: 5 });
      const tail = await store.get(stored, { start: stored.size - 4 });

      expect(text(middle?.content ?? new Uint8Array())).toBe('2345');
      expect(middle?.range).toEqual({ start: 2, end: 5 });
      expect(middle?.size).toBe(stored.size);
      expect(tail?.content.byteLength).toBe(4);
      expect(tail?.range).toEqual({ start: stored.size - 4, end: stored.size - 1 });
    });

    it('answers null for an object that is not there', async () => {
      const missing = { bucket: 'private' as const, key: `${prefix}/${'0'.repeat(64)}` };

      expect(await store.head(missing)).toBeNull();
      expect(await store.get(missing)).toBeNull();
    });

    it('keeps the two buckets apart', async () => {
      const stored = await store.put({
        bucket: 'private',
        prefix,
        content: unique('private only'),
        mediaType: 'text/plain',
      });

      expect(await store.head({ bucket: 'public', key: stored.key })).toBeNull();
    });

    it('deletes an object, and deleting what is not there is not an error', async () => {
      const stored = await store.put({
        bucket: 'private',
        prefix,
        content: unique('to delete'),
        mediaType: 'text/plain',
      });

      await store.delete(stored);
      await store.delete(stored);

      expect(await store.head(stored)).toBeNull();
    });

    it('lists by prefix, in pages, without the neighbours of the prefix', async () => {
      const listed = `${prefix}/listed`;
      const keys: string[] = [];
      for (const label of ['a', 'b', 'c']) {
        const stored = await store.put({
          bucket: 'private',
          prefix: listed,
          content: unique(label),
          mediaType: 'text/plain',
        });
        keys.push(stored.key);
      }
      await store.put({
        bucket: 'private',
        prefix: `${listed}-neighbour`,
        content: unique('neighbour'),
        mediaType: 'text/plain',
      });

      const all = await store.list('private', listed);
      const firstPage = await store.list('private', listed, { limit: 2 });
      const secondPage = await store.list('private', listed, {
        limit: 2,
        ...(firstPage.next === null ? {} : { after: firstPage.next }),
      });

      expect(all.objects.map((object) => object.key)).toEqual([...keys].sort());
      expect(all.next).toBeNull();
      expect(firstPage.objects).toHaveLength(2);
      expect(firstPage.next).not.toBeNull();
      expect([...firstPage.objects, ...secondPage.objects].map((object) => object.key)).toEqual(
        [...keys].sort(),
      );
      expect(secondPage.next).toBeNull();
    });

    it('refuses a prefix or an extension that could leave its place', async () => {
      const request = { bucket: 'private' as const, content: bytes('x'), mediaType: 'text/plain' };

      await expect(store.put({ ...request, prefix: '../elsewhere' })).rejects.toThrow(/prefix/);
      await expect(store.put({ ...request, prefix, extension: 'a/b' })).rejects.toThrow(
        /extension/,
      );
    });
  });
}
