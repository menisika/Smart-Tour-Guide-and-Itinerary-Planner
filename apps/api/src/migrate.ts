import { runner } from 'node-pg-migrate';

import { loadAppConfig } from './platform/config/app-config.ts';
import { MIGRATIONS_TABLE, migrationsDir } from './platform/database/migrations.ts';

/**
 * Applies every pending migration to one database, in order, and returns the
 * names of those it applied (ADR-0026).
 *
 * - Forward only: the direction is fixed to `up`, and no migration file may
 *   carry a "down" section (`migrations.test.ts` checks the files).
 * - All pending migrations run in one transaction, under an advisory lock, so
 *   two starts at once cannot interleave; the second waits for the first.
 */
export async function applyMigrations(
  databaseUrl: string,
  options: { readonly quiet?: boolean } = {},
): Promise<readonly string[]> {
  const applied = await runner({
    databaseUrl,
    dir: migrationsDir,
    // Only `.sql` files are migrations; the folder also holds a README.
    ignorePattern: '(?!.*\\.sql$).*',
    migrationsTable: MIGRATIONS_TABLE,
    direction: 'up',
    checkOrder: true,
    singleTransaction: true,
    advisoryLockMode: 'wait',
    ...(options.quiet === true ? { log: () => undefined } : {}),
  });

  return applied.map((migration) => migration.name);
}

/**
 * The `migrate` entry point: over the direct connection, never the pooler
 * (ADR-0010, point 9).
 *
 * In the cloud this is a step of the pipeline, before the new image receives
 * traffic. Locally, `docker compose up` runs it before the API starts.
 */
export async function runMigrations(): Promise<void> {
  const config = loadAppConfig(process.env);
  const applied = await applyMigrations(config.databaseUrlDirect);

  console.log(
    applied.length === 0
      ? 'Migrations: the schema is up to date.'
      : `Migrations: applied ${applied.join(', ')}.`,
  );
}
