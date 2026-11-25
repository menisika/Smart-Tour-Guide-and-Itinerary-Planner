# 07. Minsk: what further sources of Places and facts add

| | |
|---|---|
| **Date** | 24 November 2026 |
| **Purpose** | Measure how much each additional source really adds, so that the list of sources of [ADR-0011](../adr/0011-sources-openstreetmap-wikidata-wikipedia-commons.md) can be decided on numbers |
| **Code** | [`spikes/minsk-city-data/`](../../spikes/minsk-city-data/README.md) — the spike of [report 06](06-minsk-city-data.md); its `npm run more` reproduces every number below |
| **OpenStreetMap** | the same Geofabrik extract of Belarus, data of 22 November 2026 |
| **Wikidata, Wikipedia, Wikivoyage** | read through the public interfaces on 24 November 2026 |
| **Heritage bank** | `https://heritage.gov.by/`, read on 24 November 2026 |
| **Overture Maps** | release `2026-11-18.0`, places theme |

Terms with a capital letter are those of the [glossary](../../GLOSSARY.md). *Measured* means the spike computed it from the data named above; *by formula* means arithmetic on measured counts with stated assumptions. "Routable" Places are the 4 078 candidates of the kinds a Route is built from: sights, nature, markets.

---

## 1. Summary

1. **Wikidata used directly raises the Places that have at least one article from 461 to about 585.** Of the 1 316 items of the city that OpenStreetMap links to nowhere, 671 have an article, but only 138 of those are sights: 232 are streets and 141 are organisations. At the middle setting 135 items match a candidate Place, 473 match another object, and 708 have no counterpart.
2. **The state heritage bank adds no Place and many facts.** It has 8 076 objects, 833 of them in Minsk, and Wikidata already holds every one of the 833 (8 070 of the 8 076 in the country). Its records carry a dating for 89 % and a description for 96 % of Minsk's objects. They reach 427 routable Places, 232 of which have no article anywhere: the Places with an article or a bank record are 731 against 499.
3. **Nothing else adds Places worth the work.** The heritage lists of Belarusian Wikipedia hold 351 rows and 3 of them match nothing. The two Wikivoyage articles hold 145 listings with coordinates; at most three sights in the city are missing from the candidates.
4. **Overture Maps has no opening hours.** Its schema has no such field and its operating status is filled for 18 of 25 381 places in Minsk. It finds a third of OpenStreetMap's Venues and offers 227 eating and drinking places of high confidence that OpenStreetMap does not have.
5. **Names in English stay the gap.** Wikidata labels raise English names of named routable Places from 18.9 % to 25.6 %; Russian stays at 93.2 %. A third of the English labels Wikidata supplies are addresses, a quarter are in Belarusian Latin.
6. **Page views order a queue well.** In a sample of 100 linked Places the monthly views of their articles run from 1 to 3 538 with a median of 22; the tenth most viewed hold 73 % of all views, and the order of one half-year repeats in the next (rank correlation 0.98). Three quarters of the views go to the Russian articles. The interface allows about ten requests a minute, so a pass over the 954 articles of today's linked Places takes an hour and a half.
7. **A country-wide base is small.** Belarus has 45 065 candidate Places by the same rules. Kept in Postgres with names, attributes with provenance and links to sources, they are about 390 000 rows and 71 MB *(by formula)*; with every Wikidata item of the country as a Place, about 990 000 rows and 179 MB.

---

## 2. Method

Each step is a script of the spike, reads the city database built for report 06 and writes its numbers as JSON into the spike's `out/` folder.

**Reading other people's sites.** One request at a time, at most one a second to a host, under the client name `minsk-city-data-spike/0.1`, with no cookies and no personal data; every answer is cached, so a second run sends nothing. No account was created and nothing was paid for. The largest single download was the heritage bank's map data, 31 MB.

| Source | Requests made | Volume | What limited the reading |
|---|---|---|---|
| Wikidata Query Service and API | about 20 | 5 MB | One count query that walks the class hierarchy timed out (504) and was dropped |
| heritage.gov.by | about 200 | 55 MB | Nothing; `robots.txt` allows everything but `/Scripts/` and `/admin/` |
| be.wikipedia.org | 8 | 0.2 MB | Nothing |
| ru and en.wikivoyage.org | 10 | 0.4 MB | Nothing |
| Overture Maps, public files | 16 file footers, 5 row groups | 6.9 MB | Nothing |
| Wikimedia page views | 197 | 1.6 MB | **429 after about ten requests in a minute** |

**Comparing names.** Two names are compared word by word after lower-casing, removing words that only say what kind of thing it is ("вуліца", "будынак", "street", "Minsk"…), and allowing a different ending or one typo in a word. The similarity is the share of the shorter name's words found in the longer one, damped when a one-word name sits inside a long one. A Belarusian name and its Russian translation are different words to this comparison; the sources mostly carry both, which is what makes it work. The rules are in [`src/names.ts`](../../spikes/minsk-city-data/src/names.ts).

---

## 3. Wikidata used directly

### 3.1 What the unlinked items are

Of the 2 514 Wikidata items located in the city (the item of the city itself left out), 615 are linked from a candidate Place, 583 only from another object, and **1 316 from nothing**. By the classes Wikidata gives them:

| Family | Unlinked items | With an article | Examples of classes |
|---|---|---|---|
| Sights | 618 | 138 | building 341, monument 71, building complex 29, cultural property 20, sculpture 15 |
| Streets | 236 | 232 | street 184, alley 44 |
| Organisations | 170 | 141 | faculty 19, court 11, college 10, institute, enterprise |
| Other | 178 | 92 | no class 48, facility, overpass, sports venue |
| Transport | 66 | 24 | tram stop 37, metro station 11, railway station 9 |
| Settlements and districts | 48 | 44 | former settlement, microdistrict |
| **All** | **1 316** | **671** | |

- **A third of the unlinked items are the state register.** 444 carry the state code (P632) and 442 the identifier of the heritage bank (P11184). Many look imported from the bank: 224 of the city's items with a code are labelled just "Будынак" (Building), as the bank titles them, and have no article.
- **The articles are mostly not about sights.** 232 of the 671 are streets and 141 are organisations. Streets are material for the way between Places, not Places of the kinds of §3.2.
- Only 96 unlinked items carry an address as a statement.

### 3.2 How good the matcher is

Before it was used on the unlinked items, the matcher was run on the 615 items whose OpenStreetMap object is known from a `wikidata` tag, with the tag hidden from it.

| Setting | Rule | Proposes the tagged object | Proposes another object | Proposes nothing | Recall | Precision, at least |
|---|---|---|---|---|---|---|
| Strict | name similarity ≥ 0.85 within 50 m, or the same address within 50 m | 372 | 31 | 212 | 60.5 % | 92.3 % |
| Middle | name ≥ 0.7 within 100 m, or name ≥ 0.85 within 150 m, or the same address within 100 m | 407 | 57 | 151 | 66.2 % | 87.7 % |
| Loose | name ≥ 0.5 within 150 m, or the same address within 150 m, or a building item inside the only building at its coordinates | 483 | 78 | 54 | 78.5 % | 86.1 % |

"Another object" is counted as an error, although it is often the same thing drawn twice — a node and the building under it — so the real precision is higher. A street item is only matched to a street, and nothing else is.

### 3.3 The 1 316 unlinked items, matched

| Setting | Match a candidate Place | of them the Place already has another Wikidata item | Match another object | No counterpart | of them sights | of those with an article |
|---|---|---|---|---|---|---|
| Strict | 85 | 32 | 398 | 833 | 517 | 94 |
| **Middle** | **135** | 54 | **473** | **708** | 464 | 72 |
| Loose | 381 | 123 | 671 | 264 | 78 | 30 |

At the middle setting:

- **The 135 that match a candidate Place** fall on 99 sights, 14 Venues, 14 memorial plaques and 8 nature Places. For 54 of them the Place already carries a different Wikidata item: Wikidata has two items for one thing, for example the building of the National Art Museum next to the museum itself.
- **The 473 that match another object** are 229 streets, 77 buildings with no other tag, 28 tram stops, and offices, schools and factories. 556 matches rest on the name and 52 on the address.
- **The 708 with no counterpart** are 464 sights, 86 organisations, 33 settlements and 125 others. Of the 464 sights 327 carry a heritage designation and only 72 have an article: these are the register's unnamed buildings, which have an address in the heritage bank and none in Wikidata (§4.3).
- The loose setting places 324 of them by position alone — a building item inside the one building at its coordinates. It cannot be checked by name, and how exact Wikidata's coordinates of these buildings are was not measured: for 272 of 592 objects they differ from the bank's own by more than 200 m (§4.2).

**Places with at least one article that Preparation could reach** *(measured; the additions are counted for sights only)*:

| | Strict | Middle | Loose |
|---|---|---|---|
| Today: distinct items with an article linked from a candidate Place | 461 | 461 | 461 |
| Existing routable Places that gain their first Wikidata item, with an article | 20 | 27 | 37 |
| Other objects of OpenStreetMap that would become Places, with an article | 15 | 25 | 42 |
| New Places from Wikidata's own coordinates, with an article | 94 | 72 | 30 |
| **Together** | **590** | **585** | **570** |

The total hardly depends on the setting, because it is bounded by the 138 unlinked sights that have an article; the setting only decides whether an article lands on an existing object or makes a new Place. The looser the setting, the more items fall onto a Place that already has one.

### 3.4 Forty proposed matches at the middle setting

A random sample with a fixed seed, for the owner to judge.

| # | Wikidata item | Class in Wikidata | OpenStreetMap object | What it is | Distance, m | Evidence |
|---|---|---|---|---|---|---|
| 1 | 1-ы Вязынскі завулак (Q111844076) | alley | 1-ы Вязынскі завулак (way/167402876) | highway=residential | 2 | name 1.00 |
| 2 | Белмедтэхніка (Q117387269) | — | УП «Белмедтэхніка» (way/758143073) | industrial | 0 | name 0.75 |
| 3 | Будынак былой Мінскай партыйнай школы (Q86113500) | building | Будынак былой Мінскай партыйнай школы 1957 г. (node/9812258818) | candidate Place: memorial plaque | 36 | name 0.88 |
| 4 | Wildberries (Q108487852) | business | Wildberries (node/8178565117) | outpost | 0 | name 1.00 |
| 5 | Батанічная (Q136684970) | tram stop | Батанічная (node/567331522) | tram stop | 0 | name 1.00 |
| 6 | Будынак (Q140420732) | building | Раковский Бровар (node/8361191118) | candidate Place: restaurant | 3 | address (Віцебская вуліца, 10) |
| 7 | Комплекс будынкаў Беларускага дзяржаўнага ўніверсітэта (Q18941656) | building complex | Беларускі дзяржаўны ўніверсітэт (relation/8813205) | education | 17 | name 0.80 |
| 8 | Вуліца Бірузова, Мінск (Q17043093) | street | вуліца Бірузова (way/25230728) | highway=tertiary | 0 | name 1.00 |
| 9 | Будынак Нацыянальнага мастацкага музея (Q141531489) | building | Нацыянальны мастацкі музей (way/25327627) | candidate Place: museum | 0 | name 1.00 |
| 10 | Міністэрства сельскай гаспадаркі і харчавання Рэспублікі Беларусь (Q13031633) | ministry of food, ministry of agriculture | Міністэрства сельскай гаспадаркі і харчавання Рэспублікі Беларусь (relation/21417) | candidate Place: notable building | 0 | name 1.00 |
| 11 | Hostel Urban (Q111120265) | hostel | Urban Hostel (node/1685777684) | hostel | 7 | name 1.00 |
| 12 | вуліца Леніна (Q4472839) | street | вуліца Леніна (way/92292940) | highway=secondary | 8 | name 1.00 |
| 13 | Абрыкосавая вуліца (Q111751299) | street | Абрыкосавая вуліца (way/25227517) | highway=residential | 1 | name 1.00 |
| 14 | Суд Першамайскага раёна г. Мінска (Q108274646) | court | Суд Першамайскага раёна г. Мінска (node/9972113376) | courthouse | 29 | name 1.00 |
| 15 | Ліцэй №1 г. Мінска (Q114889400) | lyceum | СШ №165 (way/25393742) | school | 0 | address (праспект Газеты Звязда, 6А) |
| 16 | Музей-майстэрня мастака З.І. Азгура (будынак, агароджа, дворык) (Q141526520) | building | Музей-майстэрня З.І. Азгура (node/9757997017) | candidate Place: artwork | 16 | name 0.90 |
| 17 | Вуліца Сямашкі (Q84092287) | street | вуліца Сямашкі (way/479721714) | highway=tertiary | 8 | name 1.00 |
| 18 | універсам «Рыга» (Q99767665) | Q883504 | Універсам «Рыга» (node/6314829037) | stop position | 76 | name 1.00 |
| 19 | Мінскі рысорны завод (Q85832709) | factory | Мінскі рысорны завод (way/432810988) | industrial | 0 | name 1.00 |
| 20 | Арбіта (Q87827972) | hotel | Oрбіта (node/2766736751) | hotel | 28 | name 1.00 |
| 21 | Чыгуначная вуліца (Мінск) (Q111987587) | street | Чыгуначная вуліца (way/288785110) | highway=secondary | 3 | name 1.00 |
| 22 | Будынак Адміністрацыі Заводскага раёна г. Мінска (Q96102559) | building | Адміністрацыя Заводскага раёна г.Мінска (node/7462296585) | government | 0 | name 1.00 |
| 23 | Белдзіпрадар (Q57538505) | Q56377753 | Бегіпрадор (node/7695994288) | company | 11 | name 1.00 |
| 24 | Стэпавы завулак (Q134309191) | alley | Стэпавы завулак (way/25229520) | highway=living street | 1 | name 1.00 |
| 25 | Навуковая бібліятэка БНТУ (Q4314459) | library | Навуковая бібліятэка БНТУ (way/467505610) | building | 0 | name 1.00 |
| 26 | Факультэт горнай справы і інжынернай экалогіі БНТУ (Q99851689) | faculty | Факультэт горнай справы і інжынернай экалогіі (9 корпус) (node/14297662873) | university | 31 | name 0.92 |
| 27 | Упраўленне ваеннай контрразведкі КДБ Беларусі (Q134628596) | public authority, organization | Упраўленне ваеннай контрвыведкі (node/5290445022) | government | 23 | name 0.80 |
| 28 | Вуліца Альшэўскага, Мінск (Q13029282) | street | вуліца Альшэўскага (way/511534707) | highway=secondary | 3 | name 1.00 |
| 29 | Памятник. Джумаш Асаналиев (Q141931634) | monument | Джумашу Асаналіеву (node/5411675448) | candidate Place: memorial | 18 | name 1.00 |
| 30 | Мазаіка «Кастрычнік» (Q141526529) | sculpture | Мазаіка «Кастрычнік», 1970-1980я гг. (node/5758770832) | candidate Place: artwork | 46 | name 0.70 |
| 31 | Агат-сістэмы кіравання (Q66486003) | business, holding company | АГАТ-сістэмы кіравання (way/1035816433) | industrial | 0 | name 1.00 |
| 32 | Чыжоўка-1 (Q99026852) | — | Чыжоўка-1 (relation/5442278) | residential | 0 | name 1.00 |
| 33 | РК Трактарны завод (Q136684995) | tram stop | РК Трактарны завод (node/4394608176) | tram stop | 0 | name 1.00 |
| 34 | Курапаты (Q9708) | place of mass murder, historic site | Курапаты (way/624426392) | candidate Place: memorial | 35 | name 1.00 |
| 35 | XXI стагоддзе (Q56056173) | serviced office | Бизнес-центр XXI век (relation/2775779) | building | 0 | name 0.75 |
| 36 | Палац Сапегаў (Q3919511) | building | Палац (node/3862667450) | candidate Place: cafe | 53 | name 0.75 |
| 37 | Будынак (Q140379203) | building | вуліца Вызвалення, 7 (way/25387273) | building | 0 | address (вуліца Вызвалення, 7) |
| 38 | Прыпыначны пункт Лебядзіны (Q14927509) | railway station | Лебядзіны (node/12233205576) | stop | 31 | name 1.00 |
| 39 | вуліца Энгельса (Q4474653) | street | вуліца Энгельса (way/37700613) | highway=tertiary | 1 | name 1.00 |
| 40 | Вуліца Клары Цэткін (Q106816752) | street | вуліца Клары Цэткін (way/54375307) | highway=primary | 1 | name 1.00 |

My reading of the sample: 34 are the same thing; 3 are the right subject or address on another kind of object (3: a plaque about the building, 6: a restaurant in the building, 15: another school at the address); 3 are wrong (4: a pick-up point of a retail chain, 18: a bus stop named after the shop, 36: a café named "Palace" 53 m from the palace). That is 85–92 %, in line with the 87.7 % measured on known links. The wrong ones share a pattern: a one-word name equal to a common word.

---

## 4. The state heritage bank

### 4.1 What it holds

The site is read the way its own pages read it: the map page loads every object with its coordinates in one request, the catalog page loads a filtered list 24 objects at a time, and the description is on the object's page.

| | Country | Minsk |
|---|---|---|
| Objects | 8 076 | 833 |
| Immovable | 7 682 | 661 |
| Movable | 199 | 119 |
| Intangible | 195 | 53 |
| Parts of a complex object | 2 554 | 376 |
| With coordinates | 5 997 | 653 |

In Minsk the types are monuments of architecture (461), of urban planning (134), of art (112), heraldry (48), documents (20), history (18) and collections (15). The first digit of the state code is the region: 833 codes start with 7, which is Minsk.

### 4.2 Fields of the 833 Minsk objects

| Field | Filled | Share |
|---|---|---|
| State code | 833 | 100 % |
| Picture | 832 | 99.9 % |
| Type | 822 | 98.7 % |
| **Description** *(in a sample of 150 object pages)* | 144 of 150 | **96.0 %** |
| Street address | 764 | 91.7 % |
| **Dating** | 740 | **88.8 %** |
| Coordinates | 653 | 78.4 % |
| Street address with a house number | 612 | 73.5 % |
| Subtype | 592 | 71.1 % |
| Category of value | 518 | 62.2 % |
| Style | 225 | 27.0 % |

- **A description is 712 characters at the median** (quartiles 493–994), in Belarusian.
- **Half of the titles are not names.** 409 objects are titled exactly "Будынак"; the 833 objects have 399 distinct titles.
- **Coordinates are positions for about half.** 361 of the 653 share their coordinates with another object. Against the coordinates Wikidata has for the same object the median distance is 30 m, but 272 of 592 pairs are more than 200 m apart. Against the OpenStreetMap object at the same address the median is 150 m. The address is the reliable locator; the coordinates are not.
- **No English.** The `/en/` address of an object page answers with an empty title.
- **No statement about reuse** was found on the object pages, on `/about` or on `/policy`. An object page offers a form that asks the Ministry of Culture for access to the full record.

### 4.3 Against Wikidata and OpenStreetMap

| The 833 Minsk objects | Objects |
|---|---|
| In Wikidata, by state code (P632) or bank identifier (P11184) | **833** |
| of them the Wikidata item has an article | 212 |
| In OpenStreetMap by the state code (`ref:mcrb`) | 269 |
| In OpenStreetMap through the `wikidata` tag of their item | 233 |
| In OpenStreetMap by either key | 411 |
| In OpenStreetMap by the address only | 141 |
| **Found in OpenStreetMap by a key or the address** | **552** |
| Not found in OpenStreetMap | 281: 110 immovable, 118 movable, 53 intangible |
| **In neither Wikidata nor OpenStreetMap** | **0** |

- **Wikidata mirrors the bank.** In the whole country 8 070 of the 8 076 objects are in Wikidata by one identifier or the other. As a list of objects the bank adds nothing to Wikidata.
- **The bank's address is what ties its objects to the map.** 141 objects are found in OpenStreetMap by address alone, on top of the 411 found by a key — a third more.
- **The 552 objects reach 445 candidate Places, 427 of them routable.** Of those 427 Places, 232 have no Wikipedia article in any of the four languages; 408 would get a dating and 138 a style. Routable Places with an article number 499; with an article or a bank record, 731.
- The 110 immovable objects that were not found are buildings whose address has no house number, territories described in words, and objects whose street is written differently in the two sources.

### 4.4 Requests for a full pass

| | Minsk | Country |
|---|---|---|
| Map data: every object with coordinates, title and code | 1 | 1 |
| List pages of 24: type, subtype, dating, style, address | 35 | 337 |
| Object pages: the description | 833 | 8 076 |
| **Requests** | **869** | **8 414** |
| At one request a second | 15 minutes | 2 hours 20 minutes |
| Volume *(by formula from the pages read)* | about 130 MB | about 1 GB |

Everything except the description comes in the first two rows: 36 requests for Minsk, 338 for the country.

---

## 5. The heritage lists of Belarusian Wikipedia

Belarusian Wikipedia has 146 pages titled «Спіс гісторыка-культурных каштоўнасцей …»; Minsk takes six parts. Each row is a template call with the state code, a name, a dating, addresses, a category, coordinates and a picture. The lists cite the printed register of 2009; the parts were last edited between April 2023 and July 2026.

| | Rows | Share |
|---|---|---|
| **Rows** | **351** | |
| With a state code | 351 | 100 % |
| With a dating, with an address | 351 | 100 % |
| With coordinates | 331 | 94.3 % |
| With a picture | 181 | 51.6 % |
| The name links to the object's own existing article | 78 | 22.2 % |
| The object's Wikidata item has an article | 120 | 34.2 % |
| An article either way | 148 | 42.2 % |
| **No article of its own** | **203** | **57.8 %** |
| The code is in Wikidata | 341 | 97.2 % |
| The code is in OpenStreetMap (`ref:mcrb`) | 258 | 73.5 % |
| **Match nothing in Wikidata or OpenStreetMap** | **3** | **0.9 %** |

- The three rows that match nothing are two groups of glass-and-metal compositions and the ensemble of Independence Avenue as a whole.
- **The lists are behind the bank.** They hold 349 distinct codes; the bank has 505 top-level codes for Minsk. 337 are in both, 12 only in the lists, 168 only in the bank.
- What the lists have that the bank lacks is a usable position: coordinates for 94 % of rows, entered by hand.

A full pass of Minsk is 4 requests: an index, the text of all parts at once, and two to check which linked articles exist.

---

## 6. Wikivoyage

One article per language, no district pages. A listing is "among the candidate Places" when its Wikidata identifier is on a Place, or a Place within 150 m has a name similarity of at least 0.6.

| Article | Group | Listings | With coordinates | With a Wikidata identifier | With hours | Among candidate Places | Another object of OpenStreetMap | Nothing in OpenStreetMap | Outside the city | No coordinates |
|---|---|---|---|---|---|---|---|---|---|---|
| Russian | see | 15 | 15 | 12 | 1 | 13 | 0 | 2 | 0 | 0 |
| Russian | do | 11 | 11 | 3 | 6 | 8 | 1 | 1 | 1 | 0 |
| Russian | eat and drink | 31 | 18 | 0 | 19 | 16 | 1 | 1 | 0 | 13 |
| Russian | buy | 11 | 10 | 1 | 6 | 3 | 6 | 1 | 0 | 1 |
| Russian | sleep | 21 | 21 | 5 | 0 | 10 | 7 | 4 | 0 | 0 |
| Russian | go and other | 24 | 24 | 10 | 9 | 4 | 9 | 2 | 9 | 0 |
| **Russian** | **all** | **113** | **99** | 31 | 41 | **54** | 24 | 11 | 10 | 14 |
| English | see | 22 | 18 | 11 | 11 | 13 | 0 | 0 | 5 | 4 |
| English | do | 12 | 9 | 8 | 3 | 7 | 0 | 2 | 0 | 3 |
| English | eat and drink | 19 | 10 | 0 | 18 | 5 | 1 | 4 | 0 | 9 |
| English | buy | 10 | 3 | 0 | 6 | 0 | 3 | 0 | 0 | 7 |
| English | sleep | 14 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 14 |
| English | go and other | 19 | 6 | 2 | 4 | 1 | 4 | 1 | 0 | 13 |
| **English** | **all** | **96** | **46** | 21 | 42 | **26** | 8 | 7 | 5 | 50 |

- **Listings with coordinates: 99 in Russian, 46 in English.** Not among the candidate Places: 45 and 20. Most of those are hotels, shops and stations, which are not candidate kinds.
- **Sights and activities not matched to a candidate: 5 in Russian and 7 in English.** Six of the twelve lie outside the city, most of them day trips; one is a cinema; two appear to be in OpenStreetMap under a Belarusian name that shares no word with the Russian one (the park of boulders, the aviation museum); three — a gallery and two theatres — were not found under any name the comparison could see.
- 18 of the 46 English listings with coordinates are also in the Russian article.
- **Hours** are written as free text ("Mon-Fri 09:00—13:00"), for 41 and 42 listings; 15 and 5 of them belong to a Venue that OpenStreetMap has.
- The "see" and "do" listings that are candidate Places — 21 in Russian, 20 in English — are a hand-made short list of the city, which is what the source is good for.

A full pass is 4 requests.

---

## 7. Overture Maps places

Read from the public files of release `2026-11-18.0`: 16 files, 12.0 GB, 90.3 million places. Only the five row groups that overlap the bounding box of Minsk were read: 6.9 MB, 7 seconds. The box holds 26 168 places, the city 25 381.

**The schema of the release** has these columns: `id`, `geometry`, `confidence`, `websites`, `emails`, `socials`, `phones`, `brand`, `addresses`, `names`, `sources`, `operating_status`, `basic_category`, `taxonomy`, `version`, `bbox`, `theme`, `type`. **There is no field for opening hours.**

| Top level of the taxonomy | Places |
|---|---|
| Shopping | 6 257 |
| Services and business | 4 484 |
| **Food and drink** | **2 642** |
| Lifestyle services | 2 084 |
| No category | 1 727 |
| Travel and transportation | 1 607 |
| Education | 1 417 |
| Sports and recreation | 1 381 |
| Arts and entertainment | 918 |
| Cultural and historic | 828 |
| Health care | 734 |
| Lodging | 664 |
| Community and government | 519 |
| Geographic entities | 119 |

| Attribute | Places | Share |
|---|---|---|
| Name | 25 381 | 100 % |
| Name in a stated language (`names.common`) | 0 | 0 % |
| Name written in Cyrillic | 15 496 | 61.1 % |
| Address | 24 614 | 97.0 % |
| Social-network page | 24 020 | 94.6 % |
| Category | 23 654 | 93.2 % |
| Phone | 18 248 | 71.9 % |
| Website | 14 696 | 57.9 % |
| E-mail | 12 316 | 48.5 % |
| Brand | 2 937 | 11.6 % |
| **Operating status** | **18** | **0.1 %** |

- **Food and drink** splits into restaurants 827, cafés 478, coffee shops 452, bars 425, casual eateries 201 and 259 others.
- **Operating status** is "open" for 18 places, hotels of an international chain and money-transfer points among them, and empty for the rest, every eating place included.
- **Confidence** has a median of 0.56; 2 021 places (8 %) are at 0.9 or above and 10 340 (41 %) below 0.5.
- **Where it comes from:** Meta for 23 511 places (93 %), Foursquare 1 129, AllThePlaces 688, Microsoft 38. The median date of a record is 9 November 2026.

**Overlap with the 2 688 Venues of OpenStreetMap:**

| Rule | Venues found in Overture | Share | of them gain a website | gain a phone | have no hours in OpenStreetMap |
|---|---|---|---|---|---|
| Within 50 m, name similarity ≥ 0.8 | 559 | 20.8 % | 147 | 172 | 101 |
| **Within 100 m, name similarity ≥ 0.6** | **910** | **33.9 %** | 251 | 306 | 198 |
| Within 150 m, name similarity ≥ 0.5 | 978 | 36.4 % | 273 | 321 | 210 |

**What it would add:**

- Overture has 2 642 eating and drinking places against OpenStreetMap's 2 688, and the two sets overlap by a third. 1 800 of Overture's match no Venue of OpenStreetMap at the middle rule; 571 of the 2 642 have a confidence of 0.9 or more, and **227 of those match no Venue** — 84 of them with no Venue of any name within 30 m.
- For the Venues it shares, it adds a website to 251 and a phone to 306, and a social-network page to almost all. It adds hours to none.
- **For sights it adds noise.** 1 223 places fall into sight-like categories; 628 of them are "historic sites", none with a confidence of 0.9, and the best-rated of those are street addresses and names of neighbourhoods. The 37 places of high confidence that match no routable candidate are parks that OpenStreetMap has under a Belarusian name or with a distant centre, amusement centres, small private museums and galleries, and parish churches.

---

## 8. Names

Share of routable candidate Places that have a name in each language, as sources are added. The proposed matches are those of the middle setting of §3.

| Routable candidates | Stage | Belarusian | Russian | English |
|---|---|---|---|---|
| **The 2 831 with a name in OpenStreetMap** | OpenStreetMap alone | 2 702 (95.4 %) | 2 638 (**93.2 %**) | 536 (**18.9 %**) |
| | with Wikidata labels through existing links | 2 705 (95.5 %) | 2 639 (93.2 %) | 708 (25.0 %) |
| | with Wikidata labels through proposed matches | 2 705 (95.5 %) | 2 639 (93.2 %) | 724 (**25.6 %**) |
| | with the titles of the heritage bank | 2 705 (95.5 %) | 2 639 (93.2 %) | 724 (25.6 %) |
| **All 4 078** | OpenStreetMap alone | 2 722 (66.7 %) | 2 654 (65.1 %) | 538 (13.2 %) |
| | with Wikidata labels through existing links | 2 955 (72.5 %) | 2 717 (66.6 %) | 868 (21.3 %) |
| | with Wikidata labels through proposed matches | 2 965 (72.7 %) | 2 717 (66.6 %) | 889 (21.8 %) |
| | with the titles of the heritage bank | 2 972 (72.9 %) | 2 717 (66.6 %) | 889 (21.8 %) |

- **Russian does not move.** A Place that Wikidata knows already has a Russian name in OpenStreetMap.
- **English rises by a third and stays at a quarter.** Of the 455 English labels that come through existing links, 152 are an address rather than a name ("Karla Marksa Street 5, Minsk") and 115 are in Belarusian Latin with diacritics.
- **Unnamed Places get a name.** 1 247 routable candidates have no `name` in OpenStreetMap; a Wikidata label names 255 of them, the proposed matches 10 more, the heritage bank 7 more.
- **The heritage bank names almost nothing**: its titles are Belarusian and half of them are "Будынак".
- Wikivoyage would name 5 matched Places in Russian and 6 in English. Overture states no language for its names.

---

## 9. A popularity signal

The Wikimedia page-view interface gives the views of one article per month. For a random sample of 100 of the 461 linked Places that have an article — 188 articles in be, be-tarask, ru and en — the views of twelve months, November 2025 to October 2026, were read and summed over the languages. Views by people only (`agent=user`), all platforms.

| Views a month per Place | |
|---|---|
| Minimum | 1 |
| 10th percentile | 2 |
| 25th percentile | 3 |
| **Median** | **22** |
| 75th percentile | 101 |
| 90th percentile | 348 |
| Maximum | 3 538 |

| | |
|---|---|
| Places under 30 views a month | 56 of 100 |
| Places under 100 views a month | 75 of 100 |
| Places with 1 000 or more | 2 |
| Share of all views held by the most viewed tenth | 73.1 % |
| Share held by the most viewed quarter | 89.8 % |
| Rank correlation between the first and the second half-year | 0.976 |
| Of the most viewed quarter in one half-year, still in it in the next | 92 % |
| Views by language | ru 76.1 %, en 17.3 %, be 5.5 %, be-tarask 1.0 % |

The most and the least viewed of the sample:

| Rank | Place, as Wikidata labels it | Views a month | be | be-tarask | ru | en |
|---|---|---|---|---|---|---|
| 1 | Белорусский государственный университет (Q2418908) | 3 538 | 82 | 25 | 2 342 | 1 090 |
| 2 | Беларусьфильм (Q2621941) | 2 980 | 57 | 12 | 2 418 | 494 |
| 3 | Яма (Q2024954) | 929 | 9 | 4 | 670 | 245 |
| 4 | Белорусский государственный медицинский университет (Q2510885) | 927 | 17 | 9 | 677 | 225 |
| 5 | Ратуша (Минск) (Q445830) | 670 | 37 | 20 | 612 | — |
| 6 | Белорусская государственная академия искусств (Q1975956) | 579 | 50 | 11 | 437 | 82 |
| 7 | Посольство Украины в Беларуси (Q3917804) | 546 | 21 | 5 | 445 | 76 |
| 8 | Военное кладбище (Q2663664) | 511 | 38 | 10 | 434 | 30 |
| … | | | | | | |
| 98 | Дом па вуліцы Максіма Багдановіча, 13 (Q19347373) | 1 | 1 | — | — | — |
| 99 | Сквер Садружнасць (Q33112947) | 1 | 1 | — | — | — |
| 100 | Дом па Інтэрнацыянальнай вуліцы, 23 (Q85938089) | 1 | 1 | — | — | — |

- **Usable to order a queue: yes, at the top.** The spread is two orders of magnitude between the 10th and the 90th percentile, and the order is stable from one half-year to the next. The first quarter of the queue would be the same whichever half-year it was built from.
- **Not usable below the median.** Half of the Places have 22 views a month or fewer, many of them with a Belarusian article alone; among them the order is noise.
- **It measures the article, not the Place.** Two universities, a film studio and an embassy lead the sample: the `wikidata` tag of a building often points at the organisation in it (report 06, §3.2). The signal has to be read together with the kind of the Place.
- **It is a Russian-language signal.** A Belarusian article exists for 69 % of the linked Places (report 06, §5.1) and draws 6.5 % of the views, be and be-tarask together.

**Requests.** One per article and period: 954 for the 461 linked Places of today, 3 086 for all 1 657 Wikidata items of the city that have an article. The interface answered 429 after about ten requests in a minute to a client with a generic name, with a wait of 16 to 49 seconds stated in the answer. At ten a minute the first pass is an hour and a half and the second about five hours; a monthly refresh costs the same again.

---

## 10. Size of a country-wide base

### 10.1 Candidate Places of Belarus

The rules of report 06 applied to the whole extract, without building geometry (3 seconds). Embankments are left out, because they need geometry to be counted once per street.

| Kind | Candidates | With a name | With a Wikidata link | With opening hours |
|---|---|---|---|---|
| Sights | 27 517 | 18 979 | 2 901 | 632 |
| Venues | 8 267 | 7 348 | 5 | 4 617 (55.8 %) |
| Nature | 7 286 | 4 418 | 1 732 | 55 |
| Memorial plaques | 1 550 | 1 369 | 5 | 0 |
| Markets | 445 | 315 | 5 | 78 |
| **All** | **45 065** | **32 429** | **4 648** | **5 382** |

Minsk is 7 656 of them: 17 %. A candidate carries 6.1 tags on average, 2.2 of them names; a tag value is 23 bytes on average and a name 35.

### 10.2 Wikidata for the country

| | Items |
|---|---|
| With coordinates and the country Belarus | 56 974 |
| of them with an article in Belarusian | 35 480 |
| of them with an article in Russian | 13 799 |
| of them with an article in English | 1 369 |
| With the state code (P632) or the heritage-bank identifier (P11184) | 8 173 |
| of them with coordinates | 6 795 |
| Distinct Wikidata items that candidate Places of OpenStreetMap link to | 4 479 |

The 56 974 are items of every kind, settlements and natural features as well as sights; their classes were not counted (§12).

### 10.3 Rows and megabytes in Postgres *(by formula)*

Assumptions, per row:

| | |
|---|---|
| Overhead of a row | 28 bytes: a 24-byte header and a 4-byte pointer; rows padded to 8 bytes |
| `place` | 96 bytes: identifier, kind, point with its reference system, parent, status, visit minutes, outside or inside, version, date checked |
| `place_name`, one per name and language | 32 bytes fixed — Place, language, kind of name, source record, date retrieved — plus the name, 35 bytes *(measured)* |
| `place_attribute`, one per attribute with its provenance (`PLC-1`) | 40 bytes fixed — Place, attribute, source record, licence, date retrieved, date checked, confidence — plus the value, 23 bytes *(measured)* |
| `place_boundary`, for the 17 % of Places that are areas *(measured in Minsk)* | 48 bytes plus 16 per vertex, 28 vertices *(measured in Minsk)* |
| `place_source_link` | 72 bytes: Place, source, external identifier, revision, date retrieved, how matched, score. One per Place for OpenStreetMap, and 3.3 per Place that has a Wikidata item — the item, its articles, its photo *(measured in Minsk)* |
| Rows per Place | 2.2 names and 3.9 other attributes *(measured on the country's candidates)* |
| Indexes | 60 % of the table sizes, plus 64 bytes per Place for the spatial index |

| | Places | Rows | Tables | With indexes |
|---|---|---|---|---|
| Minsk, every candidate | 7 656 | 65 512 | 7.2 MB | **12.0 MB** |
| Belarus, sights, nature and markets | 35 248 | 306 111 | 33.5 MB | 55.9 MB |
| **Belarus, every candidate** | **45 065** | **387 159** | 42.4 MB | **70.7 MB** |
| Belarus, every candidate, and every Wikidata item with coordinates as a Place | 97 560 | 992 155 | 107.8 MB | 178.7 MB |

The largest table is the attributes with their provenance: 176 087 rows and 16.9 MB for the country. Dossiers, facts, Stories and events are not in this estimate; it is the Place base alone.

---

## 11. What each source adds

For Minsk. "Places" are routable Places; "facts" are text or dated statements a Dossier could start from.

| Source | Places it adds | Facts it adds | Hours it adds | Names it adds | Requests per full pass | Licence as the source states it |
|---|---|---|---|---|---|---|
| **Wikidata, matched by position and name** | 72–94 new Places that have an article; about 390–420 more without one, mostly the register's unnamed buildings | An article for about 124 more Places: 461 → 585 | None | English for 188 named Places (18.9 % → 25.6 %); a name for 265 unnamed ones | About 10 for the city | "All structured data from the main and property namespace is available under the Creative Commons CC0 License" |
| **State heritage bank** | None: all 833 objects are in Wikidata | A dating and a description for 427 Places, 232 of which have no article: 499 → 731 Places with any text | None | 7 Belarusian names; half of its titles are "Будынак" | 869 for Minsk, 36 without descriptions; 8 414 for the country | None stated on the pages read |
| **Heritage lists of Belarusian Wikipedia** | 3 rows match nothing | None beyond the bank; hand-entered coordinates for 331 rows | None | None | 4 | Creative Commons Attribution-Share Alike 4.0 |
| **Wikivoyage, Russian and English** | At most 3 sights in the city | A paragraph of description for 54 and 26 Places; a short list of what to see | Free text for 15 and 5 Venues of OpenStreetMap | Russian for 5, English for 6 | 4 | Creative Commons Attribution-Share Alike 4.0 |
| **Overture Maps places** | No sights; 227 eating and drinking places of high confidence as Venue candidates | A website for 251 Venues, a phone for 306 | **None: no such field**; operating status for 18 of 25 381 | One name per place, language not stated | One read of 6.9 MB | CDLA-Permissive-2.0 on every record; Apache-2.0 for Foursquare's, CC0-1.0 for AllThePlaces' |
| **Wikimedia page views** | — | A popularity signal for every Place that has an article; reliable for the most viewed quarter | — | — | 954 for today's linked Places, at about ten a minute; 3 086 for every item of the city with an article | Not read |

---

## 12. What could not be measured, and why

| Not measured | Why |
|---|---|
| Precision of the matches beyond the sample | It takes a person who knows the city; the sample of forty and the check on known links are what stands in for it |
| Whether the bank's descriptions may be stored and retold | The site states nothing about reuse; legal reading is deferred by the owner |
| Fill rates of the bank's fields outside Minsk | Only the Minsk list was read; the country would take 337 more requests |
| `gosspisok.gov.by` and `data.gov.by` | The first does not answer from this network and the second does not resolve, as the requesting session found; not retried from elsewhere |
| How many of Overture's 227 extra eating places exist | It needs a visit or another source; Overture's own confidence is all there is |
| Hours from any of the new sources in a machine-readable form | None of them has them: Wikivoyage has free text, Overture has no field, the bank and Wikidata have none |
| Class of the 56 974 Wikidata items of the country | The query that walks the class hierarchy timed out on the public service |
| Exact request limit of the page-view interface | Measured only as "about ten a minute for a client with a generic name"; an identified client is allowed more, and identifying was ruled out |
| Size of the country-wide base in a real Postgres | Arithmetic on measured counts; no database was run |
| Names in Russian and English for Places that have only a Belarusian name | No source measured here supplies them; transliteration was not tried |
