# Architecture Decision Records

These records resolve the 22 decision forks of [PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks) and six cross-cutting questions that an independent review added. Each was put to the product owner with its options, their costs against the requirements, and a recommendation; the owner confirmed every one on 22–23 November 2026. One more record (0030) and a set of amendments followed the first measurements of Minsk; the owner confirmed them on 24 November 2026. On the same day the owner narrowed the product to Belarus and asked for a base of Places that is kept current; record 0031 answers that.

- One file per decision: context, options considered, decision, consequences, the requirements it serves, and what was not verified.
- Requirement identifiers (`RTE-4`, `NFR-33`…) are those of the [product specification](../PRODUCT-SPEC.md); capitalised terms are those of the [glossary](../../GLOSSARY.md).
- The picture of the whole is in [architecture-overview.md](../architecture-overview.md).
- Facts quoted from providers' pages were read on 22–24 November 2026. Prices, quotas and terms change; a fact is re-read before it drives a purchase or a launch.

## Records

| # | Decision | Fork | Status |
|---|---|---|---|
| [0001](0001-cloud-google-cloud-and-firebase.md) | Google Cloud with Firebase; portable core, managed edge | 16 | Accepted, amended |
| [0002](0002-terraform-github-actions-and-local-environment.md) | Terraform, GitHub Actions, one-command local environment | 16 | Accepted, amended |
| [0003](0003-backend-shape-modular-monolith-with-workers.md) | A modular monolith with a worker, in one language | 17 | Accepted, amended |
| [0004](0004-language-models-cloud-hosted-behind-a-port.md) | Cloud-hosted language models behind one port; the model chosen by comparison | 9 | Accepted, revised |
| [0005](0005-mobile-client-expo-and-a-typescript-monorepo.md) | React Native with Expo in a TypeScript monorepo | 1 | Accepted, amended; conditional on the device check |
| [0006](0006-planner-one-deterministic-heuristic-and-an-independent-verifier.md) | One deterministic planner everywhere; an independent verifier | 3 | Accepted, amended |
| [0007](0007-web-from-the-expo-codebase-and-a-separate-console.md) | Public web from the Expo codebase; console separate | 2 | Accepted, amended |
| [0008](0008-maps-openstreetmap-pmtiles-and-maplibre.md) | OpenStreetMap tiles as PMTiles, rendered by MapLibre | 5 | Accepted, amended |
| [0009](0009-travel-times-own-pedestrian-graph-valhalla-in-s4.md) | Our own pedestrian graph; Valhalla in S4 | 4 | Accepted, amended |
| [0010](0010-storage-postgres-on-neon-and-objects-in-r2.md) | Postgres with PostGIS on Neon; files in Cloudflare R2; immutable city versions | 13 | Accepted, amended |
| [0011](0011-sources-openstreetmap-wikidata-wikipedia-commons.md) | OpenStreetMap, Wikidata, Wikipedia, Commons | 12 | Accepted, amended |
| [0012](0012-preparation-pipeline-durable-workflows-on-postgres.md) | Preparation as durable workflows on Postgres, run as a job | 8 | Accepted, amended |
| [0013](0013-statement-verification-entailment-model-then-judge.md) | Statement check: entailment model, then a judge | 10 | Accepted, amended |
| [0014](0014-speech-synthesis-and-recognition-behind-ports-aac.md) | Hosted speech synthesis and recognition behind ports; own pronunciation dictionary; AAC | 11 | Accepted, amended; voice conditional on the listening comparison |
| [0015](0015-interests-fixed-themes-with-precomputed-scores.md) | Fixed themes with precomputed scores | 14 | Accepted, amended |
| [0016](0016-bridges-assembled-on-the-device-introductions-generated-per-route.md) | Bridges assembled on the device; introduction and finale generated per Route | 22 | Accepted, amended |
| [0017](0017-sync-offline-journal-and-idempotent-api.md) | A journal on the device and an idempotent API | 6 | Accepted, amended |
| [0018](0018-real-time-websocket-gateway-in-memory-fan-out.md) | WebSocket gateway in the API; fan-out in memory behind a port | 7 | Accepted, amended |
| [0019](0019-identity-firebase-authentication-with-guest-upgrade.md) | Firebase Authentication; a Guest that upgrades in place | 15 | Accepted, amended |
| [0020](0020-notifications-outbox-fcm-and-e-mail-behind-a-port.md) | Notification outbox; Firebase Cloud Messaging; e-mail behind a port | 19 | Accepted, amended |
| [0021](0021-observability-opentelemetry-and-an-own-event-pipeline.md) | OpenTelemetry; our own product-event pipeline | 18 | Accepted, amended |
| [0022](0022-entitlements-own-model-and-a-payment-port.md) | Our own entitlement model; a payment port | 20 | Accepted |
| [0023](0023-distribution-stores-deferred.md) | App stores deferred; free channels meanwhile | 21 | Deferred |
| [0024](0024-runtime-rules-under-scale-to-zero-and-the-spending-envelope.md) | Runtime rules under scale-to-zero; the spending envelope | — | Accepted, amended |
| [0025](0025-api-contract-and-versioning.md) | API contract and versioning | — | Accepted |
| [0026](0026-schema-migrations-expand-and-contract.md) | Schema migrations: forward-only, expand and contract | — | Accepted |
| [0027](0027-testing-strategy.md) | Testing strategy | — | Accepted, amended |
| [0028](0028-abuse-protection-and-rate-limits.md) | Abuse protection and rate limits | — | Accepted |
| [0029](0029-time-zones-and-opening-hours-as-city-data.md) | Time zones and opening hours as city data | — | Accepted, amended |
| [0030](0030-base-of-places-gathered-ahead-of-time-and-matched.md) | The base of Places: gathered ahead of time, matched by us, the Curator's decisions on top | 12, 13 | Accepted, amended |
| [0031](0031-keeping-the-base-of-places-current.md) | Keeping the base of Places current: Freshness Checks, Proposed Changes, history | — | Accepted |

## The 22 forks

| Fork | Topic | Outcome | Record |
|---|---|---|---|
| 1 | Mobile client for the Outing | Closed | 0005 |
| 2 | Web client and console | Closed | 0007 |
| 3 | Planner and verifier | Closed | 0006 |
| 4 | Travel times and routing | Closed for S1–S3. How Valhalla is served at request time for bicycle and car is left to S4, when `RTE-18` is built | 0009 |
| 5 | Maps | Closed | 0008 |
| 6 | Synchronisation | Closed | 0017 |
| 7 | Real time | Closed for one instance. The broker for several instances is planned work behind an existing port | 0018 |
| 8 | Preparation pipeline | Closed | 0012 |
| 9 | Language models | Closed as to route and access. The model for Preparation is chosen by a comparison on ten Places | 0004 |
| 10 | Verification of statements | Closed. Thresholds are set on a labelled sample | 0013 |
| 11 | Speech | Closed. The voice family is chosen by a listening comparison | 0014 |
| 12 | Sources of Places and facts | Closed | 0011 |
| 13 | Storage | Closed | 0010 |
| 14 | Representing interests | Closed | 0015 |
| 15 | Identity and access | Closed | 0019 |
| 16 | Cloud, infrastructure as code, pipeline | Closed | 0001, 0002 |
| 17 | Shape of the back end | Closed | 0003 |
| 18 | Observability and analytics | Closed | 0021 |
| 19 | Notifications | Closed. E-mail in the cloud is switched on when a domain is bought | 0020 |
| 20 | Entitlements and payments | Closed. Real payment providers are outside the current scope (§9.1) | 0022 |
| 21 | Distribution | **Deferred** to launch planning: both store accounts cost more than the owner's spending ceiling, and their availability for the owner is unverified | 0023 |
| 22 | Bridges, introductions, finales | Closed | 0016 |

## Changes after the independent review

On 23 November 2026 two things happened after the first 23 records were written.

**The owner changed one premise.** The developer's machine is too weak for language models, and a small spend on cloud models is acceptable. ADR-0004 was revised: paid cloud models are the main route, behind the same port, through two adapters.

**An independent reviewer examined all records** against the specification and against current documentation. It was given the documents and no conclusions. It found four defects that would have stopped the system from working as written, and a longer list of gaps. The owner decided each point that had an alternative; the rest were corrected.

| What was wrong or missing | What was decided | Records |
|---|---|---|
| The workflow library polls the database every second; on the free database plan that uses up the month's compute hours and stops the whole system | Nothing polls while idle; the worker is a job that exits; one hourly trigger | 0012, 0024 |
| Cloud Run gives a service no processor time after it has answered, so "background" delivery of notifications and batching of events would never run | Work happens inside a request, in a job, or in the hourly trigger; events are staged in the database and exported by a job | 0020, 0021, 0024 |
| "Near me" sends a person's coordinates to the server, against invariant 8 of the specification | The device coarsens its position to a cell of 100–150 m; the specification was clarified | 0006, 0009, specification |
| No record summed the spending; one month of synthesis in the voice family with pronunciation control would cost about USD 51 | A spending envelope; monthly budgets as hard stops; synthesis follows the free quota | 0014, 0024 |
| Python in the worker no longer rested on a requirement once models moved to the cloud | The worker is TypeScript, an entry point of the same image | 0003, 0012, 0013, 0014 |
| Fan-out through Pub/Sub needed a subscription per instance and kept undelivered positions for at least ten minutes | Pub/Sub removed; one instance fans out in memory behind a port | 0001, 0018 |
| An open connection keeps an instance billed; a planning run would freeze Chat for everyone on the instance | Connections only in live phases in the foreground; the planner in worker threads | 0003, 0006, 0018 |
| A person registered by e-mail code would still look anonymous to Firebase and could be removed by its clean-up | Registration recorded in our database; Guests created at the first remembered action | 0019 |
| Sign-in by e-mail code is needed in S1, but e-mail was planned for S2 and needs a domain | The owner deferred the domain; recorded as a limitation of the cloud deployment | 0019, 0020, 0024 |
| Signed links do not work on a custom domain; daily dumps exceed the database plan's network transfer | Two buckets; weekly dumps plus the database's own restore | 0010 |
| Account deletion did not reach exported events and backups | Pseudonymous event keys destroyed on deletion; fixed retention of dumps | 0019, 0021 |
| A sensitive, unverified Place could leak through a bridge teaser | No teaser for such a Place | 0016 |
| Identical results on two JavaScript engines were asserted, not ensured | No floating-point code in the shared packages; both engines run in the pipeline | 0006, 0027 |
| A second container stood in front of link previews | The web's server build runs inside the API's container | 0003, 0007 |
| No decision on the API contract, migrations, tests, rate limits, or where opening hours are evaluated | Six new records | 0024–0029 |

**One proposal of the review was not adopted.** It suggested replacing Pub/Sub with Postgres `LISTEN`/`NOTIFY`. Neon's documentation states that this does not work on the free plan: the database suspends and silently drops the listening connection.

**What the review checked and found sound** includes: WebSockets on Cloud Run; public images pulled from GitHub Container Registry; the limits of the database plan; server rendering in Expo; the map binding reading a `pmtiles://` source; pronunciation markup for Russian in the chosen voice family; and the reasons given for every rejected option.

## Changes after the measurements of Minsk

On 23–24 November 2026 the city data of Minsk was built for the first time and measured ([research report 06](../research/06-minsk-city-data.md)), and further sources were measured against it ([report 07](../research/07-minsk-more-sources.md)). No measurement contradicted a decision. Five things that records assumed or left unsaid would have misled if built on as written. The owner's idea of a base of Places gathered ahead of time answered the first of them and became a record of its own, reviewed independently before it was accepted. The owner confirmed everything below on 24 November 2026.

| What the measurement showed | What was decided | Records |
|---|---|---|
| A Wikidata link exists for one routable Place in six; links made by others are sometimes wrong, and the identifiers of sources are not stable | Places have identifiers of our own; records of sources are matched by us; a Curator's decisions outrank every source and survive every run | 0030, 0011 |
| The opening-hours parser has its own table of holidays, which lacks one Belarusian holiday and the moved working days | The city's calendar is applied before parsing; hours are evaluated in the city's time zone | 0029 |
| Cut at the city boundary, the graph loses the roads to Minsk's two exclaves; a graph of the country would be fourteen times larger | A city version per city; the graph cut wider than the boundary | 0009 |
| The area of one three-hour Outing holds 709 candidates; half of all candidates are artworks and a quarter of those have no name; no record said how 709 become at most 150 | A fixed preselection rule with a ceiling per kind; an object without a name is not a Place | 0006, 0015, 0030 |
| An English name exists for 18.9 % of named Places, and for 25.6 % with Wikidata labels | Preparation proposes the name, marked as generated; a transliteration is shown until then | 0012, 0030 |
| 96 % of routable candidates have no opening hours, and most of them are seen from outside | "Seen from outside or visited inside" is an attribute with a default by kind; the warning about unknown hours applies to Places visited inside | 0029 |
| The state heritage bank adds facts for 427 Places, 232 of them with no article; page views order Places reliably at the top; Overture Maps has no opening hours; Wikivoyage and the heritage lists of Wikipedia add almost nothing | The bank and page views join the sources; the other three are not taken | 0011, 0030 |
| Belarus has 45 065 candidate Places — about 71 MB in the database, by formula | The map and Wikidata are gathered for the whole country; the Curator's queue and Preparation are opened area by area, Minsk first | 0030 |
| Tests of matching and of the survival of a Curator's decisions were in no record | Added to the suites that run on every change | 0027 |

**How the review of 0030 went.** An independent reviewer read the first draft and found two defects that would have lost data: a run could overwrite what a Curator had set, and a Place's identity could move when a source issued a new snapshot. The draft was rewritten around both. Two of the reviewer's judgements were later replaced by measurements. It advised keeping only a link to the heritage bank; the measurement showed that the bank's value is its facts. It estimated a country-wide base at 250–350 MB; the formula on measured sizes gives 71 MB.

## Changes after the product narrowed to Belarus

On 24 November 2026 the owner changed the frame of the product: it now targets Belarus only, and its base of Places must be kept up to date constantly — automatically, by agents and scheduled jobs — while staying editable by hand, with proposed edits that can be accepted, and with a history. The kinds in focus are tourist sights, cafés, hotels, parks and places of entertainment.

Two research passes and one measurement were made for it: which sources and change feeds can keep such a base current and what their terms allow; what automated checkers and their scheduling cost; and, on the map data of the whole country, how many Places of the five kinds there are, how old the data is and how much changes a day ([research report 08](../research/08-belarus-focus-kinds-and-freshness.md)). Record 0031 was drafted from them, reviewed independently, revised, and confirmed by the owner the same day.

| What was found | What was decided | Records |
|---|---|---|
| Snapshots and a ledger of runs give no history of one Place, no way to accept or reject one change, and no undo | Every change to a Place is a change record with its origin and evidence — first a Proposed Change, then applied or rejected. The records are the history | 0031, 0030 |
| Belarus has 44 641 objects of the five kinds, 72 % of them outside the six largest cities; about 78 changes a week are of a sort a person would notice | A Curator sees every such change in Minsk. From the rest of the country a Curator sees Corrections and changes to Places that have a Dossier, a Curator's decision, or a Route or a Visit referring to them. Everything else there is applied and marked as not reviewed | 0031 |
| One mass edit rewrote a fifth of the map's objects in a month | A run that would apply too much applies nothing and waits for a Curator | 0031 |
| A daily change file of the map carries no position for outlines: a café redrawn as its building would be closed and later duplicated | The map is re-read as a full extract and compared with the previous snapshot, weekly | 0031, 0011 |
| The map's volunteers edit opening hours 8 times a month for the whole country; a check by a person is recorded for 3.9 % of objects | Freshness is shown, not assumed: each attribute keeps when it was last confirmed, and a table shows it by area and kind. A list of Places to check in person covers what nothing automatic reaches | 0031 |
| One Place in ten has a website; markup states opening hours on 6.6 % of pages, the text on 42.6 % | A Freshness Check reads the websites of Places of Minsk once a quarter with a program: markup, and otherwise a pattern that shows the fragment to the Curator. No language model for now | 0031 |
| Google's terms forbid storing search results and choosing pages to read from them; Google Places, Yandex and 2GIS forbid storing their data; Booking forbids automated access; the Trade Register of Belarus is behind a state login | No investigating agent and no paid place service; four more sources examined and not taken | 0031, 0011 |
| The scheduler of the workflow library needs a process that never stops | Freshness Checks are rows of a table, dispatched by the single hourly trigger and run as jobs | 0031, 0024 |
| Hotels and places of entertainment were not kinds of Place | Both are kinds of their own. Lodging can be the start or the finish of a Route and is never a stop; entertainment without sessions is a stop; cinemas, theatres and clubs are shown near a Route | 0031, specification |

**How the review of 0031 went.** An independent reviewer found four defects that would have stopped the first draft from working as written, and the draft was rewritten around them. The daily change file could not place a redrawn café. Automatic closures outside Minsk contradicted the rule of 0030 that a Place with a Dossier, a Route or a Visit is never closed by a job. Work was routed to a Curator in areas where 0030 says there is none, so a Correction from Pinsk would never have had an outcome. And one reference per attribute could not hold both where a value came from and when it was last confirmed. Thirteen smaller points were corrected with them; the largest simplification — one way of reading the map instead of two — was the reviewer's.

**The owner's four decisions.** Lodging and entertainment take the roles above, with cinemas, theatres and clubs to become stops once their sessions can be checked. Outside Minsk a Curator reviews Corrections and protected Places only. The map is re-read weekly. And the owner changed one recommendation: the website Freshness Check was proposed with a small language model, for up to USD 2; the owner chose to start without a model — free, reproducible, no requirement failing — and to add it when entering hours by hand becomes tiresome. The spending envelope of 0024 is therefore unchanged.

## Changes to the specification

Two clarifications were made in [PRODUCT-SPEC.md](../PRODUCT-SPEC.md) on 23 November 2026, at the owner's instruction, and are recorded in its decision log.

| Where | Before | After |
|---|---|---|
| Invariant 8 (§3.6), `NFR-14`, the start rule of §4.5 | Coordinates of a person never reach the server, except shared positions | Exact coordinates never reach the server; a start or finish taken from the person's position is sent as a cell of 100–150 m |
| `NFR-4` | 3 s at the 95th percentile on the server | 3 s on a warm instance; 6 s for the first request after an idle period |

Three places were examined and left unchanged:

- **`ACC-3`, e-mail one-time code.** Firebase offers an e-mail link, not a code. The requirement stands; a small module of ours provides the code (0019).
- **`KNW-7`, bridges "generated for a Route".** Met by assembly per Route on the device and generation of the introduction and finale on the server (0016).
- **`KNW-13`, back-transcription.** Kept as written, with one caveat recorded in 0014: it cannot hear a wrong stress in a word spelled the same either way.

Two may need a change later, and are not changed now:

- **The rule of §4.7 that other audio is lowered while a Story plays.** If lock-screen controls force exclusive audio on a platform, other audio is paused instead. The device check decides (0005).
- **"Never stored" for shared positions (`PTY-15`).** It holds literally while positions exist only in one instance's memory. A broker between instances would hold an undelivered position briefly; the specification must say whether that is permitted before the broker is introduced (0018).

**Words, 24 November 2026.** Three changes were made in the [glossary](../../GLOSSARY.md) at the owner's instruction and noted in the specification's decision log. No requirement was changed.

| Term | Before | After |
|---|---|---|
| Key Place | Used in two definitions, defined nowhere | A Place on the list a Curator keeps for a city, seeded from page views and heritage category |
| Coverage | "…the share with known opening hours" | Known opening hours are counted over Venues and Places that are visited inside |
| Source | Not a term | A body of data outside the product from which records about Places and facts are gathered, with its licence |

**Scope, 24 November 2026.** Made at the owner's instruction with record 0031, and noted in the specification's decision log.

| Where | Before | After |
|---|---|---|
| §1.5 Market; §1.3; stage S5 | "Belarus first, then the CIS"; "Other cities" | "Belarus only"; "Other cities of Belarus" |
| §8 and §13 | Several payment providers because the model "must work across markets" | The research finding that Belarus alone is unlikely to sustain the product is kept beside the owner's decision, as a risk |
| §3.2, kinds of Place | sights, nature, Venues, markets, memorial plaques | adds lodging and places of entertainment, with their roles in a Route |
| §9.1, later directions | "Scheduled events, bookings, tickets" | adds cinemas, theatres and clubs as stops, once their sessions can be checked |
| §4.3 | — | `PLC-12` history and undo; `PLC-13` Proposed Changes; `PLC-14` freshness shown by area and kind |
| §4.11 | — | `CUR-12` the queue of Proposed Changes, the history of a Place, the table of Freshness Checks |
| §4.1, account deletion | removes the User's Corrections | adds: the history of changes keeps no text and no author of a Correction |
| Glossary | — | **Proposed Change**, **Freshness Check** |

## Recorded limitations

Each follows from a decision of the owner and applies until the stated condition changes.

| Limitation | Until | Record |
|---|---|---|
| Push notifications and, probably, Sign in with Apple cannot be exercised on a real iPhone; they are accepted on Android and the web | A paid Apple account is bought | 0020, 0023 |
| Sign-in by e-mail code and e-mail to Guests work in the local environment only; the cloud deployment offers Google sign-in | A domain is bought | 0019, 0020, 0024 |
| Public files are served from an address meant for development, with a rate limit | A domain is bought | 0010 |
| Real time runs on one instance, about a thousand simultaneous connections | The broker adapter is written | 0018 |
| Reminders and retried notifications are accurate to the hour | A faster trigger is decided | 0020, 0024 |
| Builds reach iPhones only through the owner's Mac, re-signed every seven days | A paid Apple account is bought | 0023 |
| Outside Minsk the base of Places is assembled automatically and reviewed by nobody; the console shows it as such | An area is opened to a Curator | 0030 |
| The state heritage bank states no terms of reuse: its facts are cited, its text is not published | Its terms are read with the register of §9.3 | 0011, 0030 |
| Opening hours of most Places are as old as their last confirmation; nothing automatic renews them | People send Corrections, or a Curator confirms in person | 0031 |
| The website Freshness Check uses no language model: where a page has no markup, the Curator reads a fragment and enters the hours | Entering hours by hand becomes the bottleneck | 0031 |
| Cinemas, theatres and clubs are shown near a Route and are not stops | A source of their sessions is found | 0031 |

## Minsk and Belarus first

The owner restated on 23 November 2026 that the emphasis is on Minsk and Belarus, and on 24 November narrowed the market to Belarus only ([what changed](#changes-after-the-product-narrowed-to-belarus)). This is how the decisions hold to it, and what it adds to the work ahead.

**Already in the decisions**

- What is built and measured first is Minsk: its city data, the reference Outing, the ten Places of the model comparison, the names of the listening comparison (0004, 0014 and the checks below).
- Reading Belarusian-language sources is the first criterion of the model comparison, because most of what is written about Belarusian places is written in Belarusian (0004, 0011).
- Providers were filtered by whether their terms allow serving people located in Belarus (0001, 0004, 0014).
- City, region, time zone and public holidays are data (0010, 0029). The generality that other cities will need is a property of the data model and is not built ahead of need.

**Not yet established for Belarus**

- **Whether the services a phone or a browser talks to directly answer from Belarusian networks** — sign-in, the address of the API and the web, push, file storage. They were tested on 23 November 2026 from a network in Poland only, which says nothing about Belarus. It takes a device in Belarus.
- **Field work in Minsk needs a person in Minsk.** The developer works from Poland. The device check can be done anywhere, on a test area built from local map data — a city is data. The reference Outing and the calibration of `NFR-3`, `NFR-5` and `NFR-7` cannot.
- **Phones without Google services** receive no push through Firebase Cloud Messaging. How common they are among people in Belarus was not measured. The Invitation page that always shows the current state (`NTF-4`) covers them.
- **Payment providers and distribution channels usable in Belarus** are launch decisions (0022, 0023).

## Checks that come before building on a decision

These are small and decide whether a fallback written into a record is needed.

| Check | Decides | Record |
|---|---|---|
| **Device check** on the owner's iPhone and Android phone: an hour with the screen locked — triggers from the JavaScript engine, a Story starting by itself with lock-screen controls, whether other audio is lowered or paused, the planner within two seconds, the map from a local file | Whether the Outing engine stays in TypeScript or moves into a native module | 0005, 0006, 0008 |
| **Comparison of models** on ten Places of Minsk, read by the owner | The model for Preparation | 0004 |
| **Listening comparison** of 20–30 phrases with Minsk names, including whether pronunciation hints take effect in Russian and how often stress is wrong in ordinary words | The voice family; whether an automatic stress step, and with it a Python job, is needed | 0014, 0003 |
| **Reachability from Belarus:** a person in Belarus opens a test page that calls each service a phone or browser talks to directly | Whether any of them must be replaced behind its port before anything is built on it | 0001, 0010, 0019, 0020 |
| **A labelled sample** of sentence–fact pairs in Russian and English | Thresholds of the statement check; the first reading of `NFR-18` | 0013 |
| **Measurements:** database compute hours per idle day and per test day; cold-path latency end to end; instance hours held by connections during a test Party; size of a map extract of central Minsk; size of the pedestrian graph and matrix in memory; database size after a first Preparation run | Whether the free allowances hold; the cold-start threshold of `NFR-4`; the Route Pack budget (`NFR-8`); instance memory | 0024, 0010, 0008, 0009 |

**Measured since** (research reports 06 and 07, on the developer's machine): the map of central Minsk is 3.2 MB and of the whole city 18.9 MB; the pedestrian graph of Minsk is 11.4 MB; a search from one point over the whole city takes 74–86 ms. The other measurements of the last row are still to be made.

## Decisions left for later stages

- **S3 — content from Users:** upload and storage of Catalog covers (`CAT-4`), automatic screening of titles, descriptions and names (`CAT-5`).
- **S3 — "ask the guide"** (`KNW-22`): where a spoken question is recognised, and how the pre-generated answers for use without a network are produced and packed.
- **S3 — payments:** which providers get adapters behind the payment port (0022).
- **S4 — Valhalla:** whether bicycle and car need it as a service at request time (0009).
- **Scale — the broker adapter** for real time on several instances, with the clarification of "never stored" (0018).
- **Launch — distribution, a domain, and the register of §9.3** (0023).
- **When needed — a language model in the website Freshness Check:** its place in the workflow is kept (0031).
- **Later — cinemas, theatres and clubs as stops:** it needs a source of sessions whose terms allow reading it; none is known (0031).

## Unverified facts the decisions rest on

Each record lists its own. Collected here, most consequential first.

**Platform behaviour**
- Automatic start of a Story from the background together with lock-screen controls on iOS; Apple documents no guarantee (0005).
- Behaviour after a person force-quits the app on iOS; only forum reports exist (0005).
- Battery use with location and audio together; no published measurement was found for `NFR-7` (0005).
- Whether Google Play accepts the precise-location declaration for a walking Outing (0005).
- Whether a Firebase user upgraded by our e-mail module leaves the anonymous state, on the emulator and in the cloud (0019).

**Free allowances**
- Database compute hours and network transfer actually used; exhaustion is an outage (0024, 0010).
- The current always-free figures of Cloud Run; localised pricing pages disagree (0024).
- That 1 GB of database and 10 GB of object storage hold Minsk and its events (0010, 0021).

**Performance and size**
- Planner time on a mid-range phone, and the heuristic's distance from the optimum on our problem shape (0006).
- Cold-path latency against the 6 seconds of `NFR-4`; real-time latency against `NFR-13` (0003, 0018).
- Size of a Route Pack cut and search times on a cloud instance; the map, the graph and search times of Minsk on the developer's machine are measured (0008, 0009).
- Size of the base of Places in the database: 71 MB for the country is computed from measured sizes, not loaded (0030).

**Quality**
- Which model reads Belarusian sources and writes grounded Russian and English best; no evaluation exists (0004).
- Accuracy of the entailment model on statements against facts in Russian (0013).
- Whether pronunciation markup changes the output of Russian voices; stress in ordinary words; quality of voices on names (0014).
- Whether a small model reaches the 90 % of `NFR-36` for Wish interpretation (0004).
- Accuracy of walking times from our own graph against real Outings (`NFR-3`) (0009).
- Precision of matching Places by position and name beyond a sample of forty; the number of decisions left to a Curator (0030).
- How often a Place deleted on the map is drawn again; how often the fragment a pattern finds on a website is the Place's opening hours; the map's change rate over a year — 52 days were read (0031).

**Prices**
- Model prices beyond the day they were read; minimum top-ups; the price of hosted speech recognition on the provider's own page (0004, 0014).
- Prices of scheduler jobs, secret versions, alert conditions, an instance-hour beyond the free allowance, a domain (0024).

**Providers: availability and terms**
- Whether a resident of Belarus can open Google Cloud billing; the decisions assume the account registered in Poland that the owner said is available (0001).
- That no country restriction applies to generative models on Google Cloud: none was found (0004).
- That Belarus is not "comprehensively sanctioned" in the sense of the clauses of the hosted model services — a legal reading, deferred with §9.3 (0004).
- Country terms of Neon and Cloudflare beyond general sanctions clauses; whether the owner's card is accepted by each provider (0010).
- What the terms of the state heritage bank allow; its site states nothing (0011, 0030).
- Apple Developer Program enrolment and payouts for either country; what a free Apple account can do beyond installation on one's own device (0019, 0020, 0023).

**Absences that were not proven, only not found**
- An e-mail one-time code method in Firebase (0019).
- An official statement about access to the Terraform registry from Belarus; the registry answered from the owner's machine (0002).

## Still unverified from §10.4 of the specification

| Item of §10.4 | State |
|---|---|
| Cloud accounts, map platforms, model and speech providers for a Belarus-based developer | Checked on providers' pages; results in 0001, 0004, 0008, 0014. Open points are listed above |
| Store developer accounts | Partly checked; open; decision deferred (0023) |
| Background location on the latest iOS; the Android 17 location rule | Documented rules established (0005); behaviour on devices awaits the device check |
| Battery use with location and audio | No published measurement; to be measured |
| Russian and Belarusian speech on names | Awaits the listening comparison (0014) |
| Cafés, bars and restaurants of Minsk in OpenStreetMap | Measured: 1 955 objects, 68.3 % with opening hours (0011, research report 06) |
| Direct competitors for a route for a group; voices of real users | Outside the scope of architecture decisions |
| Legal statements | Deferred by the owner (§9.3); not examined |
