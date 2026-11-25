# 0024. Runtime rules under scale-to-zero, and the spending envelope

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 23 November 2026 |
| **Amended** | 24 November 2026, confirmed by the owner — with ADR-0031: the Freshness Checks hang on the single trigger; the envelope is unchanged. See [what changed](README.md#changes-after-the-product-narrowed-to-belarus) |
| **Origin** | Not one of the 22 forks. It records what an independent review found: two mechanisms in the first versions of these records could not work on the chosen platform, and no record summed the spending. See [what changed](README.md#changes-after-the-independent-review) |
| **Requirements** | `NFR-34`, `NFR-22`, `NFR-28`, `NFR-11`, `KNW-19` |

## Context

"Free while idle" (`NFR-34`) is a property of how the system behaves, not only of which services it uses. Three facts of the chosen platform decide it.

| Fact | Source |
|---|---|
| "When the Cloud Run service finishes handling a request, the instance's access to CPU will be disabled or severely limited." A timer or a background thread in a service does not run between requests. | [Cloud Run, general tips](https://docs.cloud.google.com/run/docs/tips/general) |
| Neon's free plan gives 100 compute-hours a month. The database suspends only after five minutes without queries, and when the hours are used up it is suspended until the next month. Kept awake all month, the smallest size uses about 182 hours. | [Neon plans](https://neon.com/docs/introduction/plans) |
| An instance with an open WebSocket is billed for as long as the connection is open; the always-free allowance is about 50 hours of one instance a month. | [WebSockets on Cloud Run](https://docs.cloud.google.com/run/docs/triggering/websockets) |
| Small recurring charges exist beyond small free allowances: scheduler jobs beyond three, secret versions beyond six, each alert condition (reported at USD 0.10 a month). | provider pricing pages, as reported by secondary sources |

Running out of database hours is not a bill. It is an outage of the whole system until the first of the next month.

## Decision

### Rules

1. **Nothing queries the database periodically more often than once an hour while nobody is using the product.** No polling loop, no keep-alive, no frequent schedule.
2. **No work after the response.** Work happens in exactly one of three places:
   - inside the request that causes it;
   - in a job that is started explicitly and exits when it is done — the worker and the batch jobs ([ADR-0003](0003-backend-shape-modular-monolith-with-workers.md), [ADR-0012](0012-preparation-pipeline-durable-workflows-on-postgres.md));
   - in the hourly trigger.
3. **There is one scheduler job: an hourly call to one endpoint of the API**, which dispatches whatever is due — notifications that failed or are scheduled; once a day the export and aggregation of product events and the refresh of opening-hour intervals; once a week the re-read of sources and the backup; once a month the restore rehearsal. The Freshness Checks of [ADR-0031](0031-keeping-the-base-of-places-current.md) are dispatched the same way, each at the interval its row states: weekly for the map and Wikidata, monthly for page views, quarterly for the state heritage bank and for the websites of Places. They are free, so the spending envelope below is unchanged.
4. **Real-time connections exist only while a person is looking at a live phase of a Party** ([ADR-0018](0018-real-time-websocket-gateway-in-memory-fan-out.md)).
5. **Secrets are bundled** into as few entries as the free allowance covers; **at most three platform alert conditions** exist, and other alerts are raised by the system through its own notification outbox ([ADR-0021](0021-observability-opentelemetry-and-an-own-event-pipeline.md)).
6. **Every paid quantity has a monthly budget in the cost ledger** — tokens per model provider, characters of synthesis, hours of recognition — and reaching a budget stops the work that would exceed it (`NFR-22`).
7. **The cost dashboard shows what can run out:** instance hours, including those held by connections; database compute hours and network transfer; storage; and each budget of rule 6 (`NFR-28`).

### The spending envelope

Estimates as of 23 November 2026, against the owner's ceiling of USD 20.

| Item | Kind | Estimate | What holds it |
|---|---|---|---|
| Language models, Preparation of Minsk | once | USD 5–10 | budget in the ledger ([ADR-0004](0004-language-models-cloud-hosted-behind-a-port.md)) |
| Language models, Wish interpretation | per use | about USD 0.10 per 1 000 | request limits ([ADR-0028](0028-abuse-protection-and-rate-limits.md)) |
| Speech synthesis | monthly quota | USD 0 inside the free quota | hard stop in the ledger ([ADR-0014](0014-speech-synthesis-and-recognition-behind-ports-aac.md)) |
| Speech recognition, Minsk | once per full run | about USD 2 | budget in the ledger |
| Containers | monthly | USD 0 inside about 50 instance-hours | rules 2 and 4; dashboard |
| Database | monthly | USD 0; exhaustion is an outage, not a charge | rule 1; alert on hours used |
| Object storage | monthly | USD 0 up to 10 GB | dashboard |
| Platform alerts | monthly | up to USD 0.30 | rule 5 |
| Domain | yearly | not bought; USD 10–15 when it is | owner's decision of 23 November 2026 |
| Store accounts | — | not bought | [ADR-0023](0023-distribution-stores-deferred.md) |

As decided, the first year comes to roughly USD 8–16.

## Consequences

- A reminder or a retried notification is accurate to the hour, not to the minute ([ADR-0020](0020-notifications-outbox-fcm-and-e-mail-behind-a-port.md)).
- Anything that needs a faster clock than an hour must hang on a request or be given its own decision; a new periodic task is a change to this record.
- Without a domain, sign-in by e-mail code and e-mail to Guests do not work in the cloud deployment, and public files are served from an address meant for development ([ADR-0019](0019-identity-firebase-authentication-with-guest-upgrade.md), [ADR-0010](0010-storage-postgres-on-neon-and-objects-in-r2.md)).
- The free allowances shape the test plan: a handful of long test Outings with open connections can use a month's instance hours.

## Not verified

- The current always-free figures of Cloud Run on its English pricing page; only localised copies were read, and they disagree.
- Prices of scheduler jobs, secret versions and alert conditions, read from secondary sources.
- Database compute hours actually used per idle day and per test day — to be measured in the first week of running.
- Price of an instance-hour beyond the free allowance.
