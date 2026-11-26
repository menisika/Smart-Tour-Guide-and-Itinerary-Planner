# Schema migrations

Forward-only SQL files, applied in order by `node dist/entrypoint.js migrate` (ADR-0026). The tool is [node-pg-migrate](https://github.com/salsita/node-pg-migrate), called from `src/migrate.ts`; it records what it applied in the table `schema_migrations`.

## Rules

- **Name:** `<17-digit UTC time>_<module>_<what-it-does>.sql`, for example `20261126120000000_places_create-schema.sql`. The module is the one whose schema the file touches.
- **One module, one schema.** Every module of the API owns a Postgres schema named after it — `places`, `planning` — created by that module's first migration. A migration creates and alters objects in the schema of its module and nowhere else, and writes the schema out in every name: `places.place`, never `place`. A foreign key into another module's schema is the same breach: modules meet through their interfaces, not through tables.
- **`platform`** owns what belongs to no module. Only a `platform` migration creates an extension; a table of the platform layer goes into schema `platform`.
- **Forward only:** no `-- Down Migration` section. A mistake is corrected by a new migration.
- **Never edit a migration that has been applied anywhere.** Add a new one.
- **Expand, then contract:** a release only adds — tables, indexes, and columns that are nullable or have a default. Nothing is renamed or tightened in place: add the new shape, copy, switch, and remove the old one later. Rolling back an image must never need a change of schema.
- **A removal takes two releases.** First mark the table or the column in a migration:

  ```sql
  COMMENT ON COLUMN places.place.old_name IS 'deprecated: replaced by name';
  ```

  The `DROP` comes in a later release, when no deployed image uses the old shape. A drop of something that no earlier migration marked is refused.

- **Safe to apply twice:** every statement says `IF NOT EXISTS` or `IF EXISTS`, so that applying a migration again changes nothing.

## How the rules are checked

| Check                                                                               | Where                                                   | Runs in                 |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------- |
| Names, no "down" section                                                            | `src/migrations.test.ts`                                | `pnpm test`             |
| Own schema only, expand only, `IF [NOT] EXISTS` — read with PostgreSQL's own parser | `tools/architecture-tests/src/schema-ownership.test.ts` | `pnpm test`             |
| Every migration applies to an empty database; applied twice, each changes nothing   | `integration/migrations.test.ts`                        | `pnpm test:integration` |

The static check fails closed: a statement it does not know — a `GRANT`, a `CREATE TYPE` — is refused with a message that says so. When such a statement is legitimate, teach `tools/architecture-tests/src/sql/migration-rules.ts` about it in the same pull request, with a fixture that shows the rule still fires.

"An earlier release" is checked as "an earlier migration file": the repository does not record yet which migration each release ended with. Until deployment does (`S1-OPS-04`), a mark and its drop in two files of one pull request pass the check and are caught in review.

## Where they run

- Locally: `docker compose up` runs the `migrate` service before the API starts.
- In the cloud: as a step of the pipeline, over the direct database connection, before the new image receives traffic.
