import { migrations as shippedMigrations, type Migration } from './migrations';
import type { SqlDatabase } from './sql-database';

/** The device holds data written by a newer application than this one. */
export class DatabaseNewerThanApplicationError extends Error {
  constructor(
    readonly found: number,
    readonly known: number,
  ) {
    super(
      `The device database is at version ${found}, and this application knows versions up to ${known}.`,
    );
    this.name = 'DatabaseNewerThanApplicationError';
  }
}

/** The version of the structure the database is at; 0 for a new, empty file. */
export async function readSchemaVersion(database: SqlDatabase): Promise<number> {
  const row = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  return row?.user_version ?? 0;
}

function assertOrdered(migrations: readonly Migration[]): void {
  migrations.forEach((migration, index) => {
    if (migration.version !== index + 1) {
      throw new Error(
        `Migration "${migration.name}" has version ${migration.version} at position ${index + 1}: versions run 1, 2, 3… with no gaps.`,
      );
    }
  });
}

/**
 * Brings the device database to the latest structure and returns its version.
 *
 * Each pending step runs in a transaction of its own together with the change
 * of the version, so a step is either fully applied and counted, or not at
 * all — an application killed in the middle starts the step again. Applying
 * the migrations to a database that is up to date changes nothing.
 */
export async function migrate(
  database: SqlDatabase,
  migrations: readonly Migration[] = shippedMigrations,
): Promise<number> {
  assertOrdered(migrations);

  const found = await readSchemaVersion(database);
  if (found > migrations.length) {
    throw new DatabaseNewerThanApplicationError(found, migrations.length);
  }

  for (const migration of migrations.slice(found)) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(migration.sql);
      // A pragma takes no bound value; the version is an integer of our own.
      await database.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }

  return migrations.length;
}
