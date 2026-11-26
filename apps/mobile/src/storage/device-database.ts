import type { SqlDatabase } from './sql-database';

/**
 * What a screen knows about the database of the device.
 *
 * - `opening` — the file is being opened and migrated;
 * - `ready` — `database` can be read and written, at `schemaVersion`;
 * - `failed` — it did not open; the screen says so and offers what works without it;
 * - `absent` — this is a browser: Outing data lives in the application only
 *   (ADR-0005, point 5; ADR-0007, point 1).
 */
export type DeviceDatabaseState =
  | { readonly status: 'opening' }
  | { readonly status: 'ready'; readonly database: SqlDatabase; readonly schemaVersion: number }
  | { readonly status: 'failed'; readonly error: unknown }
  | { readonly status: 'absent' };

export const DEVICE_DATABASE_NAME = 'promenade.db';
