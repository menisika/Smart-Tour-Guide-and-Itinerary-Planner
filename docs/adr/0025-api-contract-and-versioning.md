# 0025. API contract and versioning

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 23 November 2026 |
| **Origin** | Not one of the 22 forks; raised by the independent review as a decision every client–server system needs. See [what changed](README.md#changes-after-the-independent-review) |
| **Requirements** | `NFR-29`, `NFR-38`, `OUT-16`, `NFR-9`, `ACC-5`, `CUR-1…11` |

## Context

- Three clients talk to one API: the mobile app, the public web and the console ([ADR-0005](0005-mobile-client-expo-and-a-typescript-monorepo.md), [ADR-0007](0007-web-from-the-expo-codebase-and-a-separate-console.md)).
- Old builds of the app stay in use: an APK installed directly is not updated by a store ([ADR-0023](0023-distribution-stores-deferred.md)).
- Journal entries are written on a device and may be delivered days later ([ADR-0017](0017-sync-offline-journal-and-idempotent-api.md)); their format is the longest-lived wire format in the system.

## Options considered

| Option | For | Against |
|---|---|---|
| **A. REST with schemas in the shared `contracts` package** | One definition gives types to every client and validation to the server; a language-neutral description can be generated | Request and response shapes are written explicitly |
| **B. A TypeScript-only remote-procedure layer** | Least writing while every client is TypeScript | No description usable outside TypeScript; couples clients to server internals |
| **C. GraphQL** | Flexible reads | No requirement asks for it; more to operate and secure |

## Decision

Option A.

1. **The API is REST over HTTPS with JSON.** Real-time messages use the same schemas over WebSocket ([ADR-0018](0018-real-time-websocket-gateway-in-memory-fan-out.md)).
2. **Every request, response, journal entry and event is defined once, as a schema in `contracts`.** The server validates against it at the boundary; clients get their types from it; an OpenAPI document is generated from it.
3. **Journal entries and events carry a type and a version.** The server accepts every version still present on devices. A version is never changed in place; a new shape is a new version.
4. **Every request states the client's version. The server enforces a minimum** and answers below it with one well-defined "update required" response that every client build knows how to show.
5. **Errors have one envelope with stable codes.** Messages shown to people are chosen on the client by code and language, which is how the specific, actionable messages of §4.5 are delivered in two languages.
6. **A compatibility suite gates every change:** the contract of the previous release is run against the current server ([ADR-0027](0027-testing-strategy.md)).

## Consequences

- A breaking change to the API is a visible act: a new version of a schema and a decision about the minimum client version.
- The console is a client like the others and has no private back door.
- Which schema library and generator are used is an implementation choice.
