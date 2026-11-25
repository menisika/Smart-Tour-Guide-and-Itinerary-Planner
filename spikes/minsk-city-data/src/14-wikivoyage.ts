// Wikivoyage, the Russian and the English article on Minsk: how many listings carry coordinates
// and how many of them are not among the candidate Places of OpenStreetMap.
import { readFileSync } from 'node:fs';
import { OSM_DATE, haversine, mdTable, openDb, pct, rows, writeJson } from './lib.ts';
import { bestSimilarity } from './names.ts';
import { action, actionPost, rights, stats } from './wiki.ts';
import { plain, templates } from './wikitext.ts';

const ARTICLES = [
  { lang: 'ru', host: 'ru.wikivoyage.org', title: 'Минск' },
  { lang: 'en', host: 'en.wikivoyage.org', title: 'Minsk' },
] as const;
const LISTING_TEMPLATES = ['listing', 'see', 'do', 'buy', 'eat', 'drink', 'sleep', 'go', 'marker'];

interface Listing {
  lang: string;
  type: string;
  name: string;
  alt: string;
  lat: number | null;
  lon: number | null;
  wikidata: string | null;
  hours: boolean;
  address: boolean;
  url: boolean;
  description: number;
}
const listings: Listing[] = [];
const articles: Record<string, unknown>[] = [];
for (const a of ARTICLES) {
  // Districts would be sub-pages "Title/…": the index shows whether there are any.
  const index = await action<{ query: { allpages: { title: string }[] } }>(a.host, { action: 'query', list: 'allpages', apprefix: `${a.title}/`, aplimit: '50' });
  const titles = [a.title, ...index.query.allpages.map((p) => p.title)];
  const res = await actionPost<{ query: { pages: { title: string; revisions: { revid: number; timestamp: string; slots: { main: { content: string } } }[] }[] } }>(a.host, {
    action: 'query', prop: 'revisions', rvprop: 'content|ids|timestamp', rvslots: 'main', titles: titles.join('|'),
  });
  for (const page of res.query.pages) {
    const rev = page.revisions[0]!;
    const calls = templates(rev.slots.main.content, LISTING_TEMPLATES);
    for (const c of calls) {
      const p = c.params;
      const num = (s: string | undefined) => (s && /^-?\d+(\.\d+)?$/.test(s.trim()) ? Number(s.trim()) : null);
      const qid = (p.wikidata ?? p.wdid ?? '').trim();
      const name = plain(p.name ?? '');
      if (name === '') continue; // a bare map marker inside running text
      listings.push({
        lang: a.lang,
        type: (c.name === 'listing' || c.name === 'marker' ? (p.type ?? 'other') : c.name).trim().toLowerCase(),
        name,
        alt: plain(p.alt ?? ''),
        lat: num(p.lat),
        lon: num(p.long),
        wikidata: /^Q\d+$/.test(qid) ? qid : null,
        hours: (p.hours ?? '').trim() !== '',
        address: (p.address ?? '').trim() !== '',
        url: (p.url ?? '').trim() !== '',
        description: plain(p.content ?? p.description ?? '').length,
      });
    }
    articles.push({ lang: a.lang, title: page.title, revision: rev.revid, edited: rev.timestamp.slice(0, 10), bytes: rev.slots.main.content.length, listings: calls.length, sub_pages: titles.length - 1 });
  }
}

// --- Against the candidate Places ------------------------------------------------------------------
const con = await openDb({ readOnly: true });
interface PlaceRow { ref: string; kind: string; subkind: string; name: string | null; name_be: string | null; name_ru: string | null; name_en: string | null; wikidata: string | null; lat: number; lon: number }
const places = await rows<PlaceRow>(con, `SELECT osm_type || '/' || osm_id AS ref, kind, subkind, name, name_be, name_ru, name_en, wikidata, lat, lon FROM place`);
interface Item { qid: string; labelBe: string | null; labelRu: string | null; labelEn: string | null; ru: string | null; en: string | null }
const items = new Map((JSON.parse(readFileSync('out/04-wikidata-items.json', 'utf8')) as Item[]).map((i) => [i.qid, i]));
const placeByQid = new Map(places.filter((p) => p.wikidata).map((p) => [p.wikidata!, p]));
// Any other named object of OpenStreetMap, to tell "known to the map, not a candidate" from "unknown".
const others = await rows<{ ref: string; name: string | null; name_ru: string | null; name_en: string | null; lat: number; lon: number; what: string | null }>(
  con,
  `SELECT f.osm_type || '/' || f.osm_id AS ref, f.tags['name'] AS name, f.tags['name:ru'] AS name_ru, f.tags['name:en'] AS name_en, f.lat, f.lon,
          coalesce(f.tags['tourism'], f.tags['shop'], f.tags['amenity'], f.tags['leisure'], f.tags['railway'], f.tags['aeroway'], f.tags['office'], f.tags['building']) AS what
   FROM feature f
   WHERE f.in_city AND (f.tags['name'] IS NOT NULL OR f.tags['name:ru'] IS NOT NULL OR f.tags['name:en'] IS NOT NULL)
     AND NOT EXISTS (SELECT 1 FROM place p WHERE p.osm_type = f.osm_type AND p.osm_id = f.osm_id)
     AND f.tags['highway'] IS NULL`,
);
const inside = new Set<number>();
const located = listings.map((l, k) => ({ l, k })).filter((x) => x.l.lat !== null && x.l.lon !== null);
if (located.length > 0) {
  const hit = await rows<{ k: number }>(
    con,
    `SELECT v.k::INTEGER AS k FROM (VALUES ${located.map((x) => `(${x.k}, ${x.l.lon}, ${x.l.lat})`).join(',')}) v(k, lon, lat), city c
     WHERE ST_Contains(c.geom, ST_Point(v.lon, v.lat))`,
  );
  for (const h of hit) inside.add(Number(h.k));
}

type Outcome = 'candidate Place, by Wikidata identifier' | 'candidate Place, by position and name' | 'another object of OpenStreetMap' | 'nothing in OpenStreetMap' | 'outside the city' | 'no coordinates';
const NEAR_M = 150;
const outcome = new Map<Listing, { outcome: Outcome; ref?: string; what?: string; score?: number; dist?: number }>();
listings.forEach((l, k) => {
  if (l.wikidata && placeByQid.has(l.wikidata)) {
    outcome.set(l, { outcome: 'candidate Place, by Wikidata identifier', ref: placeByQid.get(l.wikidata)!.ref, what: placeByQid.get(l.wikidata)!.subkind });
    return;
  }
  if (l.lat === null || l.lon === null) return void outcome.set(l, { outcome: 'no coordinates' });
  if (!inside.has(k)) return void outcome.set(l, { outcome: 'outside the city' });
  const names = [l.name, l.alt];
  let best: { ref: string; what: string; score: number; dist: number } | null = null;
  for (const p of places) {
    if (Math.abs(p.lat - l.lat) > 0.002 || Math.abs(p.lon - l.lon) > 0.0034) continue;
    const dist = haversine(l.lat, l.lon, p.lat, p.lon);
    if (dist > NEAR_M) continue;
    const it = p.wikidata ? items.get(p.wikidata) : undefined;
    const s = bestSimilarity(names, [p.name, p.name_be, p.name_ru, p.name_en, it?.labelRu, it?.labelEn, it?.labelBe, it?.ru, it?.en]).score;
    if (s >= 0.6 && (best === null || s > best.score || (s === best.score && dist < best.dist))) best = { ref: p.ref, what: p.subkind, score: s, dist };
  }
  if (best) return void outcome.set(l, { outcome: 'candidate Place, by position and name', ...best });
  for (const o of others) {
    if (Math.abs(o.lat - l.lat) > 0.002 || Math.abs(o.lon - l.lon) > 0.0034) continue;
    const dist = haversine(l.lat, l.lon, o.lat, o.lon);
    if (dist > NEAR_M) continue;
    const s = bestSimilarity(names, [o.name, o.name_ru, o.name_en]).score;
    if (s >= 0.6 && (best === null || s > best.score)) best = { ref: o.ref, what: o.what ?? 'other', score: s, dist };
  }
  outcome.set(l, best ? { outcome: 'another object of OpenStreetMap', ...best } : { outcome: 'nothing in OpenStreetMap' });
});

const GROUP = (t: string) => (t === 'see' ? 'see' : t === 'do' ? 'do' : ['eat', 'drink'].includes(t) ? 'eat and drink' : t === 'sleep' ? 'sleep' : t === 'buy' ? 'buy' : 'go and other');
const table: (string | number)[][] = [];
const json: Record<string, unknown>[] = [];
for (const lang of ['ru', 'en']) {
  for (const g of ['see', 'do', 'eat and drink', 'buy', 'sleep', 'go and other', 'all']) {
    const set = listings.filter((l) => l.lang === lang && (g === 'all' || GROUP(l.type) === g));
    if (set.length === 0) continue;
    const c = (o: Outcome) => set.filter((l) => outcome.get(l)!.outcome === o).length;
    const withCoord = set.filter((l) => l.lat !== null && l.lon !== null);
    const amongPlaces = c('candidate Place, by Wikidata identifier') + c('candidate Place, by position and name');
    const row = {
      article: lang, group: g, listings: set.length, with_coordinates: withCoord.length, with_wikidata_identifier: set.filter((l) => l.wikidata).length,
      with_hours: set.filter((l) => l.hours).length,
      candidate_place_by_wikidata: c('candidate Place, by Wikidata identifier'), candidate_place_by_position_and_name: c('candidate Place, by position and name'),
      another_osm_object: c('another object of OpenStreetMap'), nothing_in_osm: c('nothing in OpenStreetMap'), outside_the_city: c('outside the city'), no_coordinates: c('no coordinates'),
      with_coordinates_not_among_candidate_places: withCoord.filter((l) => !outcome.get(l)!.outcome.startsWith('candidate Place')).length,
    };
    json.push(row);
    table.push([lang, g, row.listings, row.with_coordinates, row.with_wikidata_identifier, row.with_hours, amongPlaces, row.another_osm_object, row.nothing_in_osm, row.outside_the_city, row.no_coordinates, row.with_coordinates_not_among_candidate_places]);
  }
}
console.log(mdTable(['Article', 'Group', 'Listings', 'With coordinates', 'With Wikidata id', 'With hours', 'Among candidate Places', 'Another OSM object', 'Nothing in OSM', 'Outside the city', 'No coordinates', 'With coordinates, not a candidate Place'], table));
const notPlaces = listings.filter((l) => l.lat !== null && !outcome.get(l)!.outcome.startsWith('candidate Place'));
console.log('\nListings with coordinates that are not candidate Places ("see" and "do" only):');
for (const l of notPlaces.filter((x) => ['see', 'do'].includes(GROUP(x.type)))) {
  const o = outcome.get(l)!;
  console.log(`  ${l.lang} ${l.type} | ${l.name} | ${o.outcome}${o.what ? ` (${o.what}, ${Math.round(o.dist ?? 0)} m)` : ''}`);
}
// Names a listing would give to the Place it matches, where OpenStreetMap has none in that language.
const placeByRef = new Map(places.map((p) => [p.ref, p]));
const nameGain = { ru: 0, en: 0 };
const hoursForVenues = { ru: 0, en: 0 };
for (const l of listings) {
  const o = outcome.get(l)!;
  if (!o.outcome.startsWith('candidate Place') || !o.ref) continue;
  const p = placeByRef.get(o.ref)!;
  if (l.lang === 'ru' && p.name_ru === null) nameGain.ru++;
  if (l.lang === 'en' && p.name_en === null) nameGain.en++;
  if (p.kind === 'venue' && l.hours) hoursForVenues[l.lang as 'ru' | 'en']++;
}
console.log('names gained by matched Places:', nameGain, 'matched Venues with hours in the listing:', hoursForVenues);

// The two articles overlap: the same thing listed in both, by Wikidata identifier or by position and name.
const ru = listings.filter((l) => l.lang === 'ru' && l.lat !== null);
const en = listings.filter((l) => l.lang === 'en' && l.lat !== null);
const shared = en.filter((e) => ru.some((r) => (e.wikidata && e.wikidata === r.wikidata) || haversine(e.lat!, e.lon!, r.lat!, r.lon!) <= 60)).length;

writeJson('out/14-wikivoyage.json', {
  osm_date: OSM_DATE,
  read_at: new Date().toISOString().slice(0, 10),
  articles,
  rule: `a listing is among the candidate Places when its Wikidata identifier is on a Place, or a Place within ${NEAR_M} m has a name similarity of at least 0.6`,
  table: json,
  english_listings_with_coordinates_also_in_the_russian_article: shared,
  listings_see_do_not_candidate_places: notPlaces.filter((x) => ['see', 'do'].includes(GROUP(x.type))).map((l) => ({ lang: l.lang, type: l.type, name: l.name, outcome: outcome.get(l)!.outcome, near: outcome.get(l)!.what ?? null })),
  names_gained_by_matched_places: nameGain,
  matched_venues_with_hours_in_the_listing: hoursForVenues,
  licence_stated_by_the_wiki: { ru: await rights('ru.wikivoyage.org'), en: await rights('en.wikivoyage.org') },
  requests_full_pass: 4,
  requests: stats,
});
console.log('requests:', stats);
