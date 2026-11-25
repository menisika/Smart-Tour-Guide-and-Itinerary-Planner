# 0021. Observability: OpenTelemetry into Google Cloud; product events through our own pipeline

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 23 November 2026 |
| **Amended** | 23 November 2026, confirmed by the owner — events are staged in Postgres and exported by a job; few platform alerts; pseudonymous person keys. See [what changed](README.md#changes-after-the-independent-review) |
| **Fork** | #18 "Observability and analytics" ([PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks)) |
| **Requirements** | `NFR-28`, `ANL-1…4`, `CUR-8`, `FBK-6`, `KNW-19`, `NFR-17`, `NFR-23`, `NFR-33`, `NFR-34` |

## Context

- State, errors and the measures of section 5 must be visible without asking a developer; critical failures raise an alert (`NFR-28`).
- The system records the events needed to compute every measure of section 5 and the product measures of `ANL-2…4`. Events carry no coordinates (`ANL-1`).
- Dashboards in the console show Coverage, cost per Place, ratings, trigger reliability and failures (`CUR-8`).
- Raw events are not kept in the 1 GB database ([ADR-0010](0010-storage-postgres-on-neon-and-objects-in-r2.md)).

### Facts (22–23 November 2026)

| Fact | Source |
|---|---|
| Google Cloud: 50 GiB of logs per project and 2.5 million trace spans a month are free; logs written by Cloud Run containers are collected without an agent. | Google Cloud pricing pages |
| DuckDB runs inside a process and reads Parquet and JSON files directly from S3-compatible storage; it has a dedicated secret type for Cloudflare R2. | [DuckDB, S3 API](https://duckdb.org/docs/2.0/core_extensions/httpfs/s3api) |
| BigQuery has no first-party emulator. | absence of one in Google's emulator list |

## Options considered

| Option | For | Against |
|---|---|---|
| **A. OpenTelemetry to Google Cloud; our own event pipeline with DuckDB** | A vendor-neutral standard; free while idle; identical locally; events never leave our storage | Funnels and charts are built in the console by hand |
| **B. A product-analytics service** (PostHog, Firebase Analytics) plus OpenTelemetry | Funnels and charts out of the box | People's events go to a third party (`NFR-17`); no local equivalent (`NFR-33`); the measures of section 5 still have to reach the console |
| **C. Events in Postgres** | Nothing new | Events are the fastest-growing data against a 1 GB limit; contradicts ADR-0010 |

## Decision

Option A.

**Technical telemetry**

1. The API and the worker are instrumented with **OpenTelemetry**: structured logs, metrics and traces, with one trace identifier from the client request through the queue into the worker.
2. **In the cloud** telemetry goes to Google Cloud's logging, monitoring and tracing, exported by the applications themselves without a collector running beside them. **Locally** the same signals go to a single observability container (`NFR-33`). The destination is configuration (`NFR-23`).
3. **Alerts** exist for the failures that matter: the API not answering, Preparation failing repeatedly, a budget in the cost ledger being reached (`NFR-22`), the outbox or the journal intake backing up. At most three are platform alert conditions, because each is charged monthly; the rest are raised by the system itself through the notification outbox.
4. **Crashes of the mobile app** are reported to a crash reporter behind a thin wrapper; a crash report carries no position.

**Product events**

5. **Events are defined in the shared `contracts` package.** The schema of an event has no field that could hold a coordinate; an event that does not match its schema is rejected (`ANL-1`). An event names the person by a pseudonym derived with a per-person key; destroying the key when the account is deleted severs the person from events already exported ([ADR-0019](0019-identity-firebase-authentication-with-guest-upgrade.md)).
6. **Events leave the device through the journal** of [ADR-0017](0017-sync-offline-journal-and-idempotent-api.md), so they are neither lost nor duplicated and work offline. The API writes them to a staging table in the same transaction in which it applies the journal entry.
7. **A daily job exports the staged events to files in object storage, deletes the staged rows, computes the measures with DuckDB over the files and writes the results into aggregate tables in Postgres.** Nothing is buffered in memory, so nothing is lost when an instance stops.
8. **The console's dashboards read the aggregates** (`CUR-8`, `FBK-6`); the cost of Preparation comes from the cost ledger of [ADR-0012](0012-preparation-pipeline-durable-workflows-on-postgres.md).
9. **The activation event** is the first completed Outing (`ANL-4`).

## Consequences

- Every measure of section 5 has a definition in code — a query in the aggregation job — rather than in a dashboard tool.
- Trigger reliability (`NFR-5`) is computed from events the device records about its own triggers, without positions leaving the device.
- A product-analytics service can be added later as another destination of the same events; nothing depends on one.

## Not verified

- The current charge per alerting condition (reported as USD 0.10 a month).
- The choice of crash reporter and its country terms.
- Volume of event files at the design load against the 10 GB of free object storage.
