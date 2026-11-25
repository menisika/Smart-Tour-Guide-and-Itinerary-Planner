// Knowledge coverage (ADR-0011): for Places that carry a Wikidata identifier, how many have an
// article in Belarusian (be and be-tarask), Russian and English, and a photo — for the centre
// (1.5 km) and for the whole city. Measured from two sides:
//   A. candidate Places of OpenStreetMap that carry a `wikidata` tag;
//   B. every Wikidata item with coordinates inside the city, linked from OpenStreetMap or not
//      (this is the figure ADR-0011 quotes from the research: 873 / 510 / 285 / 86).
import { readFileSync } from 'node:fs';
import { CENTRE, CENTRE_RADIUS_M, OSM_DATE, haversine, mdTable, openDb, pct, rows, writeJson } from './lib.ts';
import { action, articleLengths, sparql, stats, type WikiLang } from './wiki.ts';

interface Item {
  qid: string;
  lat: number | null;
  lon: number | null;
  image: boolean;
  commonsCategory: boolean;
  be: string | null;
  beTarask: string | null;
  ru: string | null;
  en: string | null;
  p31: string[];
  heritage: boolean;
  labelBe: string | null;
  labelRu: string | null;
  labelEn: string | null;
  inCity?: boolean;
  inCentre?: boolean;
  /** Wikitext length in bytes per language, for items linked from a candidate Place. */
  bytes?: Partial<Record<WikiLang, number>>;
}

const extract = JSON.parse(readFileSync('out/01-extract.json', 'utf8')) as { city_bbox: [number, number, number, number] };
const [xmin, ymin, xmax, ymax] = extract.city_bbox;
const west = (Math.floor(xmin * 100) / 100).toFixed(2);
const south = (Math.floor(ymin * 100) / 100).toFixed(2);
const east = (Math.ceil(xmax * 100) / 100).toFixed(2);
const north = (Math.ceil(ymax * 100) / 100).toFixed(2);

// --- B. Wikidata items with coordinates in the bounding box of the city ------------------------
const title = (url: string | undefined) => (url ? decodeURIComponent(url.replace(/^https:\/\/[^/]+\/wiki\//, '')).replace(/_/g, ' ') : null);
const qidOf = (uri: string) => uri.replace('http://www.wikidata.org/entity/', '');
const bindings = await sparql(`
SELECT ?item (SAMPLE(?loc) AS ?loc) (SAMPLE(?img) AS ?img) (SAMPLE(?cc) AS ?cc)
       (SAMPLE(?be) AS ?be) (SAMPLE(?bt) AS ?bt) (SAMPLE(?ru) AS ?ru) (SAMPLE(?en) AS ?en)
       (GROUP_CONCAT(DISTINCT ?p31; separator="|") AS ?p31s) (SAMPLE(?her) AS ?her)
       (SAMPLE(?lbe) AS ?lbe) (SAMPLE(?lru) AS ?lru) (SAMPLE(?len) AS ?len)
WHERE {
  SERVICE wikibase:box {
    ?item wdt:P625 ?loc .
    bd:serviceParam wikibase:cornerSouthWest "Point(${west} ${south})"^^geo:wktLiteral ;
                    wikibase:cornerNorthEast "Point(${east} ${north})"^^geo:wktLiteral .
  }
  OPTIONAL { ?item wdt:P18 ?img }
  OPTIONAL { ?item wdt:P373 ?cc }
  OPTIONAL { ?be schema:about ?item ; schema:isPartOf <https://be.wikipedia.org/> }
  OPTIONAL { ?bt schema:about ?item ; schema:isPartOf <https://be-tarask.wikipedia.org/> }
  OPTIONAL { ?ru schema:about ?item ; schema:isPartOf <https://ru.wikipedia.org/> }
  OPTIONAL { ?en schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }
  OPTIONAL { ?item wdt:P31 ?p31 }
  OPTIONAL { ?item wdt:P1435 ?her }
  OPTIONAL { ?item rdfs:label ?lbe FILTER(LANG(?lbe) = "be") }
  OPTIONAL { ?item rdfs:label ?lru FILTER(LANG(?lru) = "ru") }
  OPTIONAL { ?item rdfs:label ?len FILTER(LANG(?len) = "en") }
}
GROUP BY ?item`);

const items = new Map<string, Item>();
for (const b of bindings) {
  const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(b.loc?.value ?? '');
  items.set(qidOf(b.item!.value), {
    qid: qidOf(b.item!.value),
    lon: m ? Number(m[1]) : null,
    lat: m ? Number(m[2]) : null,
    image: Boolean(b.img),
    commonsCategory: Boolean(b.cc),
    be: title(b.be?.value),
    beTarask: title(b.bt?.value),
    ru: title(b.ru?.value),
    en: title(b.en?.value),
    p31: (b.p31s?.value ?? '').split('|').filter(Boolean).map(qidOf),
    heritage: Boolean(b.her),
    labelBe: b.lbe?.value ?? null,
    labelRu: b.lru?.value ?? null,
    labelEn: b.len?.value ?? null,
  });
}
console.log(`Wikidata items with coordinates in the box ${west},${south},${east},${north}: ${items.size}`);

// --- A. Candidate Places of OpenStreetMap with a wikidata tag ---------------------------------
interface PlaceRow {
  ref: string;
  kind: string;
  subkind: string;
  name: string | null;
  wikidata: string | null;
  lat: number;
  lon: number;
  dist_centre_m: number;
}
const con = await openDb({ readOnly: true });
const places = await rows<PlaceRow>(
  con,
  `SELECT osm_type || '/' || osm_id AS ref, kind, subkind, name, wikidata, lat, lon, dist_centre_m FROM place ORDER BY osm_type, osm_id`,
);
const QID = /^Q[1-9]\d*$/;
const linked = places.filter((p) => p.wikidata !== null && QID.test(p.wikidata));
const malformed = places.filter((p) => p.wikidata !== null && !QID.test(p.wikidata)).length;

// Items the tags point to that the box query did not return (no coordinates in Wikidata, or outside the box).
const missing = [...new Set(linked.map((p) => p.wikidata!))].filter((q) => !items.has(q));
interface Entity {
  missing?: string;
  redirects?: { to: string };
  labels?: Record<string, { value: string }>;
  sitelinks?: Record<string, { title: string }>;
  claims?: Record<string, { mainsnak: { datavalue?: { value: unknown } } }[]>;
}
let redirected = 0;
let deleted = 0;
for (let i = 0; i < missing.length; i += 50) {
  const batch = missing.slice(i, i + 50);
  const res = await action<{ entities: Record<string, Entity> }>('www.wikidata.org', {
    action: 'wbgetentities',
    ids: batch.join('|'),
    props: 'sitelinks|claims|labels',
    languages: 'be|ru|en',
    sitefilter: 'bewiki|be_x_oldwiki|ruwiki|enwiki',
    formatversion: '1',
  });
  for (const q of batch) {
    // A merged item answers under its new identifier.
    const e = res.entities[q] ?? Object.values(res.entities).find((x) => x.redirects && (x as { redirects: { from?: string } }).redirects.from === q);
    if (!e || e.missing !== undefined) {
      deleted++;
      continue;
    }
    if (e.redirects) redirected++;
    const ids = (p: string) =>
      (e.claims?.[p] ?? []).map((c) => (c.mainsnak.datavalue?.value as { id?: string } | undefined)?.id).filter((x): x is string => Boolean(x));
    const coord = e.claims?.P625?.[0]?.mainsnak.datavalue?.value as { latitude: number; longitude: number } | undefined;
    items.set(q, {
      qid: q,
      lat: coord?.latitude ?? null,
      lon: coord?.longitude ?? null,
      image: Boolean(e.claims?.P18?.length),
      commonsCategory: Boolean(e.claims?.P373?.length),
      be: e.sitelinks?.bewiki?.title ?? null,
      beTarask: e.sitelinks?.be_x_oldwiki?.title ?? null,
      ru: e.sitelinks?.ruwiki?.title ?? null,
      en: e.sitelinks?.enwiki?.title ?? null,
      p31: ids('P31'),
      heritage: Boolean(e.claims?.P1435?.length),
      labelBe: e.labels?.be?.value ?? null,
      labelRu: e.labels?.ru?.value ?? null,
      labelEn: e.labels?.en?.value ?? null,
    });
  }
}

// --- Inside the city? Inside the centre? ----------------------------------------------------
const located = [...items.values()].filter((it) => it.lat !== null && it.lon !== null);
const inside = new Set<string>();
for (let i = 0; i < located.length; i += 2000) {
  const values = located.slice(i, i + 2000).map((it) => `('${it.qid}', ${it.lon}, ${it.lat})`).join(',');
  const hit = await rows<{ qid: string }>(
    con,
    `SELECT v.qid FROM (VALUES ${values}) v(qid, lon, lat), city c WHERE ST_Contains(c.geom, ST_Point(v.lon, v.lat))`,
  );
  for (const h of hit) inside.add(h.qid);
}
for (const it of items.values()) {
  it.inCity = inside.has(it.qid);
  it.inCentre = it.lat !== null && it.lon !== null && haversine(CENTRE.lat, CENTRE.lon, it.lat, it.lon) <= CENTRE_RADIUS_M;
}

// --- Tables -----------------------------------------------------------------------------------
const HEAD = ['Set', 'Items', 'be', 'be-tarask', 'be or be-tarask', 'ru', 'en', 'any of the four', 'none', 'photo (P18)', 'photo or Commons category'];
function line(label: string, set: Item[]): (string | number)[] {
  const n = set.length;
  const c = (f: (i: Item) => boolean) => `${set.filter(f).length} (${pct(set.filter(f).length, n)})`;
  return [
    label, n,
    c((i) => i.be !== null), c((i) => i.beTarask !== null), c((i) => i.be !== null || i.beTarask !== null),
    c((i) => i.ru !== null), c((i) => i.en !== null),
    c((i) => Boolean(i.be ?? i.beTarask ?? i.ru ?? i.en)), c((i) => !(i.be ?? i.beTarask ?? i.ru ?? i.en)),
    c((i) => i.image), c((i) => i.image || i.commonsCategory),
  ];
}
function count(set: Item[]) {
  const k = (f: (i: Item) => boolean) => set.filter(f).length;
  return {
    items: set.length,
    be: k((i) => i.be !== null),
    be_tarask: k((i) => i.beTarask !== null),
    be_or_be_tarask: k((i) => i.be !== null || i.beTarask !== null),
    ru: k((i) => i.ru !== null),
    en: k((i) => i.en !== null),
    any_article: k((i) => Boolean(i.be ?? i.beTarask ?? i.ru ?? i.en)),
    no_article: k((i) => !(i.be ?? i.beTarask ?? i.ru ?? i.en)),
    photo_p18: k((i) => i.image),
    photo_or_commons_category: k((i) => i.image || i.commonsCategory),
    heritage_designation: k((i) => i.heritage),
    // source situations of ADR-0004
    belarusian_only: k((i) => Boolean(i.be ?? i.beTarask) && !i.ru && !i.en),
    belarusian_and_russian_no_english: k((i) => Boolean(i.be ?? i.beTarask) && Boolean(i.ru) && !i.en),
    russian_only: k((i) => !(i.be ?? i.beTarask) && Boolean(i.ru) && !i.en),
    english_available: k((i) => Boolean(i.en)),
  };
}
const distinctItems = (ps: PlaceRow[]) => [...new Set(ps.map((p) => p.wikidata!))].map((q) => items.get(q)).filter((x): x is Item => Boolean(x));
const centrePlace = (p: PlaceRow) => p.dist_centre_m <= CENTRE_RADIUS_M;
const routableKinds = new Set(['sight', 'nature', 'market']);

const osmCity = distinctItems(linked);
const osmCentre = distinctItems(linked.filter(centrePlace));
const osmRoutableCity = distinctItems(linked.filter((p) => routableKinds.has(p.kind)));
const osmRoutableCentre = distinctItems(linked.filter((p) => routableKinds.has(p.kind) && centrePlace(p)));
const wdCity = [...items.values()].filter((i) => i.inCity);
const wdCentre = [...items.values()].filter((i) => i.inCentre);

console.log('\nA. Candidate Places of OpenStreetMap that carry a Wikidata identifier (distinct items)');
console.log(mdTable(HEAD, [
  line('Whole city, every kind', osmCity),
  line('Whole city, sights, nature, markets', osmRoutableCity),
  line('Centre 1.5 km, every kind', osmCentre),
  line('Centre 1.5 km, sights, nature, markets', osmRoutableCentre),
]));
console.log('\nB. Every Wikidata item with coordinates');
console.log(mdTable(HEAD, [line('Whole city', wdCity), line('Centre 1.5 km', wdCentre)]));

// --- How much text there is: article length for the items candidate Places point to -----------
const LANGS: WikiLang[] = ['be', 'beTarask', 'ru', 'en'];
const lengthStats: Record<string, unknown> = {};
for (const lang of LANGS) {
  const withArticle = osmCity.filter((i) => i[lang] !== null);
  const lengths = await articleLengths(lang, withArticle.map((i) => i[lang]!));
  const values: number[] = [];
  for (const i of withArticle) {
    const b = lengths.get(i[lang]!);
    if (b === undefined) continue;
    (i.bytes ??= {})[lang] = b;
    values.push(b);
  }
  values.sort((x, y) => x - y);
  const at = (p: number) => values[Math.min(values.length - 1, Math.floor(p * values.length))] ?? 0;
  lengthStats[lang] = {
    articles: withArticle.length,
    length_found: values.length,
    median_bytes: at(0.5),
    p25_bytes: at(0.25),
    p75_bytes: at(0.75),
    under_2000_bytes: values.filter((v) => v < 2000).length,
    over_10000_bytes: values.filter((v) => v >= 10000).length,
    total_megabytes: Math.round(values.reduce((x, y) => x + y, 0) / 1e4) / 100,
  };
}
console.log('\nArticle length (wikitext bytes) for items linked from candidate Places:', lengthStats);

// --- Link gap: knowledge that no candidate Place points to -------------------------------------
const anyTag = new Set(
  (await rows<{ q: string }>(con, `SELECT DISTINCT tags['wikidata'] AS q FROM feature WHERE in_city AND tags['wikidata'] IS NOT NULL`)).map((r) => r.q),
);
const placeTag = new Set(linked.map((p) => p.wikidata!));
const notPlace = wdCity.filter((i) => !placeTag.has(i.qid));
const notAnywhere = wdCity.filter((i) => !anyTag.has(i.qid));
console.log('\nC. Wikidata items in the city by whether OpenStreetMap points to them');
console.log(mdTable(HEAD, [
  line('Linked from a candidate Place', wdCity.filter((i) => placeTag.has(i.qid))),
  line('Linked only from another object (street, station, district…)', wdCity.filter((i) => !placeTag.has(i.qid) && anyTag.has(i.qid))),
  line('Not linked from any object in the city', notAnywhere),
]));

// What kinds of things the unlinked items are: labels of the most frequent classes.
const classCount = new Map<string, number>();
for (const i of notAnywhere) for (const c of i.p31) classCount.set(c, (classCount.get(c) ?? 0) + 1);
const allClassCount = new Map<string, number>();
for (const i of wdCity) for (const c of i.p31) allClassCount.set(c, (allClassCount.get(c) ?? 0) + 1);
const top = (m: Map<string, number>, k: number) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, k);
const classIds = [...new Set([...top(classCount, 25), ...top(allClassCount, 25)].map(([c]) => c))];
const classLabel = new Map<string, string>();
for (let i = 0; i < classIds.length; i += 50) {
  const res = await action<{ entities: Record<string, Entity> }>('www.wikidata.org', {
    action: 'wbgetentities', ids: classIds.slice(i, i + 50).join('|'), props: 'labels', languages: 'en', formatversion: '1',
  });
  for (const [q, e] of Object.entries(res.entities)) classLabel.set(q, e.labels?.en?.value ?? q);
}
const named = (m: Map<string, number>, k: number) => top(m, k).map(([c, n]) => ({ class: classLabel.get(c) ?? c, qid: c, items: n }));

// Per kind, for the report.
const byKind: Record<string, unknown> = {};
for (const kind of ['sight', 'nature', 'market', 'venue', 'plaque']) {
  const ofKind = places.filter((p) => p.kind === kind);
  const withTag = ofKind.filter((p) => p.wikidata !== null && QID.test(p.wikidata));
  byKind[kind] = { places: ofKind.length, with_wikidata: withTag.length, ...count(distinctItems(withTag)) };
}

writeJson('out/04-knowledge.json', {
  osm_date: OSM_DATE,
  wikidata_read_at: new Date().toISOString().slice(0, 10),
  box: [west, south, east, north],
  centre: CENTRE,
  centre_radius_m: CENTRE_RADIUS_M,
  requests: stats,
  osm_side: {
    candidate_places: places.length,
    with_wikidata_tag: linked.length,
    malformed_wikidata_tags: malformed,
    tags_pointing_to_deleted_items: deleted,
    tags_pointing_to_redirects: redirected,
    items_not_returned_by_box_query: missing.length,
    whole_city_every_kind: count(osmCity),
    whole_city_sights_nature_markets: count(osmRoutableCity),
    centre_every_kind: count(osmCentre),
    centre_sights_nature_markets: count(osmRoutableCentre),
    by_kind: byKind,
    article_length: lengthStats,
  },
  wikidata_side: {
    whole_city: count(wdCity),
    centre: count(wdCentre),
    linked_from_a_candidate_place: count(wdCity.filter((i) => placeTag.has(i.qid))),
    linked_only_from_another_object: count(wdCity.filter((i) => !placeTag.has(i.qid) && anyTag.has(i.qid))),
    not_linked_from_any_object: count(notAnywhere),
    not_linked_from_a_candidate_place: count(notPlace),
    classes_in_city: named(allClassCount, 25),
    classes_of_unlinked_items: named(classCount, 25),
  },
});
writeJson('out/04-wikidata-items.json', [...items.values()]);
console.log('\nrequests:', stats);
