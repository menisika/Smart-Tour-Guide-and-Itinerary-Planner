import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { applyMigrations } from '../src/migrate.ts';
import { migrationsDir } from '../src/platform/database/migrations.ts';
import { createScratchDatabase, type ScratchDatabase } from './scratch-database.ts';

const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort();

/** Everything a migration can change about the shape of the database, as comparable rows. */
const SHAPE = `
  select 'schema' as kind, nspname::text as name, '' as detail
    from pg_namespace
   where nspname !~ '^pg_' and nspname <> 'information_schema'
  union all
  select 'extension', extname::text, extversion from pg_extension
  union all
  select 'column', table_schema || '.' || table_name || '.' || column_name,
         data_type || ' nullable=' || is_nullable || ' default=' || coalesce(column_default, '')
    from information_schema.columns
   where table_schema !~ '^pg_' and table_schema <> 'information_schema'
  union all
  select 'index', schemaname || '.' || indexname, indexdef
    from pg_indexes
   where schemaname !~ '^pg_'
  union all
  select 'constraint', n.nspname || '.' || c.conname, pg_get_constraintdef(c.oid)
    from pg_constraint c join pg_namespace n on n.oid = c.connamespace
   where n.nspname !~ '^pg_' and n.nspname <> 'information_schema'
  union all
  select 'comment', d.objoid::regclass::text || '#' || d.objsubid, d.description
    from pg_description d join pg_class c on c.oid = d.objoid
    join pg_namespace n on n.oid = c.relnamespace
   where d.classoid = 'pg_class'::regclass
     and n.nspname !~ '^pg_' and n.nspname <> 'information_schema'
  order by 1, 2, 3
`;

describe('schema migrations against a real database (ADR-0026)', () => {
  let database: ScratchDatabase;
  let client: Client;

  beforeAll(async () => {
    database = await createScratchDatabase();
    client = new Client({ connectionString: database.url });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
    await database.drop();
  });

  it('applies every migration to an empty database, in order', async () => {
    const applied = await applyMigrations(database.url, { quiet: true });

    expect(applied).toEqual(files.map((name) => name.replace(/\.sql$/, '')));
  });

  it('gives the database PostGIS and a schema for each module', async () => {
    const schemas = await client.query<{ nspname: string }>(
      `select nspname from pg_namespace where nspname in ('places', 'planning') order by 1`,
    );
    const postgis = await client.query(`select 1 from pg_extension where extname = 'postgis'`);

    expect(schemas.rows.map((row) => row.nspname)).toEqual(['places', 'planning']);
    expect(postgis.rowCount).toBe(1);
  });

  it('applies nothing when it is run a second time', async () => {
    expect(await applyMigrations(database.url, { quiet: true })).toEqual([]);
  });

  it.each(files)('%s applied twice is a no-op', async (name) => {
    const before = await client.query(SHAPE);

    await client.query(readFileSync(join(migrationsDir, name), 'utf8'));

    expect((await client.query(SHAPE)).rows).toEqual(before.rows);
  });
});
