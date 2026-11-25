# Schema migrations

Forward-only SQL files, applied in order by `node dist/entrypoint.js migrate` (ADR-0026). The tool is [node-pg-migrate](https://github.com/salsita/node-pg-migrate), called from `src/migrate.ts`; it records what it applied in the table `schema_migrations`.

## Rules

- **Name:** `<17-digit UTC time>_<module>_<what-it-does>.sql`, for example `20261124180000000_platform_enable-postgis.sql`. The module is the one whose tables the file touches; a migration touches the tables of one module.
- **Forward only:** no `-- Down Migration` section. A mistake is corrected by a new migration.
- **Never edit a migration that has been applied anywhere.** Add a new one.
- **Expand, then contract:** a release may add tables, nullable columns and indexes. Removing or tightening happens in a later release, when no deployed image uses the old shape. Rolling back an image must never need a change of schema.

`src/migrations.test.ts` checks the names and the absence of "down" sections on every change.

## Where they run

- Locally: `docker compose up` runs the `migrate` service before the API starts.
- In the cloud: as a step of the pipeline, over the direct database connection, before the new image receives traffic.
