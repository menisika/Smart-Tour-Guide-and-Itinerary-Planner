# 0011. Sources: OpenStreetMap, Wikidata, Wikipedia and Wikimedia Commons

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 22 November 2026 |
| **Amended** | 23 November 2026, confirmed by the owner — the schedule is driven by the single hourly trigger. See [what changed](README.md#changes-after-the-independent-review) |
| **Amended** | 24 November 2026, confirmed by the owner — after the measurements of Minsk: Wikidata is a source, not the key of a Place; the state heritage bank and page views join; requests identify the client; three sources measured and not taken. See [what changed](README.md#changes-after-the-measurements-of-minsk) |
| **Amended** | 24 November 2026, confirmed by the owner — with ADR-0031: the schedule of re-reads is that of the Freshness Checks; four more sources examined and not taken. See [what changed](README.md#changes-after-the-product-narrowed-to-belarus) |
| **Fork** | #12 "Sources of Places and facts" ([PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks)) |
| **Requirements** | `PLC-1`, `PLC-4`, `PLC-5`, `PLC-7`, `PLC-11`, `KNW-4`, `KNW-5`, `KNW-17`, `KNW-20`, `RTE-12`, `NFR-11`, `NFR-19`, `NFR-4` |

## Context

- Every attribute of a Place and every fact of a Dossier carries its source, its revision or retrieval date and its licence (`PLC-1`, `KNW-4`, `NFR-19`).
- The base is built from open data; commercial map data may at most be used to check freshness and may not be stored against its terms (§4.3).
- Belarusian is the main language of knowledge about Belarusian places: within 1.5 km of the centre of Minsk, Wikidata has 873 objects, with an article in Belarusian for 510, in Russian for 285 and in English for 86 `[R3 §2]`.
- Opening hours in OpenStreetMap are filled in for 64 % of Minsk's museums `[R3 §2]`.

## Options considered

| Option | For | Against |
|---|---|---|
| **A. OpenStreetMap + Wikidata + Wikipedia (be, ru, en) + Commons** | Open licences that allow storing and rebuilding; covers geometry, kinds, hours, entity keys, narrative material and photos | Thin opening hours; uneven quality |
| **B. A plus Overture Maps** | A second open source of Venues and operating status | Coverage of Belarus unmeasured; status empty by default; Venues are selected by a Curator anyway (`PLC-6`). No requirement fails without it |
| **C. A plus a paid freshness check** (Google Places, Yandex) | The best hours and closures | Paid beyond the budget; results may not be stored; an external call on the path of every request (`NFR-4`, `NFR-11`) |

## Decision

Option A.

1. **OpenStreetMap** (ODbL) supplies geometry, kinds, names per language, opening hours, Entrances and the street network. One regional extract feeds Places, the pedestrian graph ([ADR-0009](0009-travel-times-own-pedestrian-graph-valhalla-in-s4.md)) and the map ([ADR-0008](0008-maps-openstreetmap-pmtiles-and-maplibre.md)).
2. **Wikidata** (CC0) supplies structured facts, labels per language, the identifiers of the heritage list and links to articles. It is one link among others, not the key of a Place: in Minsk one routable candidate in six carries its link, so Places have identifiers of our own and records are matched by us ([ADR-0030](0030-base-of-places-gathered-ahead-of-time-and-matched.md)).
3. **Wikipedia in Belarusian, Russian and English** (CC BY-SA) is the narrative material from which facts are extracted. Each fact stores the article, the revision identifier, the retrieval date and the licence. Stories are generated from the facts per output language, not translated (`KNW-20`). The second Belarusian Wikipedia (be-tarask) is not read for now: in Minsk it adds one Place.
4. **Wikimedia Commons** supplies photos; each file keeps its author and licence (`KNW-17`).
5. **Access** is through the projects' official interfaces at Minsk's volume, with caching and polite rates; bulk dumps are the path when Preparation is opened to other cities in S5.
6. **Freshness (`PLC-7`).** The Sources are re-read by the Freshness Checks of [ADR-0031](0031-keeping-the-base-of-places-current.md): the full extract of the map weekly, the last revision of linked Wikidata items weekly, page views monthly, the state heritage bank quarterly. Article revisions are compared monthly, and a material change marks the Dossier stale. What a re-read finds becomes change records, applied or proposed by the rules of that record. The schedule hangs on the single hourly trigger of [ADR-0024](0024-runtime-rules-under-scale-to-zero-and-the-spending-envelope.md). Corrections (`FBK-3`) and the Curator cover what open data misses — for opening hours that is most of it: the map's volunteers rewrite eight values a month for the whole country.
7. **The re-check of `RTE-12`** — when a Route is built and when its Route Pack is downloaded — runs against our own base and records the check date. No external service is called on the request path.
8. **Memorial plaques** are imported as their own kind and excluded from Routes by default (`PLC-5`).
9. **The state heritage bank** (heritage.gov.by) supplies a dating and a description for listed objects. They are read as facts for a Dossier, each citing the bank's record; the descriptions are not published as text. In Minsk this gives facts to 427 routable Places, 232 of which have no article anywhere.
10. **Monthly page views of a Place's articles** are a popularity signal: stable from one half-year to the next, and meaningful for the most viewed quarter. It measures the article, not the Place, and is read together with the kind of the Place.
11. **Every request to a source identifies the client** by the project's repository address, stays inside the source's stated limits and obeys its "retry after" ([ADR-0030](0030-base-of-places-gathered-ahead-of-time-and-matched.md)). Wikimedia allows 200 requests a minute to a client identified as its policy asks, and 10 to any other.
12. **Measured and not taken:** Overture Maps places — its schema has no opening hours, its operating status is filled for 18 of 25 381 places in Minsk, and it holds no sights; the heritage lists of Belarusian Wikipedia — three rows that match nothing; Wikivoyage — at most three sights the base lacks. Examined on 24 November 2026 and not taken either: Foursquare's open places (closure marks but no opening hours, behind an account, coverage of Belarus unknown); AllThePlaces (four relevant chains in the country); the Trade Register of Belarus (behind a state login, no licence stated); the register of legal entities (operators, not Places; no terms).

## Consequences

- The Place base is a derived database under ODbL: attribution is shown, and the share-alike terms attach to the database, not to Stories.
- Unknown hours stay unknown and are shown as such (`PLC-4`, `RTE-13`); the product does not guess them.
- The quality of Minsk rests on the Curator more than on any source — as the specification intends for a Reference City.
- The heritage bank states no terms of reuse. Its facts are cited and its text is not published; what its terms allow is read before launch, with the register of §9.3.

## Measured since the decision

From [research report 06](../research/06-minsk-city-data.md) and [report 07](../research/07-minsk-more-sources.md).

- Cafés, bars and restaurants of Minsk in OpenStreetMap: 1 955 objects, 68.3 % with opening hours; with fast food the Venues are 2 688. This closes the open item of §10.4.
- Of 654 linked Wikidata items in Minsk, 69 % have an article in Belarusian, 40 % in Russian and 11 % in English.
- Wikidata matched by us raises the Places of Minsk that have at least one article from 461 to about 585; with the heritage bank, Places with any text go from 499 to 731.

## Not verified

- Whether the state heritage bank's records may be stored and retold; its site states nothing.
- Fill rates of the heritage bank's fields outside Minsk.
- Licence interpretation — whether a paraphrase by a model is a derivative work — is deferred with §9.3; provenance is kept regardless.
