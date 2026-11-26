import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { S3ObjectStore } from '../src/ports/object-store/s3-object-store.adapter.ts';
import { describeObjectStoreContract } from '../src/ports/object-store/testing/object-store.contract.ts';

/**
 * The S3 adapter against the object storage of the compose environment
 * (SeaweedFS, `docker/object-storage/s3.json`): what a device can and cannot
 * fetch, with and without a signed link. The values are the local constants of
 * `compose.yaml`.
 */
const endpoint =
  process.env['PROMENADE_TEST_OBJECT_STORE_ENDPOINT'] ??
  `http://127.0.0.1:${process.env['PROMENADE_OBJECT_STORAGE_PORT'] ?? '8333'}`;

const store = new S3ObjectStore({
  endpoint,
  linkEndpoint: endpoint,
  region: 'auto',
  accessKeyId: 'promenade-local',
  secretAccessKey: 'promenade-local-secret',
  publicBucket: 'promenade-public',
  privateBucket: 'promenade-private',
  publicBaseUrl: `${endpoint}/promenade-public`,
});

const prefix = `integration-test/${randomBytes(6).toString('hex')}`;
const content = () => new TextEncoder().encode(`0123456789 ${randomBytes(8).toString('hex')}`);

describe('the S3 adapter against the compose object storage', () => {
  describeObjectStoreContract(() => store);

  describe('the public bucket', () => {
    it('is read by anyone through the public link', async () => {
      const body = content();
      const stored = await store.put({
        bucket: 'public',
        prefix,
        content: body,
        mediaType: 'text/plain',
        extension: 'txt',
      });

      const response = await fetch(store.publicLink(stored.key));

      expect(response.status).toBe(200);
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(body);
      expect(response.headers.get('content-type')).toContain('text/plain');
    });

    it('serves a byte range over plain HTTP, which is how a map archive is read', async () => {
      const stored = await store.put({
        bucket: 'public',
        prefix,
        content: content(),
        mediaType: 'application/octet-stream',
      });

      const response = await fetch(store.publicLink(stored.key), {
        headers: { range: 'bytes=3-6' },
      });

      expect(response.status).toBe(206);
      expect(await response.text()).toBe('3456');
    });

    it('cannot be written by anyone without credentials', async () => {
      const response = await fetch(`${endpoint}/promenade-public/${prefix}/anonymous-write`, {
        method: 'PUT',
        body: 'not allowed',
      });

      expect(response.status).toBe(403);
    });
  });

  describe('the private bucket', () => {
    it('refuses a request without a signature', async () => {
      const stored = await store.put({
        bucket: 'private',
        prefix,
        content: content(),
        mediaType: 'audio/mp4',
      });

      const response = await fetch(`${endpoint}/promenade-private/${stored.key}`);

      expect(response.status).toBe(403);
    });

    it('a signed link works without credentials, and resumes with a range', async () => {
      const body = content();
      const stored = await store.put({
        bucket: 'private',
        prefix,
        content: body,
        mediaType: 'audio/mp4',
      });

      const whole = await fetch(await store.signedLink(stored.key));
      const rest = await fetch(await store.signedLink(stored.key), {
        headers: { range: 'bytes=5-' },
      });

      expect(whole.status).toBe(200);
      expect(new Uint8Array(await whole.arrayBuffer())).toEqual(body);
      expect(rest.status).toBe(206);
      expect(new Uint8Array(await rest.arrayBuffer())).toEqual(body.slice(5));
    });

    it('an altered link is refused', async () => {
      const stored = await store.put({
        bucket: 'private',
        prefix,
        content: content(),
        mediaType: 'audio/mp4',
      });
      const other = await store.put({
        bucket: 'private',
        prefix,
        content: content(),
        mediaType: 'audio/mp4',
      });
      const link = await store.signedLink(stored.key);

      // The same signature on another object, a longer life, a changed signature.
      const anotherObject = link.replace(stored.key, other.key);
      const longerLife = new URL(link);
      longerLife.searchParams.set('X-Amz-Expires', '604800');
      const changedSignature = new URL(link);
      const signature = changedSignature.searchParams.get('X-Amz-Signature') ?? '';
      changedSignature.searchParams.set(
        'X-Amz-Signature',
        (signature.startsWith('0') ? '1' : '0') + signature.slice(1),
      );

      expect(anotherObject).not.toBe(link);
      expect((await fetch(anotherObject)).status).toBe(403);
      expect((await fetch(longerLife)).status).toBe(403);
      expect((await fetch(changedSignature)).status).toBe(403);
    });

    it('an expired link is refused', async () => {
      const stored = await store.put({
        bucket: 'private',
        prefix,
        content: content(),
        mediaType: 'audio/mp4',
      });
      const link = await store.signedLink(stored.key, 1);

      expect((await fetch(link)).status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 2_500));

      expect((await fetch(link)).status).toBe(403);
    });
  });
});
