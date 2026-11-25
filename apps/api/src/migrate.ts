import { runner } from 'node-pg-migrate';

import { loadAppConfig } from './platform/config/app-config.ts';
import { MIGRATIONS_TABLE, migrationsDir } from './platform/database/migrations.ts';

/**
 * Applies every pending migration, in order, and returns (ADR-0026).
 *
 * - Forward only: the direction is fixed to `up`, and no migration file may
 *   carry a "down" section (`migrations.test.ts` checks the files).
 * - Over the direct connection, never the pooler (ADR-0010, point 9).
 * - All pending migrations run in one transaction, under an advisory lock, so
 *   two starts at once cannot interleave; the second waits for the first.
 *
 * In the cloud this is a step of the pipeline, before the new image receives
 * traffic. Locally, `docker compose up` runs it before the API starts.
 */
export async function runMigrations(): Promise<void> {
  const config = loadAppConfig(process.env);

  const applied = await runner({
    databaseUrl: config.databaseUrlDirect,
    dir: migrationsDir,
    // Only `.sql` files are migrations; the folder also holds a README.
    ignorePattern: '(?!.*\\.sql$).*',
    migrationsTable: MIGRATIONS_TABLE,
    direction: 'up',
    checkOrder: true,
    singleTransaction: true,
    advisoryLockMode: 'wait',
  });

  console.log(
    applied.length === 0
      ? 'Migrations: the schema is up to date.'
      : `Migrations: applied ${applied.map((migration) => migration.name).join(', ')}.`,
  );
}
