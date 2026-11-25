// Overture Maps places for Minsk: counts by category, which attributes exist and how often they
// are filled, the overlap with the Venues of OpenStreetMap, and what the source would add.
// Only the row groups that overlap the bounding box of the city are read from the public files.
//
//   OVERTURE_RELEASE  a release name such as 2026-11-18.0; the latest one when not set.
import { DuckDBInstance } from '@duckdb/node-api';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { OSM_DATE, haversine, mdTable, openDb, pct, rows, timer, writeJson } from './lib.ts';
import { bestSimilarity } from './names.ts';
import { cachedText, webStats } from './web.ts';

const BUCKET = 'https://overturemaps-us-west-2.s3.amazonaws.com';
const releases = [...(await cachedText(`${BUCKET}/?list-type=2&prefix=release/&delimiter=/`)).matchAll(/<Prefix>release\/([^<\/]+)\/<\/Prefix>/g)].map((m) => m[1]!).sort();
const release = process.env.OVERTURE_RELEASE ?? releases[releases.length - 1]!;
const listing = await cachedText(`${BUCKET}/?list-type=2&prefix=release/${release}/theme=places/type=place/`);
const files = [...listing.matchAll(/<Key>([^<]*\.parquet)<\/Key>[\s\S]*?<Size>(\d+)<\/Size>/g)].map((m) => ({ url: `${BUCKET}/${m[1]}`, bytes: Number(m[2]) }));

const extract = JSON.parse(readFileSync('out/01-extract.json', 'utf8')) as { city_bbox: [number, number, number, number] };
const [w, s, e, n] = extract.city_bbox;
const boundary = JSON.stringify((JSON.parse(readFileSync('out/minsk-boundary.geojson', 'utf8')) as { geometry: unknown }).geometry);

const instance = await DuckDBInstance.create(':memory:', { threads: '4', memory_limit: '8GB', extension_directory: 'data/duckdb-ext' });
const db = await instance.connect();
await db.run('INSTALL spatial; LOAD spatial; INSTALL httpfs; LOAD httpfs; SET geometry_always_xy = true;');
const q = async <T = Record<string, unknown>>(sql: string) => (await db.runAndReadAll(sql)).getRowObjectsJson() as T[];

const LOCAL = `data/overture/minsk-places-${release}.parquet`;
const list = files.map((f) => `'${f.url}'`).join(', ');
const schema = await q<{ column_name: string; column_type: string }>(`DESCRIBE SELECT * FROM read_parquet('${files[0]!.url}')`);
// What the first read predicted and took is kept next to the file, so that later runs can report it.
const READ_LOG = `data/overture/read-${release}.json`;
let readMs = 0;
let predicted: Record<string, unknown> | null = null;
if (existsSync(LOCAL) && existsSync(READ_LOG)) {
  ({ predicted, readMs } = JSON.parse(readFileSync(READ_LOG, 'utf8')) as { predicted: Record<string, unknown>; readMs: number });
} else {
  mkdirSync('data/overture', { recursive: true });
  // What the read will cost, from the file footers alone.
  predicted = (
    await q(`
    WITH m AS (SELECT file_name, row_group_id, path_in_schema, stats_min_value, stats_max_value, total_compressed_size, row_group_num_rows
               FROM parquet_metadata([${list}])),
         g AS (SELECT file_name, row_group_id, any_value(row_group_num_rows) AS rows,
                      max(CASE WHEN path_in_schema = 'bbox, xmin' THEN stats_min_value::DOUBLE END) AS x0,
                      max(CASE WHEN path_in_schema = 'bbox, xmax' THEN stats_max_value::DOUBLE END) AS x1,
                      max(CASE WHEN path_in_schema = 'bbox, ymin' THEN stats_min_value::DOUBLE END) AS y0,
                      max(CASE WHEN path_in_schema = 'bbox, ymax' THEN stats_max_value::DOUBLE END) AS y1,
                      sum(total_compressed_size) AS bytes
               FROM m GROUP BY 1, 2)
    SELECT count(*)::INTEGER AS row_groups, sum(rows)::DOUBLE AS rows_in_theme,
           count(*) FILTER (x0 <= ${e} AND x1 >= ${w} AND y0 <= ${n} AND y1 >= ${s})::INTEGER AS row_groups_to_read,
           sum(bytes) FILTER (x0 <= ${e} AND x1 >= ${w} AND y0 <= ${n} AND y1 >= ${s})::DOUBLE AS bytes_to_read
    FROM g`)
  )[0]!;
  console.log('predicted read:', predicted);
  if (Number(predicted.bytes_to_read) > 100e6) throw new Error('the read would exceed 100 MB: ask before going on');
  const t = timer();
  await db.run(`COPY (
      SELECT id, ST_X(geometry) AS lon, ST_Y(geometry) AS lat, names, taxonomy, basic_category, confidence, operating_status,
             websites, phones, socials, emails, brand, addresses, sources
      FROM read_parquet([${list}])
      WHERE bbox.xmin <= ${e} AND bbox.xmax >= ${w} AND bbox.ymin <= ${n} AND bbox.ymax >= ${s}
    ) TO '${LOCAL}' (FORMAT parquet)`);
  readMs = t();
  writeFileSync(READ_LOG, JSON.stringify({ predicted, readMs, read_at: new Date().toISOString() }));
}
await db.run(`CREATE TABLE ov AS
  SELECT * FROM read_parquet('${LOCAL}') p
  WHERE ST_Contains(ST_GeomFromGeoJSON('${boundary}'), ST_Point(p.lon, p.lat))`);
const inBox = Number((await q<{ c: number }>(`SELECT count(*)::DOUBLE AS c FROM read_parquet('${LOCAL}')`))[0]!.c);
const total = Number((await q<{ c: number }>(`SELECT count(*)::DOUBLE AS c FROM ov`))[0]!.c);

// --- Categories and attributes -------------------------------------------------------------------
const topLevel = await q<{ category: string; places: number }>(`SELECT coalesce(taxonomy.hierarchy[1], '(none)') AS category, count(*)::DOUBLE AS places FROM ov GROUP BY 1 ORDER BY 2 DESC`);
const basic = await q<{ category: string; places: number }>(`SELECT coalesce(basic_category, '(none)') AS category, count(*)::DOUBLE AS places FROM ov GROUP BY 1 ORDER BY 2 DESC LIMIT 40`);
const attributes = (
  await q<Record<string, number>>(`
  SELECT count(*)::DOUBLE AS places,
         count(names."primary")::DOUBLE AS name,
         count(*) FILTER (cardinality(names.common) > 0)::DOUBLE AS name_in_a_stated_language,
         count(*) FILTER (names.common['ru'] IS NOT NULL)::DOUBLE AS name_ru,
         count(*) FILTER (names.common['be'] IS NOT NULL)::DOUBLE AS name_be,
         count(*) FILTER (names.common['en'] IS NOT NULL)::DOUBLE AS name_en,
         count(*) FILTER (regexp_matches(names."primary", '[А-Яа-яЁёІіЎў]'))::DOUBLE AS primary_name_in_cyrillic,
         count(basic_category)::DOUBLE AS basic_category,
         count(taxonomy."primary")::DOUBLE AS taxonomy,
         count(operating_status)::DOUBLE AS operating_status,
         count(confidence)::DOUBLE AS confidence,
         count(*) FILTER (len(websites) > 0)::DOUBLE AS website,
         count(*) FILTER (len(phones) > 0)::DOUBLE AS phone,
         count(*) FILTER (len(socials) > 0)::DOUBLE AS social,
         count(*) FILTER (len(emails) > 0)::DOUBLE AS email,
         count(*) FILTER (brand.names."primary" IS NOT NULL)::DOUBLE AS brand,
         count(*) FILTER (len(addresses) > 0 AND addresses[1].freeform IS NOT NULL)::DOUBLE AS address
  FROM ov`)
)[0]!;
const status = await q<{ operating_status: string; places: number }>(`SELECT coalesce(operating_status, '(none)') AS operating_status, count(*)::DOUBLE AS places FROM ov GROUP BY 1 ORDER BY 2 DESC`);
const confidence = (await q(`SELECT round(quantile_cont(confidence, 0.1), 2) AS p10, round(quantile_cont(confidence, 0.5), 2) AS median, round(quantile_cont(confidence, 0.9), 2) AS p90,
  count(*) FILTER (confidence >= 0.9)::DOUBLE AS at_least_0_9, count(*) FILTER (confidence < 0.5)::DOUBLE AS under_0_5 FROM ov`))[0]!;
const sources = await q<{ dataset: string; license: string; places: number }>(`
  SELECT s.dataset, coalesce(s.license, '(none stated)') AS license, count(DISTINCT id)::DOUBLE AS places
  FROM (SELECT id, unnest(sources) AS s FROM ov) GROUP BY 1, 2 ORDER BY 3 DESC`);
const updated = (await q(`SELECT min(s.update_time) AS oldest, max(s.update_time) AS newest, quantile_disc(s.update_time, 0.5) AS median FROM (SELECT unnest(sources) AS s FROM ov)`))[0]!;

// --- Overlap with OpenStreetMap ---------------------------------------------------------------------
interface Ov { id: string; lon: number; lat: number; name: string | null; names: string[]; top: string | null; basic: string | null; conf: number; status: string | null; website: boolean; phone: boolean }
const ov = (
  await q<{ id: string; lon: number; lat: number; name: string | null; common: Record<string, string> | { key: string; value: string }[] | null; top: string | null; basic: string | null; conf: number; status: string | null; website: boolean; phone: boolean }>(
    `SELECT id, lon, lat, names."primary" AS name, names.common AS common, taxonomy.hierarchy[1] AS top, basic_category AS basic, confidence AS conf,
            operating_status AS status, len(websites) > 0 AS website, len(phones) > 0 AS phone FROM ov`,
  )
).map((r): Ov => {
  const common = Array.isArray(r.common) ? r.common.map((x) => x.value) : Object.values(r.common ?? {});
  return { id: r.id, lon: Number(r.lon), lat: Number(r.lat), name: r.name, names: [r.name, ...common].filter((x): x is string => Boolean(x)), top: r.top, basic: r.basic, conf: Number(r.conf), status: r.status, website: r.website, phone: r.phone };
});
const grid = new Map<string, Ov[]>();
const cell = (lat: number, lon: number) => `${Math.floor(lat / 0.002)}:${Math.floor(lon / 0.0035)}`;
for (const o of ov) (grid.get(cell(o.lat, o.lon)) ?? grid.set(cell(o.lat, o.lon), []).get(cell(o.lat, o.lon))!).push(o);
function near(lat: number, lon: number, metres: number): { o: Ov; dist: number }[] {
  const out: { o: Ov; dist: number }[] = [];
  const cy = Math.floor(lat / 0.002);
  const cx = Math.floor(lon / 0.0035);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      for (const o of grid.get(`${cy + dy}:${cx + dx}`) ?? []) {
        const dist = haversine(lat, lon, o.lat, o.lon);
        if (dist <= metres) out.push({ o, dist });
      }
    }
  }
  return out;
}
const con = await openDb({ readOnly: true });
interface OsmPlace { ref: string; kind: string; subkind: string; names: (string | null)[]; lat: number; lon: number; hours: boolean; website: boolean; phone: boolean }
const osm = (
  await rows<{ ref: string; kind: string; subkind: string; name: string | null; name_ru: string | null; name_be: string | null; name_en: string | null; brand: string | null; alt: string | null; lat: number; lon: number; hours: boolean; website: boolean; phone: boolean }>(
    con,
    `SELECT osm_type || '/' || osm_id AS ref, kind, subkind, name, name_ru, name_be, name_en, tags['brand'] AS brand, tags['alt_name'] AS alt, lat, lon,
            opening_hours IS NOT NULL AS hours, (tags['website'] IS NOT NULL OR tags['contact:website'] IS NOT NULL) AS website,
            (tags['phone'] IS NOT NULL OR tags['contact:phone'] IS NOT NULL) AS phone
     FROM place ORDER BY osm_type, osm_id`,
  )
).map((r): OsmPlace => ({ ref: r.ref, kind: r.kind, subkind: r.subkind, names: [r.name, r.name_ru, r.name_be, r.name_en, r.brand, r.alt], lat: r.lat, lon: r.lon, hours: r.hours, website: r.website, phone: r.phone }));

const RULES = [
  { label: 'within 50 m, name similarity at least 0.8', m: 50, s: 0.8 },
  { label: 'within 100 m, name similarity at least 0.6', m: 100, s: 0.6 },
  { label: 'within 150 m, name similarity at least 0.5', m: 150, s: 0.5 },
];
const venues = osm.filter((p) => p.kind === 'venue');
const matchedOv = RULES.map(() => new Set<string>());
const overlap = RULES.map((rule, k) => {
  let matched = 0;
  let gainsWebsite = 0;
  let gainsPhone = 0;
  let hoursUnknownMatched = 0;
  for (const v of venues) {
    let best: { o: Ov; dist: number; score: number } | null = null;
    for (const c of near(v.lat, v.lon, rule.m)) {
      const score = bestSimilarity(v.names, c.o.names).score;
      if (score >= rule.s && (best === null || score > best.score || (score === best.score && c.dist < best.dist))) best = { ...c, score };
    }
    if (best) {
      matched++;
      matchedOv[k]!.add(best.o.id);
      if (!v.website && best.o.website) gainsWebsite++;
      if (!v.phone && best.o.phone) gainsPhone++;
      if (!v.hours) hoursUnknownMatched++;
    }
  }
  return { rule: rule.label, osm_venues: venues.length, found_in_overture: matched, share: pct(matched, venues.length), of_them_gain_a_website: gainsWebsite, of_them_gain_a_phone: gainsPhone, of_them_without_hours_in_osm: hoursUnknownMatched };
});
// The other direction: Overture's eating and drinking places that match no Venue of OpenStreetMap.
const foodOv = ov.filter((o) => o.top === 'food_and_drink');
function unmatchedFood(k: number, minConf: number): number {
  const rule = RULES[k]!;
  return foodOv.filter((o) => {
    if (o.conf < minConf || matchedOv[k]!.has(o.id)) return false;
    // Not matched as the best candidate of a Venue: is any Venue close with a similar name?
    return !venues.some((v) => Math.abs(v.lat - o.lat) < 0.002 && Math.abs(v.lon - o.lon) < 0.0035 && haversine(v.lat, v.lon, o.lat, o.lon) <= rule.m && bestSimilarity(v.names, o.names).score >= rule.s);
  }).length;
}
const adds = {
  overture_eating_and_drinking_places: foodOv.length,
  of_them_confidence_at_least_0_9: foodOv.filter((o) => o.conf >= 0.9).length,
  not_matched_to_an_osm_venue_any_confidence: unmatchedFood(1, 0),
  not_matched_to_an_osm_venue_confidence_at_least_0_9: unmatchedFood(1, 0.9),
  not_matched_and_no_osm_venue_within_30_m_confidence_at_least_0_9: foodOv.filter((o) => o.conf >= 0.9 && !matchedOv[1]!.has(o.id) && !venues.some((v) => Math.abs(v.lat - o.lat) < 0.0005 && haversine(v.lat, v.lon, o.lat, o.lon) <= 30)).length,
  status_of_eating_and_drinking_places: foodOv.reduce<Record<string, number>>((a, o) => { a[o.status ?? '(none)'] = (a[o.status ?? '(none)'] ?? 0) + 1; return a; }, {}),
};
// Sights: Overture's attractions against the routable candidates.
const routable = osm.filter((p) => ['sight', 'nature', 'market'].includes(p.kind));
const SIGHT_BASIC = new Set([
  'historic_site', 'monument', 'castle', 'place_of_worship', 'christian_place_of_worship', 'jewish_place_of_worship', 'muslim_place_of_worship',
  'museum', 'art_gallery', 'theatre_venue', 'performing_arts_venue', 'zoo', 'aquarium', 'sculpture_statue', 'park', 'national_park', 'garden', 'nature_reserve',
]);
const sightOv = ov.filter((o) => SIGHT_BASIC.has(o.basic ?? ''));
const sightUnmatched = sightOv.filter((o) => !routable.some((p) => Math.abs(p.lat - o.lat) < 0.002 && Math.abs(p.lon - o.lon) < 0.0035 && haversine(p.lat, p.lon, o.lat, o.lon) <= 100 && bestSimilarity(p.names, o.names).score >= 0.6));
const sights = {
  overture_places_in_sight_categories: sightOv.length,
  not_matched_to_a_routable_candidate: sightUnmatched.length,
  of_them_confidence_at_least_0_9: sightUnmatched.filter((o) => o.conf >= 0.9).length,
  by_category: Object.entries(sightOv.reduce<Record<string, { places: number; unmatched: number }>>((a, o) => {
    const c = (a[o.basic!] ??= { places: 0, unmatched: 0 });
    c.places++;
    if (sightUnmatched.includes(o)) c.unmatched++;
    return a;
  }, {})).sort((x, y) => y[1].places - x[1].places),
  examples_unmatched_high_confidence: sightUnmatched.filter((o) => o.conf >= 0.9).slice(0, 15).map((o) => `${o.name} [${o.basic}]`),
  examples_unmatched_historic_site: sightUnmatched.filter((o) => o.basic === 'historic_site').sort((x, y) => y.conf - x.conf).slice(0, 15).map((o) => `${o.name} (${o.conf.toFixed(2)})`),
};

console.log(`release ${release}; files ${files.length}; places in the box ${inBox}; in the city ${total}`);
console.log(mdTable(['Top level of the taxonomy', 'Places'], topLevel.map((r) => [r.category, r.places])));
console.log(mdTable(['Attribute', 'Places', 'Share'], Object.entries(attributes).map(([k, v]) => [k, v, pct(Number(v), total)])));
console.log('operating_status:', status, 'confidence:', confidence);
console.log('sources:', sources);
console.log(mdTable(['Rule', 'Venues', 'Found in Overture', 'Share', 'Gain a website', 'Gain a phone'], overlap.map((o) => [o.rule, o.osm_venues, o.found_in_overture, o.share, o.of_them_gain_a_website, o.of_them_gain_a_phone])));
console.log('adds:', adds);
console.log('sights:', sights);

writeJson('out/15-overture.json', {
  osm_date: OSM_DATE,
  read_at: new Date().toISOString().slice(0, 10),
  release,
  releases_published: releases,
  files_in_the_places_theme: files.length,
  bytes_in_the_places_theme: files.reduce((a, f) => a + f.bytes, 0),
  predicted_read: predicted,
  read_ms: Math.round(readMs),
  schema_columns: schema.map((c) => `${c.column_name}: ${c.column_type.length > 120 ? `${c.column_type.slice(0, 117)}...` : c.column_type}`),
  has_an_opening_hours_column: schema.some((c) => /hour/i.test(c.column_name) || /opening|hours/i.test(c.column_type)),
  places_in_the_bounding_box: inBox,
  places_in_the_city: total,
  by_top_level_of_taxonomy: topLevel,
  by_basic_category_top_40: basic,
  attributes,
  operating_status: status,
  confidence,
  sources,
  source_update_time: updated,
  overlap_with_osm_venues: overlap,
  what_it_would_add: adds,
  sights,
  requests: webStats,
});
