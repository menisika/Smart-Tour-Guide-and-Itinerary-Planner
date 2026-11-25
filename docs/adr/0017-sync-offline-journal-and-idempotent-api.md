# 0017. Synchronisation: a journal on the device and an idempotent API

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 23 November 2026 |
| **Amended** | 23 November 2026, confirmed by the owner — a high-water mark replaces the set of applied identifiers; reads do not use the real-time channel. See [what changed](README.md#changes-after-the-independent-review) |
| **Fork** | #6 "Synchronisation" ([PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks)) |
| **Requirements** | `OUT-13`, `OUT-16`, `NFR-9`, `NFR-10`, `EDT-8`, `ACC-2`, `ACC-4`, `ACC-5`, `PTY-16`, `FBK-3`, invariant 9 of §3.6 |

## Context

- Everything done without a network — Visits, ratings, Corrections, skips, edits — is kept on the device and delivered exactly once when the network returns (`OUT-16`, `NFR-9`).
- An Outing survives loss of network, restart and crash (`NFR-10`).
- Every edit of a Route creates a new version (`EDT-8`); within a Party only the Organizer edits the Route (§2.2).
- A User's data is the same on all their devices (`ACC-5`).

## Options considered

| Option | For | Against |
|---|---|---|
| **A. A journal of actions on the device, accepted idempotently by the server** | Exactly-once effects from two simple rules; no extra service; fits the relational model | Reading on other devices is ordinary fetching and caching, written by hand |
| **B. Conflict-free replicated data types** (Automerge, Yjs) | Automatic merging of concurrent edits | The specification has no concurrent editing of one thing by several people; the document lives in the library's format, not in tables; the verifier must still check the merged result |
| **C. A synchronisation engine** (PowerSync, ElectricSQL) | Less code for reading data on the device | A further always-on service; exactly-once delivery of Visits still needs our journal; ties to a vendor |

No requirement fails without option B or C.

## Decision

Option A.

1. **Every action taken on the device is first written to a journal in the device's SQLite database**, with an identifier created on the device, the Outing it belongs to and a sequence number. The interface reads its state from the same database, so it behaves the same with and without a network.
2. **The device sends journal entries in order; the server keeps, per device and stream, the number of the last entry it applied** and ignores anything at or below it. Sending again is always safe. An entry is removed from the device only after the server has acknowledged it. These two rules give "no loss, no duplicates" without an ever-growing set of identifiers.
3. **The state of an Outing in progress** — current stop, Story and position within it — is stored on the device at every change and restored after a restart or a crash (`OUT-13`, `NFR-10`).
4. **A Route edit is a new version with a pointer to its parent**, created on the device with its own identifier. If two devices of the same person diverge, both versions are kept and the later one becomes current; nothing is overwritten silently (`EDT-8`).
5. **Reading** (`ACC-5`): the device fetches a person's Routes, Profile and history through the API and caches them; changes made elsewhere arrive on the next fetch, which happens when the screen gains focus or a push arrives. The real-time channel is reserved for the live phases of a Party ([ADR-0018](0018-real-time-websocket-gateway-in-memory-fan-out.md)).
6. **A Guest's journal carries the Guest's identity**; on registration the identity is upgraded in place ([ADR-0019](0019-identity-firebase-authentication-with-guest-upgrade.md)), so nothing in the journal has to be rewritten (`ACC-4`).
7. **Product events** travel through the same journal ([ADR-0021](0021-observability-opentelemetry-and-an-own-event-pipeline.md)).
8. **A suite gates every change (`NFR-38`):** it cuts the network, resends, and kills the process on both sides, and asserts zero lost and zero duplicated Visits, ratings and Corrections.

## Consequences

- The server stores one number per device and stream; there is no retention period to choose.
- Entry types are versioned, because old builds of the app stay in use ([ADR-0025](0025-api-contract-and-versioning.md)).
- Order is guaranteed per Outing, not globally; nothing in the specification needs a global order.
- If concurrent editing by several people is ever required (for instance, an open Outing planned together), this decision is revisited.
