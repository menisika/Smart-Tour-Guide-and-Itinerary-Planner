# Promenade

Promenade (a working name) is a planner of city outings for a company of one or more people: it builds a walking route, tells stories about the places on it, starts them by location, and works without a network. The product is described in [docs/PRODUCT-SPEC.md](docs/PRODUCT-SPEC.md), its terms in [GLOSSARY.md](GLOSSARY.md), and the decisions about how it is built in the [Architecture Decision Records](docs/adr/README.md).

**This repository is a skeleton.** It runs, and it already enforces the rules of the architecture, but it holds no product feature: one health endpoint, one screen, stubs where the planner and its neighbours will be.

## Start

You need Docker with Compose. Nothing else is required to start the system.

```bash
docker compose up --build --wait
```

The first run builds the application image and the emulator image and takes several minutes. When the command returns, everything is up:

| What                                              | Where                                                     |
| ------------------------------------------------- | --------------------------------------------------------- |
| Health of the API: database and PostGIS version   | http://localhost:8080/health                              |
| Public web, rendered on the server inside the API | http://localhost:8080/                                    |
| Firebase Authentication emulator, interface       | http://localhost:4000                                     |
| Mail catcher                                      | http://localhost:8025                                     |
| Object storage, S3 interface                      | http://localhost:8333                                     |
| Postgres with PostGIS                             | `localhost:5433`, user, password and database `promenade` |

Check it with the smoke test, which asks every service one question:

```bash
node scripts/smoke.mjs
```

The worker and the batch jobs are started on purpose and exit when they are done:

```bash
docker compose run --rm worker
```

```bash
docker compose run --rm job environment-report
```

Stop everything, keeping the data:

```bash
docker compose down
```

If a port is taken on your machine, each one can be moved: see [the local environment](docs/development.md#the-local-environment).

## Test

You need Node.js 26 and pnpm 12.

```bash
pnpm install
```

```bash
pnpm lint
```

```bash
pnpm test
```

Neither command needs the Docker environment, a build, or a network. Neither calls a paid service: language models and speech are replayed from recordings.

- `pnpm lint` — ESLint, the import boundaries, the type check of every package, the work plan, the design system, and the formatting check.
- `pnpm test` — unit tests, the property-based tests of the planner stub, and the tests that prove each architecture rule fails on a deliberate violation.
- `node scripts/smoke.mjs` — the running environment, after `docker compose up`.

The same three run in the pipeline, [.github/workflows/ci.yml](.github/workflows/ci.yml).

How a change gets into the repository — branches, commit messages, pull requests, hooks — is in [CONTRIBUTING.md](CONTRIBUTING.md). What is to be built, and in what order, is in [docs/WORK-PLAN.md](docs/WORK-PLAN.md).

## Rules that are checked automatically

| Rule                                                                                                                                           | Decision           |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| The verifier may not import the planner, directly or through another package                                                                   | ADR-0006           |
| No floating-point code in `planner`, `verifier` and `routing`: no float literal, no transcendental `Math` function, no division left unrounded | ADR-0006           |
| A module of the API is used only through its public interface; nobody imports another module's internals                                       | ADR-0003           |
| Shared packages do not import applications; applications do not import each other                                                              | ADR-0005, ADR-0007 |
| Schema migrations are forward-only SQL with a fixed naming                                                                                     | ADR-0026           |

How each is enforced, what exactly is reported, and how to watch each one fail: [docs/development.md](docs/development.md#the-rules-and-how-each-one-fails).

## What each folder is

| Folder                                                 | What it holds                                                                                                                                                                                                                                                         |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`apps/api`](apps/api)                                 | The back end: a NestJS modular monolith. The API, the worker, the batch jobs and the schema migrations are entry points of the same code and the same image. Holds the migrations, the model and speech ports with their replay adapters, and the recorded responses. |
| [`apps/mobile`](apps/mobile)                           | The Expo application for iOS and Android. Its web target is the public web, rendered on the server inside the API's container.                                                                                                                                        |
| [`apps/console`](apps/console)                         | The internal console: a separate React application on its own origin.                                                                                                                                                                                                 |
| [`packages/contracts`](packages/contracts)             | Schemas and types shared by the API and every client, and the shared description of a planning problem.                                                                                                                                                               |
| [`packages/planner`](packages/planner)                 | The deterministic planner. A stub. Integer arithmetic only.                                                                                                                                                                                                           |
| [`packages/verifier`](packages/verifier)               | The independent verifier of Routes. A stub. Integer arithmetic only; may not import the planner.                                                                                                                                                                      |
| [`packages/routing`](packages/routing)                 | Travel times as precomputed integers. A stub. Integer arithmetic only.                                                                                                                                                                                                |
| [`packages/triggers`](packages/triggers)               | The trigger rules of an Outing as a pure function. A stub.                                                                                                                                                                                                            |
| [`packages/i18n`](packages/i18n)                       | Interface texts in Russian and English. A stub.                                                                                                                                                                                                                       |
| [`tools/eslint-plugin`](tools/eslint-plugin)           | The lint rule that keeps floating-point code out of the three integer-only packages.                                                                                                                                                                                  |
| [`tools/architecture-tests`](tools/architecture-tests) | Tests that run the real checks over deliberately wrong code.                                                                                                                                                                                                          |
| [`docker`](docker)                                     | Configuration of the local stand-ins: the emulator image, the storage identities, the database initialisation.                                                                                                                                                        |
| [`infra`](infra)                                       | Terraform with providers pinned and no resources.                                                                                                                                                                                                                     |
| [`scripts`](scripts)                                   | The smoke test.                                                                                                                                                                                                                                                       |
| [`docs`](docs)                                         | The specification, the decision records, research, and the [development guide](docs/development.md).                                                                                                                                                                  |
| [`spikes`](spikes)                                     | Standalone experiments. Not part of the workspace.                                                                                                                                                                                                                    |

## Local services

`docker compose up` runs the same application image as the cloud, next to stand-ins for the managed services (ADR-0002):

| Service          | Image                                                                                       | Stands in for                                |
| ---------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `postgres`       | `postgis/postgis:18-3.6`                                                                    | Postgres with PostGIS on Neon                |
| `firebase-auth`  | built from [`docker/firebase-emulator`](docker/firebase-emulator), `firebase-tools` 15.37.0 | Firebase Authentication                      |
| `object-storage` | `chrislusf/seaweedfs:4.50`                                                                  | Cloudflare R2: a public and a private bucket |
| `mail`           | `axllent/mailpit:v1.34.0`                                                                   | the e-mail provider                          |
| `migrate`, `api` | the application image                                                                       | Cloud Run                                    |

Language models and speech have no container. Inside the application, adapters replay recorded responses.

**Why SeaweedFS for object storage.** ADR-0010 leaves the emulator to implementation and notes that MinIO's community edition was reported archived; its repository is indeed archived, with the last change on 24 April 2026. Of the S3-compatible servers maintained today, SeaweedFS was chosen because:

- it is actively developed (commits on the day this was written, a release roughly every week) under the Apache-2.0 licence, and needs no account;
- one file of static configuration gives exactly the two access models of ADR-0010 — a bucket anyone can read and a bucket that answers only to a signed request — and one flag creates both buckets at start-up, so the environment needs no initialisation step and no client tool;
- the behaviour the product relies on was verified against it: anonymous read of the public bucket, refusal of the private one, signed links that work, are rejected when altered and expire, and byte-range requests, which the map files need.

Other servers that are maintained today — RustFS, VersityGW and Garage all had commits on the same day — were not tried: the first candidate met every need, and its image was already on the developer's machine. LocalStack was ruled out by ADR-0001, because it needs an account. The emulator sits behind the S3 interface, so replacing it is a change to `compose.yaml` and `docker/object-storage` only.

## Versions

Chosen on 24 November 2026, each read from its registry and its documentation that day.

|                                             | Version                   |
| ------------------------------------------- | ------------------------- |
| Node.js                                     | 26 (26.13.1 in the image) |
| pnpm                                        | 12.15.0                   |
| TypeScript                                  | 6.0.3                     |
| NestJS                                      | 12.6                      |
| Expo SDK, Expo Router                       | 58                        |
| React, React Native                         | 19.3.0, 0.88.1            |
| Vite, Vitest                                | 8.3, 5.1                  |
| ESLint, typescript-eslint                   | 10.15, 8.74               |
| dependency-cruiser                          | 18.9                      |
| fast-check                                  | 4.11                      |
| zod                                         | 4.6                       |
| node-pg-migrate, pg                         | 9.0, 8.23                 |
| Postgres, PostGIS                           | 18, 3.6                   |
| Terraform; `google`, `cloudflare` providers | 1.17; 8.12.0, 5.29.0      |

TypeScript 7.0 is the newest release, but typescript-eslint supports TypeScript below 6.1, and NestJS 12 and Expo SDK 58 are both on 6.0.

## Not here yet

The skeleton stops where features begin. Notably absent, and named in the decision records:

- the planner in a pool of worker threads (ADR-0003) — the stub runs in the request's thread;
- the suite that runs the planner on the phone's JavaScript engine as well as the server's (ADR-0006, ADR-0027);
- cloud adapters for language models and speech (ADR-0004, ADR-0014), and real recordings made with them;
- token verification, the notification outbox, the durable workflows of Preparation, OpenTelemetry;
- the error envelope of ADR-0025 applied to every error answer — its schema is in `contracts`, but the API still answers errors in the framework's default shape;
- building and publishing the image in the pipeline, and any cloud resource.
