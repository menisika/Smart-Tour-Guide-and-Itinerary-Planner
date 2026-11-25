import { fileURLToPath } from 'node:url';

/** The table in which the migration tool records what it has applied. */
export const MIGRATIONS_TABLE = 'schema_migrations';

/** `migrations/` next to `src/` and `dist/`, wherever the package is installed. */
export const migrationsDir = fileURLToPath(new URL('../../../migrations', import.meta.url));

/**
 * A migration file is `<17-digit UTC time>_<module>_<what-it-does>.sql`,
 * for example `20261124180000000_platform_enable-postgis.sql`. The module in
 * the name is the one whose tables the migration touches (ADR-0026, point 5).
 */
export const MIGRATION_FILE_NAME = /^\d{17}_[a-z][a-z0-9]*_[a-z0-9]+(-[a-z0-9]+)*\.sql$/;
