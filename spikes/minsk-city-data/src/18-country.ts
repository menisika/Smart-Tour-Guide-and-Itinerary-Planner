// Size of a country-wide base: candidate Places by kind for the whole extract, Wikidata items of
// the country, and from these an estimate of rows and megabytes in Postgres if every candidate
// Place of Belarus were kept with its links to sources and the provenance of each attribute.
// Counts are measured; the megabytes are arithmetic on stated assumptions.
import { DuckDBInstance } from '@duckdb/node-api';
import { readFileSync } from 'node:fs';
import { OSM_DATE, PBF, mdTable, openDb, rows, timer, writeJson } from './lib.ts';
import { heritageWikidata } from './heritage-wd.ts';
import { KIND, SUBKIND } from './kinds.ts';
import { sparql, stats } from './wiki.ts';

const instance = await DuckDBInstance.create(':memory:', { threads: '8', memory_limit: '12GB', extension_directory: 'data/duckdb-ext' });
const con = await instance.connect();
await con.run('INSTALL spatial; LOAD spatial; SET geometry_always_xy = true;');
const q = async <T = Record<string, unknown>>(sql: string) => (await con.runAndReadAll(sql)).getRowObjectsJson() as T[];
const t = timer();

// --- 1. Candidate Places of the whole extract -------------------------------------------------------
// Every tagged node, way and area relation that could match a rule. No geometry is built: the only
// rule that needs an area (named water of at least one hectare) is handled below.
await con.run(`CREATE TABLE obj AS
  SELECT kind AS osm_type, id, tags, refs
  FROM ST_ReadOSM('${PBF}')
  WHERE tags IS NOT NULL AND cardinality(tags) > 0
    AND (kind IN ('node', 'way') OR tags['type'] IN ('multipolygon', 'boundary'))
    AND (tags['historic'] IS NOT NULL OR tags['tourism'] IS NOT NULL OR tags['amenity'] IS NOT NULL OR tags['leisure'] IS NOT NULL
         OR tags['natural'] IN ('water', 'beach') OR tags['boundary'] = 'protected_area'
         OR (tags['building'] IS NOT NULL AND (tags['wikidata'] IS NOT NULL OR tags['heritage'] IS NOT NULL)))`);
// Area of the named water bodies drawn as closed ways; a relation is taken to be large enough.
await con.run(`CREATE TABLE water AS
  SELECT id, refs FROM obj WHERE osm_type = 'way' AND tags['natural'] = 'water' AND tags['name'] IS NOT NULL
    AND refs[1] = refs[len(refs)] AND len(refs) >= 4`);
await con.run(`CREATE TABLE water_node AS
  SELECT id, lat, lon FROM ST_ReadOSM('${PBF}') WHERE kind = 'node' AND id IN (SELECT unnest(refs) FROM water)`);
await con.run(`CREATE TABLE water_area AS
  WITH pts AS (SELECT id, generate_subscripts(refs, 1) AS idx, unnest(refs) AS node_id FROM water)
  SELECT p.id, ST_Area_Spheroid(ST_MakeValid(ST_MakePolygon(ST_MakeLine(list(ST_Point(n.lon, n.lat) ORDER BY p.idx))))) AS area_m2
  FROM pts p JOIN water_node n ON n.id = p.node_id GROUP BY p.id HAVING count(*) >= 4`);
await con.run(`CREATE TABLE place AS
  WITH o AS (
         SELECT obj.osm_type, obj.id, obj.tags,
                CASE WHEN obj.osm_type = 'relation' THEN 1e9 WHEN wa.area_m2 IS NOT NULL THEN wa.area_m2 ELSE 0 END AS area_m2
         FROM obj LEFT JOIN water_area wa ON obj.osm_type = 'way' AND wa.id = obj.id),
       c AS (SELECT *, ${SUBKIND} AS subkind FROM o)
  SELECT *, ${KIND} AS kind FROM c WHERE subkind IS NOT NULL AND subkind <> 'embankment'`);
const scanMs = t();

interface KindRow { kind: string; places: number; named: number; wikidata: number; opening_hours: number; nodes: number; ways: number; relations: number }
const COUNTS = `count(*)::DOUBLE AS places, count(tags['name'])::DOUBLE AS named, count(tags['wikidata'])::DOUBLE AS wikidata,
  count(tags['opening_hours'])::DOUBLE AS opening_hours,
  count(*) FILTER (osm_type = 'node')::DOUBLE AS nodes, count(*) FILTER (osm_type = 'way')::DOUBLE AS ways, count(*) FILTER (osm_type = 'relation')::DOUBLE AS relations`;
const byKind = await q<KindRow>(`SELECT kind, ${COUNTS} FROM place GROUP BY 1 ORDER BY 2 DESC`);
const allKinds = (await q<KindRow>(`SELECT 'all' AS kind, ${COUNTS} FROM place`))[0]!;
const bySubkind = await q<{ kind: string; subkind: string; places: number }>(`SELECT kind, subkind, count(*)::DOUBLE AS places FROM place GROUP BY 1, 2 ORDER BY 1, 3 DESC`);
// What a Place row would have to hold, measured on the candidates themselves.
const shape = (
  await q<Record<string, number>>(`
  WITH kv AS (SELECT osm_type, id, unnest(map_keys(tags)) AS k, unnest(map_values(tags)) AS v FROM place)
  SELECT (SELECT count(*) FROM place)::DOUBLE AS places,
         count(*)::DOUBLE AS tags,
         count(*) FILTER (k = 'name' OR k LIKE 'name:%' OR k IN ('alt_name', 'old_name', 'official_name', 'short_name', 'int_name', 'loc_name'))::DOUBLE AS name_tags,
         avg(strlen(k))::DOUBLE AS mean_key_bytes,
         avg(strlen(v))::DOUBLE AS mean_value_bytes,
         avg(strlen(v)) FILTER (k = 'name' OR k LIKE 'name:%')::DOUBLE AS mean_name_bytes
  FROM kv`)
)[0]!;

// --- 2. Wikidata for the country ------------------------------------------------------------------
const one = async (query: string) => Number((await sparql(query))[0]?.n?.value ?? NaN);
const BY = `?item wdt:P17 wd:Q184 ; wdt:P625 ?c .`;
const wikidata = {
  items_with_coordinates_in_belarus: await one(`SELECT (COUNT(DISTINCT ?item) AS ?n) WHERE { ${BY} }`),
  of_them_with_an_article_in_be: await one(`SELECT (COUNT(DISTINCT ?item) AS ?n) WHERE { ${BY} ?a schema:about ?item ; schema:isPartOf <https://be.wikipedia.org/> }`),
  of_them_with_an_article_in_ru: await one(`SELECT (COUNT(DISTINCT ?item) AS ?n) WHERE { ${BY} ?a schema:about ?item ; schema:isPartOf <https://ru.wikipedia.org/> }`),
  of_them_with_an_article_in_en: await one(`SELECT (COUNT(DISTINCT ?item) AS ?n) WHERE { ${BY} ?a schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }`),
};
const heritage = await heritageWikidata();
const heritageSide = {
  items_with_state_code_P632_or_bank_identifier_P11184: heritage.items.size,
  distinct_state_codes_P632: heritage.qidByCode.size,
  distinct_bank_identifiers_P11184: heritage.qidBySlug.size,
  of_them_with_coordinates: [...heritage.items].filter((x) => heritage.coord.has(x)).length,
};
const osmWikidata = Number((await q<{ n: number }>(`SELECT count(DISTINCT tags['wikidata'])::DOUBLE AS n FROM place WHERE tags['wikidata'] IS NOT NULL`))[0]!.n);

// --- 3. Postgres: rows and megabytes ---------------------------------------------------------------
// Assumptions, per row. A heap tuple costs 24 bytes of header plus a 4-byte line pointer; values
// are padded to 8 bytes. Indexes are taken as a share of the heap they index.
const minsk = JSON.parse(readFileSync('out/02-places.json', 'utf8')) as { all_kinds_together: { places: number; as_area: number; wikidata: number } };
const knowledge = JSON.parse(readFileSync('out/04-knowledge.json', 'utf8')) as { osm_side: { whole_city_every_kind: { items: number; be: number; be_tarask: number; ru: number; en: number; photo_p18: number } } };
const k = knowledge.osm_side.whole_city_every_kind;
// Vertices of the boundary of an area Place, measured on the candidates of Minsk.
const cityDb = await openDb({ readOnly: true });
const meanVertices = Number((await rows<{ v: number }>(cityDb, `SELECT avg(ST_NPoints(area))::DOUBLE AS v FROM place WHERE area IS NOT NULL`))[0]!.v);
const A = {
  tuple_overhead_bytes: 28,
  place_row_payload_bytes: 96, // identifier, kind, point with SRID, parent, status, visit minutes, outside/inside, version, checked-at
  attribute_row_fixed_bytes: 40, // place, attribute key id, source record, licence id, retrieved-at, checked-at, confidence
  name_row_fixed_bytes: 32, // place, language, kind of name, source record, retrieved-at
  link_row_bytes: 72, // place, source, external identifier, revision, retrieved-at, how matched, score
  boundary_bytes_per_vertex: 16,
  boundary_fixed_bytes: 48,
  mean_vertices_of_an_area_place: Math.round(meanVertices * 10) / 10, // measured on the candidates of Minsk
  share_of_places_that_are_areas: minsk.all_kinds_together.as_area / minsk.all_kinds_together.places,
  links_per_place_openstreetmap: 1,
  // per Place that carries a Wikidata identifier, as measured in Minsk: the item, its articles, its photo
  links_per_wikidata_place: 1 + (k.be + k.be_tarask + k.ru + k.en + k.photo_p18) / k.items,
  index_share_of_heap: 0.6,
  gist_index_bytes_per_place: 64,
};
const pad = (x: number) => Math.ceil(x / 8) * 8;
function estimate(places: number, withWikidata: number) {
  const tagsPerPlace = shape.tags! / shape.places!;
  const namesPerPlace = shape.name_tags! / shape.places!;
  const attrsPerPlace = tagsPerPlace - namesPerPlace;
  const rowsPlace = places;
  const rowsName = Math.round(places * namesPerPlace);
  const rowsAttr = Math.round(places * attrsPerPlace);
  const rowsBoundary = Math.round(places * A.share_of_places_that_are_areas);
  const rowsLink = Math.round(places * A.links_per_place_openstreetmap + withWikidata * A.links_per_wikidata_place);
  const bytes = {
    place: rowsPlace * pad(A.tuple_overhead_bytes + A.place_row_payload_bytes),
    place_name: rowsName * pad(A.tuple_overhead_bytes + A.name_row_fixed_bytes + shape.mean_name_bytes!),
    place_attribute: rowsAttr * pad(A.tuple_overhead_bytes + A.attribute_row_fixed_bytes + shape.mean_value_bytes!),
    place_boundary: rowsBoundary * pad(A.tuple_overhead_bytes + A.boundary_fixed_bytes + A.mean_vertices_of_an_area_place * A.boundary_bytes_per_vertex),
    place_source_link: rowsLink * pad(A.tuple_overhead_bytes + A.link_row_bytes),
  };
  const heap = Object.values(bytes).reduce((a, b) => a + b, 0);
  const indexes = heap * A.index_share_of_heap + places * A.gist_index_bytes_per_place;
  const mb = (b: number) => Math.round(b / 1e5) / 10;
  return {
    places,
    rows: { place: rowsPlace, place_name: rowsName, place_attribute: rowsAttr, place_boundary: rowsBoundary, place_source_link: rowsLink, total: rowsPlace + rowsName + rowsAttr + rowsBoundary + rowsLink },
    megabytes: { ...Object.fromEntries(Object.entries(bytes).map(([n, b]) => [n, mb(b)])), heap: mb(heap), indexes: mb(indexes), total: mb(heap + indexes) },
  };
}
const routable = byKind.filter((r) => ['sight', 'nature', 'market'].includes(r.kind));
const estimates = {
  minsk_every_candidate: estimate(minsk.all_kinds_together.places, minsk.all_kinds_together.wikidata),
  belarus_every_candidate: estimate(allKinds.places, allKinds.wikidata),
  belarus_sights_nature_markets: estimate(routable.reduce((a, r) => a + r.places, 0), routable.reduce((a, r) => a + r.wikidata, 0)),
  // If every Wikidata item with coordinates and every heritage object became a Place as well.
  belarus_every_candidate_plus_wikidata_and_heritage: estimate(
    allKinds.places + (wikidata.items_with_coordinates_in_belarus - osmWikidata),
    wikidata.items_with_coordinates_in_belarus,
  ),
};

console.log(`scan and classification: ${Math.round(scanMs)} ms`);
console.log(mdTable(['Kind', 'Candidates', 'With a name', 'With Wikidata', 'With opening hours', 'Nodes', 'Ways', 'Relations'],
  [...byKind, allKinds].map((r) => [r.kind, r.places, r.named, r.wikidata, r.opening_hours, r.nodes, r.ways, r.relations])));
console.log('shape of a candidate:', shape, 'tags per candidate:', (shape.tags! / shape.places!).toFixed(2));
console.log('Wikidata:', wikidata, heritageSide, 'distinct Wikidata identifiers on candidates:', osmWikidata);
for (const [name, e] of Object.entries(estimates)) console.log(name, JSON.stringify(e));

writeJson('out/18-country.json', {
  osm_extract: PBF,
  osm_date: OSM_DATE,
  wikidata_read_at: new Date().toISOString().slice(0, 10),
  scan_ms: Math.round(scanMs),
  by_kind: byKind,
  all_kinds: allKinds,
  by_rule: bySubkind,
  notes: ['embankments are left out (they need geometry to be counted once per street)', 'a named water body drawn as a relation is taken to be at least one hectare'],
  candidate_shape: { ...shape, tags_per_candidate: shape.tags! / shape.places!, name_tags_per_candidate: shape.name_tags! / shape.places! },
  wikidata,
  heritage_in_wikidata: heritageSide,
  distinct_wikidata_identifiers_on_candidates: osmWikidata,
  assumptions: A,
  estimates,
  requests: stats,
});
console.log('requests:', stats);
