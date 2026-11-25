// How large the pedestrian network of the whole extract is, by the same walkability rules:
// ADR-0009 builds city data "for a whole region", so the city figure alone is a lower bound.
// Counts are measured; the size is the format's arithmetic (12 bytes per node, 14 per segment).
import { DuckDBInstance } from '@duckdb/node-api';
import { OSM_DATE, PBF, timer, writeJson } from './lib.ts';
import { WALKABLE } from './walkable.ts';

const instance = await DuckDBInstance.create(':memory:', { threads: '8', memory_limit: '12GB', extension_directory: 'data/duckdb-ext' });
const con = await instance.connect();
await con.run('INSTALL spatial; LOAD spatial; SET geometry_always_xy = true;');
const t = timer();
await con.run(`CREATE TABLE w AS SELECT refs FROM ST_ReadOSM('${PBF}') WHERE kind = 'way' AND ${WALKABLE}`);
const r = (
  await con.runAndReadAll(
    `SELECT (SELECT count(*) FROM w)::DOUBLE AS ways,
            (SELECT sum(len(refs) - 1) FROM w)::DOUBLE AS segments,
            (SELECT count(DISTINCT n) FROM (SELECT unnest(refs) AS n FROM w))::DOUBLE AS nodes`,
  )
).getRowObjectsJson()[0] as { ways: number; segments: number; nodes: number };
const result = {
  osm_extract: PBF,
  osm_date: OSM_DATE,
  walkable_ways: r.ways,
  nodes: r.nodes,
  street_segments: r.segments,
  full_graph_bytes_by_formula: 32 + 12 * r.nodes + 4 + 14 * r.segments,
  query_ms: Math.round(t()),
};
writeJson('out/10-country.json', result);
console.log(result);
