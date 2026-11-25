// Builds the pedestrian graph of the city (ADR-0009) and measures it:
// node and edge counts, size of the compact binary form, build time, and the time of a
// one-to-many shortest-path search over the whole city in this Node.js process.
import { brotliCompressSync, constants as zc, gzipSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';
import { CENTRE, OSM_DATE, STATION, haversine, openDb, rows, timer, writeJson } from './lib.ts';
import {
  FLAG_BRIDGE, FLAG_BUSY, FLAG_CROSSING, FLAG_ROAD, FLAG_STEPS, FLAG_TUNNEL, FLAG_UNPAVED,
  MAX_LEN_DM, NodeIndex, Searcher, UNREACHED, buildGraph, components, deserialize, serialize,
  type Graph, type UndirectedEdge,
} from './graph.ts';
import { FLAGS, WALKABLE, t } from './walkable.ts';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;
const round1 = (x: number) => Math.round(x * 10) / 10;
function sizes(bytes: Uint8Array): { raw: number; gzip: number; brotli: number } {
  return {
    raw: bytes.byteLength,
    gzip: gzipSync(bytes, { level: 9 }).byteLength,
    brotli: brotliCompressSync(bytes, { params: { [zc.BROTLI_PARAM_QUALITY]: 9, [zc.BROTLI_PARAM_LGWIN]: 24 } }).byteLength,
  };
}

// --- 1. Read walkable ways and their nodes from the city database ------------------------------
const total = timer();
const con = await openDb({ readOnly: true });
let tm = timer();
await con.run(`CREATE TEMP TABLE walk AS SELECT id, refs, ${FLAGS} AS flags, ${t('highway')} AS highway FROM way WHERE ${WALKABLE}`);
await con.run(`CREATE TEMP TABLE walk_pt AS SELECT id AS way_id, generate_subscripts(refs, 1) AS idx, unnest(refs) AS node_id, flags FROM walk`);
await con.run(`CREATE TEMP TABLE walk_node AS
  SELECT n.id, n.lat, n.lon, ST_Contains(c.geom, ST_Point(n.lon, n.lat)) AS in_city
  FROM node n, city c WHERE n.id IN (SELECT node_id FROM walk_pt)`);
// The largest part of the boundary: the city proper, without its exclaves.
const mainPart = (await rows<{ wkt: string }>(con, `SELECT ST_AsText(g) AS wkt FROM (SELECT unnest(ST_Dump(geom)).geom AS g FROM city) ORDER BY ST_Area(g) DESC LIMIT 1`))[0]!.wkt;
const inMainIds = new Set(((await con.runAndReadAll(`SELECT id::DOUBLE FROM walk_node WHERE ST_Contains(ST_GeomFromText('${mainPart}'), ST_Point(lon, lat))`)).getColumns()[0] as number[]));
const ptCols = (await con.runAndReadAll(`SELECT way_id::DOUBLE, node_id::DOUBLE, flags::INTEGER FROM walk_pt ORDER BY way_id, idx`)).getColumns();
const nodeCols = (await con.runAndReadAll(`SELECT id::DOUBLE, lat, lon, in_city FROM walk_node`)).getColumns();
const byClass = await rows<{ highway: string; ways: number }>(con, `SELECT highway, count(*)::DOUBLE AS ways FROM walk GROUP BY 1 ORDER BY 2 DESC`);
const queryMs = tm();

// --- 2. Full graph: every OpenStreetMap node of a walkable way is a vertex ----------------------
tm = timer();
const osmId = nodeCols[0] as number[];
const osmLat = nodeCols[1] as number[];
const osmLon = nodeCols[2] as number[];
const osmIn = nodeCols[3] as boolean[];
const osmIndex = new Map<number, number>();
for (let i = 0; i < osmId.length; i++) osmIndex.set(osmId[i]!, i);

const wayIds = ptCols[0] as number[];
const ptNode = ptCols[1] as number[];
const ptFlags = ptCols[2] as number[];

const used = new Int32Array(osmId.length).fill(-1); // box node -> graph vertex
const vLat: number[] = [];
const vLon: number[] = [];
const vertexOf = (i: number): number => {
  if (used[i] === -1) {
    used[i] = vLat.length;
    vLat.push(Math.round(osmLat[i]! * 1e7));
    vLon.push(Math.round(osmLon[i]! * 1e7));
  }
  return used[i]!;
};

const seen = new Map<number, number>(); // a * 2^26 + b (a < b) -> index in edges
const edges: UndirectedEdge[] = [];
let tooLong = 0;
let parallel = 0;
let segmentsOutside = 0;
for (let k = 1; k < wayIds.length; k++) {
  if (wayIds[k] !== wayIds[k - 1]) continue;
  const i = osmIndex.get(ptNode[k - 1]!);
  const j = osmIndex.get(ptNode[k]!);
  if (i === undefined || j === undefined || i === j) continue;
  if (!osmIn[i] && !osmIn[j]) {
    segmentsOutside++;
    continue;
  }
  let lenDm = Math.round(haversine(osmLat[i]!, osmLon[i]!, osmLat[j]!, osmLon[j]!) * 10);
  if (lenDm > MAX_LEN_DM) {
    tooLong++;
    lenDm = MAX_LEN_DM;
  }
  let a = vertexOf(i);
  let b = vertexOf(j);
  if (a > b) [a, b] = [b, a];
  const key = a * 67108864 + b;
  const prev = seen.get(key);
  if (prev !== undefined) {
    parallel++;
    // The same pair of nodes on two ways (a footway drawn over a road): keep the friendlier one.
    const e = edges[prev]!;
    if (lenDm < e.lenDm) e.lenDm = lenDm;
    e.flags = Math.min(e.flags, ptFlags[k]!);
    continue;
  }
  seen.set(key, edges.length);
  edges.push({ a, b, lenDm, flags: ptFlags[k]! });
}
const all = buildGraph(Int32Array.from(vLat), Int32Array.from(vLon), edges);

// Keep the largest connected component: a Place snapped to an island would reach nothing.
const comp = components(all);
let giant = 0;
for (let c = 1; c < comp.sizes.length; c++) if (comp.sizes[c]! > comp.sizes[giant]!) giant = c;
// Which box node each vertex came from, to tell exclaves from islands inside the city proper.
const osmOfVertex = new Float64Array(all.nodeCount);
for (let i = 0; i < used.length; i++) if (used[i] !== -1) osmOfVertex[used[i]!] = osmId[i]!;
let outsideGiantInMainPart = 0;
for (let v = 0; v < all.nodeCount; v++) if (comp.label[v] !== giant && inMainIds.has(osmOfVertex[v]!)) outsideGiantInMainPart++;
const remap = new Int32Array(all.nodeCount).fill(-1);
const gLat: number[] = [];
const gLon: number[] = [];
for (let v = 0; v < all.nodeCount; v++) {
  if (comp.label[v] === giant) {
    remap[v] = gLat.length;
    gLat.push(all.lat[v]!);
    gLon.push(all.lon[v]!);
  }
}
const gEdges = edges.filter((e) => remap[e.a] !== -1).map((e) => ({ ...e, a: remap[e.a]!, b: remap[e.b]! }));
const full = buildGraph(Int32Array.from(gLat), Int32Array.from(gLon), gEdges);
const buildFullMs = tm();

// --- 3. Contracted graph: only junctions, dead ends and places where the attributes change -----
tm = timer();
function contract(g: Graph): { graph: Graph; keep: Int32Array; shapePoints: number; loopsDropped: number; clamped: number } {
  const keep = new Int32Array(g.nodeCount).fill(-1);
  const cLat: number[] = [];
  const cLon: number[] = [];
  for (let v = 0; v < g.nodeCount; v++) {
    const s = g.firstOut[v]!;
    const deg = g.firstOut[v + 1]! - s;
    if (deg !== 2 || g.flags[s] !== g.flags[s + 1]) {
      keep[v] = cLat.length;
      cLat.push(g.lat[v]!);
      cLon.push(g.lon[v]!);
    }
  }
  const out: UndirectedEdge[] = [];
  let shapePoints = 0;
  let loopsDropped = 0;
  let clamped = 0;
  for (let v = 0; v < g.nodeCount; v++) {
    if (keep[v] === -1) continue;
    for (let e = g.firstOut[v]!; e < g.firstOut[v + 1]!; e++) {
      let prev = v;
      let cur = g.head[e]!;
      let lenDm = g.len[e]!;
      let inner = 0;
      while (keep[cur] === -1) {
        const s = g.firstOut[cur]!;
        const next = g.head[s] === prev ? s + 1 : s;
        lenDm += g.len[next]!;
        prev = cur;
        cur = g.head[next]!;
        inner++;
      }
      if (cur === v) {
        loopsDropped++;
        continue;
      }
      // Each chain is met from both ends; emit it from the end with the smaller vertex.
      // Two chains between the same pair of junctions are both emitted, which is correct.
      if (v > cur) continue;
      if (lenDm > MAX_LEN_DM) {
        clamped++;
        lenDm = MAX_LEN_DM;
      }
      shapePoints += inner;
      out.push({ a: keep[v]!, b: keep[cur]!, lenDm, flags: g.flags[e]! });
    }
  }
  return { graph: buildGraph(Int32Array.from(cLat), Int32Array.from(cLon), out), keep, shapePoints, loopsDropped: loopsDropped / 2, clamped };
}
const contracted = contract(full);
const contractMs = tm();

// --- 4. Sizes ----------------------------------------------------------------------------------
tm = timer();
const fullBytes = serialize(full);
const contractedBytes = serialize(contracted.graph);
writeFileSync('out/minsk-walk-full.bin', fullBytes);
writeFileSync('out/minsk-walk-contracted.bin', contractedBytes);
const serializeMs = tm();
const fullSizes = sizes(fullBytes);
const contractedSizes = sizes(contractedBytes);
// Geometry the contracted graph needs to draw a leg: the inner points of each chain as two int16
// deltas per point, plus one uint32 offset per chain.
const contractedGeometryBytes = 4 * contracted.shapePoints + 4 * (contracted.graph.edgeCount / 2 + 1);

tm = timer();
const loaded = deserialize(new Uint8Array(readFileSync('out/minsk-walk-full.bin')));
const loadMs = tm();
if (loaded.nodeCount !== full.nodeCount || loaded.edgeCount !== full.edgeCount) throw new Error('round trip failed');

// A cut for a Route Pack: every vertex inside a square around the centre, with the edges between them.
function cutSquare(g: Graph, lat: number, lon: number, halfSideM: number): Graph {
  const dLat = halfSideM / 111_320;
  const dLon = halfSideM / (111_320 * Math.cos((lat * Math.PI) / 180));
  const id = new Int32Array(g.nodeCount).fill(-1);
  const la: number[] = [];
  const lo: number[] = [];
  for (let v = 0; v < g.nodeCount; v++) {
    const y = g.lat[v]! / 1e7;
    const x = g.lon[v]! / 1e7;
    if (Math.abs(y - lat) <= dLat && Math.abs(x - lon) <= dLon) {
      id[v] = la.length;
      la.push(g.lat[v]!);
      lo.push(g.lon[v]!);
    }
  }
  const es: UndirectedEdge[] = [];
  for (let v = 0; v < g.nodeCount; v++) {
    if (id[v] === -1) continue;
    for (let e = g.firstOut[v]!; e < g.firstOut[v + 1]!; e++) {
      const w = g.head[e]!;
      if (w > v && id[w] !== -1) es.push({ a: id[v]!, b: id[w]!, lenDm: g.len[e]!, flags: g.flags[e]! });
    }
  }
  return buildGraph(Int32Array.from(la), Int32Array.from(lo), es);
}
const cuts = [1500, 2500].map((half) => {
  const c = cutSquare(full, CENTRE.lat, CENTRE.lon, half);
  return { square_km: `${(2 * half) / 1000} x ${(2 * half) / 1000}`, nodes: c.nodeCount, street_segments: c.edgeCount / 2, ...sizes(serialize(c)) };
});

// --- 5. Search times -------------------------------------------------------------------------
function bench(g: Graph, label: string, maxDm: number, runs: number): Record<string, number | string> {
  const s = new Searcher(g);
  const rnd = mulberry32(20261122);
  s.run(Math.floor(rnd() * g.nodeCount), maxDm); // warm-up, lets the engine optimise the loop
  s.run(Math.floor(rnd() * g.nodeCount), maxDm);
  const ms: number[] = [];
  const settled: number[] = [];
  for (let r = 0; r < runs; r++) {
    const src = Math.floor(rnd() * g.nodeCount);
    const tt = timer();
    s.run(src, maxDm);
    ms.push(tt());
    settled.push(s.settledCount);
  }
  ms.sort((a, b) => a - b);
  settled.sort((a, b) => a - b);
  return {
    graph: label,
    cut_off: maxDm >= UNREACHED - 1 ? 'none (whole city)' : `${maxDm / 10} m`,
    runs,
    median_ms: round1(quantile(ms, 0.5)),
    p95_ms: round1(quantile(ms, 0.95)),
    max_ms: round1(ms[ms.length - 1]!),
    median_nodes_settled: quantile(settled, 0.5),
  };
}
const searches = [
  bench(full, 'full', UNREACHED - 1, 50),
  bench(contracted.graph, 'contracted', UNREACHED - 1, 50),
  bench(full, 'full', 30_000, 200),
  bench(contracted.graph, 'contracted', 30_000, 200),
];

// --- 6. Sanity: station to centre, with and without stairs --------------------------------------
const index = new NodeIndex(full);
const from = index.nearest(STATION.lat, STATION.lon);
const to = index.nearest(CENTRE.lat, CENTRE.lon);
const s = new Searcher(full);
s.run(from.node);
const viaAll = s.dist[to.node]! / 10;
let farthest = 0;
for (let v = 0; v < full.nodeCount; v++) if (s.dist[v]! !== UNREACHED && s.dist[v]! > farthest) farthest = s.dist[v]!;
s.run(from.node, UNREACHED - 1, FLAG_STEPS);
const viaNoSteps = s.dist[to.node] === UNREACHED ? null : s.dist[to.node]! / 10;
const sanity = {
  station_snap_m: round1(from.metres),
  centre_snap_m: round1(to.metres),
  straight_line_m: Math.round(haversine(STATION.lat, STATION.lon, CENTRE.lat, CENTRE.lon)),
  walking_m: viaAll,
  walking_without_steps_m: viaNoSteps,
  farthest_vertex_from_station_km: round1(farthest / 10_000),
};

// --- 7. What the graph is made of ---------------------------------------------------------------
const flagStats: Record<string, { segments: number; km: number }> = {};
const names: [number, string][] = [
  [FLAG_STEPS, 'steps'], [FLAG_CROSSING, 'crossing'], [FLAG_TUNNEL, 'tunnel'], [FLAG_BRIDGE, 'bridge'],
  [FLAG_UNPAVED, 'unpaved'], [FLAG_ROAD, 'carriageway'], [FLAG_BUSY, 'busy carriageway'],
];
let totalDm = 0;
for (const e of gEdges) {
  totalDm += e.lenDm;
  for (const [bit, name] of names) {
    if (e.flags & bit) {
      const st = (flagStats[name] ??= { segments: 0, km: 0 });
      st.segments++;
      st.km += e.lenDm / 10_000;
    }
  }
}
for (const st of Object.values(flagStats)) st.km = round1(st.km);
const dedicated = gEdges.filter((e) => !(e.flags & FLAG_ROAD));
const sortedSizes = [...comp.sizes].sort((a, b) => b - a);

const result = {
  osm_date: OSM_DATE,
  walkable_ways_in_box: wayIds.length ? new Set(wayIds).size : 0,
  walkable_ways_by_class: byClass,
  before_component_filter: {
    nodes: all.nodeCount,
    street_segments: all.edgeCount / 2,
    components: comp.sizes.length,
    largest_components: sortedSizes.slice(0, 5),
    nodes_outside_largest: all.nodeCount - sortedSizes[0]!,
    of_them_inside_the_main_part_of_the_city: outsideGiantInMainPart,
    of_them_in_exclaves_or_outside_the_boundary: all.nodeCount - sortedSizes[0]! - outsideGiantInMainPart,
  },
  full_graph: {
    nodes: full.nodeCount,
    street_segments: full.edgeCount / 2,
    directed_edges: full.edgeCount,
    length_km: round1(totalDm / 10_000),
    length_on_dedicated_foot_ways_km: round1(dedicated.reduce((a, e) => a + e.lenDm, 0) / 10_000),
    bytes: fullSizes,
    longest_segment_m: gEdges.reduce((a, e) => Math.max(a, e.lenDm), 0) / 10,
    segments_clamped_to_6553_m: tooLong,
    parallel_segments_merged: parallel,
    segments_wholly_outside_city_skipped: segmentsOutside,
  },
  contracted_graph: {
    nodes: contracted.graph.nodeCount,
    street_segments: contracted.graph.edgeCount / 2,
    directed_edges: contracted.graph.edgeCount,
    bytes: contractedSizes,
    shape_points_removed: contracted.shapePoints,
    geometry_side_file_bytes_estimate: contractedGeometryBytes,
    loops_dropped: contracted.loopsDropped,
    chains_clamped_to_6553_m: contracted.clamped,
  },
  flags: flagStats,
  route_pack_cuts_full_graph: cuts,
  time_ms: {
    read_from_city_database: Math.round(queryMs),
    build_full_graph: Math.round(buildFullMs),
    contract: Math.round(contractMs),
    serialize_both: Math.round(serializeMs),
    load_full_graph_from_file: round1(loadMs),
    total: Math.round(total()),
  },
  searches,
  sanity,
  process: { node: process.version, heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1e6), array_buffers_mb: Math.round(process.memoryUsage().arrayBuffers / 1e6) },
};
writeJson('out/05-graph.json', result);
console.log(JSON.stringify(result, null, 2));
