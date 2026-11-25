// The state "Bank of information on the historical and cultural heritage" (heritage.gov.by):
// how many objects it holds in the country and in Minsk, which fields are filled, how the Minsk
// objects connect to Wikidata and to OpenStreetMap, and how many requests a full pass takes.
//
// The site is read the way its own pages read it: the map page loads every object with its
// coordinates in one request, the catalog page loads a filtered list 24 objects at a time, and a
// description is on the object's own page. One request a second, cached.
import { readFileSync } from 'node:fs';
import { OSM_DATE, haversine, mdTable, openDb, pct, rows, writeJson } from './lib.ts';
import { houseNumber, sample, similarity } from './names.ts';
import { heritageWikidata } from './heritage-wd.ts';
import { stats as wikiStats } from './wiki.ts';
import { cachedJsonFrom, cachedText, webStats } from './web.ts';

const SITE = 'https://heritage.gov.by';
const AJAX = { 'Content-Type': 'application/json;charset=UTF-8', Accept: 'application/json, text/plain, */*', 'X-Requested-With': 'XMLHttpRequest' };
const KEY = '0f8fad5b-d9cb-469f-a165-70867728950e'; // the page sends a fresh GUID and gets it echoed back
const filters = (areas: string[]) => ({ SearchItems: [], Forms: [], Categories: [], Types: [], Kinds: [], Areas: areas, Districts: [] });

// --- 1. Every object with its coordinates: the request of the map page ---------------------------
interface MapExhibit {
  Id: string;
  Url: string;
  Title: string;
  ParentId: string | null;
  IsComplex: boolean;
  Code: string | null;
  FormValue: 'Immovable' | 'Movable' | 'Intangible';
  Latitude: number | null;
  Longitude: number | null;
}
const map = await cachedJsonFrom<{ Exhibits: MapExhibit[]; Count: number }>(`${SITE}/catalog/getallexhibits`, {
  method: 'PUT', headers: AJAX, body: JSON.stringify({ page: 1, filters: filters([]), key: KEY }),
});
const allObjects = map.Exhibits;
const byUrl = new Map(allObjects.map((e) => [e.Url, e]));
const count = <T>(list: T[], f: (x: T) => unknown) => list.filter(f).length;
const country = {
  objects: allObjects.length,
  immovable: count(allObjects, (e) => e.FormValue === 'Immovable'),
  movable: count(allObjects, (e) => e.FormValue === 'Movable'),
  intangible: count(allObjects, (e) => e.FormValue === 'Intangible'),
  parts_of_a_complex_object: count(allObjects, (e) => e.ParentId),
  with_coordinates: count(allObjects, (e) => e.Latitude && e.Longitude),
  immovable_with_coordinates: count(allObjects, (e) => e.FormValue === 'Immovable' && e.Latitude && e.Longitude),
  by_first_digit_of_code: Object.fromEntries(
    Object.entries(allObjects.reduce<Record<string, number>>((a, e) => { const d = (e.Code ?? '?').trim()[0] ?? '?'; a[d] = (a[d] ?? 0) + 1; return a; }, {})).sort(),
  ),
};

// --- 2. The Minsk list: the request of the catalog page, 24 objects a page -------------------------
interface ListExhibit {
  Url: string;
  IsComplex: boolean;
  ParentCode: string | null;
  Title: string;
  Code: string;
  FormValue: string;
  Category: string | null;
  Type: string | null;
  Kind: string | null;
  Style: string | null;
  Dating: string | null;
  District: string | null;
  City: string | null;
  Address: string | null;
  FullAddress: string | null;
  Preview: string | null;
  FilesList: unknown[] | null;
}
interface ListPage { Page: number; Exhibits: ListExhibit[]; Count: number; CountPages: number }
const listPage = (areas: string[], page: number) =>
  cachedJsonFrom<ListPage>(`${SITE}/catalog/getexhibits`, {
    method: 'PUT', headers: AJAX, body: JSON.stringify({ page, filters: filters(areas), noskip: page === 1, key: KEY }),
  });
const first = await listPage(['minsk'], 1);
const minsk: ListExhibit[] = [...first.Exhibits];
for (let p = 2; p <= first.CountPages; p++) minsk.push(...(await listPage(['minsk'], p)).Exhibits);
const seenCodes = new Set<string>();
const minskObjects = minsk.filter((e) => (seenCodes.has(e.Code) ? false : (seenCodes.add(e.Code), true)));
const countryFirst = await listPage([], 1);

const filled = (v: string | null | undefined) => v !== null && v !== undefined && v.trim() !== '';
const coordOf = (e: ListExhibit) => {
  const m = byUrl.get(e.Url);
  return m && m.Latitude && m.Longitude ? { lat: Number(m.Latitude), lon: Number(m.Longitude) } : null;
};
const titleCount = new Map<string, number>();
for (const e of minskObjects) titleCount.set(e.Title.trim(), (titleCount.get(e.Title.trim()) ?? 0) + 1);
const generic = (title: string) => /^(будынак|будынкі|будынак \(.*\)|жылы дом|дом|комплекс будынкаў|забудова.*)$/i.test(title.trim());

// --- 3. Descriptions: a sample of object pages ---------------------------------------------------
const SAMPLE = 150;
const picked = sample([...minskObjects].sort((a, b) => (a.Code < b.Code ? -1 : 1)), SAMPLE, 20261124);
const text = (html: string) =>
  html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'");
const descLengths: number[] = [];
let withDescription = 0;
let pageBytes = 0;
const pageFields: Record<string, number> = {};
for (const e of picked) {
  const html = await cachedText(`${SITE}/catalog/${e.Url}`);
  pageBytes += html.length;
  const lines = text(html).split('\n').map((l) => l.trim()).filter(Boolean);
  // The record is the block between the second "Звесткі аб каштоўнасці" and the page footer.
  const start = lines.lastIndexOf('Звесткі аб каштоўнасці');
  const block = lines.slice(start + 1);
  const at = block.indexOf('Апісанне');
  const end = block.findIndex((l, k) => k > at && (/ng-cloak|gallery-primary|^Старонка$|^Банк звестак гісторыка-культурнай спадчыны Беларусі$/.test(l)));
  const description = at === -1 ? '' : block.slice(at + 1, end === -1 ? undefined : end).filter((l) => !/^[\d"=>{}+' ]*$/.test(l) && l !== 'у').join(' ');
  if (description.length >= 40) {
    withDescription++;
    descLengths.push(description.length);
  }
  for (const label of ['Шыфр', 'Катэгорыя каштоўнасці', 'Глава', 'Тып каштоўнасці', 'Падтып каштоўнасці', 'Месца знаходжання', 'Датаванне', 'Стыль', 'Аўтар', 'Матэрыял', 'Памеры']) {
    if (block.includes(label)) pageFields[label] = (pageFields[label] ?? 0) + 1;
  }
}
descLengths.sort((a, b) => a - b);
const q = (xs: number[], p: number) => xs[Math.min(xs.length - 1, Math.floor(p * xs.length))] ?? 0;

// Is there an English version of a record? Three pages are enough to see.
const english: { url: string; status: string; title: string }[] = [];
for (const e of picked.slice(0, 3)) {
  try {
    const html = await cachedText(`${SITE}/en/catalog/${e.Url}`);
    english.push({ url: `/en/catalog/${e.Url}`, status: 'answers', title: (/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '').trim() });
  } catch (err) {
    english.push({ url: `/en/catalog/${e.Url}`, status: String(err).slice(0, 80), title: '' });
  }
}
// What the site says about reuse: the pages a visitor would look at.
const terms: Record<string, string[]> = {};
for (const path of ['/about', '/policy']) {
  const lines = text(await cachedText(`${SITE}${path}`)).split('\n').map((l) => l.trim()).filter(Boolean);
  terms[path] = lines.filter((l) => /ліцэнз|лиценз|licen|аўтарск|авторск|copyright|©|creative commons|выкарыстанн[яі] (матэрыял|звест|інфармац)|перадрук|спасылк/i.test(l)).slice(0, 8);
}

// --- 4. Wikidata: the state code (P632) and the bank identifier (P11184), whole country ------------
const { qidByCode, qidBySlug, coord: wdCoord, items: wdItems } = await heritageWikidata();
const wikidataSide = {
  items_with_P632_or_P11184: wdItems.size,
  distinct_codes_P632: qidByCode.size,
  distinct_identifiers_P11184: qidBySlug.size,
  items_with_coordinates: [...wdItems].filter((x) => wdCoord.has(x)).length,
  bank_objects_whose_code_is_in_wikidata: count(allObjects, (e) => e.Code && qidByCode.has(e.Code.trim())),
  bank_objects_whose_slug_is_in_wikidata: count(allObjects, (e) => qidBySlug.has(e.Url)),
  bank_objects_linked_either_way: count(allObjects, (e) => (e.Code && qidByCode.has(e.Code.trim())) || qidBySlug.has(e.Url)),
};

// --- 5. Minsk objects against Wikidata and OpenStreetMap -------------------------------------------
const con = await openDb({ readOnly: true });
const osmCode = new Map<string, { ref: string; is_place: boolean }>();
for (const r of await rows<{ code: string; ref: string; is_place: boolean }>(
  con,
  `SELECT trim(f.tags['ref:mcrb']) AS code, f.osm_type || '/' || f.osm_id AS ref,
          EXISTS (SELECT 1 FROM place p WHERE p.osm_type = f.osm_type AND p.osm_id = f.osm_id) AS is_place
   FROM feature f WHERE f.in_city AND f.tags['ref:mcrb'] IS NOT NULL ORDER BY is_place, ref`,
)) for (const c of r.code.split(/[;,]\s*/)) osmCode.set(c, { ref: r.ref, is_place: r.is_place });
const osmWikidata = new Map<string, { ref: string; is_place: boolean }>();
for (const r of await rows<{ q: string; ref: string; is_place: boolean }>(
  con,
  `SELECT f.tags['wikidata'] AS q, f.osm_type || '/' || f.osm_id AS ref,
          EXISTS (SELECT 1 FROM place p WHERE p.osm_type = f.osm_type AND p.osm_id = f.osm_id) AS is_place
   FROM feature f WHERE f.in_city AND f.tags['wikidata'] IS NOT NULL ORDER BY is_place, ref`,
)) osmWikidata.set(r.q, { ref: r.ref, is_place: r.is_place });
// Every addressed object of the city, by house number.
const addressed = await rows<{ ref: string; street: string; no: string; lat: number; lon: number; is_place: boolean; routable: boolean }>(
  con,
  `SELECT f.osm_type || '/' || f.osm_id AS ref, f.tags['addr:street'] AS street, f.tags['addr:housenumber'] AS no, f.lat, f.lon,
          p.kind IS NOT NULL AS is_place, coalesce(p.kind IN ('sight', 'nature', 'market'), false) AS routable
   FROM feature f LEFT JOIN place p ON p.osm_type = f.osm_type AND p.osm_id = f.osm_id
   WHERE f.in_city AND f.tags['addr:street'] IS NOT NULL AND f.tags['addr:housenumber'] IS NOT NULL
   ORDER BY routable DESC, is_place DESC, (f.tags['building'] IS NOT NULL) DESC, ref`,
);
const normNo = (s: string) => s.toLowerCase().replace(/\s/g, '').replace(/a/g, 'а').replace(/b/g, 'б').replace(/k/g, 'к');
const byNo = new Map<string, typeof addressed>();
for (const a of addressed) (byNo.get(normNo(a.no)) ?? byNo.set(normNo(a.no), []).get(normNo(a.no))!).push(a);
function byAddress(e: ListExhibit): (typeof addressed)[number] | null {
  if (!filled(e.Address)) return null;
  const no = houseNumber(e.Address!);
  if (no === null) return null;
  const street = e.Address!.replace(/\d+\s?[а-яa-z]?(\s?\/\s?\d+[а-яa-z]?)?\s*$/i, ' ');
  let best: (typeof addressed)[number] | null = null;
  let bestScore = 0;
  for (const a of byNo.get(normNo(no)) ?? []) {
    const s = similarity(street, a.street);
    if (s > bestScore) {
      bestScore = s;
      best = a;
    }
  }
  return bestScore >= 0.99 ? best : null;
}
// A candidate Place within 25 m of the bank's own coordinates.
const placePts = await rows<{ ref: string; lat: number; lon: number; routable: boolean }>(
  con, `SELECT osm_type || '/' || osm_id AS ref, lat, lon, kind IN ('sight', 'nature', 'market') AS routable FROM place`,
);
const routableRefs = new Set(placePts.filter((p) => p.routable).map((p) => p.ref));
const nearPlace = (lat: number, lon: number) => placePts.find((p) => Math.abs(p.lat - lat) < 0.0004 && Math.abs(p.lon - lon) < 0.0006 && haversine(lat, lon, p.lat, p.lon) <= 25) ?? null;

interface WdItem { qid: string; be: string | null; beTarask: string | null; ru: string | null; en: string | null }
const wdArticles = new Map((JSON.parse(readFileSync('out/04-wikidata-items.json', 'utf8')) as WdItem[]).map((i) => [i.qid, Boolean(i.be ?? i.beTarask ?? i.ru ?? i.en)]));
const tally = {
  in_wikidata: 0,
  wikidata_item_has_an_article: 0,
  osm_by_code_tag: 0,
  osm_by_wikidata_tag: 0,
  osm_by_either_key: 0,
  osm_by_address_only: 0,
  osm_by_key_or_address: 0,
  not_found_in_osm: 0,
  not_found_in_osm_immovable: 0,
  not_found_in_osm_immovable_top_level: 0,
  in_neither_wikidata_nor_osm: 0,
  a_candidate_place_within_25_m_of_the_bank_coordinates: 0,
};
const reachedPlaces = new Set<string>();
const reachedRoutable = new Set<string>();
const coordGap: number[] = [];
const addressGap: number[] = [];
const notInOsm: ListExhibit[] = [];
const perObject: Record<string, unknown>[] = [];
for (const e of minskObjects) {
  const qid = qidByCode.get(e.Code.trim()) ?? qidBySlug.get(e.Url) ?? null;
  const viaWd = qid ? osmWikidata.get(qid) ?? null : null;
  const viaCode = osmCode.get(e.Code.trim()) ?? null;
  const viaAddr = byAddress(e);
  const c = coordOf(e);
  const viaPos = c ? nearPlace(c.lat, c.lon) : null;
  const byKey = viaCode ?? viaWd;
  const target = byKey ?? viaAddr;
  if (qid) tally.in_wikidata++;
  if (qid && wdArticles.get(qid)) tally.wikidata_item_has_an_article++;
  if (viaCode) tally.osm_by_code_tag++;
  if (viaWd) tally.osm_by_wikidata_tag++;
  if (byKey) tally.osm_by_either_key++;
  else if (viaAddr) tally.osm_by_address_only++;
  if (target) tally.osm_by_key_or_address++;
  else {
    tally.not_found_in_osm++;
    notInOsm.push(e);
    if (e.FormValue === 'Immovable') {
      tally.not_found_in_osm_immovable++;
      if (!filled(e.ParentCode)) tally.not_found_in_osm_immovable_top_level++;
    }
    if (!qid) tally.in_neither_wikidata_nor_osm++;
  }
  if (viaPos) tally.a_candidate_place_within_25_m_of_the_bank_coordinates++;
  // The Place an object reaches: through a key the object itself carries, or through its address.
  if (target?.is_place) {
    reachedPlaces.add(target.ref);
    if (routableRefs.has(target.ref)) reachedRoutable.add(target.ref);
  }
  if (c && qid && wdCoord.has(qid)) coordGap.push(haversine(c.lat, c.lon, wdCoord.get(qid)!.lat, wdCoord.get(qid)!.lon));
  if (c && viaAddr) addressGap.push(haversine(c.lat, c.lon, viaAddr.lat, viaAddr.lon));
  perObject.push({ code: e.Code, slug: e.Url, title: e.Title, form: e.FormValue, address: e.Address, dating: e.Dating, style: e.Style, qid, osm: target?.ref ?? null, osm_is_place: target?.is_place ?? false, lat: c?.lat ?? null, lon: c?.lon ?? null });
}
coordGap.sort((a, b) => a - b);
addressGap.sort((a, b) => a - b);
// Coordinates shared by several objects are placeholders rather than positions.
const coordUse = new Map<string, number>();
for (const e of minskObjects) {
  const c = coordOf(e);
  if (c) coordUse.set(`${c.lat},${c.lon}`, (coordUse.get(`${c.lat},${c.lon}`) ?? 0) + 1);
}
const sharedCoords = [...coordUse.values()].filter((n) => n > 1).reduce((a, n) => a + n, 0);

const n = minskObjects.length;
const fields = {
  objects: n,
  listed_by_the_site_as_count: first.Count,
  pages_of_24: first.CountPages,
  codes_starting_with_7_in_the_map_data: count(allObjects, (e) => (e.Code ?? '').trim().startsWith('7')),
  top_level: count(minskObjects, (e) => !filled(e.ParentCode)),
  parts_of_a_complex_object: count(minskObjects, (e) => filled(e.ParentCode)),
  complex_objects: count(minskObjects, (e) => e.IsComplex),
  immovable: count(minskObjects, (e) => e.FormValue === 'Immovable'),
  movable: count(minskObjects, (e) => e.FormValue === 'Movable'),
  intangible: count(minskObjects, (e) => e.FormValue === 'Intangible'),
  code: count(minskObjects, (e) => filled(e.Code)),
  category: count(minskObjects, (e) => filled(e.Category) && e.Category !== 'без катэгорыі'),
  type: count(minskObjects, (e) => filled(e.Type)),
  subtype: count(minskObjects, (e) => filled(e.Kind)),
  dating: count(minskObjects, (e) => filled(e.Dating)),
  style: count(minskObjects, (e) => filled(e.Style)),
  street_address: count(minskObjects, (e) => filled(e.Address)),
  street_address_with_house_number: count(minskObjects, (e) => filled(e.Address) && houseNumber(e.Address!) !== null),
  coordinates: count(minskObjects, (e) => coordOf(e) !== null),
  coordinates_shared_with_another_object: sharedCoords,
  picture: count(minskObjects, (e) => (e.FilesList?.length ?? 0) > 0 || filled(e.Preview)),
  distinct_titles: titleCount.size,
  generic_title: count(minskObjects, (e) => generic(e.Title)),
  title_exactly_budynak: titleCount.get('Будынак') ?? 0,
};
console.log('Country:', country);
console.log('Wikidata:', wikidataSide);
console.log(mdTable(['Field (Minsk)', 'Objects', 'Share'], Object.entries(fields).map(([k, v]) => [k, v, pct(v, n)])));
console.log(`Descriptions in a sample of ${SAMPLE} pages: ${withDescription} (${pct(withDescription, SAMPLE)}); length median ${q(descLengths, 0.5)}, quartiles ${q(descLengths, 0.25)}–${q(descLengths, 0.75)} characters`);
console.log('Fields seen on the sampled pages:', pageFields);
console.log('Links (Minsk):', tally, 'candidate Places reached:', reachedPlaces.size, 'of them routable:', reachedRoutable.size);
console.log(`Bank coordinates against Wikidata coordinates: ${coordGap.length} pairs, median ${Math.round(q(coordGap, 0.5))} m, 90th percentile ${Math.round(q(coordGap, 0.9))} m, over 200 m: ${coordGap.filter((d) => d > 200).length}`);
console.log(`Bank coordinates against the OpenStreetMap object at the same address: ${addressGap.length} pairs, median ${Math.round(q(addressGap, 0.5))} m, over 200 m: ${addressGap.filter((d) => d > 200).length}`);
console.log('English pages:', english);
console.log('Statements about reuse on /about and /policy:', terms);
console.log('Not found in OpenStreetMap by a key or an address, by form:', notInOsm.reduce<Record<string, number>>((a, e) => { a[e.FormValue] = (a[e.FormValue] ?? 0) + 1; return a; }, {}));
console.log('first fifteen immovable:', notInOsm.filter((e) => e.FormValue === 'Immovable').slice(0, 15).map((e) => `${e.Code} ${e.Title} — ${e.FullAddress}`));

writeJson('out/12-heritage.json', {
  osm_date: OSM_DATE,
  read_at: new Date().toISOString().slice(0, 10),
  site: SITE,
  country,
  country_list_pages_of_24: countryFirst.CountPages,
  wikidata: wikidataSide,
  minsk_fields: fields,
  minsk_most_frequent_titles: [...titleCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([title, objects]) => ({ title, objects })),
  minsk_types: Object.entries(minskObjects.reduce<Record<string, number>>((a, e) => { a[e.Type ?? '—'] = (a[e.Type ?? '—'] ?? 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]),
  descriptions: { sample: SAMPLE, with_description: withDescription, median_characters: q(descLengths, 0.5), p25: q(descLengths, 0.25), p75: q(descLengths, 0.75), mean_page_bytes: Math.round(pageBytes / SAMPLE), fields_on_pages: pageFields },
  minsk_links: { ...tally, candidate_places_reached: reachedPlaces.size, routable_candidate_places_reached: reachedRoutable.size },
  coordinates_vs_wikidata_m: { pairs: coordGap.length, median: Math.round(q(coordGap, 0.5)), p90: Math.round(q(coordGap, 0.9)), over_200_m: coordGap.filter((d) => d > 200).length },
  coordinates_vs_osm_address_m: { pairs: addressGap.length, median: Math.round(q(addressGap, 0.5)), p90: Math.round(q(addressGap, 0.9)), over_200_m: addressGap.filter((d) => d > 200).length },
  not_found_in_osm: notInOsm.map((e) => ({ code: e.Code, form: e.FormValue, title: e.Title, address: e.FullAddress, type: e.Type, dating: e.Dating })),
  english_pages: english,
  statements_about_reuse: terms,
  requests_full_pass: {
    minsk: { map: 1, list_pages: first.CountPages, object_pages_for_descriptions: n, total: 1 + first.CountPages + n },
    country: { map: 1, list_pages: countryFirst.CountPages, object_pages_for_descriptions: allObjects.length, total: 1 + countryFirst.CountPages + allObjects.length },
  },
  requests_this_run: { web: webStats, wikimedia: wikiStats },
});
writeJson('out/12-heritage-minsk.json', perObject);
console.log('requests:', webStats, wikiStats);
