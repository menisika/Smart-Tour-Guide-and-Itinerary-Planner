# 06. Minsk city data: first measurements

| | |
|---|---|
| **Date** | 23 November 2026 |
| **Purpose** | Build the first real city data for Minsk and measure what the [Architecture Decision Records](../adr/README.md) list as unmeasured |
| **Code** | [`spikes/minsk-city-data/`](../../spikes/minsk-city-data/README.md) — a throw-away spike; its `npm run all` reproduces every number below |
| **OpenStreetMap** | Geofabrik extract of Belarus `belarus-261122.osm.pbf`, 352.6 MB, data of 22 November 2026 |
| **Map tiles** | Protomaps daily build `20261122` (OpenStreetMap as of 22 November 2026, 04:00 UTC) |
| **Wikidata, Wikipedia** | read through the public interfaces on 23 November 2026; 27 requests for a clean pass |
| **Machine** | a laptop in use: Intel Core Ultra 5 225H, 36 GB, Linux, Node.js 26.12.1, DuckDB 2.0.1 |

Terms with a capital letter are those of the [glossary](../../GLOSSARY.md); requirement identifiers are those of the [product specification](../PRODUCT-SPEC.md).

**Kinds of statement.** *Measured* — the spike computed it from the data named above. *By formula* — arithmetic on measured counts. *Assumption* — a value the spike had to choose; each is named where it is used. *Proposal* — a selection made from the data for the owner or the Curator to accept or change.

---

## 1. Summary

1. **Minsk is 353.3 km² in three parts** — the city proper and two exclaves to the east, one of them at the airport. Cutting it out of the Belarus extract and building every table takes 11 seconds.
2. **7 656 candidate Places** by the kinds of §3.2: 3 668 sights, 383 nature, 27 markets, 2 688 Venues and 890 memorial plaques. The kinds a Route is built from by default — sights, nature, markets — give 4 078 candidates; 1 930 of them are artworks.
3. **17.3 % of those 4 078 carry a Wikidata link** (706). Wikidata has 2 515 items located inside the city; OpenStreetMap links to 1 199 of them, and to only 615 from a candidate Place. 445 of the unlinked items carry a heritage designation.
4. **The figures ADR-0011 quotes hold.** Within 1.5 km of the centre Wikidata has 892 items: an article in Belarusian for 500 (505 with be-tarask), in Russian for 284, in English for 86. Opening hours are filled in for 48 of 75 museums: 64.0 %.
5. **Cafés, bars and restaurants — the open item of §10.4 — are 1 955 objects, 68.3 % with opening hours.** With fast food the Venues are 2 688.
6. **The standard parser resolves 99.6 % of the opening-hours values** (2 034 of 2 043), every one of the 27 values with a public-holiday rule among them. It knows nine Belarusian holidays and takes them from its own tables, not from data we supply.
7. **The pedestrian graph of the city is 393 145 nodes and 474 945 street segments: 11.4 MB** as typed arrays, 5.4 MB compressed. Building it takes 2 seconds. A search from one point to every node of the city takes 74–86 ms in Node.js; with a 3 km cut-off, 3–5 ms.
8. **The sparse matrix between the 4 041 routable Places at a 3 km cut-off is 1.34 million pairs: 5.4 MB**, 2.7 MB compressed. Computing the matrix for every candidate takes 21–32 seconds on one thread.
9. **The map is much smaller than estimated.** Centre, 3 by 3 km, zoom 0–15: 3.2 MB. Whole city by its boundary: 18.9 MB. Latin and Cyrillic glyphs for three fonts: 1.2 MB.
10. **Everything a Route Pack needs besides audio and photos is about 5.6 MB** for the reference Outing: map 2.8 MB, glyphs 1.4 MB, graph 0.4 MB, matrix at most 1.0 MB.
11. **Nothing measured contradicts a decision.** Five things the records assume or leave open need a decision before they are built on; they are listed in [§10](#10-what-contradicts-or-is-missing-from-a-record).

---

## 2. Method

**One tool chain.** TypeScript on Node.js, with DuckDB and its `spatial` extension reading the `.osm.pbf` directly. Two shell scripts wrap `curl` and the `pmtiles` command-line tool. Nothing forced another language.

**Boundary.** The administrative boundary is OpenStreetMap relation 59195 (`boundary=administrative`, `admin_level=4`, Wikidata Q2280). Its member ways are joined into a polygon in SQL. The result has three parts:

| Part | Area, km² | Candidate Places |
|---|---|---|
| The city proper | 336.8 | 7 611 |
| Eastern exclave with the airport | 13.6 | 28 |
| Smaller eastern exclave | 2.9 | 17 |
| **Minsk** | **353.3** | **7 656** |

An object belongs to Minsk when a point guaranteed to lie on it is inside this polygon.

**Centre.** "The centre" is a circle of 1.5 km around the `place=city` node of Minsk (53.90247° N, 27.56182° E), which stands on Kastryčnickaja Square. The 3 by 3 km map cut is the square around the same point.

**What the cut contains** (measured):

| | |
|---|---|
| Nodes in the working box (boundary plus about 2 km) | 1 982 793 |
| Ways with a node in the box | 387 024 |
| Relations with a member in the box | 5 728 |
| Tagged objects inside the city | 405 136 |
| Time from the `.osm.pbf` to the finished city database | 11.0–11.7 s |

**Wikimedia.** One query to the Wikidata Query Service lists every item with coordinates in the bounding box of the city, with its articles, image and class. Items that OpenStreetMap points to and the box did not return are read through the Wikidata API; article lengths come from the Wikipedia APIs, fifty titles per request. Requests go one at a time with a pause, under a generic client name, and every answer is cached on disk. A clean pass takes 27 requests and 3.3 MB of answers. During the work the Wikipedia requests were sent twice within an hour; one was answered with 503 and two with 429, asking to wait 10 and 49 seconds, and all succeeded on the retry.

**Reproducing.** `npm install`, `npm run fetch` and `npm run all` in [`spikes/minsk-city-data/`](../../spikes/minsk-city-data/README.md) repeat every step in under three minutes after the downloads; each step prints its tables and writes the same numbers as JSON into the spike's `out/` folder. The spike's `README.md` says what changes when the data is newer.

---

## 3. Places

### 3.1 Kinds

The kind of an object is decided by tag rules, first match wins; the rules are in [`src/02-places.ts`](../../spikes/minsk-city-data/src/02-places.ts). A memorial plaque is recognised first, so that it never counts as a sight (`PLC-5`).

| Kind (§3.2) | Candidates | With a name | `name:be` | `name:ru` | `name:en` | Wikidata link | Share | Within 1.5 km of the centre |
|---|---|---|---|---|---|---|---|---|
| Sights | 3 668 | 2 618 | 2 515 | 2 446 | 464 | 621 | 16.9 % | 964 |
| Nature | 383 | 194 | 190 | 191 | 72 | 84 | 21.9 % | 43 |
| Markets | 27 | 19 | 17 | 17 | 2 | 1 | 3.7 % | 0 |
| **Sights, nature and markets together** | **4 078** | **2 831** | **2 722** | **2 654** | **538** | **706** | **17.3 %** | **1 007** |
| Venues | 2 688 | 2 535 | 1 058 | 1 202 | 620 | 1 | 0.04 % | 625 |
| Memorial plaques | 890 | 869 | 852 | 847 | 33 | 3 | 0.3 % | 490 |
| **All candidates** | **7 656** | **6 235** | **4 632** | **4 703** | **1 191** | **710** | **9.3 %** | **2 122** |

The same by rule:

| Kind | Rule | Candidates | With a name | Wikidata link |
|---|---|---|---|---|
| Sight | `tourism=artwork` | 1 930 | 1 460 | 12 |
| Sight | building with a `wikidata` or `heritage` tag | 569 | 224 | 415 |
| Sight | `historic=memorial`, not a plaque | 417 | 373 | 39 |
| Sight | `tourism=attraction`, zoo, theme park, aquarium | 222 | 208 | 49 |
| Sight | `amenity=fountain` | 161 | 25 | 2 |
| Sight | `amenity=place_of_worship` | 160 | 148 | 54 |
| Sight | `tourism=museum` | 75 | 74 | 21 |
| Sight | theatre, arts centre, planetarium | 58 | 54 | 18 |
| Sight | other `historic=*` (wayside cross, archaeological site, tomb, ruins…) | 52 | 30 | 7 |
| Sight | `historic=monument` | 17 | 15 | 4 |
| Sight | `tourism=gallery` | 7 | 7 | 0 |
| Nature | `leisure=park` | 264 | 116 | 76 |
| Nature | `tourism=viewpoint` | 37 | 14 | 0 |
| Nature | named garden | 24 | 24 | 1 |
| Nature | nature reserve, protected area | 19 | 11 | 2 |
| Nature | beach | 18 | 8 | 0 |
| Nature | named water of at least one hectare | 17 | 17 | 4 |
| Nature | embankment (a street named "набережная"), one per name | 4 | 4 | 1 |
| Market | `amenity=marketplace` | 27 | 19 | 1 |
| Venue | `amenity=cafe` | 1 387 | 1 322 | 0 |
| Venue | fast food, food court, ice cream | 733 | 682 | 1 |
| Venue | `amenity=restaurant` | 289 | 276 | 0 |
| Venue | bar, pub | 279 | 255 | 0 |
| Plaque | `historic=memorial` + `memorial=plaque` | 890 | 869 | 3 |

What the counts say:

- **Memorial plaques are 890**, against 889 in the earlier research (R3 §2). They outnumber all other memorials (417) two to one, and 490 of them are in the centre. Keeping them out of Routes by default is necessary.
- **Artworks are almost half of the routable candidates** (1 930 of 4 078): 482 murals, 204 sculptures, 124 installations, and 1 047 with no type; 470 have no name. Without artworks and fountains 1 968 candidates remain. The specification excludes plaques by default and says nothing about murals or unnamed artworks.
- **Names.** `name` holds the Belarusian name: it equals `name:be` for 3 423 of the 3 700 named Places that are not Venues. Of the 2 831 named routable candidates, 95.4 % have `name:be`, 93.2 % have `name:ru` and 18.9 % have `name:en`.
- **English names are few and uneven.** Of the 538 `name:en` values, 75 are written in Cyrillic and 49 in the Belarusian Latin alphabet with its diacritics ("Lošyca Park", "Kurasoŭščyna Park"). Wikidata is alike: 1 269 of its 2 515 items in the city have an English label, 340 of them with those diacritics, and one name appears in several transliterations ("Yanka Kupala" and "Janka Kupala"; "Kastrychnitskaya" and "Kastryčnickaja").
- **Venues are named in Russian more often than in Belarusian:** `name` equals `name:ru` for 812 and `name:be` for 245 of 2 535.
- **Other attributes a Dossier could start from** are rare among the 4 078: a `start_date` on 485, a `heritage` tag on 299, a website on 250, an image or Commons tag on 224.

### 3.2 The Wikidata link, seen from OpenStreetMap

- 710 candidate Places carry a `wikidata` tag; they point to 658 distinct items. Four of those items no longer exist and one is a redirect.
- 35 items are carried by more than one Place (87 Places): the same thing drawn twice, or a building and the organisation inside it.
- A tag does not always point at the Place. The sculpture "The Last Way" at the Yama memorial points at the item *Minsk Ghetto*; a monument to Taras Shevchenko points at *legacy of Taras Shevchenko*; university buildings point at their faculties, an office building at the enterprise in it.
- 532 pairs of routable Places have the same name and kind within 100 m — the size of the merging work of `PLC-11`.

### 3.3 Sensitivity that tags alone show

A rough count over the 4 078 routable candidates, by tags and words in the name only. It is a lower bound: most sensitive content is in the articles, not in the tags.

| Signal | Places |
|---|---|
| Religion: a place of worship or a `religion` tag | 168 |
| War: `memorial=war_memorial`, a `military` tag, or a war word in the name | 60 |
| Repression: a word in the name | 0 |

### 3.4 Territories

A candidate Territory is a named area of at least one hectare that people enter. 115 were found.

| Class | Territories | With nested Places | Nested Places | With a tagged entrance | Crossed by a walkable way | With opening hours | With a `fee` tag | With Wikidata |
|---|---|---|---|---|---|---|---|---|
| Park | 95 | 73 | 427 | 66 | 95 | 1 | 1 | 58 |
| Cemetery | 6 | 3 | 9 | 4 | 3 | 0 | 0 | 4 |
| Nature reserve | 4 | 1 | 1 | 1 | 4 | 0 | 0 | 2 |
| Theme park | 2 | 1 | 32 | 1 | 2 | 1 | 1 | 0 |
| Historic site | 2 | 1 | 15 | 1 | 2 | 0 | 0 | 0 |
| Attraction | 2 | 2 | 4 | 1 | 2 | 1 | 0 | 1 |
| Garden | 2 | 1 | 1 | 1 | 2 | 0 | 0 | 0 |
| Botanical garden | 1 | 1 | 39 | 1 | 1 | 1 | 1 | 1 |
| Museum grounds | 1 | 0 | 0 | 1 | 1 | 1 | 0 | 0 |
| **All** | **115** | **83** | **528** | **77** | **112** | **5** | **3** | **66** |

- **Nesting.** 528 of the 4 078 routable Places (12.9 %) lie inside a Territory. The parent of a Place is the smallest Territory that contains it. 101 Territories are at the top level and 14 are inside another one; no third level of Territories occurs.
- **Entrances, two ways.** *Tagged*: a node with `entrance=*` or a gate, within 15 m of the boundary — 304 nodes, on 77 Territories. *Computed*: a way that can be walked crosses the boundary — 2 025 ways. Every Territory has at least one of the two; 38 have no tagged entrance. An open park is crossed by dozens of paths (Victory Park: 81); a fenced one by few (the Botanical Garden: 5). The count of crossings is therefore itself a signal of whether a Territory is fenced.
- **Access Rules are almost absent.** Five Territories carry opening hours and three a `fee` tag.

The fifteen Territories with the most nested Places:

| Territory | Class | Hectares | Nested Places | Nested plaques | Nested Venues | Nested Territories | Tagged entrances | Walkable ways crossing | Opening hours | Fee |
|---|---|---|---|---|---|---|---|---|---|---|
| Батанічны сад | botanical garden | 90.8 | 39 | 0 | 5 | 2 | 7 | 5 | `Mo off; Tu-Su 10:00-21:00` | yes |
| Парк Перамогі | park | 147.4 | 33 | 7 | 9 | 2 | 4 | 81 | — | — |
| ДынаПарк | theme park | 3.2 | 32 | 0 | 0 | 0 | 5 | 2 | `10:00-18:00` | yes |
| Парк Янкі Купалы | park | 10.5 | 31 | 3 | 0 | 0 | 1 | 9 | — | — |
| Лошыцкі парк | park | 93.2 | 21 | 2 | 5 | 0 | 6 | 10 | — | — |
| Парк Уга Чавеса | park | 48.6 | 19 | 0 | 3 | 0 | 3 | 36 | — | — |
| Lakeside Park | park | 7.2 | 18 | 0 | 0 | 0 | 0 | 18 | — | — |
| Мінскі заапарк | park | 14.4 | 17 | 0 | 0 | 1 | 7 | 5 | `10:00-18:00` | yes |
| Севастопальскі парк | park | 89.3 | 16 | 0 | 0 | 0 | 2 | 68 | — | — |
| Парк Грэкавай | park | 67.1 | 15 | 1 | 1 | 0 | 6 | 31 | — | — |
| Лагер смерці «Малы Трасцянец» | historic site | 48.5 | 15 | 0 | 0 | 1 | 1 | 14 | — | — |
| Парк імя 50-годдзя Кастрычніка | park | 76.5 | 14 | 0 | 0 | 0 | 5 | 43 | — | — |
| Парк Горкага | park | 24.4 | 14 | 1 | 6 | 0 | 10 | 29 | — | — |
| Яўрэйскі мемарыяльны парк | park | 8.8 | 13 | 0 | 0 | 0 | 6 | 18 | — | — |
| Парк Пісьменнікаў | park | 18.4 | 12 | 0 | 1 | 0 | 3 | 44 | — | — |

**The Botanical Garden example of §3.2 exists in the data.** The garden (relation 222265) is closed on Mondays, open 10:00–21:00 otherwise, with `fee=yes`. Inside it lies a landscape park of 9.5 ha, and inside that the greenhouse (way 36059825, `building=conservatory`) with its own hours, `Mo off; Tu-Su 10:00-19:00`, and no `fee` tag. The tree is three levels deep and the hours of the levels differ, so the acceptance case of `PLC` can be run on real data. Two differences from the example as written: the whole garden is closed on Monday, not only the greenhouse, and the second ticket is not in the data. The garden's seven tagged entrance nodes stand at four spots: three gates and a lift gate, one of the gates marked by three more `entrance` nodes.

---

## 4. Opening hours

Coverage is the share of objects with an `opening_hours` tag. A value is *resolved* when opening_hours.js 3.16.0 — the parser the OpenStreetMap ecosystem uses — turns it into intervals for two fortnights without an error: 23 November – 6 December 2026, and 25 December 2026 – 7 January 2027. The parser ran in the time zone `Europe/Minsk` with the country set to Belarus.

| Group | Objects | With `opening_hours` | Coverage | Resolved | Resolved without a warning | With a public-holiday rule | Of them resolved |
|---|---|---|---|---|---|---|---|
| **Museums** (`tourism=museum`) | 75 | 48 | **64.0 %** | 48 | 48 | 0 | — |
| Galleries | 7 | 4 | 57.1 % | 3 | 3 | 0 | — |
| Cafés | 1 387 | 971 | 70.0 % | 968 | 946 | 11 | 11 |
| Bars and pubs | 279 | 178 | 63.8 % | 177 | 135 | 1 | 1 |
| Restaurants | 289 | 186 | 64.4 % | 186 | 171 | 3 | 3 |
| **Cafés, bars and restaurants together** | 1 955 | 1 335 | **68.3 %** | 1 331 | 1 252 | 15 | 15 |
| Fast food and food courts | 733 | 555 | 75.7 % | 553 | 540 | 9 | 9 |
| Markets | 27 | 6 | 22.2 % | 5 | 5 | 0 | — |
| Theatres and arts centres | 58 | 10 | 17.2 % | 9 | 9 | 0 | — |
| Places of worship | 160 | 14 | 8.8 % | 14 | 14 | 0 | — |
| Parks and gardens | 288 | 12 | 4.2 % | 12 | 12 | 0 | — |
| Attractions, zoo, theme parks | 222 | 15 | 6.8 % | 15 | 14 | 2 | 2 |
| **Every candidate Place** | 7 656 | 2 043 | 26.7 % | 2 034 | 1 941 | 27 | 27 |

- **§10.4 is closed.** Cafés, bars and restaurants of Minsk in OpenStreetMap are 1 955 objects, and 68.3 % carry opening hours. Within 1.5 km of the centre: 535 objects, 389 with hours (72.7 %).
- **Resolution: 99.6 %.** The 2 043 tagged objects hold 783 distinct values; nine do not resolve, one object each. Four are free text in Russian ("ежедневно с 8:30 до 21:00"); five are slips of syntax (`Mo-Thu`, `16::00`, `St-Su`, a time without a range, a comment in square brackets). ADR-0029 treats them as unknown, which costs nine Places.
- **Public-holiday rules are rare and all resolve.** 27 values contain `PH`. No museum has one. For only 22 of the 2 043 values does the holiday fortnight differ from the ordinary one.
- **The holiday calendar is inside the parser.** For Belarus it knows nine holidays: 1 January, 7 January, 8 March, Radunitsa (moving), 1 May, 9 May, 3 July, 7 November, 25 December. 2 January — a non-working holiday since 2020, not re-verified against the official list here — is not among them, and the working days that the government moves each year are not modelled. School holidays are not defined for Belarus; no value in Minsk uses them.
- **Forms.** 106 objects are `24/7`; for 68 the weeks are not all alike (a season, a week of the month, a holiday rule); four contain an interval the parser marks as "unknown" (a comment such as "by appointment").
- **Freshness.** 560 of the 2 043 objects (27 %) carry a `check_date`. Whether the hours are true cannot be seen from here.
- **Resolved form.** All intervals of all 2 034 Places for two weeks are 26 597 intervals — 106 kB at two 16-bit numbers each.
- **Hours are a property of Venues.** Of the 4 078 routable candidates, 153 have opening hours. Buildings, monuments and parks have none, and need none while they are seen from outside.

---

## 5. Knowledge coverage

### 5.1 Places of OpenStreetMap that carry a Wikidata identifier

Counted per distinct Wikidata item; the four deleted items are left out. "Photo" is the image property (P18) of Wikidata.

| Set | Items | be | be-tarask | be or be-tarask | ru | en | Any of the four | None | Photo |
|---|---|---|---|---|---|---|---|---|---|
| **Whole city** | 654 | 451 (69.0 %) | 170 (26.0 %) | 452 (69.1 %) | 261 (39.9 %) | 72 (11.0 %) | 461 (70.5 %) | 193 (29.5 %) | 539 (82.4 %) |
| Whole city, sights, nature, markets only | 650 | 449 | 169 | 450 | 260 | 72 | 459 | 191 | 537 |
| **Centre, 1.5 km** | 325 | 258 (79.4 %) | 98 (30.2 %) | 258 (79.4 %) | 151 (46.5 %) | 39 (12.0 %) | 263 (80.9 %) | 62 (19.1 %) | 298 (91.7 %) |
| Centre, sights, nature, markets only | 323 | 257 | 97 | 257 | 150 | 39 | 262 | 61 | 297 |

By source situation — what a language model would have to read (whole city, 654 items):

| Situation | Items | Share |
|---|---|---|
| Belarusian only | 198 | 30.3 % |
| Belarusian and Russian, no English | 184 | 28.1 % |
| Russian only | 7 | 1.1 % |
| English available | 72 | 11.0 % |
| No article in any of the four | 193 | 29.5 % |

- **English is the exception.** Nine linked Places in ten have nothing in English, and three in ten have Belarusian text only.
- **be-tarask adds text, not coverage.** One item has a be-tarask article and no article in be.

How much text there is, as wikitext:

| Wikipedia | Articles | Median | Quartiles | Under 2 kB | Total |
|---|---|---|---|---|---|
| be | 451 | 6.9 kB | 4.5–11.3 kB | 3 | 4.88 MB |
| be-tarask | 170 | 10.2 kB | 5.4–14.9 kB | 5 | 2.10 MB |
| ru | 261 | 8.3 kB | 5.7–14.7 kB | 0 | 3.35 MB |
| en | 72 | 5.4 kB | 2.9–8.5 kB | 9 | 0.53 MB |

Cyrillic takes two bytes per letter, so a median Belarusian article is about 3 400 characters of wikitext with its markup.

### 5.2 Every Wikidata item with coordinates

This is the figure of the research that ADR-0011 quotes, measured again.

| Set | Items | be | be-tarask | be or be-tarask | ru | en | Any of the four | None | Photo |
|---|---|---|---|---|---|---|---|---|---|
| **Centre, 1.5 km** | 892 | 500 | 220 | 505 | 284 | 86 | 515 | 377 | 727 |
| *Earlier research (R3 §2)* | *873* | *510* | — | — | *285* | *86* | — | — | *719* |
| **Whole city** | 2 515 | 1 603 | 576 | 1 624 | 695 | 212 | 1 657 | 858 | 1 669 |

### 5.3 The gap between the two

The 2 515 Wikidata items located in the city, by whether OpenStreetMap points to them:

| | Items | With an article | Of them Belarusian | Photo | Heritage designation |
|---|---|---|---|---|---|
| Linked from a candidate Place | 615 | 433 | 427 | 514 | 254 |
| Linked only from another object — a street, a station, a district | 584 | 553 | 545 | 435 | 7 |
| **Not linked from any object in the city** | **1 316** | **671** | **652** | **720** | **445** |

The unlinked items are mostly what Routes are made of: 344 buildings, 184 streets, 74 monuments, 44 alleys, 30 building complexes, 20 cultural properties, 15 sculptures. Reading the `wikidata` tag reaches a quarter of what Wikidata knows about Minsk; the rest has to be matched by position and name.

---

## 6. Pedestrian graph and matrix

### 6.1 Rules

A way is walkable when it is a footway, a path, steps, a pedestrian street, a platform or a carriageway on which walking is not forbidden; motorways never, trunk roads only when tagged for walking; a carriageway whose footway is mapped separately (`foot=use_sidepath`) is left out; `access=private` and `access=no` are left out unless `foot` allows. The rules are in [`src/walkable.ts`](../../spikes/minsk-city-data/src/walkable.ts). An edge carries its length in decimetres as an integer and one byte of attributes: steps, crossing, tunnel, bridge, unpaved, carriageway, busy carriageway.

A segment is kept when at least one of its ends is inside the boundary, and only the largest connected component is kept.

### 6.2 Counts and sizes

Two forms were built. In the **full** graph every OpenStreetMap node of a walkable way is a vertex, so the graph is also the geometry of every path. In the **contracted** graph only junctions, dead ends and changes of attribute are vertices.

| | Full | Contracted |
|---|---|---|
| Nodes | 393 145 | 198 882 |
| Street segments (each stored as two directed edges) | 474 945 | 279 995 |
| Compact binary form | **11.37 MB** | 6.31 MB, plus about 1.88 MB of path geometry *(by formula)* |
| The same compressed with gzip | 6.92 MB | 3.99 MB |
| The same compressed with Brotli | 5.45 MB | 3.30 MB |

The compact form is seven typed arrays behind a 32-byte header: latitude and longitude as 32-bit integers, the index of each node's first edge, and per directed edge the target (32 bits), the length (16 bits) and the attributes (8 bits). That is 12 bytes per node and 14 per street segment. It is read from disk as it is, with no parsing: 6–37 ms.

What the graph is made of:

| | |
|---|---|
| Walkable ways in the working box | 155 349: footway 76 538, service 46 346, path 8 952, steps 5 927, residential 5 808, other 11 778 |
| Total length | 10 032 km, of which 5 287 km on ways for walking only and 4 745 km on carriageways |
| Steps | 6 512 segments, 58 km |
| Crossings | 10 404 segments |
| Underpasses and other tunnels | 2 881 segments, 46 km |
| Unpaved | 26 722 segments, 701 km |
| Longest segment | 799 m — 16 bits for a length in decimetres are enough |
| Connected components before filtering | 577; the largest holds 393 145 of 400 471 nodes (98.2 %) |
| Nodes outside the largest component | 7 326: 3 869 are islands inside the city proper, 3 457 are in the exclaves |

Sanity check: from the railway station to the centre is 1 497 m in a straight line, 1 787 m on the graph, and 1 883 m when steps are avoided.

**The whole extract, for scale.** By the same rules Belarus has 985 106 walkable ways, 5 701 274 nodes and 6 198 080 segments (measured, 1.3 s). In the same format that is 155 MB *(by formula)*: fourteen times the city.

### 6.3 Times

| Step | Time |
|---|---|
| Read walkable ways and their nodes from the city database | 0.6–1.4 s |
| Build the full graph, with components | 1.4–2.0 s |
| Contract it | 0.05–0.10 s |
| Write both files | 0.02–0.06 s |

One-to-many shortest paths, Dijkstra with a binary heap over the typed arrays, one thread, random sources, medians of 50 runs without a cut-off and of 200 runs with one:

| Graph | Cut-off | Median | 95th percentile | Nodes settled |
|---|---|---|---|---|
| Full | none — the whole city | **74–86 ms** in six runs, 40 ms in one | 72–94 ms | 393 145 |
| Contracted | none — the whole city | 33–39 ms | 35–47 ms | 198 882 |
| Full | 3 000 m | 2.6–5.0 ms | 6.2–8.3 ms | 26 147 |
| Contracted | 3 000 m | 1.5–2.5 ms | 3.2–3.7 ms | 15 097 |

The spread comes from the machine: a laptop in use, with fast and slow cores and a power-saving governor. The first search in a fresh process takes 86–128 ms.

### 6.4 Memory

A fresh Node.js process that loads the graph and the matrix, builds the index for snapping a point to the graph, and runs one search:

| | Resident memory |
|---|---|
| Empty process | 76 MB |
| After loading the two files | 116 MB |
| After the snapping index and one search | 124 MB |

So the city costs about 48 MB as the spike is written. 40.6 MB of it is typed arrays: the graph twice (the file and a copy of it, 22.8 MB), the matrix (5.4 MB) and the state of one search (12.3 MB). Each further search running at the same time needs its own 12.3 MB.

### 6.5 Sparse matrix

Each Place is snapped to the nearest graph vertex within 250 m (median 12 m, 95th percentile 35 m). The distance between two Places is the walk between their vertices plus the two snaps. A pair is stored once, and only when it is within the cut-off. 50 of the 7 656 candidates could not be snapped: all 45 that stand in the exclaves, which the largest component does not reach, and five in the city proper.

| Places | Cut-off | Places | Pairs | Share of all pairs | Size | Brotli | A dense matrix would be | Neighbours of a Place: median / 95th / most |
|---|---|---|---|---|---|---|---|---|
| **Sights, nature, markets** | **3 km** | **4 041** | **1 341 299** | **16.4 %** | **5.38 MB** | **2.71 MB** | 32.7 MB | 381 / 1 530 / 1 591 |
| The same | 2 km | 4 041 | 711 096 | 8.7 % | 2.86 MB | 1.44 MB | 32.7 MB | 156 / 1 025 / 1 148 |
| The same | 1 km | 4 041 | 209 238 | 2.6 % | 0.85 MB | 0.43 MB | 32.7 MB | 42 / 401 / 500 |
| Without artworks and fountains | 3 km | 1 968 | 416 474 | 21.5 % | 1.67 MB | 0.85 MB | 7.7 MB | 309 / 898 / 920 |
| With memorial plaques | 3 km | 4 931 | 2 494 636 | 20.5 % | 10.00 MB | 4.98 MB | 48.6 MB | 719 / 2 146 / 2 216 |
| With cafés, bars and restaurants | 3 km | 5 987 | 3 076 371 | 17.2 % | 12.33 MB | 6.20 MB | 71.7 MB | 634 / 2 326 / 2 390 |
| Every candidate | 3 km | 7 606 | 5 417 448 | 18.7 % | 21.70 MB | 10.82 MB | 115.7 MB | 952 / 3 121 / 3 210 |

The form is four bytes per pair — a 16-bit column and a 16-bit distance in decimetres — plus one 32-bit offset per Place. Computing the pairs for every candidate took 6 128 searches and 21–32 seconds on one thread, 3.4–5.2 ms per search.

---

## 7. Map

Cut with `pmtiles extract` (go-pmtiles 1.31.2) from `https://build.protomaps.com/20261122.pmtiles`, a 139.7 GB archive, by HTTP range requests. The archive stops at zoom 15, as ADR-0008 says. On 23 November the oldest build still published was that of 17 November: seven days.

| Extract | Zoom | Tiles | Size |
|---|---|---|---|
| **Centre, 3 by 3 km** | 0–15 | 52 | **3.16 MB** |
| Centre, 3 by 3 km | 0–14 | | 2.37 MB |
| Centre, 3 by 3 km | 0–13 | | 1.97 MB |
| Area of the reference Outing, 2.3 by 2.2 km | 0–15 | | 2.81 MB |
| **Whole city, by the administrative boundary** | 0–15 | 1 212 | **18.91 MB** |
| Whole city, by the bounding box of the boundary | 0–15 | | 23.88 MB |
| Whole city, by the boundary | 0–14 | | 10.03 MB |
| Whole city, by the boundary | 0–13 | | 5.79 MB |
| Whole city, by the boundary | 0–12 | | 3.14 MB |

- The centre took 33 requests and 9 seconds; the city 65 requests. A dry run predicts the size before anything is downloaded.
- Cutting the centre out of the local city archive gives a file identical byte for byte to the one cut from the daily build. A Route Pack's map can therefore be cut from our own copy of the city, with no request to Protomaps.
- The bounding box of Minsk is twice as wide as the city because of the exclaves; the boundary is the right shape to cut by.
- About 1.7 MB of any extract is the pyramid of zooms 0–10 above its area, which every extract carries.

Glyph ranges of the fonts the Protomaps styles name, from `protomaps/basemaps-assets`, in bytes:

| Font | 0–255 | 256–511 | 1024–1279 | 1280–1535 | 8192–8447 | Latin (first two) | Cyrillic (next two) |
|---|---|---|---|---|---|---|---|
| Noto Sans Regular | 76 044 | 127 726 | 125 320 | 84 434 | 64 220 | 203 770 | 209 754 |
| Noto Sans Medium | 77 628 | 129 635 | 128 608 | 86 131 | 65 101 | 207 263 | 214 739 |
| Noto Sans Italic | 79 344 | 132 976 | 128 015 | 26 727 | 52 891 | 212 320 | 154 742 |

Latin and Cyrillic for one font are 0.41 MB; for the three fonts 1.20 MB, and 1.38 MB with general punctuation. The main Cyrillic block of the regular font is 125 320 bytes, the "125 KB" of ADR-0008. The range 256–511 is needed for Belarusian Latin and for Polish names; the Belarusian letters і and ў are in the main Cyrillic block.

**What a Route Pack carries besides audio and photos**, for the reference Outing of §8.1:

| Part | Size |
|---|---|
| Map of the Outing's area, zoom 0–15 | 2.81 MB |
| Glyphs, three fonts, Latin, Cyrillic and punctuation | 1.38 MB |
| Graph of the same area: 13 190 nodes, 15 402 segments | 0.37 MB (0.18 MB compressed) |
| Matrix between all 709 routable Places of the area, dense *(by formula)* | 1.01 MB at most |
| **Together** | **about 5.6 MB of the 150 MB of `NFR-8`** |

---

## 8. Material for the checks

All three are proposals built from the data. A name marked `*` is the Wikidata label, because OpenStreetMap has none in that language.

### 8.1 Reference Outing for SC-1

Start and finish at the railway station (53.89056° N, 27.55118° E), on foot, the Wish "early 20th-century architecture, no museums". Ten Places were chosen from those near the station that OpenStreetMap dates between the 1890s and 1917 and that have a Wikidata item with at least one article; the Minsk Gate, which faces the station, is added as the eleventh. The order is the shortest closed walk on our graph, found exactly.

| # | Belarusian | Russian | English | Coordinates | Built, as OpenStreetMap dates it | Leg, m | Arrives, min | Wikidata | Articles, kB: be / be-tarask / ru / en | Sensitive (`KNW-14`) | OpenStreetMap |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Дом Полякаў* | Дом Поляков* | Poliakaŭ House* | 53.89448, 27.54134 | 1917 | 974 | 13 | Q29642243 | 11.1 / — / 6.2 / — | — | way/25435141 |
| 2 | Касцёл Святога Сымона і Святой Алены | Костёл Святого Симеона и Святой Елены | Church of Saints Simon and Helena | 53.89647, 27.54763 | 1910 | 537 | 28 | Q1742825 | 220.0 / 10.9 / 24.6 / 8.5 | religion | way/100418249 |
| 3 | Дом Абрампольскага* | Дом Абрампольского* | Abrampoĺski House* | 53.89653, 27.5486 | 1912 | 122 | 38 | Q15472005 | 13.4 / 12.9 / 7.2 / — | — | way/25387578 |
| 4 | Дом Уніхоўскага* | Дом Униховского* | Unichoŭski House* | 53.89669, 27.54915 | early 20th century | 155 | 48 | Q15472375 | 20.1 / 15.2 / 10.2 / — | — | way/35996170 |
| 5 | Тэатр імя Горкага | Театр имени М.Горького | National Academic Drama Theatre Maxim Gorky* | 53.89839, 27.55127 | early 20th century | 325 | 60 | Q4314968 | 14.9 / 10.2 / 25.9 / — | religion (a former synagogue) | way/25387470 |
| 6 | Дом Маліна | Дом Малина | Malin House* | 53.89766, 27.55157 | late 19th – early 20th century | 169 | 70 | Q13030665 | 15.8 / 15.5 / 13.4 / — | — | way/38809287 |
| 7 | Юбілейны Дом | Юбилейный Дом | Niezaliežnasci Avenue, 26* | 53.90284, 27.56463 | 1913 | 1144 | 94 | Q64518136 | 23.5 / — / 6.4 / — | — | way/25327580 |
| 8 | Нацыянальны акадэмічны тэатр імя Янкі Купалы | Национальный академический театр имени Янки Купалы | Yanka Kupala National Academic Theatre | 53.90091, 27.56275 | 1890 | 401 | 107 | Q1429567 | 50.7 / 38.9 / 40.0 / 8.0 | — | way/25327619 |
| 9 | Чырвоны дом | Красный дом | Karla Marksa Street 5, Minsk* | 53.89601, 27.55289 | early 20th century | 900 | 127 | Q64518139 | 9.9 / — / 4.9 / — | to check: the articles are about the house of the people's militia of 1917 | way/35996172 |
| 10 | Дом Кастравіцкай* | Дом Костровицкой* | Kastravickaja House* | 53.89491, 27.55424 | 1911 | 181 | 137 | Q13030666 | 10.2 / 8.4 / 9.3 / — | — | way/25434700 |
| 11 | Вароты Мінска | Ворота Минска | The Minsk Gate | 53.89189, 27.55178 | not dated in OpenStreetMap; tagged as Stalinist neoclassicism | 510 | 152 | Q17611440 | 9.2 / — / 5.3 / — | — | relation/9383682 |

- **Walking: 5 740 m**, 323 m of it from the last stop back to the station.
- **Time: 165 minutes** — 77 minutes of walking at 4.5 km/h and 8 minutes at each of the 11 stops. Both figures are assumptions: the specification names the paces and gives them no speed, and a visit duration is an attribute OpenStreetMap does not have. At 4 km/h the Outing takes 174 minutes, at 5 km/h 157.
- **Opening hours are known for none of the eleven**: all are seen from outside. Every stop has a photo in Wikidata; eight carry a heritage designation there.
- **Sources.** Belarusian for all eleven, Russian for all eleven, be-tarask for seven, English for two. Four have no name in OpenStreetMap at all and are known there only as buildings with a `wikidata` tag.
- **The articles are not always about the building as a sight.** The Russian article for the Jubilee House is titled "Здание церковно-археологического музея"; the articles for the "Red House" are about the house of the people's militia of 1917.
- The area of this Outing with a margin of 400 m is 2.3 by 2.2 km and holds 709 routable candidates.

### 8.2 Ten Places for the model comparison of ADR-0004

Four with Belarusian text only, three with Belarusian and Russian, three with English as well; five fall under a category of `KNW-14`.

| # | Belarusian | Russian | English | Source situation | be, kB | be-tarask, kB | ru, kB | en, kB | Sensitive (`KNW-14`) | Kind | Coordinates | Wikidata | OpenStreetMap |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Дом Яніцкага* | — | Janicki House* | Belarusian only | 17.8 | 14.1 | — | — | — | notable building | 53.89427, 27.54359 | Q29115754 | way/25435144 |
| 2 | Мінскі гарадавы | Минский городовой | — | Belarusian only | 18.7 | — | — | — | — | artwork | 53.89887, 27.55255 | Q55284820 | node/4711338416 |
| 3 | Беларусь партызанская | Беларусь партизанская | — | Belarusian only | 7.7 | — | — | — | war | monument | 53.86394, 27.66833 | Q55808423 | node/249843013 |
| 4 | Царква ў гонар абраза Божай Маці «Адшуканне загінулых» | Храм Иконы Божией Матери «Взыскание Погибших» | Church of the Theotokos Seeker of the Perishing in Minsk* | Belarusian only | 5.7 | — | — | — | religion | place of worship | 53.93274, 27.56704 | Q61217145 | way/25326432 |
| 5 | Вароты Мінска | Ворота Минска | The Minsk Gate | Belarusian and Russian | 9.2 | — | 5.3 | — | — | attraction | 53.89189, 27.55178 | Q17611440 | relation/9383682 |
| 6 | Дом Абрампольскага* | Дом Абрампольского* | Abrampoĺski House* | Belarusian and Russian | 13.4 | 12.9 | 7.2 | — | — | notable building | 53.89653, 27.5486 | Q15472005 | way/25387578 |
| 7 | Манумент Перамогі | Монумент Победы | Victory Monument | Belarusian and Russian | 19.7 | 10.7 | 12.2 | — | war | monument | 53.90867, 27.57509 | Q3831641 | way/346312697 |
| 8 | Касцёл Святога Сымона і Святой Алены | Костёл Святого Симеона и Святой Елены | Church of Saints Simon and Helena | English available | 220.0 | 10.9 | 24.6 | 8.5 | religion | place of worship | 53.89647, 27.54763 | Q1742825 | way/100418249 |
| 9 | Мемарыял «Яма» (абеліск) | Мемориал «Яма» (обелиск) | Memorial «Yama» («The Pit», obelisk) | English available | 10.9 | 8.6 | 7.2 | 3.2 | war (the Minsk ghetto) | memorial | 53.90971, 27.54283 | Q2024954 | node/255310414 |
| 10 | Нацыянальны акадэмічны тэатр імя Янкі Купалы | Национальный академический театр имени Янки Купалы | Yanka Kupala National Academic Theatre | English available | 50.7 | 38.9 | 40.0 | 8.0 | to check: recent events with living persons in the articles | theatre | 53.90091, 27.56275 | Q1429567 | way/25327619 |
| reserve | Турма КДБ | Тюрьма КГБ | Amierykanka* | English available | 13.3 | 10.7 | 8.3 | 7.7 | repression; living persons | notable building | 53.89879, 27.55346 | Q6538813 | way/25387513 |

- Number 1 has an article in be and in be-tarask; numbers 2–4 have one Belarusian article each. Numbers 2–4 have a Russian name in OpenStreetMap and no Russian article.
- Number 8 is the extreme of volume: 220 kB of Belarusian wikitext against 8.5 kB of English.
- The reserve covers the categories the ten do not: repression and living persons.
- Categories are marked from the subject of the Place. Whether an article touches living persons or contested history can only be seen by reading it, which is the Curator's step.

### 8.3 Names and phrases for the listening comparison of ADR-0014

Thirty lines: twenty-six in Russian and four in English. For each Russian name the lead sentence of its Russian Wikipedia article was read on 23 November 2026 and the stress mark copied from it; the spike asserts no stress of its own.

| # | Language | Text to synthesise | Stress in the lead of the Russian Wikipedia article | Why it is in the list |
|---|---|---|---|---|
| 1 | ru | Улица Немига | Неми́га («Немига») | three-syllable toponym; the Belarusian form is Няміга |
| 2 | ru | Река Свислочь | Сви́слочь («Свислочь (приток Березины)») | hydronym; nothing in the spelling shows the stress |
| 3 | ru | Троицкое предместье | Тро́ицкое («Троицкое предместье») | common name, baseline |
| 4 | ru | Раковское предместье | none given — a Curator sets it | adjective made from a place name |
| 5 | ru | Лошицкий парк | none given — a Curator sets it | toponym Лошица and its adjective |
| 6 | ru | Урочище Куропаты | Куропа́ты («Куропаты») | toponym; also a sensitive Place |
| 7 | ru | Комаровский рынок, или Комаровка | Комаро́вка («Комаровка (Минск)») | colloquial form next to the official one |
| 8 | ru | Микрорайон Уручье | Уру́чье («Уручье (Минск)») | toponym with a neuter ending |
| 9 | ru | Курасовщина | Курасо́вщина («Курасовщина») | four syllables, suffix -овщина |
| 10 | ru | Серебрянка | Серебря́нка («Серебрянка (Минск)») | coincides with a common noun |
| 11 | ru | Каменная Горка | Ка́менная («Каменная Горка (Минск)») | an ordinary adjective inside a name |
| 12 | ru | Зыбицкая улица | Зы́бицкая («Зыбицкая улица») | rare adjective |
| 13 | ru | Чижовка | Чижо́вка («Чижовка (Минск)») | short toponym in -овка |
| 14 | ru | Водохранилище Дрозды | none given — a Curator sets it | coincides with the plural of a common noun |
| 15 | ru | Грушевка | Гру́шевка («Грушевка (Минск)») | е or ё: the spelling does not say |
| 16 | ru | Шабаны | Шабаны́ («Шабаны (Минск)») | plural toponym |
| 17 | ru | Пищаловский замок | none given — a Curator sets it | adjective from a surname |
| 18 | ru | Остров Мужества и Скорби, который называют Островом слёз | none given — a Curator sets it | the letter ё and a genitive form |
| 19 | ru | Костёл Святого Симеона и Святой Елены, или Красный костёл | none given — a Curator sets it | костёл with ё; two saints' names |
| 20 | ru | Красный костёл основал Эдвард Войнилович. | none given — a Curator sets it | surname in -ович |
| 21 | ru | Театр имени Янки Купалы | Купа́ла («Янка Купала») | a name declined in the genitive |
| 22 | ru | Площадь Якуба Коласа | Яку́б («Якуб Колас») | a first name with two possible stresses |
| 23 | ru | Музей Максима Богдановича | Богдано́вич («Богданович, Максим Адамович») | surname in -ович |
| 24 | ru | Дом Ваньковичей | none given — a Curator sets it | surname in the genitive plural |
| 25 | ru | Дом Костровицкой построен в 1911 году, дом Абрампольского — в 1912-м. | none given — a Curator sets it | two rare surnames and two years to read out |
| 26 | ru | Пр-т Независимости, д. 26 — «Юбилейный дом», XX в. | not applicable | abbreviations, a house number and a Roman numeral: text normalisation |
| 27 | en | The Church of Saints Simon and Helena, known as the Red Church | not applicable | baseline English name |
| 28 | en | Niamiha Street and the Trinity Suburb, Trajeckaje pradmiescie | not applicable | Belarusian names inside an English sentence |
| 29 | en | Abrampoĺski House and Unichoŭski House | not applicable | English labels of Wikidata as they are, with the diacritics of Belarusian Latin |
| 30 | en | Lošyca Park, Kurasoŭščyna Park and Janka Kupala Street | not applicable | name:en values of OpenStreetMap and a Wikidata label as they are: š, č, ŭ and an initial J |

- **The lead of the Russian article gives the stress for 16 of the 25 names looked up.** It is a usable first filling of the pronunciation dictionary of `KNW-12`, and it leaves a third of even well-known names to the Curator.
- Line 26 tests the normalisation of text before synthesis; lines 27–30 test an English voice on Belarusian names, in spellings that OpenStreetMap and Wikidata actually hold.
- The list has no Belarusian lines: Narration is in Russian and English (`KNW-11`).

---

## 9. ADR assumption → measured value

| Record | Assumption or open figure | Measured | Verdict |
|---|---|---|---|
| 0008 | An extract of central Minsk at zoom 15 is 10–40 MB (research estimate) | 3.16 MB for 3 by 3 km; 18.91 MB for the whole city by its boundary | Three to twelve times smaller |
| 0008 | The published builds stop at zoom 15 and are kept for a week | Maximum zoom 15 in the archive header; builds of 17–23 November available on 23 November | Holds |
| 0008 | Cyrillic glyphs for Noto Sans exist, 125 KB for the main block | 125 320 bytes; Latin and Cyrillic 0.41 MB per font, 1.20 MB for three | Holds |
| 0008, `NFR-8` | A Route Pack of at most 150 MB holds the map of the Route's area | Map, glyphs, graph and matrix for the reference Outing: about 5.6 MB | Holds with room to spare |
| 0009 | Size of the pedestrian graph of Minsk — not verified | 393 145 nodes, 474 945 segments, 11.37 MB; 5.45 MB compressed | Small |
| 0009 | Size of a Route Pack cut — not verified | 0.59 MB for 3 by 3 km of the centre; 0.37 MB for the reference Outing | Small |
| 0009 | Time of a one-to-many search over the city in the API process — not verified | 74–86 ms (40 ms in one run) on a laptop; 3–5 ms with a 3 km cut-off | Far inside the 3 s of `NFR-4` |
| 0009 | Times between Places are stored as a sparse matrix | 4 041 Places at 3 km: 1.34 million pairs, 5.38 MB, 16.4 % of a dense matrix | Holds |
| 0009 | The graph in memory sets a floor on instance memory | About 48 MB over an empty Node.js process, 12.3 MB more per concurrent search | A low floor |
| 0009 | City data is built "for a whole region" | The city: 393 145 nodes. The whole Belarus extract: 5 701 274 nodes, 155 MB *(by formula)* | "Region" needs a definition — §10 |
| 0009 | The planner needs times between 30–150 candidates | 709 routable candidates in the area of one Outing; a median of 381 within 3 km of a Place | Holds only after a selection — §10 |
| 0010 | A city version holds Places, the graph, the matrix and the base map | Graph 11.4 MB, matrix 5.4 MB, map 18.9 MB: about 36 MB of files | Small against 10 GB |
| 0011 | Within 1.5 km of the centre Wikidata has 873 objects: be 510, ru 285, en 86 | 892: be 500 (505 with be-tarask), ru 284, en 86 | Confirmed |
| 0011 | Opening hours are filled in for 64 % of Minsk's museums | 48 of 75: 64.0 % | Confirmed |
| 0011, §10.4 | Cafés, bars and restaurants of Minsk and their share with hours — not measured | 1 955 objects; 1 335 with hours: 68.3 % | Measured |
| 0011 | Wikidata is the entity key that ties sources together | 17.3 % of routable candidates carry the key; 1 316 of 2 515 items in the city are linked from nothing | The key has to be made — §10 |
| 0011 | Memorial plaques are a kind of their own | 890 plaques against 417 other memorials | Necessary |
| 0011 | Request limits of the Wikimedia interfaces — not verified | A clean pass is 27 requests. A second pass within the hour drew two 429 answers, with waits of 10 and 49 seconds | A limit exists; its value was not measured |
| 0029 | How well the opening-hours syntax of Belarus resolves, with public-holiday rules — not verified | 2 034 of 2 043 values (99.6 %); all 27 values with a holiday rule | Resolves |
| 0029 | A city carries its calendar of public holidays as data | The parser uses its own table of nine holidays | A gap — §10 |
| 0029 | Hours are resolved into intervals for two weeks | 26 597 intervals for 2 034 Places: 106 kB | Small |
| 0004 | Most of what is written about Belarusian places is written in Belarusian | Of 654 linked items: be 69 %, ru 40 %, en 11 %; 30 % have Belarusian text only | Confirmed |
| 0014 | A list of 20–30 phrases with Minsk names is needed | 30 lines; a sourced stress mark for 16 of 25 names | Prepared |
| 0021 | DuckDB, chosen there for product events, can also build city data from an OpenStreetMap extract (a premise of this task, not of the record) | The whole cut, polygons included, in 11 s from a 353 MB file | Holds |
| 0003 | One language on the production path | The spike needed TypeScript, SQL and two shell wrappers | Holds |

---

## 10. What contradicts, or is missing from, a record

No measurement contradicts a decision. Five things that records assume or leave unsaid would mislead if built on as written. The records are not changed here.

1. **ADR-0011 — the Wikidata key exists for one Place in six.** The record makes Wikidata "the entity key that ties sources together" and does not say where the key comes from. In OpenStreetMap only 706 of 4 078 routable candidates carry it, 1 316 Wikidata items in the city — 445 with a heritage designation — are linked from no object, and some tags point at a subject or an organisation instead of the Place (§3.2, §5.3). Who creates the link, by what rule, and whether a Curator confirms it is not decided. Without that step Preparation reaches about 460 Places that have any article.
2. **ADR-0029 — the calendar "as data" and the parser's own calendar are two different things.** The standard parser reads public holidays from tables compiled into it and offers no way to pass a calendar in. Its table for Belarus has 1 January and not 2 January — a non-working holiday since 2020, not re-verified against the official list here — and it does not model the working days the government moves each year. Either the `PH` rules are expanded into dates from the city's calendar before parsing, or the city calendar of the record is not what decides. The parser also evaluates in the time zone of the process, so the build must run in the city's zone. Both are small; neither is in the record.
3. **ADR-0009 — "a whole region" is undefined, and the boundary is the wrong knife for a graph.** Cut by the administrative boundary, the graph loses the roads that join the two exclaves to the city: 32 routable Places there reach nothing. The graph has to be cut wider than the Places. If "region" means the country, the graph is 155 MB and a search over all of it would take about fourteen times longer, by proportion; per city it is 11 MB.
4. **ADR-0006 and ADR-0009 — "30–150 candidates" is the result of a selection that no record describes.** The neighbourhood of a Place holds hundreds of candidates, and the area of one three-hour Outing holds 709. Half of all routable candidates are artworks, a quarter of which have no name. ADR-0015 gives every Place a theme score, prepared or not, so the means exist; the rule that turns 709 into at most 150 — by score, by distance, or both — is written nowhere. The specification excludes plaques by default and is silent on unnamed artworks and murals.
5. **ADR-0011 and ADR-0014 — names in the listener's language are missing for most Places.** OpenStreetMap has an English name for 18.9 % of named routable Places and a Russian one for 93.2 %; a quarter of the English names are in Cyrillic or in Belarusian Latin with diacritics, and transliterations disagree (§3.1). ADR-0008 settles what the map shows (the local name). No record says how a Story in English or Russian names a Place that has only a Belarusian name, and the pronunciation dictionary has nothing to start from for it.

Three smaller observations for the specification, outside the records:

- **Unknown hours as a warning (`PLC-4`, `RTE-13`).** 96 % of routable candidates have no hours; most are buildings, monuments and parks that are seen from outside. Whether a Place is experienced outside or inside is in no source; until it is set, nearly every stop would carry the warning.
- **be-tarask.** The sources of ADR-0011 name "Wikipedia in Belarusian". There are two; the second adds one Place of coverage and 2.1 MB of text in another orthography. Whether it is read is undecided, and it would be a separate line in the model comparison.
- **The Botanical Garden example of §3.2** differs from the data in its hours and has no second ticket in the data (§3.4).

---

## 11. What could not be measured, and why

| Not measured | Why |
|---|---|
| Accuracy of walking times against real Outings (`NFR-3`) | Needs a person walking in Minsk; the developer works from Poland |
| Walking times against Valhalla on a sample (ADR-0009, point 7) | Valhalla was not installed: its image and its tile build were outside the downloads agreed for this spike |
| Search time and memory on a Cloud Run instance | Measured on a laptop only; a cloud instance would have needed a billing account |
| How a zoom-15 map looks when zoomed in further (ADR-0008) | Needs rendering on a device; it belongs to the device check of ADR-0005 |
| Whether the tagged opening hours are true | Only presence and syntax can be seen in the data; 27 % of values carry a check date |
| Museum hours on public holidays | No museum in Minsk has a holiday rule in OpenStreetMap; they resolve as ordinary days |
| Whether tagged entrances are public entrances, and which Territories are fenced | Not in the tags in a reliable form; needs a visit or a Curator |
| Visit duration, and whether a Place is experienced outside or inside | In no source; set by rule or by a Curator |
| Photo licences and authors (`KNW-17`) | Only the presence of an image in Wikidata was counted; Commons was not queried per file |
| Size of the Postgres database for Minsk (ADR-0010) | No Postgres was run; the spike's DuckDB file (153 MB with two million raw nodes) says nothing about it |
| The request limits of the Wikimedia interfaces themselves (ADR-0011) | Two 429 answers were met on a repeated pass; probing for the limit would mean abusing the service |
| Size of a path-geometry file for the contracted graph | Computed by formula from the number of removed points, not written |
| The model comparison and the listening comparison themselves | They need provider accounts and the owner's ears; this report supplies their material |
| Stress for nine of the 25 names | The lead of the Russian article gives none; no other source was consulted |
| Whether a model reads be-tarask sources as well as be | A question for the model comparison |
