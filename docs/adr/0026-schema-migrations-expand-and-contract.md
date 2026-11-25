# 0026. Schema migrations: forward-only, expand and contract

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 23 November 2026 |
| **Origin** | Not one of the 22 forks; raised by the independent review: rolling back an image says nothing about the database. See [what changed](README.md#changes-after-the-independent-review) |
| **Requirements** | `NFR-29`, `NFR-30`, `NFR-38` |

## Context

- Deployment has no manual steps and has a way back to the previous working version (`NFR-29`). The way back is redeploying the previous image ([ADR-0002](0002-terraform-github-actions-and-local-environment.md)).
- The API, the worker and the batch jobs share one database ([ADR-0010](0010-storage-postgres-on-neon-and-objects-in-r2.md)).

## Options considered

| Option | For | Against |
|---|---|---|
| **A. Forward-only migrations, expand and contract** | An image can always be rolled back without touching the schema | A removal takes two releases |
| **B. Migrations with "down" scripts** | Looks reversible | Down paths are rarely tested and lose data; rollback would still need a manual step |
| **C. Schema synchronised automatically from code** | Least writing | Unreviewed changes to a database that holds verified Dossiers |

## Decision

Option A.

1. **Migrations are forward-only SQL files in the repository**, applied by one tool owned by the API codebase.
2. **Expand and contract.** A release may add — tables, nullable columns, indexes. Something is removed or tightened only in a later release, once no deployed image reads or writes the old shape.
3. **Migrations run as a step of the pipeline**, over a direct database connection, before the new image receives traffic.
4. **Rolling back an image never requires rolling back the schema.** A test enforces it: the previous release's suite runs against the new schema ([ADR-0027](0027-testing-strategy.md)).
5. **Each module owns its tables** ([ADR-0003](0003-backend-shape-modular-monolith-with-workers.md)); a migration touches the tables of one module.
6. **The workflow library migrates its own tables**; its version is pinned and upgraded deliberately ([ADR-0012](0012-preparation-pipeline-durable-workflows-on-postgres.md)).
7. **Locally, the same migrations run when the environment starts** (`NFR-33`).

## Consequences

- Renaming a column is three steps over two or three releases: add, copy and switch, remove.
- Restoring a backup (`NFR-30`) restores a schema version; the migrations after it are applied on top, which the monthly rehearsal exercises.
