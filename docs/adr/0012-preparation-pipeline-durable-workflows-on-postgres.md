# 0012. Preparation pipeline: durable workflows on Postgres (DBOS), run as a job

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 22 November 2026 |
| **Amended** | 23 November 2026, confirmed by the owner: the worker is TypeScript and runs as a job that is started explicitly; the message broker and the dependence on the developer's machine are gone. See [what changed](README.md#changes-after-the-independent-review) |
| **Amended** | 24 November 2026, confirmed by the owner — after the measurements of Minsk: Preparation starts from the records already gathered, and proposes a Place's name in a language no source supplies. See [what changed](README.md#changes-after-the-measurements-of-minsk) |
| **Fork** | #8 "Preparation pipeline" ([PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks)) |
| **Requirements** | `KNW-1…3`, `KNW-19`, `KNW-21`, `NFR-6`, `NFR-12`, `NFR-22`, `NFR-33`, `NFR-34`, `CUR-4`, `NTF-1` |

## Context

- Preparation of a Place is a chain of slow, fallible steps: collect sources, extract facts, generate Stories, check statements, synthesise speech, transcribe back.
- It runs in the background, shows progress, resumes after a failure at any step and corrupts nothing (`KNW-3`, `NFR-12`).
- Concurrent requests for one Place result in one Preparation (`KNW-2`, `NFR-6`): ten concurrent starts must produce exactly one Dossier.
- Cost is measured per Place and per component (`KNW-19`, `NFR-22`).
- The database is Neon's free plan, which stops for the rest of the month when its compute hours are used up ([ADR-0010](0010-storage-postgres-on-neon-and-objects-in-r2.md)); Cloud Run gives a service no processor time after it has answered ([ADR-0024](0024-runtime-rules-under-scale-to-zero-and-the-spending-envelope.md)).

### Facts (22–23 November 2026)

| Fact | Source |
|---|---|
| DBOS Transact checkpoints each step of a workflow in Postgres and resumes interrupted workflows. Its queues need "just Postgres", with limits on concurrency and rate. | [repository](https://github.com/dbos-inc/dbos-transact-py), [queues](https://docs.dbos.dev/python/tutorials/queue-tutorial) |
| Starting a workflow with an identifier that is already in use attaches to the existing execution by default. | DBOS documentation, `SetWorkflowID` |
| A DBOS queue polls the database, by default every second, for as long as the process lives. | [queues reference](https://docs.dbos.dev/python/reference/queues) |
| DBOS may connect through a pooler "only in session mode"; Neon's pooler is transaction mode. | [DBOS FAQ](https://docs.dbos.dev/faq), [Neon pooling](https://neon.com/docs/connect/connection-pooling) |
| Google Cloud Workflows has no emulator. Temporal needs a running cluster or its paid cloud service. | [ADR-0001](0001-cloud-google-cloud-and-firebase.md); Temporal documentation |

## Options considered

| Option | For | Against |
|---|---|---|
| **A. DBOS: a library on our Postgres** | No orchestration server, so nothing to pay for while idle; identical locally; de-duplication by workflow identifier | Younger and less known than Temporal; its polling must not be left running |
| **B. Temporal** | The industry reference for durable execution | Needs an always-on cluster (violates `NFR-34`) or a paid service beyond the budget |
| **C. Our own step table and a queue** | No new dependency | Retries, recovery, de-duplication and visibility would be written and tested by hand — the library's whole content |
| **D. Google Cloud Workflows** | Managed; a free quota | No emulator, so `NFR-33` fails |

## Decision

Option A, with the worker as a job.

1. **Preparation of a Place is one durable workflow** in the worker ([ADR-0003](0003-backend-shape-modular-monolith-with-workers.md)). Each step stores its result; a restarted worker continues from the last completed step.
2. **The workflow identifier is the Place plus the version of the Dossier being prepared.** A second request for the same Place attaches to the running workflow instead of starting another (`KNW-2`).
3. **The API enqueues the workflow and then starts the worker job.** The worker is a Cloud Run job, not a service: it runs until its queues are empty and exits. Nothing polls the database while there is no work. Locally the same image is started by the same port.
4. **The worker connects to the database directly; the API connects through the pooler.**
5. **Every step writes what it consumed** — tokens, characters, seconds of audio, and which model or service — to a cost ledger. The console reads cost per Place and per component from it (`KNW-19`).
6. **The ledger holds a monthly budget per provider** — tokens, characters, audio hours. A step that would exceed it is not started; the workflow waits for the next period or for the Administrator to raise the budget (`NFR-22`). This is what keeps Preparation inside the spending envelope.
7. **Progress and failures** shown in the console (`CUR-4`) come from workflow state. A failure on one Place does not stop the others.
8. **Steps are idempotent towards the outside:** generated files are written under content hashes, so a repeated step overwrites nothing.
9. **Nothing a Curator verified is changed by a workflow** (`KNW-21`): a re-preparation of a verified Dossier produces a proposal in the Curator's queue.
10. **Account deletion and other multi-store operations** run as workflows of the same kind ([ADR-0019](0019-identity-firebase-authentication-with-guest-upgrade.md)).
11. **Preparation starts from what is already gathered.** The workflow reads the records the base of Places holds for the Place ([ADR-0030](0030-base-of-places-gathered-ahead-of-time-and-matched.md)) and fetches only what is missing. The state heritage bank is one of its sources of facts ([ADR-0011](0011-sources-openstreetmap-wikidata-wikipedia-commons.md)).
12. **Preparation proposes the Place's name in an output language that no source supplies** — an English name is missing for three quarters of Minsk's named Places. The proposed name is marked as generated, a Curator can change it, Stories use it, and the pronunciation dictionary ([ADR-0014](0014-speech-synthesis-and-recognition-behind-ports-aac.md)) starts from it.

## Consequences

- Workflow state shares the product's database; its tables belong to the worker's module and are migrated by the library, pinned to a version ([ADR-0026](0026-schema-migrations-expand-and-contract.md)).
- Acceptance tests follow directly from the requirements: ten concurrent starts yield one Dossier; killing the worker at each step and restarting it finishes without duplicates.
- A long batch keeps the database awake for its whole duration; its compute hours are part of the envelope of ADR-0024.

## Not verified

- Compute hours a full Minsk run consumes on the free plan, and the volume of workflow state against the 1 GB database.
- Start-up time of a job execution, which adds to the delay before the first Place of a batch begins.
