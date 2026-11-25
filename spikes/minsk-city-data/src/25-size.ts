// Size by formula, as in report 07 §10.3, for the Places of the five groups country-wide, and
// the rows a change history would add in a year at the rate the diffs showed.
// Counts are measured; the megabytes are arithmetic on the assumptions listed in the output.
import { readFileSync } from 'node:fs';
import { OSM_DATE, PBF, mdTable, writeJson } from './lib.ts';
import { GROUPS, GROUP_LABEL, classify, type Group } from './focus.ts';
import { loadCandidates } from './focus-load.ts';

const { candidates } = await loadCandidates(PBF);
const NAME_KEY = (k: string) => k === 'name' || k.startsWith('name:') || ['alt_name', 'old_name', 'official_name', 'short_name', 'int_name', 'loc_name'].includes(k);
interface Shape { places: number; tags: number; nameTags: number; valueBytes: number; nameBytes: number; areas: number; wikidata: number }
const shape: Record<string, Shape> = {};
const blank = (): Shape => ({ places: 0, tags: 0, nameTags: 0, valueBytes: 0, nameBytes: 0, areas: 0, wikidata: 0 });
for (const c of candidates) {
  const cls = classify(c.tags);
  if (!cls) continue;
  for (const g of [cls.group, 'all']) {
    const s = (shape[g] ??= blank());
    s.places++;
    if (c.type !== 'node') s.areas++;
    if (c.tags.wikidata) s.wikidata++;
    for (const [k, v] of Object.entries(c.tags)) {
      s.tags++;
      if (NAME_KEY(k)) {
        s.nameTags++;
        s.nameBytes += Buffer.byteLength(v);
      } else s.valueBytes += Buffer.byteLength(v);
    }
  }
}

// Assumptions per row, the same as in report 07 §10.3.
const A = {
  tuple_overhead_bytes: 28,
  place_row_payload_bytes: 96,
  attribute_row_fixed_bytes: 40,
  name_row_fixed_bytes: 32,
  link_row_bytes: 72,
  boundary_bytes_per_vertex: 16,
  boundary_fixed_bytes: 48,
  mean_vertices_of_an_area_place: 28, // measured on the candidates of Minsk (report 07)
  links_per_wikidata_place: 3.28, // the item, its articles, its photo: measured in Minsk (report 07)
  index_share_of_heap: 0.6,
  gist_index_bytes_per_place: 64,
  // A change history: one row per change, one row per attribute value the change carries.
  change_row_payload_bytes: 72, // Place, source, kind of change, detected at, state, decided by, decided at, source revision
  change_item_fixed_bytes: 24, // change, attribute
  // old and new value of an attribute, each as long as the measured mean value
};
const pad = (x: number) => Math.ceil(x / 8) * 8;
const mb = (b: number) => Math.round(b / 1e5) / 10;
function estimate(s: Shape) {
  const meanName = s.nameBytes / Math.max(1, s.nameTags);
  const meanValue = s.valueBytes / Math.max(1, s.tags - s.nameTags);
  const rows = {
    place: s.places,
    place_name: s.nameTags,
    place_attribute: s.tags - s.nameTags,
    place_boundary: s.areas,
    place_source_link: Math.round(s.places + s.wikidata * A.links_per_wikidata_place),
  };
  const bytes = {
    place: rows.place * pad(A.tuple_overhead_bytes + A.place_row_payload_bytes),
    place_name: rows.place_name * pad(A.tuple_overhead_bytes + A.name_row_fixed_bytes + meanName),
    place_attribute: rows.place_attribute * pad(A.tuple_overhead_bytes + A.attribute_row_fixed_bytes + meanValue),
    place_boundary: rows.place_boundary * pad(A.tuple_overhead_bytes + A.boundary_fixed_bytes + A.mean_vertices_of_an_area_place * A.boundary_bytes_per_vertex),
    place_source_link: rows.place_source_link * pad(A.tuple_overhead_bytes + A.link_row_bytes),
  };
  const heap = Object.values(bytes).reduce((a, b) => a + b, 0);
  const indexes = heap * A.index_share_of_heap + s.places * A.gist_index_bytes_per_place;
  return {
    places: s.places,
    tags_per_place: Math.round((s.tags / s.places) * 100) / 100,
    name_tags_per_place: Math.round((s.nameTags / s.places) * 100) / 100,
    mean_value_bytes: Math.round(meanValue * 10) / 10,
    mean_name_bytes: Math.round(meanName * 10) / 10,
    share_drawn_as_a_way_or_relation: `${((100 * s.areas) / s.places).toFixed(1)} %`,
    rows: { ...rows, total: Object.values(rows).reduce((a, b) => a + b, 0) },
    megabytes: { tables: mb(heap), with_indexes: mb(heap + indexes) },
  };
}
const estimates = Object.fromEntries([...GROUPS, 'all' as const].map((g) => [g, estimate(shape[g] ?? blank())]));

// --- The change history ----------------------------------------------------------------------------
interface DiffOut { for_a_history: { days: number; changes: number; attribute_values_in_those_changes: number; material_changes: number }; all_days: { days: number; summary: { set: string; all: { total: number } }[] } }
const diffs = JSON.parse(readFileSync('out/23-diffs.json', 'utf8')) as DiffOut;
const h = diffs.for_a_history;
const meanValueAll = (shape.all!.valueBytes + shape.all!.nameBytes) / shape.all!.tags;
function history(changesPerDay: number, valuesPerChange: number) {
  const changes = Math.round(changesPerDay * 365);
  const items = Math.round(changes * valuesPerChange);
  const bytes = changes * pad(A.tuple_overhead_bytes + A.change_row_payload_bytes) + items * pad(A.tuple_overhead_bytes + A.change_item_fixed_bytes + 2 * meanValueAll);
  return { changes_a_year: changes, attribute_rows_a_year: items, rows_a_year: changes + items, megabytes_a_year: { tables: mb(bytes), with_indexes: mb(bytes * (1 + A.index_share_of_heap)) } };
}
const all52 = diffs.all_days.summary.find((s) => s.set === 'All five groups')!.all.total;
const histories = {
  at_the_rate_of_the_last_30_days: { changes_per_day: Math.round((h.changes / h.days) * 100) / 100, ...history(h.changes / h.days, h.attribute_values_in_those_changes / h.changes) },
  at_the_rate_of_all_52_days: { changes_per_day: Math.round((all52 / diffs.all_days.days) * 100) / 100, ...history(all52 / diffs.all_days.days, h.attribute_values_in_those_changes / h.changes) },
  material_changes_only: { changes_per_day: Math.round((h.material_changes / h.days) * 100) / 100, ...history(h.material_changes / h.days, h.attribute_values_in_those_changes / h.changes) },
};

console.log(mdTable(['Group', 'Places', 'Tags per Place', 'Rows', 'Tables, MB', 'With indexes, MB'],
  [...GROUPS, 'all' as const].map((g) => { const e = estimates[g]!; return [g === 'all' ? 'All five' : GROUP_LABEL[g as Group], e.places, e.tags_per_place, e.rows.total, e.megabytes.tables, e.megabytes.with_indexes]; })));
console.log(JSON.stringify(estimates.all, null, 1));
console.log('history:', JSON.stringify(histories, null, 1));

writeJson('out/25-size.json', { osm_extract: PBF, osm_date: OSM_DATE, assumptions: A, mean_value_bytes_of_any_tag: Math.round(meanValueAll * 10) / 10, estimates, change_history: histories });
