/// <reference types="node" />
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readDeviceSetting, removeDeviceSetting, writeDeviceSetting } from './device-settings';
import { DatabaseNewerThanApplicationError, migrate, readSchemaVersion } from './migrate';
import { migrations, type Migration } from './migrations';
import type { SqlDatabase } from './sql-database';
import { openNodeDatabase } from './testing/node-sqlite';

/** Everything SQLite knows about the structure: tables, indexes, triggers, views. */
async function readSchema(database: SqlDatabase) {
  return {
    version: await readSchemaVersion(database),
    objects: await database.getAllAsync<{ type: string; name: string; sql: string | null }>(
      'SELECT type, name, sql FROM sqlite_schema ORDER BY type, name',
      [],
    ),
  };
}

describe('the device database', () => {
  let directory: string;
  let path: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'promenade-device-db-'));
    path = join(directory, 'promenade.db');
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('opens, applies the migrations twice, and finds the same schema', async () => {
    const first = openNodeDatabase(path);
    expect(await readSchemaVersion(first)).toBe(0);
    expect(await migrate(first)).toBe(migrations.length);
    const afterFirst = await readSchema(first);
    first.close();

    // The application is started again: the same file, the same migrations.
    const second = openNodeDatabase(path);
    expect(await migrate(second)).toBe(migrations.length);
    const afterSecond = await readSchema(second);
    second.close();

    expect(afterFirst.version).toBe(migrations.length);
    expect(afterFirst.objects.length).toBeGreaterThan(0);
    expect(afterSecond).toEqual(afterFirst);
  });

  it('keeps the data of the device across a second run of the migrations', async () => {
    const database = openNodeDatabase(path);
    await migrate(database);
    await writeDeviceSetting(database, 'interface.locale', 'en');
    await migrate(database);
    expect(await readDeviceSetting(database, 'interface.locale')).toBe('en');
    database.close();
  });

  it('applies only the steps a database has not seen', async () => {
    const database = openNodeDatabase();
    const one: Migration = { version: 1, name: 'one', sql: 'CREATE TABLE one (id INTEGER)' };
    const two: Migration = { version: 2, name: 'two', sql: 'CREATE TABLE two (id INTEGER)' };

    expect(await migrate(database, [one])).toBe(1);
    // Were step one run again, CREATE TABLE would fail.
    expect(await migrate(database, [one, two])).toBe(2);
    expect((await readSchema(database)).objects.map((object) => object.name)).toEqual([
      'one',
      'two',
    ]);
    database.close();
  });

  it('applies a step wholly or not at all', async () => {
    const database = openNodeDatabase();
    const broken: Migration = {
      version: 1,
      name: 'broken half-way',
      sql: 'CREATE TABLE kept (id INTEGER); CREATE TABLE kept (id INTEGER);',
    };

    await expect(migrate(database, [broken])).rejects.toThrow();
    expect(await readSchema(database)).toEqual({ version: 0, objects: [] });
    database.close();
  });

  it('refuses data written by a newer application', async () => {
    const database = openNodeDatabase();
    await database.execAsync(`PRAGMA user_version = ${migrations.length + 1}`);
    await expect(migrate(database)).rejects.toBeInstanceOf(DatabaseNewerThanApplicationError);
    database.close();
  });

  it('refuses a list of migrations with a gap or out of order', async () => {
    const database = openNodeDatabase();
    const gap: Migration[] = [
      { version: 1, name: 'one', sql: 'CREATE TABLE one (id INTEGER)' },
      { version: 3, name: 'three', sql: 'CREATE TABLE three (id INTEGER)' },
    ];
    await expect(migrate(database, gap)).rejects.toThrow(/no gaps/);
    expect(await readSchemaVersion(database)).toBe(0);
    database.close();
  });
});

describe('device settings', () => {
  it('stores a value as an open string, replaces it and removes it', async () => {
    const database = openNodeDatabase();
    await migrate(database);

    expect(await readDeviceSetting(database, 'interface.locale')).toBeNull();

    // A language the interface does not have yet is stored like any other.
    await writeDeviceSetting(database, 'interface.locale', 'be-tarask');
    expect(await readDeviceSetting(database, 'interface.locale')).toBe('be-tarask');

    await writeDeviceSetting(database, 'interface.locale', 'en');
    expect(await readDeviceSetting(database, 'interface.locale')).toBe('en');

    await removeDeviceSetting(database, 'interface.locale');
    expect(await readDeviceSetting(database, 'interface.locale')).toBeNull();
    database.close();
  });
});
