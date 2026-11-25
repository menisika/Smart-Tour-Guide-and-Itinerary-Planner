# 08. Belarus: five kinds of Places, how fresh the data is, and how much changes a day

| | |
|---|---|
| **Date** | 24 November 2026 |
| **Purpose** | Numbers for keeping the base of Places of Belarus up to date automatically: how many Places of the owner's five kinds there are, how old the data is, how many changes arrive each day, and what a Place's own website can give |
| **Code** | [`spikes/minsk-city-data/`](../../spikes/minsk-city-data/README.md), steps 20–25; `npm run fetch-history` and `npm run belarus` reproduce every number below |
| **OpenStreetMap, state** | Geofabrik extract of Belarus `belarus-261122.osm.pbf`: replication sequence 4976, data up to 22 November 2026, 21:20 UTC |
| **OpenStreetMap, changes** | Geofabrik extract `belarus-261001.osm.pbf` (sequence 4925, 1 October 2026, 20:22 UTC) and the 52 daily diffs 4926–4977, 2 October to 23 November 2026 |
| **Websites of Places** | home pages fetched on 24 November 2026 from a network in Poland |

Terms with a capital letter are those of the [glossary](../../GLOSSARY.md). *Measured* means the spike computed it from the data named above; *by formula* means arithmetic on measured counts with stated assumptions; *my reading* means a judgement made by looking at a sample.

---

## 1. Summary

1. **44 641 objects of the five kinds in Belarus** *(measured)*: sights 26 879, eating and drinking 8 260, parks and nature 4 360, lodging 4 025, entertainment 1 117. Minsk holds 7 012 of them, the five other regional centres 5 384, the rest of the country 32 245 — 72 %.
2. **Outside the six cities the base is thin.** Opening hours are filled in for 70 % of eating places in Minsk and 40 % in the rest of the country; a website for 34 % and 11 %; a check date for 25 % and 5 %.
3. **Every object carries a version and a timestamp, and the timestamp is not a check.** The median age of the last edit is 2.0 years, but 21 % of all objects were last touched in one month, November 2024, by a mass edit. A quarter of the objects have never been edited since they were created.
4. **A person's check is recorded for 3.9 % of objects** (1 728 with a check date), at a median age of 1.4 years.
5. **About 17 changes a day touch the five kinds** *(measured over the last 30 days)*: 499 changes — 194 created, 47 deleted, 258 modified. The median day has 16, the worst day 33. Over all 52 days read the median is 18 and the worst day 66.
6. **A Curator would be shown about 78 changes a week** — those that create or remove a Place or change its name, hours, position, kind, lifecycle or contacts. For Places that can be stops of a Route it is 53 a week; for those of them that have a name, 36; for those with a Wikidata link, 2.
7. **Opening hours are almost never edited.** Eight changes of opening hours in 30 days, against 4 615 eating places that have hours: at this rate a value is revisited once in 47 years *(by formula)*. OpenStreetMap will not keep hours fresh by itself.
8. **A daily diff is small and cheap.** Median 420 kB compressed, 11 468 objects, of which 0.14 % touch the five kinds; reading and applying one takes 49 ms. Applying 51 diffs to the October state reproduces the November extract exactly: 44 641 objects, none missing, none extra.
9. **One Place in ten has a website tag, and seven in ten of the sites answer.** 4 470 objects carry one; 10.5 % of the tags point at a social network or an aggregator. Of 171 distinct sites fetched, 122 answered with a page, 19 no longer exist as hosts, and 30 failed otherwise.
10. **A site rarely states its hours for a machine and often for a person.** Of the 122 pages, 11 carry schema.org markup of a local-business type and 7 of those give opening hours; 52 show hours in their text. The median page is 3 641 characters of text.
11. **The base and its history are small** *(by formula)*: 386 000 rows and 73 MB for the Places of the five kinds; a change history adds about 24 000 rows and 4 MB a year at the measured rate.

---

## 2. Method

**The five groups** are rules over OpenStreetMap tags; the first rule that matches decides. They are in [`src/focus.ts`](../../spikes/minsk-city-data/src/focus.ts) and are applied by the same code to the extract and to the diffs.

| Group | Tags, in the order they are tried | Left out on purpose |
|---|---|---|
| **Lodging** | `tourism` = hotel, hostel, guest_house, motel, apartment, chalet, camp_site, caravan_site, wilderness_hut, alpine_hut, cabin, glamping, resort, holiday_village; `leisure=resort` | `amenity=sanatorium` (112 objects in the country) |
| **Eating and drinking** | `amenity` = cafe, restaurant, bar, pub, fast_food, food_court, ice_cream, biergarten | — |
| **Entertainment** | `amenity` = cinema, theatre, nightclub, arts_centre, planetarium, casino, karaoke_box, concert_hall; `leisure` = bowling_alley, amusement_arcade, water_park, escape_game, trampoline_park, miniature_golf, indoor_play; `tourism` = zoo, theme_park, aquarium | `amenity=community_centre` (1 197), `leisure` = sauna (514), dance (103), ice_rink (76), adult_gaming_centre (48) |
| **Sights** | `tourism` = attraction, museum, gallery, artwork; `amenity` = place_of_worship, fountain; any `historic=*` except no, district, road, railway; a building with a `wikidata` or `heritage` tag | memorial plaques: 1 550, a kind of their own (`PLC-5`), counted apart |
| **Parks and nature** | `tourism=viewpoint`; `leisure` = park, nature_reserve, beach_resort; `leisure=garden` when named or botanical; `boundary` = protected_area, national_park; `natural=beach` | `tourism=picnic_site` (1 324); lakes and rivers |

An object is a node, a way, or a relation of type multipolygon or boundary. Lodging is tried before eating, so a hotel that also carries `amenity=restaurant` is lodging. Markets (445) are in none of the five.

**Where an object is.** Its own position for a node, its first node for a way, the first node of its first way for a relation; ten objects have no usable position and count as "the rest". "Minsk" and "regional centres" are the administrative boundaries of the six cities as OpenStreetMap draws them: Minsk 353 km², Brest 146, Gomel 145, Grodno 142, Vitebsk 135, Mogilev 116.

**Versions and timestamps.** DuckDB's reader of `.osm.pbf` does not return them, so the spike has its own small reader of the format ([`src/pbf.ts`](../../spikes/minsk-city-data/src/pbf.ts)); it goes through the whole extract — 42.4 million nodes, 5.6 million ways, 107 539 relations — in 6 to 36 seconds depending on what else the machine does.

**Changes.** A daily diff holds the new state of every changed object and nothing of the old one. So the state of the five groups was taken from the extract of 1 October, and the diffs were applied to it one by one; for every change the state before it is then known. The check: after diff 4976 the state must equal the extract of 22 November. It does — 44 641 objects in both, none missing, none extra, none in another group.

**Websites.** One request for `robots.txt` and one for the page named in the tag, a time limit of 15 seconds, at most 2 MB read, the client name `minsk-city-data-spike/0.1`, no cookies. Answers are kept in the spike's web cache; a second run sends nothing. 322 requests were made.

---

## 3. Counts

### 3.1 The five groups in three areas *(measured)*

| Group | Area | Objects | Named | Opening hours | Website | Phone | Check date | Wikidata link |
|---|---|---|---|---|---|---|---|---|
| **Sights** | Minsk | 3 578 | 70.8 % | 3.0 % | 5.3 % | 3.3 % | 1.1 % | 16.4 % |
| | Regional centres | 2 601 | 64.4 % | 3.9 % | 6.6 % | 3.3 % | 1.3 % | 21.5 % |
| | Rest | 20 700 | 68.7 % | 1.5 % | 5.3 % | 1.4 % | 1.4 % | 8.0 % |
| | **Belarus** | **26 879** | 18 431 (68.6 %) | 515 (1.9 %) | 1 465 (5.5 %) | 490 (1.8 %) | 363 (1.4 %) | 2 803 (10.4 %) |
| **Eating and drinking** | Minsk | 2 688 | 94.3 % | 70.3 % | 33.7 % | 42.1 % | 24.7 % | 0.0 % |
| | Regional centres | 1 896 | 92.4 % | 65.7 % | 22.0 % | 29.7 % | 18.0 % | 0.1 % |
| | Rest | 3 676 | 83.1 % | 40.2 % | 11.3 % | 21.9 % | 5.4 % | 0.1 % |
| | **Belarus** | **8 260** | 7 341 (88.9 %) | 4 615 (55.9 %) | 1 741 (21.1 %) | 2 501 (30.3 %) | 1 204 (14.6 %) | 5 (0.1 %) |
| **Lodging** | Minsk | 153 | 84.3 % | 29.4 % | 45.1 % | 39.2 % | 11.8 % | 7.8 % |
| | Regional centres | 203 | 87.7 % | 19.2 % | 40.4 % | 43.8 % | 2.0 % | 4.4 % |
| | Rest | 3 669 | 71.7 % | 5.0 % | 20.3 % | 27.1 % | 1.5 % | 0.5 % |
| | **Belarus** | **4 025** | 2 937 (73.0 %) | 266 (6.6 %) | 894 (22.2 %) | 1 144 (28.4 %) | 77 (1.9 %) | 38 (0.9 %) |
| **Parks and nature** | Minsk | 363 | 47.9 % | 3.6 % | 2.5 % | 2.2 % | 0.6 % | 21.8 % |
| | Regional centres | 469 | 32.4 % | 1.9 % | 1.1 % | 0.4 % | 0.2 % | 6.8 % |
| | Rest | 3 528 | 31.8 % | 0.9 % | 2.1 % | 0.5 % | 0.0 % | 2.7 % |
| | **Belarus** | **4 360** | 1 447 (33.2 %) | 55 (1.3 %) | 87 (2.0 %) | 26 (0.6 %) | 4 (0.1 %) | 206 (4.7 %) |
| **Entertainment** | Minsk | 230 | 97.0 % | 42.6 % | 50.4 % | 48.3 % | 16.1 % | 14.8 % |
| | Regional centres | 215 | 96.3 % | 46.0 % | 33.0 % | 33.0 % | 15.3 % | 14.0 % |
| | Rest | 672 | 81.1 % | 16.2 % | 14.3 % | 14.1 % | 1.5 % | 3.0 % |
| | **Belarus** | **1 117** | 975 (87.3 %) | 306 (27.4 %) | 283 (25.3 %) | 277 (24.8 %) | 80 (7.2 %) | 84 (7.5 %) |
| **All five** | Minsk | 7 012 | 79.8 % | 30.7 % | 18.4 % | 20.4 % | 10.8 % | 10.2 % |
| | Regional centres | 5 384 | 73.6 % | 27.8 % | 13.9 % | 15.1 % | 7.7 % | 11.7 % |
| | Rest | 32 245 | 66.9 % | 6.5 % | 7.5 % | 6.8 % | 1.7 % | 5.6 % |
| | **Belarus** | **44 641** | 31 131 (69.7 %) | 5 757 (12.9 %) | 4 470 (10.0 %) | 4 438 (9.9 %) | 1 728 (3.9 %) | 3 136 (7.0 %) |

"Website" is any of `website`, `contact:website`, `url`; "phone" is `phone`, `contact:phone` or `contact:mobile`; "check date" is any `check_date*` tag or `survey:date`. Of the 44 641 objects 30 121 are nodes, 13 831 ways and 689 relations.

- **Lodging is a matter of the countryside.** 3 669 of 4 025 lodging objects are outside the six cities; a fifth of those have a website and one in twenty has hours.
- **Sights are two thirds of everything**, and outside the cities they are mostly memorials, attractions and churches with no hours, no site and no Wikidata link (8 %).
- **Entertainment is small**: 1 117 objects, 445 of them in the six cities.

### 3.2 What each group is made of *(measured)*

| Group | Tag | Objects |
|---|---|---|
| Sights | `tourism=attraction` | 5 981 |
| | `historic=memorial`, not a plaque | 5 668 |
| | `tourism=artwork` | 4 652 |
| | other `historic=*` | 4 651 |
| | `amenity=place_of_worship` | 2 525 |
| | building with `wikidata` or `heritage` | 1 465 |
| | `amenity=fountain` | 812 |
| | `tourism=museum` | 689 |
| | `historic=monument` | 407 |
| | `tourism=gallery` | 29 |
| Eating and drinking | `amenity=cafe` | 4 236 |
| | `amenity=fast_food` | 2 159 |
| | `amenity=restaurant` | 929 |
| | `amenity=bar` | 694 |
| | `amenity=pub` | 162 |
| | biergarten, ice_cream, food_court | 80 |
| Lodging | `tourism=guest_house` | 1 152 |
| | `tourism=camp_site` | 896 |
| | `tourism=hotel` | 791 |
| | `leisure=resort` | 438 |
| | `tourism=chalet` | 248 |
| | `tourism=motel` | 171 |
| | `tourism=apartment` | 147 |
| | `tourism=hostel` | 93 |
| | wilderness_hut, caravan_site, resort, cabin, glamping, holiday_village, alpine_hut | 89 |
| Parks and nature | `leisure=park` | 1 889 |
| | `tourism=viewpoint` | 980 |
| | `natural=beach` | 829 |
| | `leisure=nature_reserve` | 233 |
| | `boundary=protected_area` | 168 |
| | `boundary=national_park` | 108 |
| | named or botanical garden | 84 |
| | `leisure=beach_resort` | 69 |
| Entertainment | `amenity=arts_centre` | 322 |
| | `amenity=cinema` | 184 |
| | `amenity=nightclub` | 128 |
| | `amenity=theatre` | 115 |
| | `amenity=casino` | 100 |
| | `tourism=theme_park` | 81 |
| | `tourism=zoo` | 62 |
| | `leisure=amusement_arcade` | 42 |
| | `leisure=escape_game` | 34 |
| | water_park, bowling_alley, karaoke_box, indoor_play, trampoline_park, aquarium, miniature_golf, planetarium | 49 |

---

## 4. Freshness that the data shows

### 4.1 Version and timestamp *(measured)*

The extract carries a version number and the time of the last edit for every object: 48 084 363 of 48 084 363. Its header carries the replication sequence and time, which is what lets diffs be applied to it.

Age of the last edit on 22 November 2026, in years:

| Set | Objects | 10 % | 25 % | Median | 75 % | 90 % | Edited in the last 30 days | Edited in the last year | Untouched for 5 years |
|---|---|---|---|---|---|---|---|---|---|
| Sights | 26 879 | 0.6 | 1.5 | 2.0 | 3.8 | 5.2 | 267 (1.0 %) | 4 485 (16.7 %) | 2 789 (10.4 %) |
| Eating and drinking | 8 260 | 0.5 | 1.1 | 1.8 | 2.9 | 5.6 | 98 (1.2 %) | 1 738 (21.0 %) | 948 (11.5 %) |
| Lodging | 4 025 | 0.7 | 1.8 | 2.0 | 2.6 | 5.1 | 25 (0.6 %) | 523 (13.0 %) | 454 (11.3 %) |
| Parks and nature | 4 360 | 1.0 | 1.7 | 3.8 | 7.8 | 12.4 | 36 (0.8 %) | 462 (10.6 %) | 1 706 (39.1 %) |
| Entertainment | 1 117 | 0.8 | 1.8 | 2.0 | 2.0 | 4.8 | 11 (1.0 %) | 140 (12.5 %) | 110 (9.8 %) |
| **All five** | **44 641** | 0.6 | 1.5 | **2.0** | 3.9 | 6.5 | 437 (1.0 %) | 7 348 (16.5 %) | 6 007 (13.5 %) |
| All five, Minsk | 7 012 | 0.4 | 1.1 | 2.0 | 2.6 | 4.0 | 118 (1.7 %) | 1 567 (22.3 %) | 488 (7.0 %) |
| All five, regional centres | 5 384 | 0.5 | 1.5 | 2.0 | 3.4 | 6.1 | 57 (1.1 %) | 810 (15.0 %) | 643 (11.9 %) |
| All five, rest | 32 245 | 0.7 | 1.6 | 2.0 | 4.0 | 6.9 | 262 (0.8 %) | 4 971 (15.4 %) | 4 876 (15.1 %) |
| Eating and drinking, with opening hours | 4 615 | 0.4 | 0.8 | 1.8 | 2.2 | 4.0 | 60 (1.3 %) | 1 316 (28.5 %) | 227 (4.9 %) |
| Lodging, with opening hours | 266 | 0.4 | 1.3 | 2.0 | 2.0 | 4.0 | 5 (1.9 %) | 48 (18.0 %) | 4 (1.5 %) |
| Entertainment, with opening hours | 306 | 0.5 | 1.4 | 2.0 | 2.0 | 2.7 | 6 (2.0 %) | 59 (19.3 %) | 8 (2.6 %) |
| Sights, with opening hours | 515 | 0.4 | 1.0 | 2.0 | 2.0 | 2.0 | 11 (2.1 %) | 127 (24.7 %) | 1 (0.2 %) |
| **All five, with opening hours** | **5 757** | 0.4 | 0.9 | **1.8** | 2.0 | 3.7 | 84 (1.5 %) | 1 560 (27.1 %) | 247 (4.3 %) |
| All five, with a website | 4 470 | 0.4 | 1.0 | 1.8 | 2.0 | 2.6 | 58 (1.3 %) | 1 111 (24.9 %) | 61 (1.4 %) |

- **The median of exactly two years is an artefact.** 9 329 objects, 20.9 % of all, were last edited in November 2024; no other month holds more than 5.5 %. One mass edit touched a fifth of the base and reset its clock. The time of the last edit therefore says when an object was last written, not when anybody last saw the Place.
- **A quarter were never edited after creation**: 11 031 objects are at version 1. The median object is at version 4, one in ten at version 11 or more.
- **Objects that carry opening hours are only slightly fresher** than the rest: 27 % edited within a year against 16.5 %.

### 4.2 Check dates *(measured)*

A check date is the one tag that records a person's visit. 1 728 objects have one, 3.9 %.

| Group | With a check date | Median age, years | Quartiles | Within a year | Older than 3 years |
|---|---|---|---|---|---|
| Eating and drinking | 1 204 | 1.2 | 0.6–2.5 | 406 | 222 |
| Sights | 361 | 2.4 | 1.0–3.5 | 86 | 118 |
| Entertainment | 80 | 2.5 | 1.1–3.1 | 19 | 22 |
| Lodging | 77 | 1.3 | 1.1–1.6 | 13 | 6 |
| Parks and nature | 4 | 1.6 | 1.2–5.1 | 0 | 1 |
| **All five** | **1 726** with a full date | **1.4** | 0.7–2.8 | 524 | 369 |

524 objects — 1.2 % of the base — were checked by a person within the last year, as far as the data says.

### 4.3 Closed Places *(measured)*

| Signal | Objects |
|---|---|
| A lifecycle prefix on the kind tag (`disused:amenity=cafe` and the like) | 352 |
| of them `was:` | 180: eating 91, sights 57, entertainment 19, lodging 12, nature 1 |
| of them `disused:` | 160: eating 143, entertainment 10, lodging 5, sights 2 |
| of them `abandoned:` | 11 |
| of them `demolished:` | 1 |
| `opening_hours` = "closed" or "off" on an object of the five groups | 4 |

Two thirds of the prefixed objects (236) are former eating places. `razed:`, `removed:` and `destroyed:` do not occur on these kinds. An object with a prefix is no longer in its group; it is the trace a closed Place leaves when a mapper marks it instead of deleting it.

---

## 5. Change rate

### 5.1 What Geofabrik publishes *(measured)*

- **Daily diffs:** 131 are published, from 16 July to 23 November 2026, one a day, each with a state file that gives its sequence number and time.
- **Dated extracts:** about the last twelve days, the first day of each of the last three months, and 1 January of every year since 2014. The oldest extract that lets 30 days be replayed is that of 1 October, so 52 diffs were read: 2 October to 23 November.
- **A diff carries no author.** The public diffs have no user names and no changeset numbers, so edits by people cannot be told from edits by scripts.

| A daily diff | |
|---|---|
| Size, compressed | median 420 kB; 230 to 788 kB |
| Size as XML | median 4.0 MB |
| Objects in it | median 11 468; at most 42 030 |
| Share of those objects that touch the five groups | 0.14 % |
| Time to read and apply one in Node.js | median 49 ms; at most 133 ms |
| Time to load the starting state of the five groups from an extract | 5.7 s |

### 5.2 The last 30 days, 25 October to 23 November *(measured)*

Each cell: total / median day / worst day.

| Set | Created | Deleted | Modified | All changes | A week: median / worst |
|---|---|---|---|---|---|
| Sights | 119 / 3 / 19 | 21 / 0 / 3 | 158 / 5 / 13 | 298 / 8 / 26 | 67 / 91 |
| Eating and drinking | 44 / 1 / 6 | 11 / 0 / 2 | 56 / 1 / 7 | 111 / 3 / 10 | 26 / 37 |
| Lodging | 10 / 0 / 3 | 5 / 0 / 1 | 15 / 0 / 2 | 30 / 0 / 4 | 8 / 11 |
| Parks and nature | 14 / 0 / 3 | 9 / 0 / 2 | 25 / 0 / 4 | 48 / 2 / 4 | 12 / 19 |
| Entertainment | 7 / 0 / 1 | 1 / 0 / 1 | 4 / 0 / 1 | 12 / 0 / 2 | 3 / 5 |
| **All five groups** | **194 / 5 / 21** | **47 / 1 / 4** | **258 / 8 / 17** | **499 / 16 / 33** | **119 / 145** |
| Can be stops of a Route: sights, nature, entertainment | 140 / 4 / 19 | 31 / 1 / 4 | 187 / 6 / 14 | 358 / 11 / 27 | 86 / 110 |
| The same, with a name | 82 / 2 / 12 | 18 / 0 / 3 | 143 / 5 / 13 | 243 / 8 / 18 | 58 / 65 |
| The same, with a Wikidata link | 5 / 0 / 4 | 1 / 0 / 1 | 42 / 1 / 5 | 48 / 1 / 10 | 9 / 16 |
| Eating, drinking and lodging | 54 / 1 / 7 | 16 / 0 / 2 | 71 / 2 / 9 | 141 / 4 / 13 | 33 / 47 |

"Created" is 163 new objects and 31 existing objects that received a kind tag. "Deleted" is 34 objects removed and 13 that left their group: nine lost or changed the kind tag, three got a lifecycle prefix, one became a memorial plaque.

Over all 52 days: 1 045 changes — 324 created, 92 deleted, 629 modified; median day 18, nine days in ten at most 33, worst day 66; median week 128, worst week 211. The worst day, 10 October, brought 42 new objects, 40 of them sights: somebody mapped a batch.

### 5.3 What changed in the modified objects *(measured, last 30 days)*

An object can count in several columns.

| Set | Modified | `name` | Other name tags | Opening hours | Position over 20 m | Kind | Lifecycle prefix | Contact | Other tags | No tag changed | Only other tags or nothing |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Sights | 158 | 28 | 30 | 0 | 9 | 4 | 1 | 7 | 79 | 46 | 114 |
| Eating and drinking | 56 | 9 | 5 | **8** | 2 | 3 | 0 | 6 | 33 | 15 | 33 |
| Lodging | 15 | 5 | 2 | 0 | 3 | 0 | 0 | 2 | 4 | 5 | 6 |
| Parks and nature | 25 | 6 | 7 | 0 | 0 | 0 | 0 | 0 | 4 | 14 | 19 |
| Entertainment | 4 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 3 |
| **All five groups** | **258** | 49 | 44 | 8 | 14 | 7 | 1 | 15 | 122 | 81 | **175** |
| Can be stops of a Route | 187 | 35 | 37 | 0 | 9 | 4 | 1 | 7 | 85 | 61 | 136 |
| The same, with a name | 143 | 34 | 36 | 0 | 9 | 4 | 1 | 7 | 64 | 38 | 93 |
| The same, with a Wikidata link | 42 | 2 | 12 | 0 | 2 | 1 | 0 | 6 | 26 | 8 | 33 |

- **Two modifications in three change nothing a person would notice**: 175 of 258 touch only tags outside this list, or no tag at all — the shape of a way was redrawn.
- **Opening hours changed eight times in 30 days**, all on eating places. 4 615 eating places carry hours; at eight a month a value is rewritten once in 47 years *(by formula)*.
- **A position moved by more than 20 m 14 times.** Only nodes are compared; an area whose outline moves shows up as "no tag changed".
- A modified object differs from its earlier state in 1.6 tags on average.

### 5.4 What a Curator would be shown *(measured, last 30 days)*

A *material* change creates or removes a Place, or changes its name, opening hours, position, kind, lifecycle prefix or contacts.

| Set | All changes | Material | Median day | Median week | Worst week | Distinct objects |
|---|---|---|---|---|---|---|
| Sights | 298 | 184 | 4 | 45 | 54 | 184 |
| Eating and drinking | 111 | 78 | 2 | 18 | 28 | 77 |
| Lodging | 30 | 24 | 0 | 5 | 8 | 24 |
| Parks and nature | 48 | 29 | 1 | 6 | 13 | 25 |
| Entertainment | 12 | 9 | 0 | 2 | 4 | 9 |
| **All five groups** | **499** | **324** | **10** | **78** | **87** | 319 |
| **Can be stops of a Route** | 358 | 222 | 6 | **53** | 66 | 218 |
| The same, with a name | 243 | 150 | 5 | **36** | 44 | 149 |
| The same, with a Wikidata link | 48 | 15 | 0 | **2** | 7 | 15 |
| Eating, drinking and lodging | 141 | 102 | 3 | 23 | 35 | 101 |

The spread between the rows is the choice the queue has to make. Everything of the five kinds is 78 proposals a week; Places that could be stops of a Route are 53; those of them with a name, 36; those that have a Wikidata item and so can have a Story, 2.

### 5.5 Day by day *(measured)*

| Day | Diff, kB | Objects in the diff | Created | Deleted | Modified | Sights | Eating | Lodging | Nature | Entertainment | Material |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25 Oct | 291 | 7 299 | 11 | 2 | 13 | 11 | 10 | 2 | 3 | 0 | 16 |
| 26 Oct | 491 | 8 424 | 2 | 0 | 2 | 1 | 2 | 1 | 0 | 0 | 3 |
| 27 Oct | 448 | 11 735 | 18 | 1 | 8 | 22 | 2 | 1 | 2 | 0 | 23 |
| 28 Oct | 230 | 5 501 | 1 | 2 | 5 | 5 | 1 | 0 | 1 | 1 | 5 |
| 29 Oct | 272 | 4 246 | 6 | 0 | 7 | 9 | 2 | 0 | 1 | 1 | 10 |
| 30 Oct | 274 | 6 435 | 2 | 1 | 14 | 8 | 6 | 0 | 3 | 0 | 6 |
| 31 Oct | 357 | 10 459 | 21 | 0 | 12 | 26 | 6 | 0 | 0 | 1 | 22 |
| 1 Nov | 496 | 17 007 | 3 | 4 | 7 | 7 | 1 | 2 | 4 | 0 | 9 |
| 2 Nov | 360 | 6 744 | 2 | 2 | 12 | 10 | 3 | 0 | 3 | 0 | 4 |
| 3 Nov | 643 | 32 089 | 14 | 1 | 17 | 18 | 8 | 2 | 3 | 1 | 20 |
| 4 Nov | 347 | 9 945 | 5 | 4 | 8 | 13 | 2 | 0 | 2 | 0 | 15 |
| 5 Nov | 388 | 9 452 | 3 | 0 | 13 | 7 | 1 | 4 | 4 | 0 | 9 |
| 6 Nov | 496 | 19 169 | 1 | 3 | 2 | 4 | 2 | 0 | 0 | 0 | 6 |
| 7 Nov | 388 | 11 468 | 6 | 3 | 9 | 8 | 5 | 3 | 0 | 2 | 12 |
| 8 Nov | 365 | 5 619 | 12 | 1 | 2 | 12 | 3 | 0 | 0 | 0 | 15 |
| 9 Nov | 517 | 9 926 | 6 | 3 | 10 | 10 | 4 | 0 | 4 | 1 | 10 |
| 10 Nov | 417 | 7 404 | 6 | 2 | 2 | 8 | 0 | 0 | 1 | 1 | 8 |
| 11 Nov | 327 | 10 759 | 8 | 3 | 12 | 14 | 4 | 1 | 3 | 1 | 16 |
| 12 Nov | 347 | 10 209 | 2 | 3 | 8 | 6 | 5 | 2 | 0 | 0 | 6 |
| 13 Nov | 316 | 14 038 | 1 | 1 | 5 | 3 | 0 | 4 | 0 | 0 | 6 |
| 14 Nov | 786 | 42 030 | 18 | 1 | 14 | 20 | 9 | 1 | 3 | 0 | 22 |
| 15 Nov | 405 | 5 387 | 7 | 2 | 9 | 8 | 7 | 0 | 3 | 0 | 10 |
| 16 Nov | 420 | 10 364 | 5 | 2 | 5 | 6 | 2 | 2 | 1 | 1 | 10 |
| 17 Nov | 345 | 7 206 | 9 | 3 | 9 | 9 | 10 | 0 | 1 | 1 | 16 |
| 18 Nov | 464 | 18 116 | 1 | 0 | 4 | 3 | 0 | 0 | 2 | 0 | 2 |
| 19 Nov | 553 | 18 406 | 4 | 1 | 5 | 7 | 1 | 0 | 2 | 0 | 6 |
| 20 Nov | 635 | 28 932 | 1 | 1 | 7 | 6 | 3 | 0 | 0 | 0 | 2 |
| 21 Nov | 360 | 15 270 | 4 | 0 | 4 | 6 | 2 | 0 | 0 | 0 | 5 |
| 22 Nov | 262 | 4 617 | 10 | 1 | 17 | 14 | 9 | 4 | 0 | 1 | 16 |
| 23 Nov | 374 | 14 114 | 5 | 0 | 16 | 17 | 1 | 1 | 2 | 0 | 14 |

A large diff is not a busy day for Places: 14 November has 42 030 objects in the diff and 33 changes to the five groups; 20 November has 28 932 and 9.

---

## 6. A Place's own website as a source

### 6.1 What the website tags point at *(measured, every tag)*

| Group | With a website tag | Own site | Social network | Aggregator |
|---|---|---|---|---|
| Sights | 1 465 | 1 418 (96.8 %) | 38 (2.6 %) | 9 (0.6 %) |
| Eating and drinking | 1 741 | 1 471 (84.5 %) | 230 (13.2 %) | 40 (2.3 %) |
| Lodging | 894 | 762 (85.2 %) | 108 (12.1 %) | 24 (2.7 %) |
| Parks and nature | 87 | 86 (98.9 %) | 1 (1.1 %) | 0 |
| Entertainment | 283 | 262 (92.6 %) | 19 (6.7 %) | 2 (0.7 %) |
| **All five** | **4 470** | **3 999 (89.5 %)** | **396 (8.9 %)** | **75 (1.7 %)** |

- Social networks are Instagram (239 tags), VK (101), Facebook, Telegram and the like; aggregators are booking, listing and map services. They were not fetched.
- **"Own site" is often not the Place's own.** The 3 999 tags point at 1 880 distinct hosts. 99 hosts are used by five or more objects and carry 1 951 of the tags, half of them: chains (a coffee chain on 115 objects, a fast-food chain on 90) and sites that describe many Places (one on 141 objects, a register of war memorials on 127, a site about the Grodno region on 88, the nature ministry on 76, the Catholic Church on 71). 1 468 hosts belong to a single object.

### 6.2 The sample *(measured)*

200 objects with a website tag, drawn at random with a fixed seed: eating and drinking 60, lodging 50, sights 45, entertainment 30, parks and nature 15. An own site already drawn was not drawn again, so the 171 fetched are 171 different sites.

| Outcome | Objects | Share of the 200 |
|---|---|---|
| **Reachable: a page came back** | **122** | **61.0 %** |
| Social network (not fetched) | 26 | 13.0 % |
| Aggregator (not fetched) | 3 | 1.5 % |
| Redirects to a social network or an aggregator | 1 | 0.5 % |
| No such host | 19 | 9.5 % |
| Connection failed or timed out | 10 | 5.0 % |
| Certificate error | 5 | 2.5 % |
| HTTP 404 | 9 | 4.5 % |
| HTTP 403 | 3 | 1.5 % |
| HTTP 503 | 1 | 0.5 % |
| Disallowed by `robots.txt` | 1 | 0.5 % |
| Parked or for sale, by a text pattern | 0 | 0 % |

**Of the 171 sites fetched, 122 answered: 71 %.** One site in nine no longer exists as a host. Five of the 122 pages have fewer than 300 characters of text: scripts only, or nothing. The three 403 answers are two food chains and one lodging site; they may refuse a client with a generic name and serve a browser.

| Group | Sampled | Social network or aggregator | Fetched | Reachable | Any JSON-LD | JSON-LD of a local-business type | of those with opening hours | Hours visible in the text | Text, characters: median | quartiles |
|---|---|---|---|---|---|---|---|---|---|---|
| Sights | 45 | 3 | 42 | 35 | 5 | 2 | 2 | 10 | 3 361 | 1 422–8 240 |
| Eating and drinking | 60 | 12 | 48 | 35 | 16 | 7 | 5 | 15 | 3 604 | 2 765–9 644 |
| Lodging | 50 | 11 | 39 | 24 | 9 | 1 | 0 | 11 | 6 924 | 2 420–8 644 |
| Parks and nature | 15 | 0 | 15 | 10 | 3 | 0 | 0 | 5 | 4 075 | 1 224–5 656 |
| Entertainment | 30 | 3 | 27 | 18 | 7 | 1 | 0 | 11 | 2 874 | 1 843–3 943 |
| **All** | **200** | **29** | **171** | **122** | **40** | **11 (9.0 %)** | **7** | **52 (42.6 %)** | **3 641** | 1 955–8 157 |

- **Markup.** 40 of the 122 pages carry JSON-LD of some kind — mostly `Organization`, `WebSite` and breadcrumbs. 11 carry a type that describes a place people visit (`Restaurant`, `FoodEstablishment`, `Hotel`, `Museum`, `BarOrPub`, `CafeOrCoffeeShop`, `LocalBusiness`, `Store`), and 7 of those give opening hours. With microdata counted as well, 8 pages state hours in markup: 6.6 %.
- **Visible hours.** The pattern is a time range — `10:00–22:00`, `с 10.00 до 19.00` — within eighty characters of a word about working time (режим работы, время работы, часы работы, ежедневно, без выходных, пн…вс, рэжым працы, opening hours, daily and the like), or the words "round the clock". It matched 52 pages: 44 by a time range, 8 by "round the clock" alone. *My reading* of 28 of the matches: 24 are the Place's opening hours; 4 are something else — a telephone line that answers round the clock, breakfast times, quiet hours of a hotel.
- **Size.** The median page is 3 641 characters of text and 86 kB of HTML; the largest is 807 642 characters. All 1 880 hosts at the median and at 71 % reachable would be about 4.9 million characters *(by formula)*.
- Only the page in the tag was read. Hours that a site keeps on a "contacts" page are not in these numbers.

---

## 7. Size *(by formula)*

The assumptions per row are those of [report 07, §10.3](07-minsk-more-sources.md#103-rows-and-megabytes-in-postgres-by-formula): a row costs 28 bytes of overhead; a Place row 96 bytes; a name row 32 bytes plus the name; an attribute row with its provenance 40 bytes plus the value; a boundary 48 bytes plus 16 per vertex at 28 vertices; a link to a source 72 bytes, one per Place for OpenStreetMap and 3.3 per Place with a Wikidata item; indexes 60 % of the tables plus 64 bytes per Place.

Measured on the 44 641 objects: 6.1 tags per Place, 2.1 of them names; a name is 35 bytes and another value 16 bytes on average; 32.5 % are drawn as a way or a relation.

| Group | Places | Tags per Place | Rows | Tables | With indexes |
|---|---|---|---|---|---|
| Sights | 26 879 | 6.0 | 230 240 | 26.1 MB | 43.6 MB |
| Eating and drinking | 8 260 | 7.7 | 81 293 | 8.1 MB | 13.4 MB |
| Lodging | 4 025 | 6.5 | 36 134 | 4.3 MB | 7.2 MB |
| Parks and nature | 4 360 | 3.2 | 26 614 | 4.1 MB | 6.9 MB |
| Entertainment | 1 117 | 7.8 | 11 740 | 1.4 MB | 2.2 MB |
| **All five** | **44 641** | 6.1 | **386 020** | **43.8 MB** | **72.9 MB** |

The 386 020 rows are 44 641 Places, 92 183 names, 179 749 other attributes, 14 520 boundaries and 54 927 links to sources.

**A change history.** One row per change — Place, source, kind of change, when detected, state, who decided and when, source revision: 72 bytes — and one row per attribute value the change carries, with the old and the new value: 24 bytes plus two values. Measured on the last 30 days: 16.6 changes a day and 2.9 attribute values per change.

| Rate | Changes a day | Changes a year | Attribute rows a year | Rows a year | Tables | With indexes |
|---|---|---|---|---|---|---|
| The last 30 days | 16.6 | 6 071 | 17 702 | 23 773 | 2.5 MB | 4.0 MB |
| All 52 days | 20.1 | 7 335 | 21 388 | 28 723 | 3.0 MB | 4.8 MB |
| Material changes only | 10.8 | 3 942 | 11 494 | 15 436 | 1.6 MB | 2.6 MB |

This is the history of what OpenStreetMap changes. What our own checkers would propose — a site that stopped answering, hours read from a page — comes on top and was not measured.

---

## 8. What could not be measured, and why

| Not measured | Why |
|---|---|
| Who makes the changes, people or scripts | Geofabrik's public diffs carry no user and no changeset |
| Whether a change is right | It takes a person on the spot; the diffs only say that something was written |
| Change rate over a year | 52 days of October and November were read; the older starting state that Geofabrik keeps is 1 January, 325 daily diffs away, of which 131 are published |
| Moves of ways and areas | A diff changes the nodes of a way without touching the way; only the positions of nodes were compared |
| When a Place was last seen by a person, beyond the 3.9 % with a check date | The timestamp of an object is the time of the last write, and a fifth of them come from one mass edit |
| How many closed Places are still mapped as open | The data shows the 352 that a mapper marked; the rest look like any other object |
| Hours on inner pages of a site, and on pages drawn by scripts | One page per site was read, without running scripts |
| Whether the hours found on a page are right, and whether they agree with OpenStreetMap | Not compared; the pattern was read by eye on 28 matches only |
| Whether the sites answer from Belarus | Fetched from a network in Poland |
| Whether the three 403 answers would open to a browser | A generic client name was a rule of this measurement |
| Cost in tokens of reading a page with a language model | Characters are measured; the price depends on the model, which is not chosen here |
| Sanatoria, community centres, saunas, ice rinks, picnic sites, lakes | Left out of the five groups on purpose; their counts are in §2 |
| Size in a real Postgres | Arithmetic on measured counts; no database was run |
