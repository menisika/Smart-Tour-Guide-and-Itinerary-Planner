import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import type { MigrationFile } from './migration-rules.ts';
import type { ModuleSource } from './module-queries.ts';

/**
 * Reads the migrations and the module sources of a tree laid out like the
 * repository: `apps/api/migrations` and `apps/api/src/modules/<module>/…`.
 */
export interface ApiSources {
  readonly modules: readonly string[];
  readonly migrations: readonly MigrationFile[];
  readonly moduleSources: readonly ModuleSource[];
}

export function readApiSources(root: string): ApiSources {
  const migrationsDir = join(root, 'apps/api/migrations');
  const modulesDir = join(root, 'apps/api/src/modules');

  const modules = readdirSync(modulesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const migrations = readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(migrationsDir, name), 'utf8') }));

  const moduleSources = modules.flatMap((module) =>
    (readdirSync(join(modulesDir, module), { recursive: true }) as string[])
      .filter((name) => name.endsWith('.ts'))
      .sort()
      .map((name) => {
        const path = join(modulesDir, module, name);
        return { file: relative(root, path), module, text: readFileSync(path, 'utf8') };
      }),
  );

  return { modules, migrations, moduleSources };
}
