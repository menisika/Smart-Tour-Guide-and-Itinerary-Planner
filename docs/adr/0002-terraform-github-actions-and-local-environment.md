# 0002. Terraform, GitHub Actions, and a one-command local environment

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 22 November 2026 |
| **Amended** | 23 November 2026, confirmed by the owner — one image with several entry points; migrations in the pipeline; recorded responses instead of a local model. See [what changed](README.md#changes-after-the-independent-review) |
| **Fork** | #16 "Cloud, infrastructure as code, pipeline" — the pipeline part ([PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks)) |
| **Requirements** | `NFR-29`, `NFR-33`, `NFR-38`, `NFR-31`, `NFR-34` |

## Context

- Deployment must be reproducible, with no manual steps and a way back to the previous version (`NFR-29`).
- The whole system must start on a developer's machine with one command, on emulators, from the same build artefacts as the cloud (`NFR-33`).
- Every change passes automated checks before it reaches the main branch (`NFR-38`).
- The repository is public for now (owner's statement, 22 November 2026).

### Facts (22 November 2026)

| Fact | Source |
|---|---|
| Terraform 1.6 and later is under the Business Source License. It permits production use unless it means "offering the Licensed Work to third parties on a hosted or embedded basis in order to compete with IBM Corp.'s paid version(s)"; internal use is expressly not competitive. | Terraform `LICENSE` |
| Terraform is at 1.17.2 and OpenTofu at 1.13.9. The `google` provider is on both registries at the same version. | GitHub releases, both registries |
| The Terraform registry and release server answered from the owner's machine (HTTP 200, measured). No official statement about blocking access from Belarus was found; only user reports. | measured; secondary reports |
| Standard GitHub-hosted runners, macOS included, are free for public repositories. | [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) |
| Cloud Run deploys public images from GitHub Container Registry directly and caches them for up to an hour. | [Cloud Run deploying](https://docs.cloud.google.com/run/docs/deploying) |

## Options considered

| Option | For | Against |
|---|---|---|
| **Terraform** | The industry default; already installed and used by the owner; the licence does not restrict deploying one's own product | Not open source; access from Belarus rests on user reports only, in either direction |
| **OpenTofu** | Open licence; state encryption | Less recognised. No requirement of the specification calls for it |
| **Pulumi** | Infrastructure in the application's language | Another state service; its country terms were not checked |

No requirement distinguishes Terraform from OpenTofu. The owner prefers the standard tool.

## Decision

1. **Terraform** describes all cloud resources. Only features that OpenTofu also has are used, so switching remains a change of one command. State lives in a Cloud Storage bucket.
2. **GitHub Actions** is the pipeline.
   - On every change: static checks, unit tests, and the suites behind `NFR-1`, `NFR-2` and `NFR-9`; merging is blocked until they pass (`NFR-38`). No job calls a language model ([ADR-0004](0004-language-models-cloud-hosted-behind-a-port.md)). The suites are described in [ADR-0027](0027-testing-strategy.md).
   - On the main branch: one container image is built once, pushed to GitHub Container Registry, and deployed by digest with Terraform; the API, the worker and the batch jobs are entry points of that image. Database migrations run as a pipeline step before the new image receives traffic, and are written so that rolling back — redeploying the previous digest — needs no change to the schema ([ADR-0026](0026-schema-migrations-expand-and-contract.md), `NFR-29`).
   - The pipeline authenticates to Google Cloud by workload identity federation; no long-lived key exists (`NFR-31`).
3. **One command locally** — `docker compose up` — starts the same image as the cloud next to Postgres with PostGIS, the Firebase sign-in emulator, an S3-compatible object-storage emulator, a mail catcher, and adapters that replay recorded responses of the language-model and speech services (`NFR-33`). No model runs on the developer's machine.

## Consequences

- An image is built once and promoted; nothing is rebuilt per environment.
- A service that has no emulator and no local stand-in may not be introduced without a new decision ([ADR-0001](0001-cloud-google-cloud-and-firebase.md)).
- If the Terraform registry ever stops answering from the owner's location, the pipeline is unaffected (it runs on GitHub's runners) and local work switches to OpenTofu.
