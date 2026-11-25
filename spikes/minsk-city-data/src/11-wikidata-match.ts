// Wikidata used directly: the items located in the city that no OpenStreetMap object links to are
// matched to OpenStreetMap objects by position and name, at three settings. The same matcher is
// first run on the items whose link is already known, which measures its precision and recall.
import { readFileSync } from 'node:fs';
import { CITY_WIKIDATA, OSM_DATE, mdTable, openDb, pct, rows, writeJson } from './lib.ts';
import { bestSimilarity, houseNumber, sample, similarity } from './names.ts';
import { action, rights, sparql, stats } from './wiki.ts';

interface Item {
  qid: string;
  lat: number | null;
  lon: number | null;
  image: boolean;
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
}
const all = JSON.parse(readFileSync('out/04-wikidata-items.json', 'utf8')) as Item[];
const cityItems = all.filter((i) => i.inCity && i.lat !== null && i.lon !== null && i.qid !== CITY_WIKIDATA);
const hasArticle = (i: Item) => Boolean(i.be ?? i.beTarask ?? i.ru ?? i.en);

const extract = JSON.parse(readFileSync('out/01-extract.json', 'utf8')) as { city_bbox: [number, number, number, number] };
const [xmin, ymin, xmax, ymax] = extract.city_bbox;
const corner = (x: number, y: number, up: boolean) =>
  `Point(${((up ? Math.ceil : Math.floor)(x * 100) / 100).toFixed(2)} ${((up ? Math.ceil : Math.floor)(y * 100) / 100).toFixed(2)})`;

// --- Addresses and state identifiers of the items, one query ---------------------------------
const extra = new Map<string, { address: string | null; street: string | null; houseNo: string | null; code: string | null; bank: string | null }>();
for (const b of await sparql(`
SELECT ?item (SAMPLE(?addr) AS ?addr) (SAMPLE(?streetLabel) AS ?street) (SAMPLE(?no) AS ?no)
       (SAMPLE(?code) AS ?code) (SAMPLE(?bank) AS ?bank)
WHERE {
  SERVICE wikibase:box {
    ?item wdt:P625 ?loc .
    bd:serviceParam wikibase:cornerSouthWest "${corner(xmin, ymin, false)}"^^geo:wktLiteral ;
                    wikibase:cornerNorthEast "${corner(xmax, ymax, true)}"^^geo:wktLiteral .
  }
  OPTIONAL { ?item wdt:P6375 ?addr }
  OPTIONAL { ?item p:P669 ?st . ?st ps:P669 ?streetItem .
             OPTIONAL { ?st pq:P670 ?no }
             OPTIONAL { ?streetItem rdfs:label ?streetLabel FILTER(LANG(?streetLabel) = "be") } }
  OPTIONAL { ?item wdt:P632 ?code }
  OPTIONAL { ?item wdt:P11184 ?bank }
}
GROUP BY ?item`)) {
  extra.set(b.item!.value.replace('http://www.wikidata.org/entity/', ''), {
    address: b.addr?.value ?? null,
    street: b.street?.value ?? null,
    houseNo: b.no?.value ?? null,
    code: b.code?.value ?? null,
    bank: b.bank?.value ?? null,
  });
}

// --- What kind of thing an item is, from the English label of its classes ---------------------
const classIds = [...new Set(cityItems.flatMap((i) => i.p31))];
const classLabel = new Map<string, string>();
for (let k = 0; k < classIds.length; k += 50) {
  const res = await action<{ entities: Record<string, { labels?: { en?: { value: string } } }> }>('www.wikidata.org', {
    action: 'wbgetentities', ids: classIds.slice(k, k + 50).join('|'), props: 'labels', languages: 'en', formatversion: '1',
  });
  for (const [q, e] of Object.entries(res.entities)) classLabel.set(q, e.labels?.en?.value ?? q);
}
const STREET = /\b(street|alley|avenue|boulevard|lane|road|square|highway|embankment|thoroughfare|prospekt|passage|ring road|interchange)\b/i;
const TRANSIT = /\b(station|stop|depot|metro|railway|tram|line|airport|platform|terminal)\b/i;
const AREA = /\b(settlement|village|district|microdistrict|neighborhood|neighbourhood|quarter|locality|city|town|hamlet|khutor|agrotown|territorial|suburb|residential area)\b/i;
const BODY = /\b(faculty|institute|university|college|school|gymnasium|lyceum|academy|enterprise|company|organization|organisation|business|court|ministry|agency|bank|publisher|publishing|newspaper|club|team|party|embassy|consulate|hospital|clinic|library|archive|factory|plant|brewery|association|union|foundation|society|committee|department|service|studio|orchestra|ensemble|channel|station of|operator|manufacturer|festival|competition|event|championship|tournament|edition|contest)\b/i;
const SIGHT = /\b(building|house|monument|memorial|sculpture|statue|bust|church|cathedral|chapel|monastery|convent|synagogue|mosque|temple|castle|palace|manor|estate|tower|gate|fountain|museum|theatre|theater|cinema|gallery|park|garden|cemetery|graveyard|bridge|cultural property|heritage|architectural|landmark|tomb|grave|obelisk|stele|plaque|artwork|mural|mosaic|ruins|archaeological|hillfort|kurgan|barrow|mound|stadium|arena|circus|zoo|pond|lake|reservoir|river|stream|forest|hotel|mall|market|complex|ensemble of|viewpoint|hall|pavilion|planetarium|observatory|water tower|mill|villa|mansion|tenement|barracks|prison|fort|wall)\b/i;
type Family = 'street' | 'transit' | 'area' | 'body' | 'sight' | 'other';
function family(i: Item): Family {
  const labels = i.p31.map((c) => classLabel.get(c) ?? '').join(' | ');
  if (STREET.test(labels)) return 'street';
  if (TRANSIT.test(labels) && !SIGHT.test(labels.replace(/station building/gi, 'building'))) return 'transit';
  if (SIGHT.test(labels)) return 'sight';
  if (AREA.test(labels)) return 'area';
  if (BODY.test(labels)) return 'body';
  return 'other';
}

// --- Candidate pairs: every named object or building within 150 m of an item --------------------
const con = await openDb({ readOnly: true });
const UTM = `'EPSG:32635'`;
const RADIUS = 150;
await con.run(`CREATE TEMP TABLE it AS SELECT * FROM (VALUES ${cityItems.map((i) => `('${i.qid}', ${i.lon}, ${i.lat})`).join(',')}) v(qid, lon, lat)`);
await con.run(`CREATE TEMP TABLE it_utm AS SELECT qid, lon, lat, ST_Transform(ST_Point(lon, lat), 'EPSG:4326', ${UTM}) AS g FROM it`);
await con.run(`CREATE TEMP TABLE cand AS
  SELECT f.osm_type, f.osm_id, f.tags,
         CASE WHEN f.area IS NOT NULL THEN f.area WHEN f.osm_type = 'way' THEN wl.line ELSE f.pt END AS geom,
         f.area IS NOT NULL AS is_area
  FROM feature f LEFT JOIN way_line wl ON f.osm_type = 'way' AND wl.id = f.osm_id
  WHERE f.in_city
    AND (f.tags['name'] IS NOT NULL OR f.tags['name:ru'] IS NOT NULL OR f.tags['name:be'] IS NOT NULL OR f.tags['name:en'] IS NOT NULL
         OR f.tags['alt_name'] IS NOT NULL OR f.tags['old_name'] IS NOT NULL OR f.tags['official_name'] IS NOT NULL
         OR (f.tags['building'] IS NOT NULL AND f.tags['building'] <> 'no'))`);
await con.run(`CREATE TEMP TABLE cand_box AS
  SELECT *, ST_XMin(geom) AS x0, ST_XMax(geom) AS x1, ST_YMin(geom) AS y0, ST_YMax(geom) AS y1 FROM cand WHERE geom IS NOT NULL`);
const pairCols = (
  await con.runAndReadAll(`
  WITH near AS (
    SELECT i.qid, c.osm_type, c.osm_id, c.tags, c.is_area,
           ST_Distance(ST_Transform(c.geom, 'EPSG:4326', ${UTM}), i.g) AS dist
    FROM it_utm i JOIN cand_box c
      ON c.x0 <= i.lon + 0.0025 AND c.x1 >= i.lon - 0.0025 AND c.y0 <= i.lat + 0.0015 AND c.y1 >= i.lat - 0.0015)
  SELECT n.qid, n.osm_type || '/' || n.osm_id AS ref, round(n.dist, 1) AS dist, n.is_area,
         n.tags['name'] AS name, n.tags['name:be'] AS name_be, n.tags['name:ru'] AS name_ru, n.tags['name:en'] AS name_en,
         n.tags['alt_name'] AS alt_name, n.tags['old_name'] AS old_name, n.tags['official_name'] AS official_name,
         n.tags['addr:street'] AS street, n.tags['addr:housenumber'] AS house_no,
         n.tags['building'] AS building, n.tags['highway'] AS highway, n.tags['wikidata'] AS wikidata,
         coalesce(n.tags['historic'], n.tags['tourism'], n.tags['amenity'], n.tags['leisure'], n.tags['railway'],
                  n.tags['public_transport'], n.tags['place'], n.tags['shop'], n.tags['office'], n.tags['landuse'], n.tags['natural']) AS what,
         p.kind, p.subkind
  FROM near n LEFT JOIN place p ON p.osm_type = n.osm_type AND p.osm_id = n.osm_id
  WHERE n.dist <= ${RADIUS}
  ORDER BY n.qid, n.dist, ref`)
).getColumnsObject() as Record<string, unknown[]>;

interface Cand {
  ref: string;
  dist: number;
  isArea: boolean;
  names: (string | null)[];
  street: string | null;
  houseNo: string | null;
  building: boolean;
  highway: boolean;
  wikidata: string | null;
  what: string;
  kind: string | null;
  subkind: string | null;
}
const candsOf = new Map<string, Cand[]>();
const nPairs = pairCols.qid!.length;
for (let k = 0; k < nPairs; k++) {
  const qid = pairCols.qid![k] as string;
  const c: Cand = {
    ref: pairCols.ref![k] as string,
    dist: pairCols.dist![k] as number,
    isArea: pairCols.is_area![k] as boolean,
    names: [pairCols.name![k], pairCols.name_be![k], pairCols.name_ru![k], pairCols.name_en![k], pairCols.alt_name![k], pairCols.old_name![k], pairCols.official_name![k]] as (string | null)[],
    street: pairCols.street![k] as string | null,
    houseNo: pairCols.house_no![k] as string | null,
    building: pairCols.building![k] !== null && pairCols.building![k] !== 'no',
    highway: pairCols.highway![k] !== null,
    wikidata: pairCols.wikidata![k] as string | null,
    what: ((pairCols.subkind![k] as string | null) ?? (pairCols.highway![k] !== null ? `highway=${pairCols.highway![k]}` : (pairCols.what![k] as string | null)) ?? (pairCols.building![k] !== null ? 'building' : 'other')) as string,
    kind: pairCols.kind![k] as string | null,
    subkind: pairCols.subkind![k] as string | null,
  };
  const list = candsOf.get(qid);
  if (list) list.push(c);
  else candsOf.set(qid, [c]);
}

// --- Scoring ------------------------------------------------------------------------------------
type Setting = 'strict' | 'medium' | 'loose';
const SETTINGS: Record<Setting, { name: [number, number][]; address: number; inside: boolean }> = {
  // [minimum name similarity, maximum distance in metres]
  strict: { name: [[0.85, 50]], address: 50, inside: false },
  medium: { name: [[0.7, 100], [0.85, 150]], address: 100, inside: false },
  loose: { name: [[0.5, 150]], address: 150, inside: true },
};
const normNo = (s: string) => s.toLowerCase().replace(/\s/g, '').replace(/a/g, 'а').replace(/b/g, 'б').replace(/k/g, 'к');

interface Proposal {
  cand: Cand;
  evidence: 'name' | 'address' | 'inside the only building';
  score: number;
  itemName: string;
  candName: string;
}
function propose(i: Item, setting: Setting): Proposal | null {
  const rule = SETTINGS[setting];
  const fam = family(i);
  const x = extra.get(i.qid);
  const itemNames = [i.labelBe, i.labelRu, i.labelEn, i.be, i.beTarask, i.ru, i.en];
  // The item's address: a statement of Wikidata, or a house number at the end of a label.
  const addressTexts = [x?.address, x?.street && x.houseNo ? `${x.street}, ${x.houseNo}` : null, i.labelBe, i.labelRu, i.be, i.ru].filter((s): s is string => Boolean(s));
  const itemHouse = x?.houseNo ?? addressTexts.map((s) => houseNumber(s)).find((h) => h !== null) ?? null;
  const cands = candsOf.get(i.qid) ?? [];
  const buildingsHere = cands.filter((c) => c.building && c.isArea && c.dist === 0);
  let best: Proposal | null = null;
  const better = (p: Proposal) => {
    const rank = (q: Proposal) => (q.cand.kind !== null ? 1000 : 0) + (q.evidence === 'inside the only building' ? 0 : 100) + q.score * 10 - q.cand.dist / 1000;
    if (best === null || rank(p) > rank(best)) best = p;
  };
  for (const c of cands) {
    // A street matches a street and nothing else; a building never matches the street it stands on.
    if ((fam === 'street') !== c.highway) continue;
    const nm = bestSimilarity(itemNames, c.names);
    if (rule.name.some(([s, d]) => nm.score >= s && c.dist <= d)) better({ cand: c, evidence: 'name', score: nm.score, itemName: nm.a, candName: nm.b });
    if (itemHouse !== null && c.houseNo !== null && c.street !== null && c.dist <= rule.address && normNo(itemHouse) === normNo(c.houseNo)) {
      const st = Math.max(...addressTexts.map((s) => similarity(s.replace(/\d+\s?[а-яa-z]?(\/\d+)?/gi, ' '), c.street!)));
      if (st >= 0.5) better({ cand: c, evidence: 'address', score: st, itemName: addressTexts[0]!, candName: `${c.street}, ${c.houseNo}` });
    }
    if (rule.inside && fam === 'sight' && buildingsHere.length === 1 && c === buildingsHere[0]) {
      better({ cand: c, evidence: 'inside the only building', score: 0, itemName: i.labelBe ?? i.labelRu ?? i.labelEn ?? i.qid, candName: c.names.find(Boolean) ?? (c.street && c.houseNo ? `${c.street}, ${c.houseNo}` : 'unnamed building') });
    }
  }
  return best;
}

// --- 1. How good is the matcher? Items whose OpenStreetMap object is known ----------------------
const tagged = await rows<{ q: string; ref: string; is_place: boolean }>(
  con,
  `SELECT f.tags['wikidata'] AS q, f.osm_type || '/' || f.osm_id AS ref,
          EXISTS (SELECT 1 FROM place p WHERE p.osm_type = f.osm_type AND p.osm_id = f.osm_id) AS is_place
   FROM feature f WHERE f.in_city AND f.tags['wikidata'] IS NOT NULL`,
);
const refsOf = new Map<string, Set<string>>();
const placeTag = new Set<string>();
for (const r of tagged) {
  (refsOf.get(r.q) ?? refsOf.set(r.q, new Set()).get(r.q)!).add(r.ref);
  if (r.is_place) placeTag.add(r.q);
}
const known = cityItems.filter((i) => placeTag.has(i.qid));
const unlinked = cityItems.filter((i) => !refsOf.has(i.qid));
const settings: Setting[] = ['strict', 'medium', 'loose'];
const quality = settings.map((s) => {
  let same = 0;
  let other = 0;
  let none = 0;
  for (const i of known) {
    const p = propose(i, s);
    if (!p) none++;
    else if (refsOf.get(i.qid)!.has(p.cand.ref)) same++;
    else other++;
  }
  return { setting: s, items: known.length, proposes_the_tagged_object: same, proposes_another_object: other, proposes_nothing: none, recall: pct(same, known.length), precision_lower_bound: pct(same, same + other) };
});
console.log('Matcher run on items whose OpenStreetMap object is known (linked from a candidate Place):');
console.log(mdTable(['Setting', 'Items', 'Proposes the tagged object', 'Proposes another object', 'Proposes nothing', 'Recall', 'Precision, at least'],
  quality.map((q) => [q.setting, q.items, q.proposes_the_tagged_object, q.proposes_another_object, q.proposes_nothing, q.recall, q.precision_lower_bound])));

// --- 2. The unlinked items ----------------------------------------------------------------------
const famCount = (list: Item[]) => {
  const c: Record<string, number> = {};
  for (const i of list) c[family(i)] = (c[family(i)] ?? 0) + 1;
  return c;
};
const result: Record<string, unknown>[] = [];
const proposals = new Map<Setting, Map<string, Proposal>>();
for (const s of settings) {
  const map = new Map<string, Proposal>();
  for (const i of unlinked) {
    const p = propose(i, s);
    if (p) map.set(i.qid, p);
  }
  proposals.set(s, map);
  const matched = unlinked.filter((i) => map.has(i.qid));
  const toPlace = matched.filter((i) => map.get(i.qid)!.cand.kind !== null);
  const toOther = matched.filter((i) => map.get(i.qid)!.cand.kind === null);
  const none = unlinked.filter((i) => !map.has(i.qid));
  const whatOther: Record<string, number> = {};
  for (const i of toOther) {
    const c = map.get(i.qid)!.cand;
    const w = c.highway ? 'street' : c.building ? 'building' : c.what;
    whatOther[w] = (whatOther[w] ?? 0) + 1;
  }
  const placeKinds: Record<string, number> = {};
  for (const i of toPlace) placeKinds[map.get(i.qid)!.cand.kind!] = (placeKinds[map.get(i.qid)!.cand.kind!] ?? 0) + 1;
  const evidence: Record<string, number> = {};
  for (const i of matched) evidence[map.get(i.qid)!.evidence] = (evidence[map.get(i.qid)!.evidence] ?? 0) + 1;
  // A Place that already carries another Wikidata identifier is a conflict, not a new link.
  const conflict = toPlace.filter((i) => map.get(i.qid)!.cand.wikidata !== null);
  const routablePlace = (i: Item) => ['sight', 'nature', 'market'].includes(map.get(i.qid)!.cand.kind ?? '');
  const reach = {
    places_with_an_article_today: 461,
    more_existing_places_get_an_article: new Set(toPlace.filter((i) => hasArticle(i) && routablePlace(i) && map.get(i.qid)!.cand.wikidata === null).map((i) => map.get(i.qid)!.cand.ref)).size,
    objects_that_become_places_with_an_article: toOther.filter((i) => hasArticle(i) && family(i) === 'sight').length,
    new_places_from_wikidata_alone_with_an_article: none.filter((i) => hasArticle(i) && family(i) === 'sight').length,
  };
  result.push({
    setting: s,
    rule: SETTINGS[s],
    unlinked_items: unlinked.length,
    match_a_candidate_place: toPlace.length,
    match_a_candidate_place_by_kind: placeKinds,
    of_them_place_already_has_another_wikidata_item: conflict.length,
    match_another_object: toOther.length,
    match_another_object_by_what: Object.fromEntries(Object.entries(whatOther).sort((a, b) => b[1] - a[1]).slice(0, 12)),
    no_counterpart: none.length,
    no_counterpart_by_family: famCount(none),
    no_counterpart_sights_with_an_article: none.filter((i) => family(i) === 'sight' && hasArticle(i)).length,
    no_counterpart_sights_with_heritage_designation: none.filter((i) => family(i) === 'sight' && i.heritage).length,
    evidence,
    with_article: { matched_place: toPlace.filter(hasArticle).length, matched_other: toOther.filter(hasArticle).length, none: none.filter(hasArticle).length },
    reach: { ...reach, total: reach.places_with_an_article_today + reach.more_existing_places_get_an_article + reach.objects_that_become_places_with_an_article + reach.new_places_from_wikidata_alone_with_an_article },
  });
}
console.log(`\nUnlinked items in the city: ${unlinked.length}; by family: ${JSON.stringify(famCount(unlinked))}`);
console.log(mdTable(
  ['Setting', 'Match a candidate Place', 'Match another object', 'No counterpart', 'of them sights', 'of those with an article', 'Places with an article that Preparation could reach'],
  result.map((r) => [r.setting as string, r.match_a_candidate_place as number, r.match_another_object as number, r.no_counterpart as number,
    (r.no_counterpart_by_family as Record<string, number>).sight ?? 0, r.no_counterpart_sights_with_an_article as number, (r.reach as { total: number }).total]),
));
for (const r of result) console.log(JSON.stringify(r));

// --- 3. A random sample of proposed matches, for a human to judge --------------------------------
const medium = proposals.get('medium')!;
const pool = unlinked.filter((i) => medium.has(i.qid)).sort((a, b) => (a.qid < b.qid ? -1 : 1));
const picked = sample(pool, 40, 20261124);
const sampleRows = picked.map((i, k) => {
  const p = medium.get(i.qid)!;
  const c = p.cand;
  return {
    n: k + 1,
    qid: i.qid,
    wikidata_name: i.labelBe ?? i.labelRu ?? i.labelEn ?? i.be ?? i.ru ?? '—',
    wikidata_class: i.p31.map((x) => classLabel.get(x) ?? x).slice(0, 2).join(', ') || '—',
    osm: c.ref,
    osm_name: c.names.find(Boolean) ?? (c.street && c.houseNo ? `${c.street}, ${c.houseNo}` : '(no name)'),
    osm_what: c.kind ? `candidate Place: ${c.subkind}` : c.what,
    distance_m: Math.round(c.dist),
    evidence: p.evidence === 'name' ? `name ${p.score.toFixed(2)}` : p.evidence === 'address' ? `address (${p.candName})` : p.evidence,
  };
});
console.log('\nSample of 40 proposed matches at the medium setting:');
console.log(mdTable(['#', 'Wikidata item', 'Class', 'OpenStreetMap object', 'What it is', 'Distance, m', 'Evidence'],
  sampleRows.map((r) => [r.n, `${r.wikidata_name} (${r.qid})`, r.wikidata_class, `${r.osm_name} (${r.osm})`, r.osm_what, r.distance_m, r.evidence])));

// Which classes fall into each family: the way to audit the word lists above.
const classesByFamily: Record<string, Record<string, number>> = {};
for (const i of unlinked) {
  const f = (classesByFamily[family(i)] ??= {});
  const label = i.p31.map((c) => classLabel.get(c) ?? c).sort().join(' + ') || '(no class)';
  f[label] = (f[label] ?? 0) + 1;
}
const topClasses = Object.fromEntries(Object.entries(classesByFamily).map(([f, m]) => [f, Object.entries(m).sort((x, y) => y[1] - x[1]).slice(0, 14).map(([c, n]) => `${c}: ${n}`)]));
console.log('\nClasses per family (unlinked items):', JSON.stringify(topClasses, null, 1));
console.log('Unlinked items with an article, by family:', JSON.stringify(famCount(unlinked.filter(hasArticle))));

// What the items "linked only from another object" hang on, for the record.
const otherLinked = cityItems.filter((i) => refsOf.has(i.qid) && !placeTag.has(i.qid));

writeJson('out/11-wikidata-match.json', {
  osm_date: OSM_DATE,
  wikidata_read_at: new Date().toISOString().slice(0, 10),
  items_in_city_with_coordinates: cityItems.length,
  linked_from_a_candidate_place: known.length,
  linked_only_from_another_object: otherLinked.length,
  linked_only_from_another_object_by_family: famCount(otherLinked),
  unlinked: unlinked.length,
  unlinked_by_family: famCount(unlinked),
  unlinked_with_an_article: unlinked.filter(hasArticle).length,
  unlinked_with_an_article_by_family: famCount(unlinked.filter(hasArticle)),
  unlinked_classes_by_family: topClasses,
  unlinked_with_state_code_P632: unlinked.filter((i) => extra.get(i.qid)?.code).length,
  unlinked_with_bank_identifier_P11184: unlinked.filter((i) => extra.get(i.qid)?.bank).length,
  unlinked_with_address_statement: unlinked.filter((i) => extra.get(i.qid)?.address ?? extra.get(i.qid)?.street).length,
  candidate_pairs_within_150_m: nPairs,
  licence_stated_by_wikidata: await rights('www.wikidata.org'),
  matcher_quality_on_known_links: quality,
  settings: result,
  sample_medium: sampleRows,
  requests: stats,
});
// Proposed links, for the names step.
writeJson('out/11-matches.json', settings.map((s) => ({
  setting: s,
  matches: [...proposals.get(s)!.entries()].map(([qid, p]) => ({ qid, ref: p.cand.ref, is_place: p.cand.kind !== null, kind: p.cand.kind, dist: p.cand.dist, evidence: p.evidence, score: Number(p.score.toFixed(3)) })),
})));
writeJson('out/11-wikidata-extra.json', [...extra.entries()].map(([qid, x]) => ({ qid, ...x })));
console.log('\nrequests:', stats);
