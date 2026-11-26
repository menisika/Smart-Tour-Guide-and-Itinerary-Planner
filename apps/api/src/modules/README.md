# Modules of the API

Each folder here is one module of the modular monolith (ADR-0003). Modules follow the areas of the specification: identity and access, profile, places, knowledge, planning, outings, party, catalog, feedback, entitlements, notifications, console, measurement. Two exist so far, as skeletons.

## The rule

```
modules/<name>/
  index.ts          the public interface — the only file other code may import
  <name>.api.ts     the interface, its injection token and its types; re-exported by index.ts
  internal/         everything else: the NestJS module, services, repositories, controllers
```

- Code outside a module imports `modules/<name>/index.ts` and nothing else of it.
- A module uses another module through the interface that module exports, injected by its token — never through its classes or its tables.
- A module owns a Postgres schema named after it and reads and writes only the tables of that schema. A migration touches the schema of one module (ADR-0026; [`migrations/README.md`](../../migrations/README.md)).
- `platform/` and `ports/` serve the modules and import none of them.

The import rules are checked by `pnpm lint:boundaries` (`.dependency-cruiser.cjs`, rules `api-module-internals`, `api-module-internals-from-outside`, `api-platform-not-to-modules`) and proven to fail on violations by `tools/architecture-tests`.

## The database

A module reaches the database through [`platform/database/index.ts`](../platform/database/index.ts) and nothing else — never the pool, never the `pg` driver (rules `api-modules-database-through-index`, `api-modules-not-to-pg`).

**Every statement is a `sql` template**, with the schema written out and values interpolated:

```ts
import { type Queryable, sql } from '../../../platform/database/index.ts';

await database.query(sql`select id, name from places.place where id = ${id}`);
```

Only values can be interpolated, never names or pieces of SQL. `tools/architecture-tests` reads every `sql` template of every module with PostgreSQL's own parser and fails `pnpm test` when one names a table outside the module's schema, names a table without a schema, or changes the shape of the database. So the rule "a module reads and writes only its own tables" is checked by a tool; it used to be kept in review.

**Reading** outside a transaction: inject `Database` and call `database.query(…)`.

**Writing, and anything that spans modules**: a unit of work. The request opens one, passes `tx` to the interface of every module that takes part, and everything commits once or not at all.

```ts
await this.unitOfWork.run(async (tx) => {
  await this.outings.finish(tx, outingId);
  await this.feedback.open(tx, outingId);
});
```

- An interface method that writes takes the `Transaction` as its first parameter.
- `run` inside a running unit of work joins it: a module that also works alone may open its own, and only the outermost commits. A failure in a nested one rolls everything back, even if the outer code catches the error.
- `Database.query` inside a unit of work joins its transaction too, so a read sees what the unit has written.
- `tx` is closed when its unit of work ends. Keeping it for later — a promise nobody awaits — fails, on purpose: no work runs after the response (ADR-0024, rule 2).

## Domain events

A module tells the others that something happened by publishing an event on the in-process bus ([`platform/events`](../platform/events/domain-events.ts)), instead of calling them or touching their tables.

The publisher defines the event in its interface file and exports it from `index.ts` (or defines it in `contracts`, when clients see the same shape):

```ts
export const outingFinished = defineDomainEvent(
  'outings.outing-finished',
  z.object({ outingId: z.string() }),
);
```

It publishes inside a transaction — there is no other way:

```ts
await this.events.publish(tx, outingFinished, { outingId });
```

A module that reacts registers a handler in `onModuleInit` of one of its providers:

| Registered with                        | Runs                                                                        | A failure                                                   |
| -------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `events.subscribe(type, handler)`      | inside the publisher's transaction, with its `tx`; awaited by `publish`     | rolls the whole unit of work back                           |
| `events.subscribeAfterCommit(type, …)` | right after the commit, awaited by `UnitOfWork.run`, so before the response | is logged; the commit stands and the request still succeeds |

A rolled-back transaction delivers nothing after commit. Nothing is delivered after the response, and nothing survives a crash between the commit and an after-commit handler: what must not be lost is written inside the transaction — that is what the notification outbox of ADR-0020 is.

## Adding a module

1. Create `modules/<name>/<name>.api.ts` with the interface and its token.
2. Implement it under `modules/<name>/internal/` and bind the token in the module class.
3. Export the module class and the interface from `modules/<name>/index.ts`.
4. Import the module in `app.module.ts`.
5. Give it its schema: a migration `<time>_<name>_create-schema.sql` with `CREATE SCHEMA IF NOT EXISTS <name>;`. A test fails while a module has none.
