import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { contentKey, sha256Hex } from './content-key.ts';
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
  ObjectStoreError,
  ObjectStoreTimeoutError,
  type PutOutcome,
  type PutRequest,
} from './object-store.port.ts';

export interface S3ObjectStoreConfig {
  /** Where the API reaches the store. */
  readonly endpoint: string;
  /**
   * The address of the store as a device sees it; signed links are made for
   * it. A signature covers the host, so a link signed for one address does not
   * work on another.
   */
  readonly linkEndpoint: string;
  readonly region: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly publicBucket: string;
  readonly privateBucket: string;
  /** The address under which the public bucket is served, without a trailing slash. */
  readonly publicBaseUrl: string;
}

const DEFAULT_MEDIA_TYPE = 'application/octet-stream';

/**
 * The `ObjectStore` over the S3 interface, with the standard client. It works
 * with any server that speaks S3 — the SeaweedFS of the local environment,
 * Cloudflare R2 — and which one is configuration only (ADR-0010, point 3).
 *
 * Nothing here opens a connection until an operation asks for one, and links
 * are computed locally, so an idle service stays idle (ADR-0024).
 */
export class S3ObjectStore implements ObjectStore {
  private readonly client: S3Client;
  /** Signs links for the address devices use. It never sends a request. */
  private readonly linkSigner: S3Client;

  constructor(private readonly config: S3ObjectStoreConfig) {
    const shared = {
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // `<endpoint>/<bucket>/<key>`: no bucket in the host name, so no DNS setup locally.
      forcePathStyle: true,
      // The client's newer default adds a checksum to every request, in a form
      // that S3-compatible servers do not all accept. The content is verified
      // by its SHA-256, which is its name.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    } as const;

    this.client = new S3Client({
      ...shared,
      endpoint: config.endpoint,
      requestHandler: { connectionTimeout: 5_000, requestTimeout: 60_000 },
    });
    this.linkSigner = new S3Client({ ...shared, endpoint: config.linkEndpoint });
  }

  async put(request: PutRequest): Promise<PutOutcome> {
    const sha256 = sha256Hex(request.content);
    const key = contentKey(request.prefix, sha256, request.extension);
    const outcome = { bucket: request.bucket, key, sha256, size: request.content.byteLength };

    // The key is the hash of the content: whatever is there already is this content.
    if ((await this.head({ bucket: request.bucket, key })) !== null) {
      return { ...outcome, written: false };
    }

    await this.send('store an object', () =>
      this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName(request.bucket),
          Key: key,
          Body: request.content,
          ContentLength: request.content.byteLength,
          ContentType: request.mediaType,
          // Immutable: a cache may keep it for as long as it likes.
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      ),
    );
    return { ...outcome, written: true };
  }

  async head(object: ObjectRef): Promise<ObjectInfo | null> {
    const answer = await this.sendUnlessMissing('look an object up', () =>
      this.client.send(
        new HeadObjectCommand({ Bucket: this.bucketName(object.bucket), Key: object.key }),
      ),
    );
    if (answer === null) return null;

    return {
      ...object,
      size: answer.ContentLength ?? 0,
      mediaType: answer.ContentType ?? DEFAULT_MEDIA_TYPE,
      lastModified: answer.LastModified ?? new Date(0),
    };
  }

  async get(object: ObjectRef, range?: ByteRange): Promise<ObjectContent | null> {
    const answer = await this.sendUnlessMissing('fetch an object', async () => {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucketName(object.bucket),
          Key: object.key,
          ...(range === undefined ? {} : { Range: `bytes=${range.start}-${range.end ?? ''}` }),
        }),
      );
      if (response.Body === undefined) throw new Error('the answer has no body');
      return { response, content: await response.Body.transformToByteArray() };
    });
    if (answer === null) return null;

    const { response, content } = answer;
    // `bytes 0-99/1234`: which bytes these are, and the size of the whole object.
    const contentRange = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.ContentRange ?? '');

    return {
      ...object,
      size: contentRange === null ? content.byteLength : Number(contentRange[3]),
      mediaType: response.ContentType ?? DEFAULT_MEDIA_TYPE,
      lastModified: response.LastModified ?? new Date(0),
      content,
      range:
        contentRange === null
          ? null
          : { start: Number(contentRange[1]), end: Number(contentRange[2]) },
    };
  }

  async delete(object: ObjectRef): Promise<void> {
    await this.sendUnlessMissing('delete an object', () =>
      this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucketName(object.bucket), Key: object.key }),
      ),
    );
  }

  async list(bucket: Bucket, prefix: string, options: ListOptions = {}): Promise<ObjectPage> {
    const answer = await this.send('list objects', () =>
      this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName(bucket),
          // With the slash, `photos` does not also list `photos-archive`.
          Prefix: prefix.endsWith('/') ? prefix : `${prefix}/`,
          ...(options.limit === undefined ? {} : { MaxKeys: options.limit }),
          ...(options.after === undefined ? {} : { ContinuationToken: options.after }),
        }),
      ),
    );

    return {
      objects: (answer.Contents ?? []).flatMap((entry) =>
        entry.Key === undefined
          ? []
          : [
              {
                bucket,
                key: entry.Key,
                size: entry.Size ?? 0,
                // A listing does not carry the media type; `head` does.
                mediaType: DEFAULT_MEDIA_TYPE,
                lastModified: entry.LastModified ?? new Date(0),
              },
            ],
      ),
      next: answer.IsTruncated === true ? (answer.NextContinuationToken ?? null) : null,
    };
  }

  publicLink(key: string): string {
    return `${this.config.publicBaseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }

  signedLink(
    key: string,
    lifetimeSeconds: number = DEFAULT_SIGNED_LINK_LIFETIME_SECONDS,
  ): Promise<string> {
    return this.send('sign a link', () =>
      getSignedUrl(
        this.linkSigner,
        new GetObjectCommand({ Bucket: this.config.privateBucket, Key: key }),
        { expiresIn: lifetimeSeconds },
      ),
    );
  }

  private bucketName(bucket: Bucket): string {
    return bucket === 'public' ? this.config.publicBucket : this.config.privateBucket;
  }

  private async send<Answer>(operation: string, request: () => Promise<Answer>): Promise<Answer> {
    try {
      return await request();
    } catch (error) {
      throw isTimeout(error)
        ? new ObjectStoreTimeoutError(operation)
        : new ObjectStoreError(operation, error);
    }
  }

  /** As `send`, with "there is no such object" answered as `null`. */
  private async sendUnlessMissing<Answer>(
    operation: string,
    request: () => Promise<Answer>,
  ): Promise<Answer | null> {
    try {
      return await request();
    } catch (error) {
      if (isMissing(error)) return null;
      throw isTimeout(error)
        ? new ObjectStoreTimeoutError(operation)
        : new ObjectStoreError(operation, error);
    }
  }
}

function isMissing(error: unknown): boolean {
  return (
    error instanceof S3ServiceException &&
    (error.$metadata.httpStatusCode === 404 ||
      error.name === 'NoSuchKey' ||
      error.name === 'NotFound')
  );
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}
