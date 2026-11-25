// Cuts the city out of the regional OpenStreetMap extract into a local DuckDB file.
//
//   city      one row: the administrative boundary as a polygon
//   node      every node inside the boundary's bounding box plus a margin
//   way       every way with at least one node in that box; way_line has its geometry
//   rel       every relation with a member in the box; rel_area has multipolygon geometry
//   feature   every tagged object with one representative point and "is it inside the city"
//
// Everything after this script reads out/minsk.duckdb and never the .osm.pbf again.
import { rmSync } from 'node:fs';
import { CITY_WIKIDATA, DB_FILE, OSM_DATE, PBF, openDb, rows, scalar, timer, writeJson } from './lib.ts';

const MARGIN_DEG_LAT = 0.02; // about 2.2 km
const MARGIN_DEG_LON = 0.035; // about 2.3 km at 54° N

rmSync(DB_FILE, { force: true });
rmSync(`${DB_FILE}.wal`, { force: true });
const con = await openDb();
const total = timer();
const steps: Record<string, number> = {};
async function step(name: string, sql: string): Promise<void> {
  const t = timer();
  await con.run(sql);
  steps[name] = Math.round(t());
  console.log(`${name}: ${steps[name]} ms`);
}

// --- 1. The boundary relation, its ways and their nodes -------------------------------------
await step(
  'boundary relation',
  `CREATE TABLE city_rel AS
   SELECT id, tags, refs, ref_roles, ref_types
   FROM ST_ReadOSM('${PBF}')
   WHERE kind = 'relation' AND tags['boundary'] = 'administrative' AND tags['wikidata'] = '${CITY_WIKIDATA}'`,
);
const candidates = await rows(
  con,
  `SELECT id::DOUBLE AS id, tags['name'] AS name, tags['admin_level'] AS admin_level, len(refs) AS members FROM city_rel`,
);
console.log('boundary candidates:', candidates);
if (candidates.length !== 1) throw new Error(`expected exactly one boundary relation, found ${candidates.length}`);

await step(
  'boundary ways',
  `CREATE TABLE city_way AS
   SELECT id, refs FROM ST_ReadOSM('${PBF}')
   WHERE kind = 'way' AND id IN (SELECT unnest(refs) FROM city_rel)`,
);
await step(
  'boundary nodes',
  `CREATE TABLE city_node AS
   SELECT id, lat, lon FROM ST_ReadOSM('${PBF}')
   WHERE kind = 'node' AND id IN (SELECT unnest(refs) FROM city_way)`,
);
await step(
  'boundary polygon',
  `CREATE TABLE city AS
   WITH pts AS (SELECT id, generate_subscripts(refs, 1) AS idx, unnest(refs) AS node_id FROM city_way),
        lines AS (
          SELECT p.id, ST_MakeLine(list(ST_Point(n.lon, n.lat) ORDER BY p.idx)) AS line
          FROM pts p JOIN city_node n ON n.id = p.node_id GROUP BY p.id)
   SELECT (SELECT id FROM city_rel) AS rel_id,
          (SELECT tags FROM city_rel) AS tags,
          ST_BuildArea(ST_Collect(list(line))) AS geom
   FROM lines`,
);
const city = (
  await rows<{ km2: number; parts: number; xmin: number; ymin: number; xmax: number; ymax: number; valid: boolean }>(
    con,
    `SELECT ST_Area_Spheroid(geom) / 1e6 AS km2, ST_NGeometries(geom) AS parts, ST_IsValid(geom) AS valid,
            ST_XMin(geom) AS xmin, ST_YMin(geom) AS ymin, ST_XMax(geom) AS xmax, ST_YMax(geom) AS ymax
     FROM city`,
  )
)[0]!;
console.log('city polygon:', city);
if (!city.valid || !(city.km2 > 100 && city.km2 < 1000)) throw new Error('boundary polygon looks wrong');

const box = {
  xmin: city.xmin - MARGIN_DEG_LON,
  xmax: city.xmax + MARGIN_DEG_LON,
  ymin: city.ymin - MARGIN_DEG_LAT,
  ymax: city.ymax + MARGIN_DEG_LAT,
};

// --- 2. Raw objects of the box ------------------------------------------------------------
await step(
  'nodes in box',
  `CREATE TABLE node AS
   SELECT id, lat, lon, tags FROM ST_ReadOSM('${PBF}')
   WHERE kind = 'node' AND lon BETWEEN ${box.xmin} AND ${box.xmax} AND lat BETWEEN ${box.ymin} AND ${box.ymax}`,
);
await step(
  'way ids touching box',
  `CREATE TEMP TABLE way_hit AS
   SELECT DISTINCT w.id
   FROM (SELECT id, unnest(refs) AS node_id FROM ST_ReadOSM('${PBF}') WHERE kind = 'way') w
   SEMI JOIN node n ON n.id = w.node_id`,
);
await step(
  'ways',
  `CREATE TABLE way AS
   SELECT id, tags, refs FROM ST_ReadOSM('${PBF}')
   WHERE kind = 'way' AND id IN (SELECT id FROM way_hit)`,
);
await step(
  'relations',
  `CREATE TABLE rel AS
   WITH allr AS MATERIALIZED (
          SELECT id, tags, refs, ref_roles, ref_types FROM ST_ReadOSM('${PBF}') WHERE kind = 'relation'),
        m AS (SELECT id, unnest(refs) AS ref, unnest(ref_types) AS typ FROM allr),
        hit AS (
          SELECT DISTINCT id FROM m
          WHERE (typ = 'way' AND ref IN (SELECT id FROM way)) OR (typ = 'node' AND ref IN (SELECT id FROM node)))
   SELECT allr.* FROM allr SEMI JOIN hit USING (id)`,
);

// --- 3. Geometry ----------------------------------------------------------------------------
await step(
  'way lines',
  `CREATE TABLE way_line AS
   WITH pts AS (SELECT id, generate_subscripts(refs, 1) AS idx, unnest(refs) AS node_id FROM way)
   SELECT p.id,
          ST_MakeLine(list(ST_Point(n.lon, n.lat) ORDER BY p.idx)) AS line,
          count(*) AS n_pts
   FROM pts p JOIN node n ON n.id = p.node_id
   GROUP BY p.id
   HAVING count(*) >= 2`,
);
await step(
  'relation areas',
  `CREATE TABLE rel_area AS
   WITH m AS (
          SELECT id, unnest(refs) AS ref, unnest(ref_types) AS typ
          FROM rel WHERE tags['type'] IN ('multipolygon', 'boundary')),
        agg AS (
          SELECT m.id, count(*) AS n_ways, count(wl.id) AS n_found,
                 ST_BuildArea(ST_Collect(list(wl.line) FILTER (wl.line IS NOT NULL))) AS geom
          FROM m LEFT JOIN way_line wl ON wl.id = m.ref
          WHERE m.typ = 'way'
          GROUP BY m.id)
   SELECT id, geom, n_ways = n_found AS complete
   FROM agg WHERE geom IS NOT NULL AND NOT ST_IsEmpty(geom)`,
);

// --- 4. One row per tagged object ------------------------------------------------------------
// "area" is a polygon where the object is one (closed way, multipolygon), otherwise NULL.
// "pt" is a point guaranteed to lie on the object: used for "inside the city" and for distances.
await step(
  'features',
  `CREATE TABLE feature AS
   WITH w AS (
          SELECT w.id, w.tags, wl.line, wl.n_pts, len(w.refs) AS n_refs,
                 (w.refs[1] = w.refs[len(w.refs)] AND len(w.refs) >= 4 AND wl.n_pts = len(w.refs)) AS closed
          FROM way w JOIN way_line wl ON wl.id = w.id
          WHERE w.tags IS NOT NULL AND cardinality(w.tags) > 0),
        wa AS (
          SELECT id, tags, closed,
                 CASE WHEN closed AND coalesce(tags['area'], '') <> 'no' AND tags['highway'] IS NULL
                           AND tags['barrier'] IS NULL
                      THEN ST_MakeValid(ST_MakePolygon(line)) END AS area,
                 line
          FROM w),
        u AS (
          SELECT 'node' AS osm_type, id AS osm_id, tags, NULL::GEOMETRY AS area, ST_Point(lon, lat) AS pt
          FROM node WHERE tags IS NOT NULL AND cardinality(tags) > 0
          UNION ALL
          SELECT 'way', id, tags, area,
                 CASE WHEN area IS NOT NULL AND NOT ST_IsEmpty(area) THEN ST_PointOnSurface(area)
                      ELSE ST_LineInterpolatePoint(line, 0.5) END
          FROM wa
          UNION ALL
          SELECT 'relation', r.id, r.tags, a.geom, ST_PointOnSurface(a.geom)
          FROM rel r JOIN rel_area a ON a.id = r.id
          WHERE a.complete)
   SELECT u.osm_type, u.osm_id, u.tags, u.area, u.pt,
          ST_X(u.pt) AS lon, ST_Y(u.pt) AS lat,
          CASE WHEN u.area IS NOT NULL THEN ST_Area_Spheroid(u.area) END AS area_m2,
          ST_Contains(c.geom, u.pt) AS in_city
   FROM u, city c
   WHERE u.pt IS NOT NULL`,
);

// --- 5. Summary ------------------------------------------------------------------------------
const counts = (
  await rows(
    con,
    `SELECT (SELECT count(*) FROM node)::DOUBLE AS nodes_in_box,
            (SELECT count(*) FROM way)::DOUBLE AS ways_in_box,
            (SELECT count(*) FROM rel)::DOUBLE AS relations_in_box,
            (SELECT count(*) FROM feature)::DOUBLE AS tagged_objects_in_box,
            (SELECT count(*) FROM feature WHERE in_city)::DOUBLE AS tagged_objects_in_city`,
  )
)[0];

// The boundary as GeoJSON, for "pmtiles extract --region".
const geojson = await scalar<string>(con, `SELECT ST_AsGeoJSON(geom) FROM city`);
writeJson('out/minsk-boundary.geojson', {
  type: 'Feature',
  properties: { source: `OpenStreetMap relation ${candidates[0]!.id}, Geofabrik extract ${OSM_DATE}` },
  geometry: JSON.parse(geojson),
});

const summary = {
  osm_extract: PBF,
  osm_date: OSM_DATE,
  boundary_relation: candidates[0],
  city_km2: Number(city.km2.toFixed(2)),
  city_polygon_parts: Number(city.parts),
  city_bbox: [city.xmin, city.ymin, city.xmax, city.ymax],
  working_box: box,
  counts,
  step_ms: steps,
  total_ms: Math.round(total()),
};
writeJson('out/01-extract.json', summary);
console.log(summary);
