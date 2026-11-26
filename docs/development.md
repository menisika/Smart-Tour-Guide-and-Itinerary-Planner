# Development guide

How the repository is put together and how to work in it. The decisions behind it are in the [Architecture Decision Records](adr/README.md); this page is about the mechanics. For a first start, read the [README](../README.md).

## Contents

- [Layout](#layout)
- [TypeScript conventions](#typescript-conventions)
- [The rules and how each one fails](#the-rules-and-how-each-one-fails)
- [The description of a planning problem](#the-description-of-a-planning-problem)
- [The trigger rules](#the-trigger-rules)
- [Modules of the API](#modules-of-the-api)
- [Schema migrations](#schema-migrations)
- [Recorded responses](#recorded-responses)
- [The container image](#the-container-image)
- [The local environment](#the-local-environment)
- [Running parts from sources](#running-parts-from-sources)

## Layout

```
apps/
  api/        NestJS modular monolith; also the worker, the batch jobs and the migrations
  mobile/     Expo application: iOS, Android and the public web
  console/    internal console, a separate React application
packages/
  contracts/  schemas and types shared by the API and every client
  planner/    the deterministic planner               — integers only
  verifier/   the independent verifier of Routes      — integers only, may not import the planner
  routing/    travel times as precomputed integers    — integers only
  triggers/   trigger rules of an Outing as a pure function
  i18n/       interface texts, Russian and English
tools/
  eslint-plugin/        the `promenade/no-floating-point` lint rule
  architecture-tests/   proves that each rule fails on a deliberate violation
docker/       configuration of the local stand-ins for cloud services
infra/        Terraform: providers pinned, no resources
scripts/      the smoke test of the local environment
```

`spikes/` is not part of the workspace: it is a standalone experiment with its own `package.json`.

## TypeScript conventions

**One strict configuration.** Every package extends [`tsconfig.base.json`](../tsconfig.base.json): `strict` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` and the unused-code checks. The mobile application extends Expo's base configuration and adds the same strictness.

**Relative imports carry the `.ts` extension.**

```ts
import { planRoute } from './plan-route.ts';
```

This is what Node.js expects when it runs TypeScript directly; `tsc` rewrites the extension to `.js` in `dist` (`rewriteRelativeImportExtensions`). The Expo application is the exception: Metro resolves extensions itself, and its imports are written without them, as in every Expo project.

**Workspace packages are consumed in two ways**, chosen by an export condition in each package's `package.json`:

```json
"exports": {
  ".": {
    "@promenade/source": "./src/index.ts",
    "types": "./dist/index.d.ts",
    "default": "./dist/index.js"
  }
}
```

- The type checker, ESLint, Vitest, Vite and dependency-cruiser are told about the `@promenade/source` condition and read the **sources**. That is why `pnpm lint` and `pnpm test` work on a fresh clone, with nothing built.
- Node.js at run time and Metro know nothing of that condition and load **`dist`**. `pnpm build` produces it.

**Shared packages hold erasable TypeScript only** (`erasableSyntaxOnly`): no enums, no namespaces, no parameter properties. They get no ambient types either — neither Node.js nor the DOM — because the same code runs on a phone.

**The API is an ES module project** (`"type": "module"`), as NestJS 12 generates it, with decorator metadata switched on.

## The rules and how each one fails

Four architecture rules are enforced by tools, and each has tests that feed it a deliberate violation.

| Rule                                                                                             | Decision          | Enforced by                                                                                                                                                                                                                                    | Proven by                                                                                                    |
| ------------------------------------------------------------------------------------------------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| The verifier may not import the planner — directly, by package name, or through another package  | ADR-0006, point 7 | `.dependency-cruiser.cjs`: `verifier-not-to-planner`, `verifier-only-on-contracts`; ESLint `no-restricted-imports` for the message in the editor; `packages/verifier/package.json` does not declare the planner, so pnpm does not even link it | `tools/architecture-tests/src/import-boundaries.test.ts`, `lint-rules.test.ts`, `manifests.test.ts`          |
| No floating-point code in `planner`, `verifier`, `routing` and the planning files of `contracts` | ADR-0006, point 2 | ESLint rule `promenade/no-floating-point` (`tools/eslint-plugin`), with inline disabling switched off for those files                                                                                                                          | `tools/eslint-plugin/src/rules/no-floating-point.test.js`, `tools/architecture-tests/src/lint-rules.test.ts` |
| The test-only generators of `contracts` are imported by tests and tools only                     | ADR-0006, point 7 | `.dependency-cruiser.cjs`: `testing-entry-only-from-tests`; the entry point `@promenade/contracts/testing` has no build in `dist`, so Node.js cannot load it at run time                                                                       | `tools/architecture-tests/src/import-boundaries.test.ts`                                                     |
| A module of the API is used only through its `index.ts`                                          | ADR-0003, point 5 | `.dependency-cruiser.cjs`: `api-module-internals`, `api-module-internals-from-outside`, `api-platform-not-to-modules`                                                                                                                          | `tools/architecture-tests/src/import-boundaries.test.ts`                                                     |

`pnpm lint` runs the rules over the repository; `pnpm test` runs the proofs.

### What `promenade/no-floating-point` reports

- a numeric literal with a decimal point or an exponent, or one that is not a safe integer: `0.5`, `1e3`, `9007199254740993`;
- every use of `Math` outside the list `abs`, `ceil`, `clz32`, `floor`, `imul`, `max`, `min`, `round`, `sign`, `trunc` — so `Math.sin`, `Math.sqrt`, `Math.pow`, `Math.random`, `Math.PI`, and also `Math[name]`, `const { sin } = Math` and `const M = Math`, which would hide what is used;
- `**` and `**=`;
- a division that is not rounded at once: write `Math.trunc(a / b)`, `Math.floor(a / b)`, `Math.ceil(a / b)` or `Math.round(a / b)`; `/=` is always reported;
- `parseFloat`, `Number.parseFloat`, `Number.EPSILON`, `Number.MAX_VALUE`, `Number.MIN_VALUE`, and the `Float16Array`, `Float32Array` and `Float64Array` types.

Division and `**` go beyond the letter of ADR-0006, which names floating-point numbers and transcendental functions. They are included because a bare division is how a float appears in integer code without a single float literal. The rule does not apply to test files.

It cannot see a float that arrives from outside as a value; the inputs of these packages are integers by contract.

### Seeing a rule fail by hand

Each command adds a violating file, runs the check, and removes the file.

A float in the planner:

```bash
echo 'export const weight = Math.sqrt(0.5);' > packages/planner/src/tmp-violation.ts; pnpm lint:eslint; rm packages/planner/src/tmp-violation.ts
```

The verifier importing the planner:

```bash
echo "export { planRoute } from '../../planner/src/index.ts';" > packages/verifier/src/tmp-violation.ts; pnpm lint:boundaries; rm packages/verifier/src/tmp-violation.ts
```

One module of the API reaching into another:

```bash
echo "export { PlacesService } from '../../places/internal/places.service.ts';" > apps/api/src/modules/planning/internal/tmp-violation.ts; pnpm lint:boundaries; rm apps/api/src/modules/planning/internal/tmp-violation.ts
```

## The description of a planning problem

`packages/contracts` holds what the planner and the verifier are both written against, in three files:

| File                    | Holds                                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/planning.ts`       | the planning problem and its answer as zod schemas with their types, the closed list of violation codes, the error codes of the planning API |
| `src/planning-rules.ts` | what both sides must compute the same way — the fixed-point scale, the numbering of nodes, the rounding of pace; it imports nothing          |
| `src/planning-wire.ts`  | the Route request and its answer as they travel; the only planning shape that may hold a coordinate                                          |

All three are under `promenade/no-floating-point`. A problem is integers only: instants in whole seconds since the Unix epoch, durations in seconds, scores in fixed point (`SCORE_SCALE`), and travel times as a matrix among the start (index 0), the finish (index 1) and the candidates, with `null` for "no path".

`@promenade/contracts/testing` is a second entry point with fast-check generators of problems, answers and wire requests, shared by the suites of the planner and the verifier. It is published as sources only — a test or a tool can import it, shipped code cannot. `samplePlanningProblems(seed, count)` gives the same problems for the same seed.

## The trigger rules

`packages/triggers` decides arrival at a Place from the stream of position fixes, as a pure function over plain data:

```ts
let state = startOuting({ travelMode, config: defaultTriggerConfig, places });
const step = advance(state, fix); // → { state, events }
```

- The numbers — radius bounds, confirmation, the uncertainty limit, the leave factor — are data, keyed by Travel Mode (`src/config.ts`); a Place may carry a radius of its own.
- Places closer than two radii are grouped into scenes when the Outing starts. An `arrived` event names the scene, the Places whose Stories start by themselves (each at most once per Outing) and the manual Places to prompt for. With accuracy worse than the limit the event is `ask`, and `confirmArrival` takes the person's "yes".
- The state is plain data, so the app can store it and resume an Outing after a restart.

A recorded track (`src/track.ts`) is a JSON object with a header — format, version, `origin`, a description, the Travel Mode — and the fixes. `origin` is `synthetic` or `test-walk`; there is no value for a person using the product, and `parseRecordedTrack` refuses a track without a known origin. `syntheticTrack` draws a track on a flat plan in metres from walks, stops, jumps, gaps and changes of accuracy, the same for the same seed. The plan lies at a point of open sea: tracks and fixtures belong to no city.

The named fixtures are in `src/testing/fixtures.ts`, one or more per rule, and the generator of whole Outings for the property tests in `src/testing/track-arbitraries.ts`.

## Modules of the API

The convention — `index.ts` as the public interface, everything else internal — and the steps for adding a module are in [`apps/api/src/modules/README.md`](../apps/api/src/modules/README.md).

Around the modules:

- `platform/` — configuration, the database pool, the health endpoints, the mounting of the public web;
- `ports/` — the `LanguageModel`, `SpeechSynthesis` and `SpeechRecognition` ports with their adapters;
- `jobs/` — the batch jobs.

**One rule is not checked by a tool:** a module reads and writes only its own tables. It cannot be seen in imports. It is kept in review until the modules get database schemas of their own.

**Runtime rules of ADR-0024 that code must keep**, also by review for now: no timer and no polling loop in the service; no work after the response is sent; the database is not queried periodically. `GET /health` queries the database and therefore must not be used as a periodic probe in the cloud; `GET /health/live` exists for that.

## Schema migrations

Rules, naming and where migrations run: [`apps/api/migrations/README.md`](../apps/api/migrations/README.md).

To add one, create `apps/api/migrations/<UTC time, 17 digits>_<module>_<what-it-does>.sql`. The time is `YYYYMMDDHHmmssSSS`:

```bash
date -u +%Y%m%d%H%M%S000
```

It is applied the next time the environment starts, or at once with:

```bash
docker compose run --rm migrate
```

## Recorded responses

Language models and speech services are paid, so nothing automatic ever calls them (ADR-0027, point 12). In the local environment and in every test the three ports are served by adapters that replay recordings from `apps/api/recordings/`:

```
recordings/
  language-model/<key>.json
  speech-synthesis/<key>.json  +  <key>.m4a
  speech-recognition/<key>.json
```

`<key>` is the SHA-256 of the request in canonical JSON (object keys sorted). For speech recognition the request is identified by the hash of the audio, its media type and its language, so that the recording stays small.

A recording is a JSON object. The adapter reads `response`; `request` and `note` are for people:

```json
{
  "note": "where this recording came from",
  "recordedAt": "2026-11-24T18:00:00Z",
  "request": { "task": "…", "messages": [], "outputSchema": {}, "maxOutputTokens": 64 },
  "response": {
    "output": {},
    "model": "…",
    "modelVersion": "…",
    "usage": { "inputTokens": 0, "outputTokens": 0 }
  }
}
```

When no recording matches, the adapter throws `RecordingNotFoundError`, and its message names the file it looked for. That is the file to create.

The recordings in the repository today are **synthetic samples**, written by hand and marked so. Real ones will be made on purpose, with a cloud adapter and a developer's own key, once those adapters exist (ADR-0004, point 6). A recording must never hold a key, an identifier of a person, or a location finer than the city.

## The container image

One [`Dockerfile`](../Dockerfile), one image, four commands:

| Command         | What it does                                                                                                                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api` (default) | serves HTTP: the API under `/api`, the health checks, and the public web for every other path                                                                                                                                                     |
| `worker`        | runs Preparation until its queue is empty, then exits — today it finds no queue and exits                                                                                                                                                         |
| `job <name>`    | runs one batch job and exits; `environment-report` is the only one so far. The decision records name the jobs to come: the base of Places (gather, match), the Freshness Checks, the build of city data, the export of product events, the backup |
| `migrate`       | applies pending schema migrations and exits                                                                                                                                                                                                       |

The build compiles the shared packages and the API, exports the Expo application for the web, and copies into the final stage only the API with its production dependencies, its migrations and recordings, and the exported web. The public web's server build is mounted inside the API's process through Expo's Express adapter (ADR-0007, point 2), in `apps/api/src/platform/public-web/`.

One detail of that adapter is worth knowing. `expo-server` 58.1.0 ships an ES-module build and a CommonJS build, and Node.js can load only the CommonJS one: the files of the ES-module build import each other without extensions, which a bundler resolves and Node.js does not. The API is an ES-module project, so it loads the adapter with `createRequire`, which is the `require` of Expo's own documentation. A plain `import` of the adapter passes the type check and fails when the process starts.

The server build that Expo exports has the mirror-image trait: it is CommonJS in files named `.js`. Node.js decides how to read a `.js` file from the nearest `package.json`, and the API's says `"type": "module"`. So `pnpm --filter @promenade/mobile export:web` ends by writing a `package.json` with `"type": "commonjs"` into the export (`apps/mobile/scripts/mark-server-build.mjs`); without it the first page request fails inside the image and works from the source tree.

## The local environment

`docker compose up --build --wait` starts everything in [`compose.yaml`](../compose.yaml). Every published port is bound to `127.0.0.1` and can be moved with a variable:

| Service                       | Address                                                               | Variable                                             |
| ----------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------- |
| API and public web            | http://localhost:8080                                                 | `PROMENADE_API_PORT`                                 |
| Postgres                      | `localhost:5433`, user and password `promenade`, database `promenade` | `PROMENADE_POSTGRES_PORT`                            |
| Authentication emulator       | http://localhost:9099                                                 | `PROMENADE_FIREBASE_AUTH_PORT`                       |
| Emulator interface            | http://localhost:4000                                                 | `PROMENADE_FIREBASE_UI_PORT`                         |
| Object storage (S3 interface) | http://localhost:8333                                                 | `PROMENADE_OBJECT_STORAGE_PORT`                      |
| Mail catcher                  | http://localhost:8025 (interface), `localhost:1025` (SMTP)            | `PROMENADE_MAIL_UI_PORT`, `PROMENADE_MAIL_SMTP_PORT` |

Postgres is published on 5433, not 5432, so that it does not collide with a Postgres already running on the machine.

- **Database.** The image enables PostGIS in its default database; ours, `promenade`, is created empty, as on the managed service, and gets PostGIS from the first migration.
- **Authentication emulator.** Its project identifier is `demo-promenade`; an identifier that starts with `demo-` never reaches a real project. Users live in memory and are gone when the container stops.
- **Object storage.** Two buckets. `promenade-public` can be read by anyone; `promenade-private` answers only to a signed request. The local key pair is in `docker/object-storage/s3.json`.
- **Mail.** Whatever is sent to `mail:1025` is caught and shown in the interface; nothing leaves the machine.

To start from nothing, remove the volumes:

```bash
docker compose down --volumes
```

## Running parts from sources

The API, against the services of the compose environment:

```bash
cp apps/api/.env.example apps/api/.env
```

```bash
pnpm dev:packages
```

```bash
pnpm dev:api
```

`dev:packages` compiles the shared packages and the API into `dist` and keeps doing so on every change; `dev:api` runs `dist` and restarts on change. Stop the `api` container first, or give the process another `PORT`.

The console, at http://localhost:5173, proxying `/api` and `/health` to the API:

```bash
pnpm dev:console
```

The public web with Expo's development server (it reads the shared packages from `dist`, so `pnpm dev:packages` must be running or `pnpm build` must have run):

```bash
pnpm dev:mobile
```

Native builds for Android and iOS need their toolchains, which this repository does not install.
