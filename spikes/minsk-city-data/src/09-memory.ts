// What the city data costs an API instance in memory (ADR-0009 "Consequences"): a fresh process
// loads the graph and the matrix, builds the snapping index and one searcher, and runs a search.
//
// It imports nothing but the graph module on purpose: lib.ts would load DuckDB's native library
// and add about 100 MB that an API instance does not carry.
import { readFileSync, writeFileSync } from 'node:fs';
import { NodeIndex, Searcher, deserialize } from './graph.ts';

const CENTRE = (JSON.parse(readFileSync('out/02-places.json', 'utf8')) as { centre: { lat: number; lon: number } }).centre;
const timer = () => {
  const t0 = process.hrtime.bigint();
  return () => Number(process.hrtime.bigint() - t0) / 1e6;
};

const mb = (b: number) => Math.round(b / 1e5) / 10;
const before = process.memoryUsage();
let t = timer();
const graphBytes = readFileSync('out/minsk-walk-full.bin');
const g = deserialize(new Uint8Array(graphBytes));
const matrix = readFileSync('out/minsk-matrix-3km.bin');
const loadMs = t();
const afterLoad = process.memoryUsage();
t = timer();
const index = new NodeIndex(g);
const indexMs = t();
const afterIndex = process.memoryUsage();
const search = new Searcher(g);
const start = index.nearest(CENTRE.lat, CENTRE.lon).node;
t = timer();
search.run(start);
const firstSearchMs = t();
t = timer();
search.run(start);
const secondSearchMs = t();
const after = process.memoryUsage();

const result = {
  node: process.version,
  files_mb: { graph: mb(graphBytes.byteLength), matrix: mb(matrix.byteLength) },
  load_both_files_ms: Math.round(loadMs * 10) / 10,
  build_snapping_index_ms: Math.round(indexMs),
  first_search_ms_cold: Math.round(firstSearchMs * 10) / 10,
  second_search_ms: Math.round(secondSearchMs * 10) / 10,
  rss_mb: { empty_process: mb(before.rss), after_loading_files: mb(afterLoad.rss), after_snapping_index: mb(afterIndex.rss), after_one_searcher_and_search: mb(after.rss) },
  array_buffers_mb: { after_loading_files: mb(afterLoad.arrayBuffers), after_one_searcher: mb(after.arrayBuffers) },
  heap_used_mb: { after_snapping_index: mb(afterIndex.heapUsed), end: mb(after.heapUsed) },
  per_extra_searcher_mb: mb(g.nodeCount * 12 + (g.edgeCount + 1) * 8),
};
writeFileSync('out/09-memory.json', JSON.stringify(result, null, 2) + '\n');
console.log(result);
