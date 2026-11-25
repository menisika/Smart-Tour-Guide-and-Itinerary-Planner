# 0001. Cloud: Google Cloud with Firebase, portable core and managed edge

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 22 November 2026, after a second comparison with Azure that the owner asked for |
| **Amended** | 23 November 2026, confirmed by the owner — Pub/Sub is no longer used; the scheduler is a single job; the rules for staying free while idle moved to ADR-0024. See [what changed](README.md#changes-after-the-independent-review) |
| **Fork** | #16 "Cloud, infrastructure as code, pipeline" — the provider part ([PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks)); the pipeline part is [ADR-0002](0002-terraform-github-actions-and-local-environment.md) |
| **Requirements** | `NFR-34`, `NFR-33`, `NFR-32`, `NFR-29`, `NFR-23`, `ACC-1…4`, `PTY-13`, `NFR-13` |

## Context

- With no users the deployment must stay inside a free tier (`NFR-34`), and the whole system must start locally on emulators of the cloud services (`NFR-33`).
- The owner set a ceiling of USD 20 for everything and named GCP, AWS and Azure as candidates.
- The owner can hold an account as a resident of Poland or of Belarus.

### Facts (read on provider pages, 22 November 2026)

| Fact | Source |
|---|---|
| AWS stopped accepting new sign-ups based in Belarus in March 2022. New AWS accounts get credits and a free plan that closes after six months. LocalStack needs an account and a token since 2026.03, and its free plan is non-commercial. | [About Amazon](https://aboutamazon.com/news/aws/updates-to-amazons-retail-entertainment-and-aws-businesses-in-russia-and-belarus) |
| Google Cloud billing lists Poland (PLN, card). Belarus is absent from the list; whether a Belarus resident can open billing could not be established. | [Cloud Billing currencies](https://docs.cloud.google.com/billing/docs/resources/currency) |
| Azure's free account is offered in Poland and not in Belarus. | Azure free-account page |
| Cloud Run: 180 000 vCPU-seconds, 360 000 GiB-seconds and 2 million requests a month, always free, applied as a discount at Tier 1 prices in any region; Jobs 240 000 vCPU-seconds. Up to 1 000 concurrent requests per instance; requests and WebSockets up to 60 minutes. Public images are pulled straight from GitHub Container Registry. | [pricing](https://cloud.google.com/run/pricing), [concurrency](https://docs.cloud.google.com/run/docs/about-concurrency), [deploying](https://docs.cloud.google.com/run/docs/deploying) |
| Cloud Run Tier 1 in Europe: europe-west1, europe-north1, europe-west4. Warsaw (europe-central2) is Tier 2. | [pricing](https://cloud.google.com/run/pricing) |
| Azure Container Apps: the same free quantities; request timeout 240 seconds. | Azure Container Apps documentation |
| Firebase Authentication: 50 000 monthly active people free, anonymous users with upgrade to a permanent account, Google and Apple sign-in, e-mail link; first-party emulator. No e-mail one-time *code* method was found. | [Firebase Auth](https://firebase.google.com/docs/auth), [Identity Platform pricing](https://cloud.google.com/identity-platform/pricing), [Auth emulator](https://firebase.google.com/docs/emulator-suite/connect_auth) |
| Entra External ID: 50 000 free, e-mail one-time passcode, Google and Apple. No anonymous users and no emulator were found. | [Entra authentication methods](https://learn.microsoft.com/en-us/entra/external-id/customers/concept-authentication-methods-customers) |
| Pub/Sub: 10 GiB a month free; the emulator supports push, pull, ordering and dead-letter topics. | [Pub/Sub emulator](https://docs.cloud.google.com/pubsub/docs/emulator) |
| No managed Postgres is free on any of the three clouds beyond twelve months. Cloud SQL's smallest instance is about USD 7.7 a month; Azure's is free for twelve months and about USD 18.9 afterwards. | provider pricing pages |
| Cloud Storage is free (5 GB) only in three US regions, and there is no free egress to Europe. Azure gives 100 GB of egress a month free. | provider pricing pages |
| There is no first-party emulator for Cloud Tasks, Workflows or Scheduler. The Firebase Storage emulator covers only part of the Cloud Storage API. | [Storage emulator](https://firebase.google.com/docs/emulator-suite/connect_storage) |

## Options considered

| Option | For | Against |
|---|---|---|
| **Google Cloud + Firebase** | Scale-to-zero containers that stay free indefinitely; an emulator for sign-in and anonymous users that model the Guest directly (`ACC-1…4`); connections of up to 60 minutes for Chat (`PTY-13`, `NFR-13`); the largest free quotas for logs and speech | No free Postgres; no free egress to Europe; partial storage emulator; no e-mail code sign-in out of the box |
| **Azure** | 100 GB of free egress; a complete storage emulator (Azurite); e-mail one-time code built in; Postgres free for the first year | No anonymous users and no sign-in emulator, so the Guest and its local stand-in would be our own code; the 240-second timeout is a risk for long-lived connections; Postgres costs nearly the whole budget after month 12 |
| **AWS** | Most widely known | Free plan closes after six months; the weakest local emulation; not available to a Belarus-based account |

## Decision

1. **Google Cloud with Firebase**, on a billing account registered in Poland.
2. **Region:** a Tier 1 European region, chosen next to the database's region ([ADR-0010](0010-storage-postgres-on-neon-and-objects-in-r2.md)). The region is configuration.
3. **Portable core, managed edge.**
   - The core is portable: stateless containers on Cloud Run (services and jobs), plain Postgres, and object storage behind a port.
   - A managed service is used only when it is free while idle *and* has a first-party emulator or a trivial local stand-in behind a port: Firebase Authentication, Firebase Cloud Messaging, Secret Manager, and one Cloud Scheduler job (an HTTP trigger; a cron container locally).
4. **Not used:** Cloud Tasks and Workflows (no emulator, `NFR-33`); Cloud SQL (not free, `NFR-34`); Pub/Sub — both uses first planned for it were replaced ([ADR-0012](0012-preparation-pipeline-durable-workflows-on-postgres.md), [ADR-0018](0018-real-time-websocket-gateway-in-memory-fan-out.md)).
5. **Cost visibility (`NFR-34`):** every resource carries a component label; budget alerts are set well below the USD 20 ceiling. The rules that keep the deployment free while idle, and the spending envelope, are in [ADR-0024](0024-runtime-rules-under-scale-to-zero-and-the-spending-envelope.md).

## Consequences

- Postgres with PostGIS has to come from outside Google Cloud to stay free; that is decided with storage (fork #13).
- Route Packs are 80–150 MB each, and Google Cloud has no free egress to Europe: where they are stored is a cost decision, also made with storage.
- Sign-in by e-mail code (`ACC-3`) needs a small module of our own on top of Firebase; the requirement itself does not change (fork #15).
- Lock-in is limited to sign-in and push, each behind a port.

## Not verified

- Whether a resident of Belarus can open a Google Cloud billing account.
- Egress and storage prices in European regions.
- Whether the 240-second timeout of Azure Container Apps cuts WebSockets — it weighed against Azure as a risk, not as a fact.
- That no e-mail code method exists in Firebase and no anonymous users or emulator exist in Entra: absence was not proven, only not found.
