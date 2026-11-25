# 0031. Keeping the base of Places current: Freshness Checks, Proposed Changes, history

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 24 November 2026, after an independent review of the draft and with the owner's four decisions listed at the end |
| **Origin** | The owner narrowed the product to Belarus and asked that the base of Places be kept up to date constantly — automatically, by agents and scheduled jobs — while staying editable by hand, with proposed edits that can be accepted, and with a history. Main focus: tourist sights, cafés, hotels, parks, places of entertainment |
| **Builds on** | [ADR-0030](0030-base-of-places-gathered-ahead-of-time-and-matched.md), which gathers and matches the base; this record keeps it true afterwards |
| **Amends** | [ADR-0011](0011-sources-openstreetmap-wikidata-wikipedia-commons.md) point 6 (the schedule of re-reads); [ADR-0024](0024-runtime-rules-under-scale-to-zero-and-the-spending-envelope.md) rule 3 and the spending envelope; [ADR-0029](0029-time-zones-and-opening-hours-as-city-data.md) point 7 (when a city version is published); ADR-0030 points 3, 8 and 11; [ADR-0027](0027-testing-strategy.md) |
| **Requirements** | `PLC-1`, `PLC-7`, `PLC-11`, `FBK-3`, `CUR-5`, `CUR-7`, `CUR-8`, `KNW-21`, `RTE-12`, `NTF-1`, `ACC-6`, `NFR-11`, `NFR-17`, `NFR-19`, `NFR-22`, `NFR-34`, the rules of §4.3, invariant 5 of §3.6, and the requirements added with this record: `PLC-12`, `PLC-13`, `PLC-14`, `CUR-12` |

## Context

**What the specification and the records already require.** The status and hours of Places are re-checked on a schedule (`PLC-7`). A person can send a Correction about the data of a Place — "closed", "moved", "wrong hours", "missing from the base" — and sees its outcome (`FBK-3`, `CUR-7`). A permanently closed Place is never offered, and a Place that moved is the old one closed and a new one created (§4.3). Data of commercial map services is not stored against their terms (§4.3). ADR-0011 re-reads the map weekly, and ADR-0030 lets a run fill what no Curator has set and keeps a ledger of runs.

**What they do not give, and the owner now asks for.**

| Asked for | What exists today | Gap |
|---|---|---|
| A history of a Place | Snapshots of sources in object storage and one ledger line per run | Nobody can see what changed on one Place, when, and why; nothing can be undone |
| Proposed edits that are accepted or not | A run "records a proposed difference" for what a Curator has set | No unit that can be accepted, rejected or edited; a rejected difference would come back with the next run |
| Updating by automatic checks | A weekly re-read of the map | Nothing reads any evidence beyond the Source's own record; nothing says how old our knowledge of a Place is |
| The whole of Belarus | Places are created for the country; a Curator works in Minsk | No rule for what happens to a change where no Curator looks |
| Hotels and places of entertainment | Not kinds of the specification | Not gathered, and their role in a Route is undefined |

Honestly counted: with a weekly re-read and the Corrections inbox, `PLC-7` and `FBK-3` could be met without this record. What fails without it is what the owner added on 24 November — history, acceptance of individual changes, and visible freshness for the country. They were added to the specification with this record; the additions are listed at the end.

### Facts (24 November 2026)

Full reports with sources: research notes 5 (sources) and 6 (agents and scheduling) of the decision session, the independent review of this record, and [research report 08](../research/08-belarus-focus-kinds-and-freshness.md).

| Fact | Source |
|---|---|
| Geofabrik rebuilds the extract of Belarus daily (336 MB). It also publishes a change file a day, 143–912 kB, "so that users can continuously update their own regional extract instead of having to download the full file". | [technical details](https://download.geofabrik.de/technical.html), [Belarus](https://download.geofabrik.de/europe/belarus/) |
| A change file carries a position only for points. A café deleted as a point and redrawn as the outline of its building arrives without a position, and a deleted object carries no tags. | [osmium](https://docs.osmcode.org/osmium/latest/osmium-derive-changes.html); the spike's reader |
| DuckDB reads the whole extract in 11 seconds, exposes neither versions nor timestamps, and cannot read change files. | [report 06](../research/06-minsk-city-data.md); [DuckDB spatial](https://duckdb.org/docs/2.0/core_extensions/spatial/functions.html), tested |
| A closed café is shown on the map by a lifecycle prefix or by deletion. Of the kinds in focus 352 objects carry a prefix — `was:` 180, `disused:` 160 — and 4 have `opening_hours` "closed" or "off". The map's documentation defines `disused:` as "not currently in use, but could be reinstated easily". | [lifecycle prefix](https://wiki.openstreetmap.org/wiki/Lifecycle_prefix); measured — report 08, §4.3 |
| Wikidata returns the last revision of 50 items per request: the 4 479 items that Places of the country link to take 90 requests. Closure is stated by P576, P3999 and P5817. | [Wikidata API](https://www.wikidata.org/w/api.php?action=help&modules=wbgetentities); [report 07](../research/07-minsk-more-sources.md), §10.2 |
| Belarus has 44 641 objects of the five kinds in focus: sights 26 879, eating and drinking 8 260, parks and nature 4 360, lodging 4 025, entertainment 1 117. Minsk holds 7 012, the five other regional centres 5 384, the rest of the country 32 245 — 72 %. | measured — report 08, §3 |
| In 30 days 499 changes touched these kinds: 194 objects created, 47 deleted, 258 modified. Those a person would notice — a Place created or removed, or its name, hours, position, kind, lifecycle or contacts changed — are 78 a week for the country, 53 for Places that can be stops of a Route, 36 for those of them that have a name. | measured — report 08, §5 |
| Opening hours were edited 8 times in 30 days, against 4 615 eating places that carry them. A check by a person is recorded for 3.9 % of objects, at a median age of 1.4 years. The time of the last edit is not a check: a fifth of all objects were last written by one mass edit. | measured — report 08, §4 and §5.3 |
| A website tag is carried by 4 470 objects, one in ten; for eating places 21 %, for lodging 22 %. 3 999 tags point at a website that is not a social network or a listing service, on 1 880 distinct hosts; 1 468 hosts belong to a single object, and 99 hosts — chains and directories — carry half of the tags. | measured — report 08, §6.1 |
| Of 171 such websites fetched, 122 answered (71 %), 19 no longer exist as hosts and 3 refused the client. Opening hours are stated in markup on 6.6 % of the pages that answered and are visible in the text of 42.6 %. The median page is 3 641 characters of text. | measured on a sample of 200 — report 08, §6.2 |
| Google's terms forbid storing results of search grounding, building a database from them, and "using Links to identify destination pages for crawling". Google Places, Yandex and 2GIS forbid storing what their interfaces return; Booking forbids automated access. | [Google Cloud service terms](https://cloud.google.com/terms/service-terms), [Maps Platform terms](https://cloud.google.com/maps-platform/terms), [Yandex](https://yandex.ru/legal/maps_api/ru/), [2GIS](https://law.2gis.ru/api-rules), [Booking](https://www.booking.com/content/terms.html) |
| Foursquare's open places carry closure marks and no opening hours, and are behind a free account; AllThePlaces covers four relevant chains in Belarus, about 107 outlets. The Trade Register of Belarus is behind a state login and states no licence. | [Foursquare](https://docs.foursquare.com/data-products/docs/places-os-data-schema), [AllThePlaces](https://www.alltheplaces.xyz/), [MART](https://www.mart.gov.by/activity/torgovlya-i-uslugi/torgovyy-reestr/) |
| A small open model at Groq costs USD 0.075 per million tokens in and USD 0.30 out; its reasoning is billed as output. A page of 3 000 tokens with 200 tokens of structured output is USD 0.0003–0.0004 at low reasoning effort. | [Groq models](https://console.groq.com/docs/models) |
| A scheduled workflow of the workflow library runs only "while your application is active", and its scheduler polls the database every 30 seconds. Cloud Scheduler gives three free jobs per billing account. | [DBOS scheduled workflows](https://docs.dbos.dev/typescript/tutorials/scheduled-workflows), [DBOS configuration](https://docs.dbos.dev/typescript/reference/configuration), [Cloud Scheduler pricing](https://cloud.google.com/scheduler/pricing) |
| The database's free plan suspends after five minutes without queries; a job once a day or once a week adds minutes of compute to an hour in which the trigger wakes it anyway. | [Neon plans](https://neon.com/docs/introduction/plans); reasoned |

## Options considered

**How a change is represented**

| Option | For | Against |
|---|---|---|
| **A. One change record for every change, whoever makes it** — proposed, then applied or rejected; the Place holds the current state, the records are its history | One mechanism answers all three requests: history, acceptance, undo. A person's Correction, a Source, a Freshness Check and a Curator are told apart by origin, not by a separate path | Every writer of Places must go through it; more rows |
| **B. Event sourcing** — the state of a Place is computed from its events | The same history, by construction | Every read needs a projection that must be rebuilt and versioned; nothing in the product needs the state of a Place at an arbitrary past moment |
| **C. History tables filled by the database** | Nothing to write in the application | Keeps what changed, not who proposed it, on what evidence, or that it was rejected; proposals do not fit |
| **D. Stay with snapshots and a ledger** (ADR-0030 as accepted) | Nothing more to build | No history per Place, no acceptance of a single change, no undo |

**How the map is re-read**

| Option | For | Against |
|---|---|---|
| **A. The full extract, compared with the snapshot of the previous run** | Positions for everything; one code path; a missed run loses nothing; read by DuckDB, as city data already is | 336 MB per run from a free server whose owner publishes change files so that the full file need not be fetched. Weekly that is the re-read ADR-0011 already accepted; daily it is 10 GB a month |
| **B. The daily change files, read directly** | Under 1 MB a day | No position for outlines: a café redrawn as its building is closed, and later appears a second time. Needs bookkeeping of sequence numbers and a fall-back to the full file |
| **C. The daily change files applied to our own copy of the extract** by the map's command-line tool, then read as in A | Polite and complete | A tool in C++ in the image and a 336 MB file kept in storage, for a latency of a day instead of a week — while a person's check of a Place is 1.4 years old at the median |

**What looks for changes beyond the Sources**

| Option | For | Against |
|---|---|---|
| **A. Sources on a schedule, by fixed rules only** | Free; reproducible | Sees only what the map's volunteers have already recorded, and they almost never revisit opening hours |
| **B. A, and a Freshness Check that reads a Place's own website by a program** — its markup, and otherwise a text pattern that finds the fragment about opening hours and shows it to the Curator | Evidence from the Place itself; free; the same result every time | Reaches the one Place in ten that has a website. Markup gives hours on one page in fifteen; on four in ten the pattern finds a fragment, and a person turns it into hours |
| **B+. B, with a small model that turns the fragment into opening hours** | Saves the Curator's typing, for cents per pass | A paid step and one more thing to evaluate, where no requirement fails without it |
| **C. B, and an investigating agent** that searches the web for a Place, reads what it finds and proposes changes | Could reach Places without a website — more than four eating places in five; a tool loop with stored steps is available off the shelf | What a search returns for a Belarusian café is mostly pages of map services, listing websites and social networks, whose terms forbid automated reading or storing. Google's terms forbid even choosing pages to read from its links; other search services restrict storing results. No requirement fails without it |
| **D. A paid place service** (Google Places and the like) | The freshest data | Its terms forbid storing what it returns; the specification already excludes it |

## Decision

A change record for everything; the full extract as the one way the map is re-read, weekly; Freshness Checks of option B, without a language model.

**Changes and history**

1. **Every change to the data of a Place after its first gathering is a change record.** It says what changes — an attribute from one value to another, or a Place created, closed, reopened, merged or split — where it comes from, on what evidence, and when. It is first a **Proposed Change**; it ends as applied automatically, accepted, rejected or superseded. Records are only ever added. The first gathering writes one creation record per Place, which refers to the snapshot the Place came from.
2. **Four origins, one path:** a Source's new state, a Freshness Check, a person's Correction, a Curator's edit. A Curator's edit in the Place editor (`CUR-5`) is a change record that is accepted as it is made.
3. **No evidence, no Proposed Change.**
   - A Source gives its record and the date or revision of what was read.
   - A Freshness Check gives the address, the time, a hash of what it read and the fragment that supports the change. No copy of the page is kept: pages of small lodgings carry names and private telephone numbers (`NFR-17`; ADR-0030, point 12).
   - A Correction is referred to by its identifier. The record copies neither its text nor its author; when a Correction is deleted with its author's account (`ACC-6`), the record keeps only that its origin was a Correction.
   - A Curator may add a note.
4. **Each attribute of a Place has two references:** the record that set it — its provenance and licence (`PLC-1`, `NFR-19`) — and the record that last confirmed it — its last-checked date. A confirmation from an origin renews an attribute only when that origin's value equals the current one: a check date on the map does not confirm hours that a Curator has set differently.
5. **The history of a Place is its change records in order.** A change of an attribute or of status can be undone while no later record has changed the same thing; undoing is a new record that restores the earlier value. Anything older is corrected by a new edit. A merge or a split is reversed with the merge and split of the Place editor, which already carry Routes, Visits and Dossiers with them.
6. **A rejection is remembered for the Place, the attribute, the origin and the value.** The value is proposed again only when that origin's value for that attribute changes — not when something unrelated in the origin's record does. There is at most one open Proposed Change per Place, attribute and origin; a newer one supersedes it, and origins that disagree are shown side by side.
7. **Confirmation records are written by a Curator, by a Freshness Check that read evidence, or by a new check date on the map.** A run that finds a Place unchanged writes nothing for it; the run's ledger line says what was read.

**Status**

8. **Signals map to the four statuses of the specification by a table kept as data,** with these starting values.

   | Signal | Status proposed |
   |---|---|
   | `disused:` or `closed:` on the map; `opening_hours` "closed" or "off" | temporarily closed |
   | `was:`, `abandoned:`, `demolished:`, `razed:`, `removed:` on the map; a closure date or "permanently closed" in Wikidata | permanently closed |
   | Gone from the extract, and no object of the same run matches the Place by position and name | temporarily closed; permanently closed when still absent after 30 days |
   | The Place's website no longer exists | no change of status; the Place goes on the list of point 19 |

9. **A closed Place stays in the base** with its status, as ADR-0030 requires. An applied change reaches Routes with the next version of the city: the daily refresh of ADR-0029 publishes a new version when a status or opening hours changed, not only when intervals did. A saved Route meets the closure at its re-check (`RTE-12`).
10. **A Place that moved beyond a set distance is the old Place closed and a new one created,** as §4.3 says; re-linking its Dossier is the Curator's.

**What is applied without a person**

11. **The rules are fixed in code; the distances and limits in them are settings.**

    | Change | Where | What happens |
    |---|---|---|
    | A Correction | everywhere | Curator — its author is owed an outcome (`FBK-3`) |
    | Closure, reopening, change of kind, a move, a merge or a split of a Place that has a Dossier, a decision of a Curator, or a Route or a Visit referring to it; any change to an attribute a Curator has set | everywhere | Curator — ADR-0030, point 2 |
    | Closure, reopening, change of kind, a move, a merge or a split of any other Place | in an area opened to a Curator | Curator |
    | | elsewhere | applied, marked as not reviewed |
    | Two origins that disagree | in an opened area | Curator |
    | | elsewhere | the current value stays; the disagreement is counted in the freshness of the area |
    | Anything a Freshness Check read from a page | in an opened area — it runs nowhere else | Curator |
    | An attribute no Curator has set, from the Source that supplied the current value, or filling an empty one; a new Place matched above the strict threshold; a confirmation | everywhere | applied |
    | A name transliterated, or proposed by Preparation ([ADR-0012](0012-preparation-pipeline-durable-workflows-on-postgres.md), point 12) | everywhere | applied, marked as generated |

12. **A run that would apply too much stops.** If one run would close more than a set number of Places, or change more than a set share of the Places of an area, nothing of that run is applied: it is held for the Curator and an alert goes out through the notification outbox. One mass edit rewrote a fifth of the map's objects in November 2024.
13. **A Curator accepts, rejects, or edits and accepts.** Proposed Changes are grouped by Place and by run, ordered by Key Place, popularity and age; a group of the same low-risk sort can be accepted at once.
14. **A Correction about the data of a Place becomes a Proposed Change;** the Curator's decision on it is the outcome its author is told (`NTF-1`). The Corrections inbox (`CUR-7`) is the same queue filtered by origin.

**Freshness Checks and their schedule**

15. **A Freshness Check is a scheduled look at whether the base is still true.** Freshness Checks are rows of a table — what, how often, last run, next run, on or off — shown and switched in the console. The single hourly trigger of ADR-0024 starts what is due as a job; a Curator can start one by hand. No Freshness Check has a schedule of its own in the cloud, and nothing polls.

    | Freshness Check | How often | Cost |
    |---|---|---|
    | The map: the full extract, compared with the previous snapshot | weekly, as ADR-0011 accepted; the interval is a setting | free |
    | Wikidata: the last revision of every linked item; closure properties | weekly | free |
    | Page views | monthly | free |
    | The state heritage bank | quarterly | free |
    | A Place's own website, in areas opened to a Curator | every Place that has one, once a quarter | free |

16. **The map is read by DuckDB, as city data already is,** and compared with the previous snapshot by the content of the attributes we keep, not by version. A run that was missed loses nothing: the next extract carries everything.
17. **The website Freshness Check** takes a Place, in an area opened to a Curator, whose website address belongs to that Place alone — not a page of a social network, a map or a listing service, and not an address shared by a chain or a directory.
    - It obeys the website's robots file, identifies itself and makes one request. A refusal is accepted: the client is never disguised.
    - A page that names neither the Place nor its street is not evidence: the address is proposed for removal.
    - It first reads schema.org markup with a program. Where there is none, a text pattern looks for a time range beside a word about working time, in Russian, Belarusian and English, and takes the fragment around it.
    - Hours read from markup that equal the base are a confirmation. Anything else goes to the Curator: hours from markup as a Proposed Change, a fragment as evidence beside the current value, for the Curator to enter the hours or dismiss it.
18. **No language model is used, by the owner's decision of 24 November 2026:** the program is free and reproducible, and no requirement fails without a model. The Freshness Check is a durable workflow of ADR-0012 with a fixed sequence of steps — fetch, read markup, find the fragment, compare, propose — and no agent library. The place of a model is kept: a step between "find the fragment" and "propose" that would turn the fragment into opening hours, called through the `LanguageModel` port of [ADR-0004](0004-language-models-cloud-hosted-behind-a-port.md). It is added when entering hours by hand becomes the Curator's bottleneck; a pass would cost cents, and the share of its output a Curator accepts would be its evaluation.
19. **A list of Places to check in person,** ordered by how long ago each was confirmed and how much it matters, is what keeps current the Places that have no website of their own — more than four eating places in five. A Curator confirms or corrects from it.

**Cost**

20. **Nothing in this record is paid for.** Every Freshness Check is free; the spending envelope of ADR-0024 does not change.

**What the Curator sees** (`CUR-5`, `CUR-7`, `CUR-8`)

21. **Changes:** the queue of Proposed Changes with evidence beside the current value. **History** on the page of a Place, with undo. **Freshness Checks:** the table of point 15 with the ledger of runs. **Freshness:** one table by area and kind — the share of Places confirmed within the period, open Proposed Changes, and how much was applied without review.

**Scope: Belarus, five kinds**

22. **Lodging and places of entertainment become kinds of Place of their own** — not Venues, so that the Curator's selection of Venues (`PLC-6`) and the Break keep their meaning. They are gathered, matched and kept current like the others. Their role in a Route, by the owner's decision of 24 November 2026:
    - **Lodging** — hotels, hostels, guest houses — is shown on the map and can be chosen as the start or the finish of a Route (`RTE-1`). It is never a stop.
    - **Entertainment that is visited without a session** — a zoo, an amusement park, a water park, a planetarium, an aquarium — is a stop like any Place visited inside, with its Access Rules; it needs no selection by a Curator.
    - **Entertainment that runs by sessions or at night** — a cinema, a theatre, a concert hall, a club — is in the base and is shown near a Route, and is not a stop for now. The owner wants it to become one once sessions can be checked; no source of sessions is known today. Kinds and Access Rules are data, so nothing built now stands in the way.
23. **Nothing is removed from the architecture because the market narrowed.** City, region, time zone and calendar stay data; they now describe parts of one country.

**Tests** (added to ADR-0027)

24. A Place's state equals its snapshot plus its applied records; undo restores the earlier value and is refused when a later record changed it; a rejected value is not proposed again after an unrelated change of the origin's record; an attribute set by a Curator is never changed automatically; a protected Place is never closed, merged or split without a Curator; the table of point 11 is exercised row by row; the limit of point 12 holds a run; the website Freshness Check runs against recorded pages; deleting an account leaves no text or author of a Correction in any record (`ACC-6`); a Source that does not answer changes nothing (`NFR-11`).

## Consequences

- Every writer of Places — the job of ADR-0030, the Place editor, the Corrections inbox — goes through change records. ADR-0030's "records a proposed difference" becomes a Proposed Change.
- **Opening hours do not stay current by themselves.** The map's volunteers rewrite eight values a month for the whole country; the website Freshness Check reaches a few hundred Places of Minsk, and for most of those it shows the Curator a fragment to read, not hours. For the rest, hours are as old as their last confirmation, and the freshness table shows that age instead of hiding it.
- Outside the areas opened to a Curator the base follows its Sources by itself, closures of unprotected Places included, and says so. A Place closed there in error is reopened by the same path when the Source shows it again.
- For most cafés the only automatic signal is an edit made on the map by a volunteer. Where nobody edits the map and nobody sends a Correction, the base does not know.
- The spending envelope of ADR-0024 is unchanged.
- The Curator's weekly work on the base is: the Proposed Changes of Minsk, Corrections and changes to protected Places from the whole country — a few a week outside Minsk — and, once a quarter, the fragments found on websites.
- History costs about 3 MB once for the creation records and about 4 MB a year for what the map changes *(by formula)*; Freshness Checks and Curators add less.

## Changes made to the specification

Made on 24 November 2026 at the owner's instruction and noted in the specification's decision log.

| Where | Before | After |
|---|---|---|
| §1.5, Market; §1.3; decision log Q2 | "Belarus first, then the CIS"; "(Belarus first)" | "Belarus only. Adding a region or a city must not require changing the system." |
| §8, "Why this shape" | Several payment providers because the model "must work across markets" | Kept, with the reason that remains: store billing beside a local provider |
| §7, stage S5 | "Other cities" | "Other cities of Belarus" |
| §3.2, kinds | sights, nature, Venues, markets, memorial plaques | adds lodging and places of entertainment, with the role the owner chooses |
| §1.6, non-goals | "no cinema sessions, table bookings, tickets or scheduled events" | unchanged: entertainment enters Routes only where no session or ticket is needed |
| §9, later directions | — | adds: cinemas, theatres and clubs as stops, once their sessions can be checked; the Dealbreaker "no alcohol venues" then covers clubs |
| §4.3, new `PLC-12` | — | Every change to the data of a Place is kept with its origin, its evidence and its date; the history of a Place can be read, and a recent change can be undone |
| §4.3, new `PLC-13` | — | A change is first a Proposed Change. A Curator accepts, rejects or edits it; some changes are applied without a person, by stated rules |
| §4.3, new `PLC-14` | — | How recently the Places of an area were confirmed is shown by area and by kind |
| §4.11, new `CUR-12` | — | A queue of Proposed Changes; the history of a Place with undo; the table of Freshness Checks |
| §4.1, rules of account deletion | removes the User's Corrections | adds: a change record keeps no text and no author of a Correction |
| Glossary | — | **Proposed Change** (Предложенная правка), **Freshness Check** (Проверка актуальности); Venue stays "to eat or drink" |

## Decided with the owner on 24 November 2026

| Question | Options put | Decision |
|---|---|---|
| What lodging and places of entertainment do in a Route | start or finish, and stops only where no session is needed · a directory only · everything a stop | The first, as point 22 says — and, as a later direction, cinemas, theatres and clubs as stops once sessions can be checked |
| Who reviews changes outside Minsk | Corrections and protected Places only · also every closure in the country, 11–16 a week · everything, 78 a week | Corrections and protected Places only (point 11) |
| What looks for changes beyond the Sources, and at what cost | the website Freshness Check with a small model, up to USD 2 · also an investigating agent · no model | The owner changed the recommendation: start without a model — markup and a pattern that shows the fragment to the Curator; add the model later if entering hours by hand becomes tiresome (points 17, 18) |
| How often the map is re-read | weekly · daily, the full extract · daily, change files | Weekly (point 15) |

## Not verified

- The change rate over a year: 52 days of October and November were read. Who makes the changes, and whether they are right, cannot be read from the map's files.
- How often a deletion on the map is followed by the same Place drawn again; the rule of point 8 assumes the redrawn Place is in the same extract.
- How often the pattern's fragment is the Place's opening hours: by eye, on 24 of 28 pages where it matched.
- How many website addresses in Minsk belong to one Place alone.
- Any source of sessions for cinemas and theatres of Belarus whose terms allow reading it.
- Hours kept on an inner page of a website, or drawn by scripts: one page per website was read.
- Whether the websites answer from Belarus; they were fetched from a network in Poland.
- Whether Geofabrik minds a daily download of the full extract; its pages state no limit and offer change files for the purpose.
- Cloud Scheduler's three free jobs were read by one researcher and could not be re-read by the reviewer the same day.
- For the model step kept for later: Groq's prices beyond its documentation — its public pricing page was withdrawn in August 2026 — and tokens per page.
- Reuse terms of the Trade Register and of the register of legal entities; neither is used.
