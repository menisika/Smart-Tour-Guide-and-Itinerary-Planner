// Pulls out of a regional .osm.pbf every object that could belong to one of the five groups,
// with its tags and one coordinate, and the boundaries of Minsk and the regional centres.
// DuckDB does the scanning; the classification itself is in focus.ts.
import { DuckDBInstance } from '@duckdb/node-api';
import { CAPITAL, REGIONAL_CENTRES, SQL_PREFILTER, type City, type Tags } from './focus.ts';

export interface Candidate {
  type: 'node' | 'way' | 'relation';
  id: number;
  tags: Tags;
  /** A node's own position; for a way its first node; for a relation the first node of its first way. */
  lat: number | null;
  lon: number | null;
}

export async function loadCandidates(pbf: string, opts: { cities?: boolean } = {}): Promise<{ candidates: Candidate[]; cities: City[]; ms: number }> {
  const t0 = Date.now();
  const instance = await DuckDBInstance.create(':memory:', { threads: '8', memory_limit: '12GB', extension_directory: 'data/duckdb-ext' });
  const con = await instance.connect();
  await con.run('INSTALL spatial; LOAD spatial; SET geometry_always_xy = true;');
  const rows = async <T>(sql: string) => (await con.runAndReadAll(sql)).getRowObjectsJson() as T[];

  await con.run(`CREATE TABLE cand AS
    SELECT kind::VARCHAR AS osm_type, id, tags, refs, ref_types::VARCHAR[] AS ref_types, lat, lon
    FROM ST_ReadOSM('${pbf}')
    WHERE tags IS NOT NULL AND cardinality(tags) > 0
      AND (kind IN ('node', 'way') OR tags['type'] IN ('multipolygon', 'boundary'))
      AND ${SQL_PREFILTER}`);
  // One node per way and per relation, for "where is it".
  await con.run(`CREATE TABLE rel_way AS
    SELECT id, refs[list_position(ref_types, 'way')] AS way_id
    FROM cand WHERE osm_type = 'relation' AND list_position(ref_types, 'way') IS NOT NULL`);
  await con.run(`CREATE TABLE rel_way_node AS
    SELECT id AS way_id, refs[1] AS node_id FROM ST_ReadOSM('${pbf}')
    WHERE kind = 'way' AND id IN (SELECT way_id FROM rel_way)`);
  await con.run(`CREATE TABLE anchor AS
    SELECT 'way' AS osm_type, id, refs[1] AS node_id FROM cand WHERE osm_type = 'way'
    UNION ALL
    SELECT 'relation', r.id, n.node_id FROM rel_way r JOIN rel_way_node n ON n.way_id = r.way_id`);
  await con.run(`CREATE TABLE anchor_pt AS
    SELECT id, lat, lon FROM ST_ReadOSM('${pbf}') WHERE kind = 'node' AND id IN (SELECT node_id FROM anchor)`);
  const raw = await rows<{ osm_type: Candidate['type']; id: number; tags: string; lat: number | null; lon: number | null }>(`
    SELECT c.osm_type, c.id::DOUBLE AS id, to_json(c.tags)::VARCHAR AS tags,
           coalesce(c.lat, p.lat) AS lat, coalesce(c.lon, p.lon) AS lon
    FROM cand c
    LEFT JOIN anchor a ON a.osm_type = c.osm_type AND a.id = c.id
    LEFT JOIN anchor_pt p ON p.id = a.node_id
    ORDER BY c.osm_type, c.id`);
  const candidates = raw.map((r): Candidate => ({ type: r.osm_type, id: Number(r.id), tags: JSON.parse(r.tags) as Tags, lat: r.lat === null ? null : Number(r.lat), lon: r.lon === null ? null : Number(r.lon) }));

  let cities: City[] = [];
  if (opts.cities) {
    const ids = [CAPITAL, ...REGIONAL_CENTRES].map((q) => `'${q}'`).join(', ');
    await con.run(`CREATE TABLE city_rel AS
      SELECT id, tags, refs FROM ST_ReadOSM('${pbf}')
      WHERE kind = 'relation' AND tags['boundary'] = 'administrative' AND tags['place'] = 'city' AND tags['wikidata'] IN (${ids})`);
    await con.run(`CREATE TABLE city_way AS
      SELECT id, refs FROM ST_ReadOSM('${pbf}') WHERE kind = 'way' AND id IN (SELECT unnest(refs) FROM city_rel)`);
    await con.run(`CREATE TABLE city_node AS
      SELECT id, lat, lon FROM ST_ReadOSM('${pbf}') WHERE kind = 'node' AND id IN (SELECT unnest(refs) FROM city_way)`);
    const geo = await rows<{ qid: string; name: string; geojson: string; x0: number; y0: number; x1: number; y1: number; km2: number }>(`
      WITH member AS (SELECT r.id AS rel_id, unnest(r.refs) AS way_id FROM city_rel r),
           pts AS (SELECT m.rel_id, w.id, generate_subscripts(w.refs, 1) AS idx, unnest(w.refs) AS node_id
                   FROM member m JOIN city_way w ON w.id = m.way_id),
           lines AS (SELECT p.rel_id, p.id, ST_MakeLine(list(ST_Point(n.lon, n.lat) ORDER BY p.idx)) AS line
                     FROM pts p JOIN city_node n ON n.id = p.node_id GROUP BY p.rel_id, p.id),
           area AS (SELECT rel_id, ST_BuildArea(ST_Collect(list(line))) AS geom FROM lines GROUP BY rel_id)
      SELECT r.tags['wikidata'] AS qid, r.tags['name'] AS name, ST_AsGeoJSON(a.geom)::VARCHAR AS geojson,
             ST_XMin(a.geom) AS x0, ST_YMin(a.geom) AS y0, ST_XMax(a.geom) AS x1, ST_YMax(a.geom) AS y1,
             ST_Area_Spheroid(a.geom) / 1e6 AS km2
      FROM area a JOIN city_rel r ON r.id = a.rel_id ORDER BY km2 DESC`);
    cities = geo.map((g) => ({ qid: g.qid, name: g.name, geometry: JSON.parse(g.geojson) as City['geometry'], bbox: [Number(g.x0), Number(g.y0), Number(g.x1), Number(g.y1)] as [number, number, number, number], km2: Number(g.km2) } as City & { km2: number }));
  }
  return { candidates, cities, ms: Date.now() - t0 };
}
