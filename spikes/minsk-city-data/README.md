# Spike: first city data for Minsk

Throw-away code that builds the first real city data for Minsk and measures what the
Architecture Decision Records list as unmeasured. The findings are in
[`docs/research/06-minsk-city-data.md`](../../docs/research/06-minsk-city-data.md).
Nothing here is production code and nothing outside this folder depends on it.

## What it needs

- Node.js 24 or newer (written and run on 26.12.1): the `.ts` files run directly, without a build.
- `bash`, `curl`, `tar`, `md5sum`, `sha256sum`; Linux on x86-64 (the `pmtiles` binary is fetched for that platform).
- About 1 GB of disk and a network connection. No account, no key, no paid service.

## Reproduce

```bash
npm install          # DuckDB client, opening_hours.js, TypeScript (about 110 MB)
npm run fetch        # Belarus extract from Geofabrik (353 MB), pmtiles CLI (17 MB), glyph ranges (1.4 MB)
npm run all          # every measurement below, in order; about three minutes, including the map download (45 MB)
```

`npm run all` is the same as running the steps one by one:

| Step | Command | Reads | Writes | Network |
|---|---|---|---|---|
| Cut the city | `npm run extract` | `data/osm/belarus-261122.osm.pbf` | `out/minsk.duckdb`, `out/minsk-boundary.geojson`, `out/01-extract.json` | DuckDB `spatial` extension on first run (35 MB, into `data/duckdb-ext/`) |
| Places and Territories | `npm run places` | city database | tables `place`, `territory`…; `out/02-places.json` | — |
| Opening hours | `npm run hours` | `place` | `out/03-hours.json` | — |
| Knowledge coverage | `npm run knowledge` | `place` | `out/04-knowledge.json`, `out/04-wikidata-items.json` | Wikidata Query Service, Wikidata and Wikipedia APIs: about 25 requests, cached |
| Pedestrian graph | `npm run graph` | `way`, `node` | `out/minsk-walk-full.bin`, `out/minsk-walk-contracted.bin`, `out/05-graph.json` | — |
| Sparse matrix | `npm run matrix` | graph, `place` | `out/minsk-matrix-3km.bin`, `out/06-matrix.json` | — |
| Material for the checks | `npm run material` | graph, `place`, Wikidata items | `out/08-material.json`, `out/08-outing-bbox.txt` | Wikipedia API: 2 requests, cached |
| Map | `npm run map` | boundary, Outing box | `data/map/*.pmtiles`, `out/07-map.json` | Protomaps daily build, by range requests (45 MB) |
| Memory | `npm run memory` | graph, matrix | `out/09-memory.json` | — |
| Country-wide network | `npm run country` | `data/osm/belarus-261122.osm.pbf` | `out/10-country.json` | — |

Every step prints its tables to the terminal and writes the same numbers as JSON into `out/`.
`npm run sql -- "SELECT kind, count(*) FROM place GROUP BY 1"` runs an ad-hoc query against the city database.
`npm run typecheck` type-checks the sources.

## Second measurement: more sources

`npm run more` measures what each further source of Places and facts would add; the findings are in
[`docs/research/07-minsk-more-sources.md`](../../docs/research/07-minsk-more-sources.md).
It needs the outputs of `npm run all`.

| Step | Command | Reads | Writes | Network |
|---|---|---|---|---|
| Wikidata matched to OpenStreetMap | `npm run wikidata-match` | `feature`, `place`, Wikidata items | `out/11-wikidata-match.json`, `out/11-matches.json` | Wikidata: 10 requests |
| State heritage bank | `npm run heritage` | `feature`, `place` | `out/12-heritage.json`, `out/12-heritage-minsk.json` | heritage.gov.by: 192 requests (1 map, 35 list pages, 150 object pages, 6 others); Wikidata: 1 |
| Heritage lists of Belarusian Wikipedia | `npm run bewiki-lists` | `feature`, `place` | `out/13-bewiki-lists.json` | be.wikipedia.org: 6 requests |
| Wikivoyage | `npm run wikivoyage` | `feature`, `place` | `out/14-wikivoyage.json` | ru and en.wikivoyage.org: 6 requests |
| Overture Maps places | `npm run overture` | boundary, `place` | `data/overture/*.parquet`, `out/15-overture.json` | 16 file footers and 7 MB of data; DuckDB `httpfs` extension on first run (26 MB) |
| Names per language | `npm run names` | outputs of the steps above | `out/16-names.json` | — |
| Page views | `npm run pageviews` | `place`, Wikidata items | `out/17-pageviews.json` | wikimedia.org: 188 requests, paced at ten a minute: twenty minutes |
| Country-wide base | `npm run country-base` | the `.osm.pbf` | `out/18-country.json` | Wikidata: 5 requests |

Answers are cached: `data/wiki-cache/` for the Wikimedia interfaces, `data/web-cache/<host>/` for the
other sites. With the caches in place `npm run more` sends nothing and takes about a minute.

## Third measurement: Belarus, five kinds, freshness and change rate

`npm run fetch-history` and then `npm run belarus`; the findings are in
[`docs/research/08-belarus-focus-kinds-and-freshness.md`](../../docs/research/08-belarus-focus-kinds-and-freshness.md).
It needs `npm run fetch` (the extract of 22 November) and nothing else from the earlier steps.

| Step | Command | Reads | Writes | Network |
|---|---|---|---|---|
| Older extract and daily diffs | `npm run fetch-history` | — | `data/osm-base/belarus-261001.osm.pbf` (350 MB), `data/osm-diffs/*.osc.gz` (52 files, 23 MB) | download.geofabrik.de: 105 requests |
| Five groups by area | `npm run focus-counts` | the `.osm.pbf` | `out/21-focus-counts.json`, `out/21-focus-objects.json` | — |
| Age of last edits | `npm run freshness` | the `.osm.pbf`, objects of the step above | `out/22-freshness.json` | — |
| Change rate | `npm run diffs` | the older extract, the diffs, objects of `focus-counts` | `out/23-diffs.json` | — |
| Places' own websites | `npm run websites` | objects of `focus-counts` | `data/web-cache/place-sites/`, `out/24-websites.json` | about 300 requests to about 160 sites: `robots.txt` and the home page, once each |
| Size by formula | `npm run size` | the `.osm.pbf`, `out/23-diffs.json` | `out/25-size.json` | — |

The whole of `npm run belarus` takes about a minute once the website answers are cached.

## What will differ on a re-run

- **The OpenStreetMap extract.** The report uses Geofabrik's `belarus-261122.osm.pbf` (data up to
  22 November 2026). Geofabrik keeps dated files for a limited time. For another date:
  `OSM_DATE=YYMMDD npm run fetch && OSM_DATE=YYMMDD npm run all`. Counts will move with the data.
- **The map build.** Protomaps keeps a daily build for seven days; the report uses `20261122`.
  For another date: `PROTOMAPS_BUILD=YYYYMMDD npm run map` after deleting `data/map/`.
- **Wikidata and Wikipedia.** Answers are cached in `data/wiki-cache/`, one file per request.
  With the cache in place a re-run sends nothing and reproduces the report exactly; after deleting
  the cache it reads today's Wikidata.
- **Timings.** They were taken on a laptop that was in use (Intel Core Ultra 5 225H, `powersave`
  governor). The whole-city search varied between 40 and 86 ms from run to run.
- **Opening hours** are evaluated for fixed dates written in `src/03-hours.ts`, in the time zone
  `Europe/Minsk`; `npm run hours` sets `TZ` itself.

## Files

| File | What it is |
|---|---|
| `src/lib.ts` | constants (city, centre, station), DuckDB connection, small helpers |
| `src/00-fetch.sh` | downloads, with checksums |
| `src/01-extract.ts` | boundary polygon; nodes, ways, relations of the city; one row per tagged object |
| `src/02-places.ts` | kinds of §3.2 as SQL rules; Territories, parents, Entrances |
| `src/03-hours.ts` | coverage of `opening_hours`; resolution with opening_hours.js |
| `src/04-knowledge.ts`, `src/wiki.ts` | Wikidata items, articles per language, photos; the polite cached client |
| `src/graph.ts` | the compact graph format, Dijkstra, snapping, components |
| `src/walkable.ts` | which ways can be walked, and the attributes an edge carries |
| `src/05-graph.ts` | full and contracted graph; sizes and search times |
| `src/06-matrix.ts` | pairs of Places within the walking cut-off |
| `src/07-map.sh`, `src/07-map-bbox.ts`, `src/07-map-report.ts` | `pmtiles extract` and the sizes |
| `src/08-material.ts` | reference Outing, ten Places, phrases — the selections are constants at the top of each part |
| `src/09-memory.ts` | memory of a process that holds the city data |
| `src/10-country.ts` | node and segment counts of the walkable network of the whole extract |
| `src/sql.ts` | ad-hoc queries |
| `src/kinds.ts` | the kinds of §3.2 as SQL rules, shared by the city step and the country-wide count |
| `src/names.ts` | comparing names written by different sources; seeded sampling |
| `src/web.ts` | the polite cached client for sites other than the Wikimedia APIs |
| `src/wikitext.ts` | template calls and their parameters out of wikitext |
| `src/heritage-wd.ts` | Wikidata items that carry the state code or the heritage-bank identifier |
| `src/11-wikidata-match.ts` | unlinked Wikidata items matched to OpenStreetMap at three settings; the matcher checked on known links |
| `src/12-heritage.ts` | the state heritage bank: counts, fields, links to Wikidata and OpenStreetMap |
| `src/13-bewiki-lists.ts` | rows of the heritage lists in Belarusian Wikipedia |
| `src/14-wikivoyage.ts` | listings of the Russian and English Wikivoyage articles |
| `src/15-overture.ts` | Overture places of the city: schema, attributes, overlap with Venues |
| `src/16-names.ts` | names per language after each source |
| `src/17-pageviews.ts` | monthly page views of a sample of linked Places |
| `src/18-country.ts` | candidate Places of the whole extract and the size of a country-wide base |
| `src/focus.ts` | the five groups as rules over tags, lifecycle prefixes, point-in-polygon for the areas |
| `src/focus-load.ts` | candidates of the five groups and city boundaries out of a `.osm.pbf` |
| `src/pbf.ts` | a minimal PBF reader for what DuckDB leaves out: versions, timestamps, the replication state |
| `src/20-fetch-history.sh` | the older extract and the daily diffs |
| `src/21-focus-counts.ts` | the five groups in Minsk, the regional centres and the rest |
| `src/22-freshness.ts` | age of last edits and of check dates |
| `src/23-diffs.ts` | daily diffs applied to the older state; created, deleted, modified and what changed; checked against the newer extract |
| `src/24-websites.ts` | a sample of 200 website tags: what answers, markup, visible hours, text size |
| `src/25-size.ts` | rows and megabytes for the five groups and for a year of change history |

## Conventions and limits

- **One tool chain:** TypeScript on Node.js with DuckDB and its `spatial` extension, which reads
  `.osm.pbf` directly. Two shell scripts wrap `curl` and the `pmtiles` command-line tool; nothing
  forced another language.
- **Downloads are data, not code.** Each lives in its own directory under `data/`; scripts live in `src/`.
  `data/`, `node_modules/` and the binary outputs are ignored by `.gitignore`.
- **Requests to Wikimedia** go one at a time with a pause of 1.1 s, gzip, the client name
  `minsk-city-data-spike/0.1`, no cookies and no personal data.
- **Requests to other sites** go at most once in 1.1 s per host under the same client name. The
  heritage bank is read through the same requests its own catalog and map pages send.
- **The graph is cut by the administrative boundary**, which leaves the two exclaves of Minsk
  disconnected from the city proper; the largest connected component is kept.
- **Places are snapped to the nearest graph vertex**, not to the nearest point of a street.
- **A pedestrian square is walked along its outline**, as OpenStreetMap draws it.
- **Territories** are named areas of at least one hectare; smaller squares and unnamed gardens are left out.
