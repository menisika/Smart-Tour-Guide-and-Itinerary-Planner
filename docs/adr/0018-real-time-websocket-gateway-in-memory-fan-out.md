# 0018. Real time: a WebSocket gateway in the API, fan-out in memory behind a port, Postgres as the source of truth

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 22 November 2026 |
| **Amended** | 23 November 2026, confirmed by the owner: the message broker is removed; one instance holds the connections and fans out in memory. See [what changed](README.md#changes-after-the-independent-review) |
| **Fork** | #7 "Real time" ([PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks)) |
| **Requirements** | `PTY-13…16`, `OUT-20`, `NFR-13`, `NFR-14`, `NFR-32`, `NFR-33`, `NFR-34`, invariant 8 of §3.6 |

## Context

- A Party has a Chat, member statuses, shared progress of the Outing and, before gathering, optional sharing of positions (`PTY-13…16`).
- Chat and positions arrive within 2 seconds and progress within 5, at the 95th percentile (`NFR-13`).
- Shared positions pass through the server and are never stored (`PTY-15`, `NFR-14`).
- Messages sent from two devices arrive in the same order everywhere; a message sent offline is delivered once (§4.8, acceptance).

### Facts (22–23 November 2026)

| Fact | Source |
|---|---|
| Cloud Run holds WebSocket connections for up to 60 minutes and up to 1 000 concurrent requests per instance. An instance with any open WebSocket counts as active and is billed for that time. Session affinity is best effort. | [WebSockets on Cloud Run](https://docs.cloud.google.com/run/docs/triggering/websockets), [concurrency](https://docs.cloud.google.com/run/docs/about-concurrency) |
| The always-free 180 000 vCPU-seconds a month are 50 hours of one instance with one processor. | arithmetic from [Cloud Run pricing](https://cloud.google.com/run/pricing) |
| A Pub/Sub subscription retains an unacknowledged message for at least 10 minutes and exists for at least a day; broadcasting to every instance needs a subscription per instance. | [subscription properties](https://docs.cloud.google.com/pubsub/docs/subscription-properties) |
| On Neon's free plan an idle `LISTEN` connection does not keep the database awake; the database suspends and silently drops it. | [Neon, WebSockets](https://neon.com/docs/compute/functions/websockets) |
| The free tiers of managed real-time services are far below the design load (Firebase Realtime Database: 100 connections; Azure Web PubSub: 20). | provider pricing pages |

## Options considered

| Option | For | Against |
|---|---|---|
| **A. One instance holds the connections and fans out in memory; a broker joins later behind a port** | Nothing to run or emulate besides the API; positions exist only in memory, so "never stored" holds literally | Capacity is one instance until the broker adapter is written |
| **B. Pub/Sub between instances from the start** | `NFR-32` met without a caveat | A subscription per instance to create, delete and sweep; an undelivered position sits in the broker for at least 10 minutes, which the specification would have to permit |
| **C. Postgres `LISTEN`/`NOTIFY` between instances** | No new service | Does not work on the free database plan |
| **D. Firestore listeners, or a dedicated real-time server** | Delivery and reconnection ready-made | A second store for Chat and stored positions (Firestore); another deployable needing Redis (dedicated server) |

## Decision

Option A.

1. **A `realtime` module of the API accepts WebSocket connections** from the app and the web, over plain WebSocket without a polling fallback.
2. **A connection is open only while a person is looking at a live phase of a Party** — gathering with sharing on, meeting, the Outing in the foreground — and is closed after a few minutes without traffic. Everything else reads through ordinary requests when the screen gains focus and is nudged by push ([ADR-0020](0020-notifications-outbox-fcm-and-e-mail-behind-a-port.md)). This is what keeps connection time inside the free instance hours.
3. **Postgres is the source of truth for Chat and progress.** A message is stored and given the next sequence number of its Outing in one transaction; clients order by that number and fetch any gap. This yields the same order on every device. A client that reconnects states the last number it saw.
4. **Fan-out goes through a `Fanout` port whose only adapter today works in memory.** The API therefore runs as a single instance for now; one instance holds up to 1 000 connections.
5. **Positions are relayed in memory only.** They are never written to the database, never logged and never put into product events. Sharing is off by default, limited in time, and ends when the Outing starts — enforced on the server at relay time, not only in the interface (`PTY-15`).
6. **Messages composed offline** go through the journal of [ADR-0017](0017-sync-offline-journal-and-idempotent-api.md) and are therefore stored once. **Shared progress** is the Visits already delivered by the journal, announced to the Party as they arrive.
7. **Beyond one instance** — more than about a thousand simultaneous connections, or planning load that needs several instances — the real-time module is deployed as its own service and a broker adapter is written behind the port ([ADR-0003](0003-backend-shape-modular-monolith-with-workers.md)). That is planned work with a known shape, not a redesign; it is also the moment the specification must say what "never stored" means for a transport buffer.

## Consequences

- **Recorded limit:** real time runs on one instance. The tenfold growth of `NFR-32` is reachable for connections only after the broker adapter of point 7 exists.
- An acceptance test shares a position, stops sharing, and then searches the database, object storage and logs for it.
- A connected Party keeps the instance billed while it is connected. Ten test Outings of four hours each would use most of a month's free instance hours; instance hours held by connections are on the cost dashboard ([ADR-0024](0024-runtime-rules-under-scale-to-zero-and-the-spending-envelope.md)).

## Not verified

- End-to-end latency against the two seconds of `NFR-13`.
- How many simultaneous connections the design load really produces once connections are limited to live phases in the foreground.
- Behaviour of a WebSocket held by the mobile app when the screen locks.
