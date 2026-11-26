import { beforeAll, describe, expect, it } from 'vitest';

import { repositoryRoot, sqlViolationsRoot } from './repository.ts';
import { type Breach, checkMigrations } from './sql/migration-rules.ts';
import { checkModuleQueries } from './sql/module-queries.ts';
import { readApiSources } from './sql/repository-sources.ts';

/**
 * ADR-0003, point 5 and ADR-0026: a module owns a Postgres schema named after
 * it; its migrations and its code touch that schema only; migrations only add,
 * and can be applied twice.
 *
 * The rules are run over the repository, where they must find nothing, and
 * over a tree of deliberately wrong migrations and queries, where each must
 * fire with a message that names the module.
 */

const format = (breaches: readonly Breach[]) =>
  breaches.map((breach) => `${breach.file}: ${breach.message}`);

describe('the repository keeps the schema rules', () => {
  const sources = readApiSources(repositoryRoot);

  it('finds the modules and their migrations', () => {
    expect(sources.modules).toContain('places');
    expect(sources.modules).toContain('planning');
    expect(sources.migrations.length).toBeGreaterThanOrEqual(3);
  });

  it('every migration touches only the schema of the module it is named for, only adds, and can be applied twice', async () => {
    expect(format(await checkMigrations(sources.migrations, sources.modules))).toEqual([]);
  });

  it('every module has a schema named after it, created by its own migration', () => {
    for (const module of sources.modules) {
      const creates = sources.migrations.some(
        (migration) =>
          migration.name.includes(`_${module}_`) &&
          new RegExp(`create schema if not exists ${module}\\b`, 'i').test(migration.sql),
      );
      expect(creates, `no migration creates the schema of module \`${module}\``).toBe(true);
    }
  });

  it('the code of every module queries only its own schema', async () => {
    expect(format(await checkModuleQueries(sources.moduleSources, sources.modules))).toEqual([]);
  });
});

describe('the schema rules fail on a deliberate violation', () => {
  const sources = readApiSources(sqlViolationsRoot);
  let migrationBreaches: readonly Breach[];
  let queryBreaches: readonly Breach[];

  beforeAll(async () => {
    migrationBreaches = await checkMigrations(sources.migrations, sources.modules);
    queryBreaches = await checkModuleQueries(sources.moduleSources, sources.modules);
  });

  const ofMigration = (name: string) =>
    migrationBreaches
      .filter((breach) => breach.file.includes(`_${name}.sql`))
      .map((b) => b.message);
  const ofSource = (name: string) =>
    queryBreaches.filter((breach) => breach.file.includes(`/${name}.ts:`)).map((b) => b.message);

  describe('a migration touches the schema of its module only (ADR-0026, point 5)', () => {
    it("catches a migration that alters another module's table, and names both modules", () => {
      const [message, ...rest] = ofMigration('planning_alters-places');

      expect(rest).toEqual([]);
      expect(message).toContain('module `planning`');
      expect(message).toContain('`places.place`, which belongs to module `places`');
    });

    it("catches a foreign key into another module's schema", () => {
      expect(ofMigration('planning_references-places')).toEqual([
        expect.stringContaining('`places.place`, which belongs to module `places`'),
      ]);
    });

    it("catches the drop of another module's table", () => {
      expect(ofMigration('planning_drops-places-table')).toEqual([
        expect.stringContaining('drops `places.place`, outside schema `planning`'),
      ]);
    });

    it('catches a table named without a schema', () => {
      expect(ofMigration('planning_no-schema')).toEqual([
        expect.stringContaining('names `stop_note` without a schema'),
      ]);
    });

    it('catches a migration named for a module that does not exist', () => {
      expect(ofMigration('catalog_create-schema')).toEqual([
        expect.stringContaining('module `catalog`, which does not exist'),
      ]);
    });

    it('lets only the platform create an extension', () => {
      expect(ofMigration('planning_creates-extension')).toEqual([
        expect.stringContaining('only a `platform` migration creates one'),
      ]);
      expect(ofMigration('platform_enable-postgis')).toEqual([]);
    });
  });

  describe('a migration only adds (ADR-0026, point 2)', () => {
    it('catches the drop of a column nobody marked as deprecated', () => {
      expect(ofMigration('places_drops-live-column')).toEqual([
        expect.stringContaining('drops column `places.place.name`'),
      ]);
    });

    it('accepts the drop of a column an earlier migration marked as deprecated', () => {
      expect(ofMigration('places_drops-deprecated-column')).toEqual([]);
    });

    it('does not accept a mark made in the same migration as the drop', () => {
      expect(ofMigration('places_marks-and-drops-at-once')).toEqual([
        expect.stringContaining('drops column `places.place.position`'),
      ]);
    });

    it('catches a new column that is required and has no default', () => {
      expect(ofMigration('places_adds-required-column')).toEqual([
        expect.stringContaining('`places.place.kind` is NOT NULL without a default'),
      ]);
    });

    it('catches a rename in place', () => {
      expect(ofMigration('places_renames')).toEqual([expect.stringContaining('renames in place')]);
    });

    it('catches the tightening of a table in use', () => {
      expect(ofMigration('places_tightens')).toEqual([
        expect.stringContaining('tightens the existing table `places.place`'),
      ]);
    });
  });

  it('catches a statement that fails when applied twice', () => {
    expect(ofMigration('places_not-repeatable')).toEqual([
      expect.stringContaining('CREATE TABLE without IF NOT EXISTS'),
    ]);
  });

  it('refuses a statement it does not know rather than letting it through', () => {
    expect(ofMigration('planning_grants')).toEqual([
      expect.stringContaining('`GrantStmt` is not a statement the migration check knows'),
    ]);
  });

  it('accepts migrations that keep every rule', () => {
    expect(ofMigration('places_create-schema')).toEqual([]);
    expect(ofMigration('planning_create-schema')).toEqual([]);
  });

  describe('module code queries only its own schema (ADR-0003, point 5)', () => {
    it("catches a query on another module's table, and names both modules", () => {
      const [message, ...rest] = ofSource('reads-places');

      expect(rest).toEqual([]);
      expect(message).toContain('module `planning`');
      expect(message).toContain('`places.place`, which belongs to module `places`');
    });

    it("catches a join into another module's schema", () => {
      expect(ofSource('joins-places')).toEqual([
        expect.stringContaining('`places.place`, which belongs to module `places`'),
      ]);
    });

    it('catches a table named without a schema', () => {
      expect(ofSource('no-schema')).toEqual([
        expect.stringContaining('names `route` without a schema'),
      ]);
    });

    it('catches code that changes the shape of the database', () => {
      expect(ofSource('changes-shape')).toEqual([
        expect.stringContaining('the code runs `AlterTableStmt`'),
      ]);
    });

    it('catches the tag imported under another name', () => {
      expect(ofSource('hides-the-tag')).toEqual([
        expect.stringContaining('something other than the tag of a template'),
      ]);
    });

    it('catches a table name passed as a value', () => {
      expect(ofSource('interpolates-a-name')).toEqual([
        expect.stringContaining('only values can be interpolated'),
      ]);
    });

    it('accepts queries on the own schema, with a WITH clause and functions of PostGIS', () => {
      expect(ofSource('places.repository')).toEqual([]);
      expect(ofSource('planning.repository')).toEqual([]);
    });
  });
});
