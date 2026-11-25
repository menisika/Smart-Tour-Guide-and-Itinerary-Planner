// Sparse matrix of walking distances between candidate Places (ADR-0009, point 4): pairs farther
// apart than the walking cut-off are left out. Measures the number of pairs, the size of a compact
// binary form and the time to compute it with the same search code the graph step timed.
import { brotliCompressSync, constants as zc, gzipSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';
import { OSM_DATE, openDb, timer, writeJson } from './lib.ts';
import { NodeIndex, Searcher, UNREACHED, deserialize } from './graph.ts';

const CUT_OFF_M = 3000;
const SNAP_MAX_M = 250;

const con = await openDb({ readOnly: true });
const cols = (
  await con.runAndReadAll(
    `SELECT kind, subkind, lat, lon, osm_type || '/' || osm_id AS ref FROM place ORDER BY osm_type, osm_id`,
  )
).getColumns();
const kind = cols[0] as string[];
const subkind = cols[1] as string[];
const lat = cols[2] as number[];
const lon = cols[3] as number[];
const n = kind.length;

const g = deserialize(new Uint8Array(readFileSync('out/minsk-walk-full.bin')));
let tm = timer();
const index = new NodeIndex(g);
const vertex = new Int32Array(n);
const snapDm = new Uint16Array(n);
const snapMetres: number[] = [];
let unsnapped = 0;
for (let i = 0; i < n; i++) {
  const hit = index.nearest(lat[i]!, lon[i]!, SNAP_MAX_M);
  vertex[i] = hit.node;
  if (hit.node === -1) unsnapped++;
  else {
    snapDm[i] = Math.round(hit.metres * 10);
    snapMetres.push(hit.metres);
  }
}
const snapMs = tm();
snapMetres.sort((a, b) => a - b);
const q = (xs: number[], p: number) => xs[Math.min(xs.length - 1, Math.floor(p * xs.length))]!;

// One bounded search per distinct vertex. The distance between two Places is the walk between
// their vertices plus the two straight snaps. Stored once per pair (i < j): walking is symmetric.
tm = timer();
const byVertex = new Map<number, number[]>();
for (let i = 0; i < n; i++) {
  if (vertex[i] === -1) continue;
  const list = byVertex.get(vertex[i]!);
  if (list) list.push(i);
  else byVertex.set(vertex[i]!, [i]);
}
const search = new Searcher(g);
const cutDm = CUT_OFF_M * 10;
const pairI: number[] = [];
const pairJ: number[] = [];
const pairDm: number[] = [];
let searches = 0;
let settledSum = 0;
for (const [v, members] of byVertex) {
  search.run(v, cutDm);
  searches++;
  settledSum += search.settledCount;
  const dist = search.dist;
  for (const i of members) {
    for (let j = i + 1; j < n; j++) {
      const w = vertex[j]!;
      if (w === -1) continue;
      const d = dist[w]!;
      if (d === UNREACHED) continue;
      const totalDm = d + snapDm[i]! + snapDm[j]!;
      if (totalDm <= cutDm) {
        pairI.push(i);
        pairJ.push(j);
        pairDm.push(totalDm);
      }
    }
  }
}
const searchMs = tm();

// Compact form of a set of Places: rowStart uint32[m + 1], column uint16[pairs] (uint32 when the
// set has more than 65 535 Places), distance uint16[pairs] in decimetres.
function measure(label: string, include: (i: number) => boolean, cutM: number): Record<string, unknown> {
  const id = new Int32Array(n).fill(-1);
  let m = 0;
  for (let i = 0; i < n; i++) if (include(i) && vertex[i] !== -1) id[i] = m++;
  const limit = cutM * 10;
  const rowCount = new Uint32Array(m + 1);
  let pairs = 0;
  for (let k = 0; k < pairI.length; k++) {
    if (pairDm[k]! > limit || id[pairI[k]!] === -1 || id[pairJ[k]!] === -1) continue;
    rowCount[id[pairI[k]!]! + 1]!++;
    pairs++;
  }
  for (let r = 0; r < m; r++) rowCount[r + 1]! += rowCount[r]!;
  const wide = m > 65535;
  const colBytes = wide ? 4 : 2;
  const buf = new ArrayBuffer(4 * (m + 1) + (colBytes + 2) * pairs + 8);
  new Uint32Array(buf, 0, m + 1).set(rowCount);
  const colOff = 4 * (m + 1);
  const col = wide ? new Uint32Array(buf, colOff, pairs) : new Uint16Array(buf, colOff, pairs);
  const dm = new Uint16Array(buf, colOff + ((colBytes * pairs + 3) & ~3), pairs);
  const cursor = rowCount.slice(0, m);
  const neighbours = new Uint32Array(m);
  for (let k = 0; k < pairI.length; k++) {
    if (pairDm[k]! > limit) continue;
    const a = id[pairI[k]!]!;
    const b = id[pairJ[k]!]!;
    if (a === -1 || b === -1) continue;
    const at = cursor[a]!++;
    col[at] = b;
    dm[at] = pairDm[k]!;
    neighbours[a]!++;
    neighbours[b]!++;
  }
  const bytes = new Uint8Array(buf);
  const sorted = Array.from(neighbours).sort((x, y) => x - y);
  if (label === 'sights, nature, markets' && cutM === CUT_OFF_M) writeFileSync('out/minsk-matrix-3km.bin', bytes);
  return {
    places: m,
    cut_off_m: cutM,
    pairs,
    share_of_all_pairs: m > 1 ? `${((100 * pairs) / ((m * (m - 1)) / 2)).toFixed(1)} %` : '—',
    bytes_raw: bytes.byteLength,
    bytes_gzip: gzipSync(bytes, { level: 9 }).byteLength,
    bytes_brotli: brotliCompressSync(bytes, { params: { [zc.BROTLI_PARAM_QUALITY]: 9, [zc.BROTLI_PARAM_LGWIN]: 24 } }).byteLength,
    dense_matrix_bytes: m * m * 2,
    neighbours_median: q(sorted, 0.5),
    neighbours_p95: q(sorted, 0.95),
    neighbours_max: sorted[sorted.length - 1] ?? 0,
  };
}

const routable = (i: number) => kind[i] === 'sight' || kind[i] === 'nature' || kind[i] === 'market';
const sets: [string, (i: number) => boolean][] = [
  ['sights, nature, markets', routable],
  ['the same without artworks and fountains', (i) => routable(i) && subkind[i] !== 'artwork' && subkind[i] !== 'fountain'],
  ['the same plus memorial plaques', (i) => routable(i) || kind[i] === 'plaque'],
  ['the same plus cafés, bars and restaurants', (i) => routable(i) || (kind[i] === 'venue' && subkind[i] !== 'fast_food')],
  ['every candidate', () => true],
];
const table: Record<string, unknown>[] = [];
for (const [label, include] of sets) table.push({ set: label, ...measure(label, include, CUT_OFF_M) });
for (const cut of [1000, 2000]) table.push({ set: 'sights, nature, markets', ...measure('sights, nature, markets', routable, cut) });

const result = {
  osm_date: OSM_DATE,
  graph: { nodes: g.nodeCount, street_segments: g.edgeCount / 2 },
  candidates: n,
  snapping: {
    max_m: SNAP_MAX_M,
    not_snapped: unsnapped,
    median_m: Math.round(q(snapMetres, 0.5)),
    p95_m: Math.round(q(snapMetres, 0.95)),
    max_m_observed: Math.round(snapMetres[snapMetres.length - 1] ?? 0),
    distinct_vertices: byVertex.size,
  },
  time_ms: {
    snap_all: Math.round(snapMs),
    all_searches_and_pair_collection: Math.round(searchMs),
    searches,
    per_search: Math.round((searchMs / Math.max(1, searches)) * 100) / 100,
    mean_nodes_settled_per_search: Math.round(settledSum / Math.max(1, searches)),
  },
  matrices: table,
};
writeJson('out/06-matrix.json', result);
console.log(JSON.stringify(result, null, 2));
