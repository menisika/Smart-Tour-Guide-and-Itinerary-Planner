import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { MIGRATION_FILE_NAME, migrationsDir } from './platform/database/migrations.ts';

const migrationFiles = readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort();

describe('schema migrations are forward-only SQL (ADR-0026)', () => {
  it('finds the first migration, which enables PostGIS', () => {
    const [first] = migrationFiles;
    if (first === undefined) throw new Error(`No migration found in ${migrationsDir}`);

    expect(readFileSync(join(migrationsDir, first), 'utf8')).toMatch(
      /create extension if not exists postgis/i,
    );
  });

  it.each(migrationFiles)('%s is named <UTC time>_<module>_<what-it-does>.sql', (name) => {
    expect(name).toMatch(MIGRATION_FILE_NAME);
  });

  it.each(migrationFiles)('%s has no "down" section', (name) => {
    const sql = readFileSync(join(migrationsDir, name), 'utf8');

    expect(sql).not.toMatch(/^\s*--\s*down migration/im);
  });

  it('holds nothing but SQL files and the README', () => {
    const others = readdirSync(migrationsDir).filter(
      (name) => !name.endsWith('.sql') && name !== 'README.md',
    );

    expect(others).toEqual([]);
  });
});
