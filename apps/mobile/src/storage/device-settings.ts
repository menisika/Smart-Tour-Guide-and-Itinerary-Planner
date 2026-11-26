import type { SqlDatabase } from './sql-database';

/**
 * Settings that belong to this device and not to an account. A value is an
 * open string: the language of the interface, for one, is stored as its code
 * and not as one of a closed list (`I18N-3`).
 */
export async function readDeviceSetting(
  database: SqlDatabase,
  key: string,
): Promise<string | null> {
  const row = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM device_setting WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

export async function writeDeviceSetting(
  database: SqlDatabase,
  key: string,
  value: string,
  now: Date = new Date(),
): Promise<void> {
  await database.runAsync(
    `INSERT INTO device_setting (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, now.toISOString()],
  );
}

export async function removeDeviceSetting(database: SqlDatabase, key: string): Promise<void> {
  await database.runAsync('DELETE FROM device_setting WHERE key = ?', [key]);
}
