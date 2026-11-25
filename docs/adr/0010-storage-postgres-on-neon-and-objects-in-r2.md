# 0010. Storage: Postgres with PostGIS on Neon, files in Cloudflare R2, city data as immutable versions

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 22 November 2026 |
| **Amended** | 23 November 2026, confirmed by the owner — two buckets; weekly dumps; direct and pooled connections; a staging table for events. See [what changed](README.md#changes-after-the-independent-review) |
| **Fork** | #13 "Storage" ([PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks)) |
| **Requirements** | `PLC-1…3`, `PLC-8`, `PLC-11`, `CAT-3`, `NFR-2`, `NFR-8`, `NFR-21`, `NFR-23`, `NFR-30`, `NFR-33`, `NFR-34`, `OUT-14`, `ENT-2`, `EDT-8` |

## Context

- Places form a tree of Territories with boundaries and inherited Access Rules; duplicates are merged by location and name (`PLC-2`, `PLC-3`, `PLC-11`).
- The same request on the same data must give the same Routes (`NFR-2`), so "the same data" needs an identity.
- Route Packs are 80–150 MB and are the product's main traffic (`OUT-14`, `NFR-8`).
- No managed Postgres is free on Google Cloud, and Google Cloud has no free egress to Europe ([ADR-0001](0001-cloud-google-cloud-and-firebase.md)).

### Facts (22 November 2026)

| Fact | Source |
|---|---|
| Neon's Free plan: 1 GB of storage and 100 compute-hours a month per project; compute suspends after five minutes idle and cannot be kept awake; instant restore reaches back six hours; 5 GB of network transfer a month is included. When compute hours or transfer run out, the database is suspended until the next month. PostGIS is available (3.5–3.6 on current Postgres versions). | [plans](https://neon.com/docs/introduction/plans), [PostGIS](https://neon.com/docs/extensions/postgis) |
| Cloudflare R2's free tier: 10 GB-months of storage, 1 million write-class and 10 million read-class operations a month. Egress is free. The API is S3-compatible. Public `r2.dev` addresses are rate-limited and meant for development; production needs a custom domain. Signed links work only on the storage's own address, not on a custom domain. | [pricing](https://developers.cloudflare.com/r2/pricing/), [limits](https://developers.cloudflare.com/r2/platform/limits/), [signed links](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) |
| Google Cloud Storage is free only in three US regions: 5 GB and 100 GB of egress a month. | Google Cloud free-tier pages |
| Supabase's free project pauses after a week without activity. Cloud SQL's smallest instance costs about USD 7.7 a month. | provider pages |
| MinIO's community edition is reported archived (April 2026). | secondary sources |

## Options considered

**Database**

| Option | For | Against |
|---|---|---|
| **Neon (Postgres + PostGIS)** | Free indefinitely; scales to zero; locally it is an ordinary Postgres container | About a second to wake after idle; 1 GB; short restore window |
| Supabase | PostGIS; bundled sign-in and real time | Pauses after a week idle; duplicates decisions already made |
| Cloud SQL | Same cloud | Not free while idle — violates `NFR-34`; a third of the budget |
| Postgres on a free virtual machine | Free | Operations fall on one developer; 1 GB of memory; US regions only |

**Files**

| Option | For | Against |
|---|---|---|
| **Cloudflare R2** | Egress free for good; 10 GB free; S3 interface, so any S3-compatible server emulates it | A second provider and account; a custom domain is needed before launch |
| Google Cloud Storage (US) | One cloud | 5 GB is about one city; egress is paid beyond 100 GB; first-party emulator is partial |

## Decision

1. **One relational database: Postgres with PostGIS on Neon's Free plan.** It is the system of record for everything mutable: Places and their tree, Dossiers and facts, Routes and their versions, Outings, Parties, Chat, the Catalog, entitlements, the audit log.
2. **Catalog filters (`CAT-3`) are plain queries**; text search uses Postgres's own. A separate search engine is not introduced — no requirement fails without one.
3. **Files live in Cloudflare R2 behind an `ObjectStore` port** that speaks the S3 interface, in two buckets. The *public* bucket holds maps, glyphs, sprites and photos. The *private* bucket holds Narrations and the other gated parts of Route Packs (`ENT-2`): the API returns a manifest with signed links valid for about a day and issues new ones when a download resumes.
4. **City data is published as immutable versions.** A version of a city holds its Places with resolved Access Rules and theme scores, the pedestrian graph, the matrix of travel times and the base map. The planner reads a version, never the live tables; the version identifier is part of what makes a Route reproducible (`NFR-2`). Adding a city is publishing a version for it (`PLC-8`, `NFR-21`).
5. **Files are content-addressed and immutable.** A Route Pack is a manifest that lists blobs by hash. The device downloads what it lacks, resumes after interruption, verifies every hash and marks the Pack usable only when complete (`OUT-14`). A Narration shared by two Routes is downloaded once.
6. **Backups (`NFR-30`).** Short-range recovery uses the database's own instant restore. A weekly job writes a compressed dump to the private bucket, where dumps are kept for a fixed number of weeks; restoring from a dump into a fresh database is rehearsed monthly. Daily dumps are ruled out by the 5 GB of monthly network transfer.
7. **Raw analytics events are not kept in Postgres.** They pass through a small staging table and leave it with the next export ([ADR-0021](0021-observability-opentelemetry-and-an-own-event-pipeline.md)); the 1 GB is for the product's own data.
8. **The Cloud Run region is chosen next to the database region** — a Tier 1 region close to the European region Neon offers.
9. **Connections.** The API reaches the database through the pooler; the worker and schema migrations connect directly ([ADR-0012](0012-preparation-pipeline-durable-workflows-on-postgres.md), [ADR-0026](0026-schema-migrations-expand-and-contract.md)).

## Consequences

- The first request after idle pays for waking both a container and the database; this counts against `NFR-4` only for that request and must be measured.
- Two providers hold data. Both sit behind standard interfaces — the Postgres protocol and S3 — so either can be replaced by configuration and a copy (`NFR-23`).
- A local S3-compatible emulator is picked at implementation from the maintained ones; MinIO is not assumed.
- Until a domain is bought, the public bucket is served from the storage's development address with its rate limit ([ADR-0024](0024-runtime-rules-under-scale-to-zero-and-the-spending-envelope.md)).
- Schema ownership follows the modules of [ADR-0003](0003-backend-shape-modular-monolith-with-workers.md): no module reads another's tables.

## Not verified

- Neon's and Cloudflare's country terms beyond general sanctions clauses; whether either accepts the owner's card.
- That 1 GB holds Minsk with its facts, Stories and Route versions — an estimate, to be measured after the first Preparation run.
- Wake-up time of a suspended Neon database from Cloud Run.
