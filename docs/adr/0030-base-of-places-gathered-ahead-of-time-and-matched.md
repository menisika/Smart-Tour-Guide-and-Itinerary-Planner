# 0030. The base of Places: gathered from sources ahead of time, matched by us, with the Curator's decisions on top

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 24 November 2026, after an independent review of the draft and the measurements of [research report 07](../research/07-minsk-more-sources.md) |
| **Amended** | 24 November 2026, confirmed by the owner — with ADR-0031: a difference found by a run is a Proposed Change; the kinds the base keeps include lodging and places of entertainment; each Source's interval is a row of the table of Freshness Checks. See [what changed](README.md#changes-after-the-product-narrowed-to-belarus) |
| **Origin** | The owner asked for a separate component that aggregates data from different sources and keeps the result, so that a base of Places is built up rather than fetched when a Route is made, and for a panel in the console that shows every source and how much is covered, by country |
| **Continued by** | [ADR-0031](0031-keeping-the-base-of-places-current.md), accepted the same day — how the base is kept true after it is gathered |
| **Requirements** | `PLC-1`, `PLC-7`, `PLC-8`, `PLC-10`, `PLC-11`, `CUR-5`, `CUR-6`, `CUR-8`, `I18N-2`, `KNW-21`, `NFR-11`, `NFR-19`, invariant 5 of §3.6 |

## Context

**What the accepted records already say.** Nothing is fetched from a source when a Route is made: the planner reads a published version of a city ([ADR-0010](0010-storage-postgres-on-neon-and-objects-in-r2.md)), and the re-check of `RTE-12` runs against our own base ([ADR-0011](0011-sources-openstreetmap-wikidata-wikipedia-commons.md)). On that point the owner's concern was already met.

**What they left out.** How the base of Places is put together from several sources was one line — "batch jobs build city data". The measurements of Minsk ([research report 06](../research/06-minsk-city-data.md)) show what that line hid.

| Measured in Minsk | Consequence |
|---|---|
| 17.3 % of routable candidate Places carry a Wikidata link; 1 316 of 2 515 Wikidata items in the city are linked from no map object | A Place cannot be keyed by its Wikidata identifier; records of different sources have to be matched by us |
| Four linked Wikidata items were deleted, one is a redirect, and 35 items are each linked from several Places | Links made by others are not reliable, and a source's identifiers are not stable |
| An English name exists for 18.9 % of named Places | Names per language (`I18N-2`) have to be assembled from several sources |

**What a thin job would and would not fail.** Honestly counted, keeping the single city-data job fails two things: duplicates merged and split by a Curator whose decisions survive the next build (`PLC-11`, `CUR-5`), and names per language. Provenance per attribute (`PLC-1`) and scheduled re-checks (`PLC-7`) could be done in a thin job. What tips the balance is identity: Routes, Visits and verified Dossiers refer to Places, so a Place's identity must not move when a source changes.

### Facts (24 November 2026)

| Fact | Source |
|---|---|
| Wikimedia's interfaces allow 10 requests a minute to unidentified clients and 200 to a client that identifies itself as its policy asks. The spike that was throttled identified itself without a contact. | [rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits); spike source code |
| DuckDB reads and writes Parquet on R2 and has a spatial-join operator. A Cloud Run job may run for up to 168 hours with up to 32 GiB of memory; its default time limit is 10 minutes. | [DuckDB](https://duckdb.org/docs/2.0/core_extensions/httpfs/s3api), [Cloud Run task timeout](https://docs.cloud.google.com/run/docs/configuring/task-timeout) |
| Belarus as a whole has 45 065 candidate Places by the rules used for Minsk: 27 517 sights, 8 267 Venues, 7 286 nature Places, 1 550 memorial plaques, 445 markets; 32 429 of them have a name. Minsk is 7 656 of them. | measured — report 07, §10.1 |
| Kept in Postgres with names, attributes with provenance and links to sources, the 45 065 are about 390 000 rows and 71 MB of the free plan's 1 GB. The review of the draft had estimated 250–350 MB. | by formula — report 07, §10.3 |
| Wikidata used directly, matched by position and name, raises the Places of Minsk that have at least one article from 461 to about 585. | measured — report 07, §3 |
| The state heritage bank holds no Place that Wikidata lacks, and carries a dating and a description for 427 routable Places of Minsk, 232 of which have no article anywhere. Its pages state no terms of reuse. | measured — report 07, §4 |
| Wikidata labels raise English names of named routable Places from 18.9 % to 25.6 %; a third of those labels are addresses and a quarter are in Belarusian Latin. | measured — report 07, §8 |

## Options considered

| Option | For | Against |
|---|---|---|
| **A. The base of Places as a part of the `places` module, built by one job** — identifiers of our own, matching, a Curator's queue and overrides, a ledger of runs, a tab in the console | Fixes what the measurements exposed with no new deployable and nothing running while idle | More to build in S1 than the records implied |
| **B. A separately deployed aggregation service** with its own database | A hard boundary; scales on its own | No requirement forces a separate deployable ([ADR-0003](0003-backend-shape-modular-monolith-with-workers.md)); a second database is not free |
| **C. Keep the thin city-data job** | Least to build | Fails `PLC-11` and `CUR-5`; Place identity moves with the sources |

Option A is still a component of its own — its own tables, its own job, its own tab — as the owner asked. It is not a deployable of its own.

## Decision

Option A.

**Identity**

1. **Places have identifiers of our own, issued once and never reused.** A table kept between runs links every record of a source to a Place. A record that matches no Place becomes a new Place only if it is of a kind the base keeps — the kinds Routes are built from, and lodging and places of entertainment ([ADR-0031](0031-keeping-the-base-of-places-current.md), point 22) — and has a name in at least one source: by the glossary a Place is named, and a quarter of Minsk's artworks are not.
2. **A Place that has a Dossier, a decision of a Curator, or a Route or a Visit referring to it is never merged, split or removed by a job.** The job proposes; the Curator decides (`KNW-21`, invariant 5). A Place that is merged or removed leaves a marker, so that old references still resolve.

**The Curator outranks every source**

3. **Whatever a Curator has set on a Place** — Access Rules, the manual flag, hidden, a Venue's selection, a corrected name — **is not changed by a run** (`CUR-5`, `CUR-6`). The run fills what no Curator has set and records a Proposed Change for the rest ([ADR-0031](0031-keeping-the-base-of-places-current.md)). Postgres stays the system of record for Places, as ADR-0010 says; the job is one writer among others, with the lowest rank.
4. **Every attribute keeps which source it came from and when it was checked** (`PLC-1`, `NFR-19`), with the source's licence. A name produced by transliteration or proposed by a model is marked as such.

**Gathering and matching**

5. **One connector per source.** It writes what it fetched as a filtered snapshot in object storage, with the reference needed to fetch the same thing again — a dated extract, a revision identifier. A full copy is kept only of what cannot be fetched again identically. Old snapshots are removed by a retention rule.
6. **Requests to a source identify the client** by the project's repository address — no personal data — stay inside the source's stated limits and obey its "retry after".
7. **Matching** has three steps. Explicit links first, and only when plausible: the class of the linked item must fit the kind of the Place. Then position and name, accepted automatically above a strict threshold that is set on a labelled sample. What falls between two thresholds goes to a queue for the Curator — in an area that has been opened to a Curator (point 15); elsewhere it stays an unmatched record.
8. **One chain, as one job:** gather and match for the country → for each city whose Places changed, resolve opening hours ([ADR-0029](0029-time-zones-and-opening-hours-as-city-data.md)) and publish a city version. It is started by a Curator or by the scheduled trigger. There is no scheduler job per source: each Source's interval is a row of the table of Freshness Checks, dispatched by the single trigger ([ADR-0024](0024-runtime-rules-under-scale-to-zero-and-the-spending-envelope.md), [ADR-0031](0031-keeping-the-base-of-places-current.md)). A source that does not answer leaves its last snapshot in force (`NFR-11`).
9. **Preparation still compiles the Dossier of a Place from its sources**, as the glossary defines it. It reads the records already gathered for the Place and fetches only what is missing ([ADR-0012](0012-preparation-pipeline-durable-workflows-on-postgres.md)).

**What the Curator sees**

10. **Every run leaves a line in a ledger:** source, area, records fetched and changed, matched and unmatched, throttled or failed requests, the snapshot produced.
11. **A tab in the console** shows each Source with its licence, last run, records, share matched and errors; the queue of doubtful matches; and counts and Coverage by country, region and city. A Place that no Curator has reviewed is shown as exactly that. The queue of Proposed Changes, the history of a Place and the freshness of each area are added by [ADR-0031](0031-keeping-the-base-of-places-current.md).
12. **No personal data enters the base of Places:** Custom Places belong to Routes, and the names of people who edited a source are not kept.

**Tests** ([ADR-0027](0027-testing-strategy.md))

13. A labelled set of match decisions; properties that must hold — the order of input does not matter, a second run changes nothing, a Curator's decisions survive, identifiers stay put when a record is renamed, moved or deleted; a test double for every source; a small fixed city for the local environment.

**Geography** — decided with the owner on 24 November 2026

14. **The map and Wikidata are gathered for the whole of Belarus**, and Places are created for the whole country. These are the cheap layers: one file read and a few dozen requests.
15. **What costs a person's time or money is opened area by area, Minsk first:** the Curator's queue of doubtful matches, and Preparation.

**Sources** — decided with the owner on 24 November 2026; [ADR-0011](0011-sources-openstreetmap-wikidata-wikipedia-commons.md) is amended accordingly

16. **The state heritage bank** is read as a source of facts for a Dossier, each with a citation of the bank's record. Its descriptions are material for facts and are not published as text.
17. **Monthly page views of a Place's articles** are read as a popularity signal. It orders the Curator's queue, seeds the list of Key Places and takes part in the preselection of candidates ([ADR-0006](0006-planner-one-deterministic-heuristic-and-an-independent-verifier.md), [ADR-0015](0015-interests-fixed-themes-with-precomputed-scores.md)).
18. **Not taken,** by what each was measured to add: Overture Maps places (no opening hours; no sights), the heritage lists of Belarusian Wikipedia (three rows that match nothing), Wikivoyage (at most three sights).

**Names** — decided with the owner on 24 November 2026

19. **A Place's name in a language is taken from the sources in a fixed order of rank.** Where a language has none, a transliteration is shown and marked as such, until Preparation proposes a name ([ADR-0012](0012-preparation-pipeline-durable-workflows-on-postgres.md)); a proposed name is marked as generated and is the Curator's to change.

**Words** — decided with the owner on 24 November 2026; the glossary is amended accordingly

20. **A Key Place** is a Place on a list the Curator keeps for a city, seeded from page views and the highest heritage categories. **Coverage** is the share of a city's Key Places with a verified Dossier, and the share with known opening hours counted over Venues and the Places that are visited inside. **Source** becomes a glossary term.

## Consequences

- S1 gains a component that the first records passed over in one line: tables for source records and their links, a matcher with a labelled sample, a queue, a ledger and a tab.
- The country-wide base takes about 71 MB of the 1 GB database by formula, before Dossiers, facts, Stories and events.
- Outside an opened area the base is assembled automatically and reviewed by nobody. The console says so, and so must any public Coverage (`PLC-10`).
- The heritage bank states no terms of reuse. Its facts are cited and its text is not published; what its terms allow joins the register of §9.3 that is read before launch.
- A Curator's first pass over Minsk is estimated at 340–600 match decisions, once.

## Not verified

- Precision of matching by position and name beyond a sample of forty, and the share of pairs that land in the queue. The review's estimate for all of Minsk is 340–600 decisions, 6–20 hours of one Curator, once; 90–150 for the centre.
- Size of a Place with its links and provenance in Postgres: the 71 MB are computed, not loaded.
- Fill rates of the heritage bank's fields outside Minsk; the country would take about 8 400 requests.
- That the throttling met by the spike came from how it identified itself — a strong inference.
