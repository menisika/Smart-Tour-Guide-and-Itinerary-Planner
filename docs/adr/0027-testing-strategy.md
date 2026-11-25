# 0027. Testing strategy

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 23 November 2026 |
| **Amended** | 24 November 2026, confirmed by the owner — after the measurements of Minsk: tests of the base of Places are added. See [what changed](README.md#changes-after-the-measurements-of-minsk) |
| **Amended** | 24 November 2026, confirmed by the owner — with ADR-0031: tests of change records and of the website Freshness Check are added. See [what changed](README.md#changes-after-the-product-narrowed-to-belarus) |
| **Origin** | Not one of the 22 forks; raised by the independent review: the specification demands specific suites and no record said how they are run. See [what changed](README.md#changes-after-the-independent-review) |
| **Requirements** | `NFR-1`, `NFR-2`, `NFR-5`, `NFR-7`, `NFR-9`, `NFR-11`, `NFR-12`, `NFR-27`, `NFR-38`, `ACC-6`, `PTY-15`, `KNW-2`, `KNW-3`, `PLC-11`, `PLC-12`, `PLC-13`, `CUR-5` |

## Context

- Several requirements are defined by a test: 100 % of Routes accepted by the verifier over at least 1 000 requests on every change (`NFR-1`); identical Routes over ten repetitions (`NFR-2`); no lost and no duplicated action when the network is cut and processes are killed (`NFR-9`); fault injection for each external dependency (`NFR-11`); killing each step of Preparation (`NFR-12`).
- Model and speech calls cost money and the owner asked for few and small evaluation runs ([ADR-0004](0004-language-models-cloud-hosted-behind-a-port.md)).
- Some thresholds can only be measured outdoors (`NFR-5`, `NFR-7`).

## Decision

**Run on every change (`NFR-38`)**

1. **Planner and verifier, property-based:** at least 1 000 generated requests, every Route accepted by the verifier; a deliberately broken planner must be caught; for generated Parties no Dealbreaker is violated ([ADR-0006](0006-planner-one-deterministic-heuristic-and-an-independent-verifier.md)).
2. **Reproducibility:** ten repetitions give identical Routes; the same request at the same budget gives byte-identical output on the server's JavaScript engine and on the phone's, both run from the command line in the pipeline.
3. **Trigger rules:** the pure function of rules T1–T10 is run against recorded tracks ([ADR-0005](0005-mobile-client-expo-and-a-typescript-monorepo.md)). The fixtures are synthetic tracks and tracks recorded for this purpose on test walks; no track of a person using the product is ever a fixture.
4. **Journal:** the network is cut, entries are resent, and the process is killed on each side; zero lost, zero duplicated ([ADR-0017](0017-sync-offline-journal-and-idempotent-api.md)).
5. **Integration:** the pipeline starts the same compose environment a developer starts and runs the scenarios against it ([ADR-0002](0002-terraform-github-actions-and-local-environment.md)).
6. **Fault injection (`NFR-11`):** every external adapter — language models, synthesis, recognition, push, e-mail, object storage — has a test double that can time out, fail and answer slowly; tests assert the degraded behaviour the specification names.
7. **Preparation:** ten concurrent starts yield one Dossier; the worker is killed at each step and restarted ([ADR-0012](0012-preparation-pipeline-durable-workflows-on-postgres.md)).
8. **Contracts and schema:** the previous release's contract against the current server, and the previous release's suite against the new schema ([ADR-0025](0025-api-contract-and-versioning.md), [ADR-0026](0026-schema-migrations-expand-and-contract.md)).
9. **Privacy tests:** after account deletion no personal record is retrievable through any API (`ACC-6`); after position sharing stops, no position is found in the database, object storage or logs of the local environment (`PTY-15`).
10. **Accessibility:** automatic checks of the web build against WCAG 2.2 AA (`NFR-27`).
11. **Base of Places:** a labelled set of match decisions; properties — the order of input does not matter, a second run changes nothing, a Curator's decisions survive a run, identifiers stay put when a source record is renamed, moved or deleted; every source has a test double; the local environment builds a small fixed city ([ADR-0030](0030-base-of-places-gathered-ahead-of-time-and-matched.md)). Change records ([ADR-0031](0031-keeping-the-base-of-places-current.md)): a Place's state equals its snapshot plus its applied records; undo restores the earlier value and is refused when a later record changed it; a rejected value is not proposed again after an unrelated change at its origin; an attribute set by a Curator is never changed automatically, and a protected Place is never closed, merged or split without a Curator; the limit on what one run may apply holds; the website Freshness Check runs against recorded pages; no text or author of a Correction survives account deletion in any record.

**Never in the pipeline**

12. **No paid service is called by an automated check.** Model and speech adapters replay recorded responses.

**Run by hand, on a schedule the owner sets**

13. **Model quality:** small fixed sets, started when a model or a prompt changes — Wish interpretation against the labelled set (`NFR-36`), statement support against the labelled sample (`NFR-18`); and the planner's distance from an exact reference solver on generated instances ([ADR-0006](0006-planner-one-deterministic-heuristic-and-an-independent-verifier.md)).
14. **Field protocol:** the reference Outing in Minsk walked twice per stage with the screen locked, on an iPhone and an Android phone, recording trigger reliability and battery use (`NFR-5`, `NFR-7`); the same Outing in airplane mode.
15. **Critical paths on real devices** before a stage is called done (§7.4).

## Consequences

- A change that breaks a promise of the product fails in the pipeline, without spending money.
- What only a street can show is not pretended to be automated; it has a protocol instead.
- Tools — the property-testing library, the runner for the phone's engine, device automation — are implementation choices.
