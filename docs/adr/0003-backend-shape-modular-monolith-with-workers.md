# 0003. Back-end shape: a modular monolith with a worker, in one language

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 22 November 2026 |
| **Amended** | 23 November 2026, confirmed by the owner: the worker is TypeScript, not Python, and runs as a job; the public web is served by the API container. See [what changed](README.md#changes-after-the-independent-review) |
| **Fork** | #17 "Shape of the back end" ([PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks)) |
| **Requirements** | constraint 5 of §10.1 (one developer), `NFR-32`, `NFR-34`, `NFR-4`, `NFR-13`, `KNW-3`, `NFR-12`, `NFR-29`, `NFR-33` |

## Context

- One developer builds and operates the system. Every deployable is a cold start, a pipeline and a failure point (§10.1, constraint 5).
- The design load is modest — 10 000 people a month, 500 Outings in progress, 50 Route requests a minute — and ten times that must be reachable "by adding capacity, without redesign" (`NFR-32`).
- With no users the deployment must cost nothing (`NFR-34`), which means containers that scale to zero. Each additional service on the request path adds its own cold start to the budget of `NFR-4`.
- Preparation is a different kind of work from serving requests: it runs for minutes per Place, in the background, and must survive being killed at any step (`KNW-3`, `NFR-12`).
- Language models, speech synthesis and speech recognition are cloud services ([ADR-0004](0004-language-models-cloud-hosted-behind-a-port.md), [ADR-0014](0014-speech-synthesis-and-recognition-behind-ports-aac.md)); the only model run by us is a small entailment model that has a build for Node.js ([ADR-0013](0013-statement-verification-entailment-model-then-judge.md)).

## Options considered

| Option | For | Against |
|---|---|---|
| **A. Modular monolith + a worker** split off only where the load profile differs | One deployable on the request path, one database, cheap cross-module transactions, fewest cold starts | Module boundaries erode unless they are enforced |
| **B. Several services from the start** (5–8, with a broker and contracts between them) | Independent scaling and deployment per service; broader on a CV | No requirement fails without it. Adds distributed transactions, per-service cold starts and pipelines — a direct conflict with constraint 5 |
| **C. A single process, no worker** | Simplest | Preparation inside the API process breaks the response time of `NFR-4` and the kill-and-resume guarantee of `KNW-3` / `NFR-12` |

**Worker language.** The first version of this record put the worker in Python, for three libraries: stress placement, a local entailment model and local speech recognition. With cloud models as the primary route no requirement fails without Python: the entailment model runs under ONNX in Node.js, recognition is a hosted service, and stress in ordinary words is the speech engine's job. The owner chose one language.

## Decision

Option A, in TypeScript throughout.

1. **`api` — one modular monolith** serves every request-response and real-time endpoint for the mobile app, the web client and the internal console, and renders the public web pages ([ADR-0007](0007-web-from-the-expo-codebase-and-a-separate-console.md)). Its modules follow the areas of the specification: identity and access (`ACC`), profile (`PRF`), places (`PLC`), knowledge (`KNW`, read side and Curator operations), planning (`RTE`, `EDT`), outings (`OUT`), party (`PTY`), catalog (`CAT`), feedback (`FBK`), entitlements (`ENT`), notifications (`NTF`), console (`CUR`), measurement (`ANL`).
2. **The worker is the same codebase and the same container image with a different entry point.** It executes Preparation as a job that is started explicitly and exits when its queue is empty ([ADR-0012](0012-preparation-pipeline-durable-workflows-on-postgres.md), [ADR-0024](0024-runtime-rules-under-scale-to-zero-and-the-spending-envelope.md)).
3. **Batch jobs**, also entry points of the same image, build city data, export and aggregate product events, and take backups.
4. **The planner runs in a pool of worker threads** inside the API process, so that a second of planning does not freeze Chat and progress for everyone connected to the instance (`NFR-13`).
5. **Module rules.** A module exposes an explicit in-process interface and publishes domain events; no module reads another module's tables; the rules are checked automatically on every change (`NFR-38`).
6. **Extraction rule.** A module becomes a service only when a named requirement forces it. Two candidates are known in advance and are designed so that extraction is a deployment change: the real-time gateway (`PTY-13…16`, `NFR-13`) when connections outgrow one instance ([ADR-0018](0018-real-time-websocket-gateway-in-memory-fan-out.md)), and the planner if CPU-bound planning starves other requests under the load of `NFR-32`.
7. **Python is not on the production path.** It returns, as one small separate job, only if the listening comparison of ADR-0014 shows that the speech engine's own stress placement is not good enough.

## Consequences

- The request path has one cold start, and the idle deployment has the smallest possible footprint (`NFR-34`).
- One language, one toolchain and one image: shared types run from the API contract to the steps of Preparation.
- Planning is CPU-bound; the size of the thread pool and of the instance is set from a load test against `NFR-4` and `NFR-32`, not assumed.
- Microservices were rejected even though they would show more technologies: no requirement of the specification fails without them.
