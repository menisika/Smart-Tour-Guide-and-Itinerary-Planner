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
- A module reads and writes only its own tables. A migration touches the tables of one module (ADR-0026).
- `platform/` and `ports/` serve the modules and import none of them.

The import rules are checked by `pnpm lint:boundaries` (`.dependency-cruiser.cjs`, rules `api-module-internals`, `api-module-internals-from-outside`, `api-platform-not-to-modules`) and proven to fail on violations by `tools/architecture-tests`. The rule about tables cannot be seen in imports and is kept in review.

## Adding a module

1. Create `modules/<name>/<name>.api.ts` with the interface and its token.
2. Implement it under `modules/<name>/internal/` and bind the token in the module class.
3. Export the module class and the interface from `modules/<name>/index.ts`.
4. Import the module in `app.module.ts`.
