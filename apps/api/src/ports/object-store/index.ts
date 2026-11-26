/** What the rest of the API uses of the object store: the port, never the S3 client. */
export { ObjectStoreModule } from './object-store.module.ts';
export {
  DEFAULT_SIGNED_LINK_LIFETIME_SECONDS,
  OBJECT_STORE,
  ObjectStoreError,
  ObjectStoreTimeoutError,
  type Bucket,
  type ByteRange,
  type ListOptions,
  type ObjectContent,
  type ObjectInfo,
  type ObjectPage,
  type ObjectRef,
  type ObjectStore,
  type PutOutcome,
  type PutRequest,
} from './object-store.port.ts';
