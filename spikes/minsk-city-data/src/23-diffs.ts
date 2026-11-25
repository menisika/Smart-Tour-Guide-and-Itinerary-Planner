// Change rate: Geofabrik's daily diffs for Belarus applied, day by day, to the state of an older
// extract, so that for every change the state before it is known. Counts per day and per group:
// created, deleted, modified, and for the modified ones what changed. The result is checked by
// comparing the state after the last diff with the newer extract the other steps use.
//
//   BASE_DATE, FIRST_DIFF, LAST_DIFF   as in src/20-fetch-history.sh
import { readFileSync, statSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { OSM_DATE, haversine, mdTable, timer, writeJson } from './lib.ts';
import { CONTACT_KEYS, GROUPS, GROUP_LABEL, LIFECYCLE_PREFIXES, ROUTABLE, classify, isPlaque, lifecycle, type Classified, type Group, type Tags } from './focus.ts';
import { loadCandidates } from './focus-load.ts';
import { readPbf, type PbfHeader } from './pbf.ts';

const BASE_DATE = process.env.BASE_DATE ?? '261001';
const FIRST = Number(process.env.FIRST_DIFF ?? 4926);
const LAST = Number(process.env.LAST_DIFF ?? 4977);
const BASE = `data/osm-base/belarus-${BASE_DATE}.osm.pbf`;

// --- 1. The starting state ------------------------------------------------------------------------
let baseHeader: PbfHeader | null = null;
readPbf(BASE, { header: (h) => { baseHeader = h; } });
const bh = baseHeader as PbfHeader | null;
if (bh?.replicationSequence !== FIRST - 1) throw new Error(`the base extract is at sequence ${bh?.replicationSequence}; the first diff must be ${Number(bh?.replicationSequence) + 1}`);

interface Entry { tags: Tags; lat: number | null; lon: number | null; cls: Classified }
const state = new Map<string, Entry>();
const base = await loadCandidates(BASE);
for (const c of base.candidates) {
  const cls = classify(c.tags);
  if (cls) state.set(`${c.type[0]}${c.id}`, { tags: c.tags, lat: c.type === 'node' ? c.lat : null, lon: c.type === 'node' ? c.lon : null, cls });
}
const baseCount = state.size;

// --- 2. Reading a diff -----------------------------------------------------------------------------
type Action = 'create' | 'modify' | 'delete';
interface Change { action: Action; type: 'node' | 'way' | 'relation'; id: number; lat: number | null; lon: number | null; tags: Tags }
const unescape = (s: string) =>
  s.includes('&')
    ? s.replace(/&(quot|amp|lt|gt|apos|#x[0-9a-fA-F]+|#\d+);/g, (_, e: string) =>
        e === 'quot' ? '"' : e === 'amp' ? '&' : e === 'lt' ? '<' : e === 'gt' ? '>' : e === 'apos' ? "'" : String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)))
    : s;
const OPEN = /^\s*<(node|way|relation) ([^>]*?)(\/?)>\s*$/;
const TAG = /^\s*<tag k="([^"]*)" v="([^"]*)"\/>/;
function* changes(xml: string): Generator<Change> {
  let action: Action | null = null;
  let cur: Change | null = null;
  let start = 0;
  while (start < xml.length) {
    let end = xml.indexOf('\n', start);
    if (end === -1) end = xml.length;
    const line = xml.slice(start, end);
    start = end + 1;
    if (cur) {
      const t = TAG.exec(line);
      if (t) cur.tags[unescape(t[1]!)] = unescape(t[2]!);
      else if (line.includes(`</${cur.type}>`)) {
        yield cur;
        cur = null;
      }
      continue;
    }
    const o = OPEN.exec(line);
    if (o) {
      if (!action) throw new Error('an object outside an action block');
      const attrs = o[2]!;
      const attr = (name: string) => new RegExp(`(?:^| )${name}="([^"]*)"`).exec(attrs)?.[1];
      const c: Change = { action, type: o[1] as Change['type'], id: Number(attr('id')), lat: attr('lat') ? Number(attr('lat')) : null, lon: attr('lon') ? Number(attr('lon')) : null, tags: {} };
      if (o[3] === '/') yield c;
      else cur = c;
      continue;
    }
    const a = /^\s*<(\/?)(create|modify|delete)>/.exec(line);
    if (a) action = a[1] === '/' ? null : (a[2] as Action);
  }
}

// --- 3. Applying the diffs -------------------------------------------------------------------------
type Kind = 'created' | 'entered' | 'deleted' | 'left' | 'modified';
const REASONS = ['name', 'other name tags', 'opening hours', 'position over 20 m', 'kind', 'lifecycle prefix', 'contact', 'other tags', 'no tag change'] as const;
type Reason = (typeof REASONS)[number];
interface Event { seq: number; day: string; group: Group; kind: Kind; reasons: Reason[]; left?: string; routable: boolean; named: boolean; wikidata: boolean; key: string; label: string; attributes: number }
const events: Event[] = [];
const perDiff: { seq: number; day: string; gz_bytes: number; xml_bytes: number; objects: number; ms: number }[] = [];
const isLifecycleKey = (k: string) => LIFECYCLE_PREFIXES.some((p) => k.startsWith(`${p}:`));
const NAME_KEY = (k: string) => k.startsWith('name:') || ['alt_name', 'old_name', 'official_name', 'short_name', 'int_name', 'loc_name'].includes(k);
let stateAtCompare: Map<string, Group> | null = null;
let compareSeq: number | null = null;

// The newer extract the other steps use: where the comparison is made.
let currentHeader: PbfHeader | null = null;
readPbf(`data/osm/belarus-${OSM_DATE}.osm.pbf`, { header: (h) => { currentHeader = h; } });
const currentSeq = (currentHeader as PbfHeader | null)?.replicationSequence ?? null;

for (let seq = FIRST; seq <= LAST; seq++) {
  const t = timer();
  const file = `data/osm-diffs/${seq}.osc.gz`;
  const day = (/timestamp=(\d{4}-\d\d-\d\d)/.exec(readFileSync(`data/osm-diffs/${seq}.state.txt`, 'utf8'))?.[1]) ?? String(seq);
  const xml = gunzipSync(readFileSync(file)).toString('utf8');
  let objects = 0;
  for (const c of changes(xml)) {
    objects++;
    if (c.type === 'relation' && c.action !== 'delete' && !['multipolygon', 'boundary'].includes(c.tags.type ?? '')) {
      // Relations of other types are never Places here; one that stopped being an area leaves.
      const key = `r${c.id}`;
      const prev = state.get(key);
      if (prev) {
        events.push({ seq, day, group: prev.cls.group, kind: 'left', reasons: [], left: 'no longer an area relation', routable: ROUTABLE.includes(prev.cls.group), named: Boolean(prev.tags.name), wikidata: Boolean(prev.tags.wikidata), key, label: prev.tags.name ?? prev.cls.rule, attributes: Object.keys(prev.tags).length });
        state.delete(key);
      }
      continue;
    }
    const key = `${c.type[0]}${c.id}`;
    const prev = state.get(key);
    // `attributes` is how many attribute values the change carries: every tag of a created or
    // removed object, the tags that differ for a modified one.
    const push = (group: Group, kind: Kind, tags: Tags, reasons: Reason[] = [], left?: string, attributes = Object.keys(tags).length) =>
      events.push({ seq, day, group, kind, reasons, left, routable: ROUTABLE.includes(group), named: Boolean(tags.name), wikidata: Boolean(tags.wikidata), key, label: tags.name ?? '', attributes });
    if (c.action === 'delete') {
      if (prev) {
        push(prev.cls.group, 'deleted', prev.tags);
        state.delete(key);
      }
      continue;
    }
    const cls = classify(c.tags);
    if (!prev && cls) {
      push(cls.group, c.action === 'create' ? 'created' : 'entered', c.tags);
      state.set(key, { tags: c.tags, lat: c.lat, lon: c.lon, cls });
    } else if (prev && !cls) {
      const lc = lifecycle(c.tags);
      push(prev.cls.group, 'left', prev.tags, [], lc ? `lifecycle prefix ${lc.prefix}:` : isPlaque(c.tags) ? 'became a memorial plaque' : 'kind tag removed or changed');
      state.delete(key);
    } else if (prev && cls) {
      const reasons: Reason[] = [];
      const keys = new Set([...Object.keys(prev.tags), ...Object.keys(c.tags)]);
      let contact = false;
      let otherNames = false;
      let other = false;
      let lifecycleChanged = false;
      let differing = 0;
      for (const k of keys) {
        if (prev.tags[k] === c.tags[k]) continue;
        differing++;
        if (k === 'name' || k === 'opening_hours' || k === cls.key || k === prev.cls.key) continue;
        if (isLifecycleKey(k)) lifecycleChanged = true;
        else if (CONTACT_KEYS(k)) contact = true;
        else if (NAME_KEY(k)) otherNames = true;
        else other = true;
      }
      if (prev.tags.name !== c.tags.name) reasons.push('name');
      if (otherNames) reasons.push('other name tags');
      if (prev.tags.opening_hours !== c.tags.opening_hours) reasons.push('opening hours');
      if (c.type === 'node' && prev.lat !== null && c.lat !== null && haversine(prev.lat, prev.lon!, c.lat, c.lon!) > 20) reasons.push('position over 20 m');
      if (prev.cls.rule !== cls.rule || prev.cls.group !== cls.group) reasons.push('kind');
      if (lifecycleChanged) reasons.push('lifecycle prefix');
      if (contact) reasons.push('contact');
      if (other) reasons.push('other tags');
      if (reasons.length === 0) reasons.push('no tag change');
      push(cls.group, 'modified', c.tags, reasons, undefined, differing);
      state.set(key, { tags: c.tags, lat: c.type === 'node' ? c.lat : null, lon: c.type === 'node' ? c.lon : null, cls });
    }
  }
  perDiff.push({ seq, day, gz_bytes: statSync(file).size, xml_bytes: xml.length, objects, ms: Math.round(t()) });
  if (seq === currentSeq) {
    stateAtCompare = new Map([...state.entries()].map(([k, v]) => [k, v.cls.group]));
    compareSeq = seq;
  }
}

// --- 4. Does the result equal the newer extract? ---------------------------------------------------
let check: Record<string, unknown> = { compared: false };
if (stateAtCompare) {
  const now = JSON.parse(readFileSync('out/21-focus-objects.json', 'utf8')) as { type: string; id: number; group: Group }[];
  const want = new Map(now.map((o) => [`${o.type[0]}${o.id}`, o.group]));
  const got = stateAtCompare as Map<string, Group>;
  const missing = [...want.keys()].filter((k) => !got.has(k));
  const extra = [...got.keys()].filter((k) => !want.has(k));
  const otherGroup = [...want.entries()].filter(([k, g]) => got.has(k) && got.get(k) !== g).length;
  check = { compared: true, at_sequence: compareSeq, objects_in_the_newer_extract: want.size, objects_after_the_diffs: got.size, missing_after_the_diffs: missing.length, extra_after_the_diffs: extra.length, in_another_group: otherGroup, examples_missing: missing.slice(0, 5), examples_extra: extra.slice(0, 5) };
}
console.log('check against the newer extract:', check);

// --- 5. Tables -------------------------------------------------------------------------------------
const days = perDiff.map((d) => d.seq);
const quant = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s.length === 0 ? 0 : s[Math.min(s.length - 1, Math.floor(p * s.length))]!; };
const KINDS3 = ['created', 'deleted', 'modified'] as const;
const kind3 = (k: Kind) => (k === 'created' || k === 'entered' ? 'created' : k === 'deleted' || k === 'left' ? 'deleted' : 'modified');
function summarise(label: string, list: Event[], seqs: number[]) {
  const byDay = (k: (typeof KINDS3)[number] | 'all') => seqs.map((s) => list.filter((e) => e.seq === s && (k === 'all' || kind3(e.kind) === k)).length);
  const out: Record<string, unknown> = { set: label, days: seqs.length };
  for (const k of [...KINDS3, 'all'] as const) {
    const d = byDay(k);
    const worst = Math.max(...d);
    out[k] = { total: d.reduce((a, b) => a + b, 0), median_per_day: quant(d, 0.5), p90_per_day: quant(d, 0.9), worst_day: worst, worst_day_date: perDiff.find((x) => x.seq === seqs[d.indexOf(worst)])?.day };
  }
  // Weeks: every run of seven consecutive days.
  const all = byDay('all');
  const weeks: number[] = [];
  for (let i = 0; i + 7 <= all.length; i++) weeks.push(all.slice(i, i + 7).reduce((a, b) => a + b, 0));
  out.per_week = { median: quant(weeks, 0.5), worst: weeks.length ? Math.max(...weeks) : 0 };
  return out;
}
const last30 = days.slice(-30);
const sets: [string, (e: Event) => boolean][] = [
  ...GROUPS.map((g): [string, (e: Event) => boolean] => [GROUP_LABEL[g], (e) => e.group === g]),
  ['All five groups', () => true],
  ['Groups that can be stops of a Route (sights, nature, entertainment)', (e) => e.routable],
  ['The same, with a name', (e) => e.routable && e.named],
  ['The same, with a Wikidata link', (e) => e.routable && e.wikidata],
  ['Eating, drinking and lodging', (e) => !e.routable],
];
const summary30 = sets.map(([label, f]) => summarise(label, events.filter(f), last30));
const summaryAll = sets.map(([label, f]) => summarise(label, events.filter(f), days));
type Sum = { total: number; median_per_day: number; p90_per_day: number; worst_day: number; worst_day_date: string };
const fmt = (s: Sum) => `${s.total} / ${s.median_per_day} / ${s.worst_day}`;
console.log(`\nLast ${last30.length} days (${perDiff.find((d) => d.seq === last30[0])!.day} to ${perDiff[perDiff.length - 1]!.day}); each cell: total / median a day / worst day`);
console.log(mdTable(['Set', 'Created', 'Deleted', 'Modified', 'All changes', 'Per week: median / worst'],
  summary30.map((r) => [r.set as string, fmt(r.created as Sum), fmt(r.deleted as Sum), fmt(r.modified as Sum), fmt(r.all as Sum), `${(r.per_week as { median: number }).median} / ${(r.per_week as { worst: number }).worst}`])));

// What changed in the modified ones.
function reasons(list: Event[]) {
  const mod = list.filter((e) => e.kind === 'modified');
  const out: Record<string, number> = { modified: mod.length };
  for (const r of REASONS) out[r] = mod.filter((e) => e.reasons.includes(r)).length;
  out['only other tags or nothing'] = mod.filter((e) => e.reasons.every((r) => r === 'other tags' || r === 'no tag change' || r === 'other name tags')).length;
  return out;
}
const in30 = (e: Event) => last30.includes(e.seq);
const reasonRows = sets.map(([label, f]) => ({ set: label, ...reasons(events.filter((e) => f(e) && in30(e))) }));
console.log('\nModified objects of the last 30 days, by what changed (an object can count in several columns):');
console.log(mdTable(['Set', 'Modified', ...REASONS, 'Only other tags or nothing'], reasonRows.map((r) => [r.set, ...['modified', ...REASONS, 'only other tags or nothing'].map((k) => (r as unknown as Record<string, number>)[k]!)])));

// Why objects left a group without being deleted.
const leftWhy: Record<string, number> = {};
for (const e of events.filter((x) => x.kind === 'left' && in30(x))) leftWhy[e.left ?? '?'] = (leftWhy[e.left ?? '?'] ?? 0) + 1;
const kinds30: Record<string, number> = {};
for (const e of events.filter(in30)) kinds30[e.kind] = (kinds30[e.kind] ?? 0) + 1;
console.log('\nkinds of change, last 30 days:', kinds30, 'left because:', leftWhy);

// What a Curator would be shown: changes that alter what a person sees or relies on.
const material = (e: Event) => e.kind !== 'modified' || e.reasons.some((r) => ['name', 'opening hours', 'position over 20 m', 'kind', 'lifecycle prefix', 'contact'].includes(r));
const proposals = sets.map(([label, f]) => {
  const list = events.filter((e) => f(e) && in30(e));
  const mat = list.filter(material);
  const perDay = last30.map((s) => mat.filter((e) => e.seq === s).length);
  const weeks: number[] = [];
  for (let i = 0; i + 7 <= perDay.length; i++) weeks.push(perDay.slice(i, i + 7).reduce((a, b) => a + b, 0));
  return { set: label, all_changes: list.length, material_changes: mat.length, material_per_day_median: quant(perDay, 0.5), material_per_week_median: quant(weeks, 0.5), material_per_week_worst: weeks.length ? Math.max(...weeks) : 0, distinct_objects: new Set(mat.map((e) => e.key)).size };
});
console.log('\nChanges a Curator would be shown (created, deleted, or a change of name, hours, position, kind, lifecycle or contact):');
console.log(mdTable(['Set', 'All changes in 30 days', 'Material changes', 'Median a day', 'Median a week', 'Worst week', 'Distinct objects'],
  proposals.map((p) => [p.set, p.all_changes, p.material_changes, p.material_per_day_median, p.material_per_week_median, p.material_per_week_worst, p.distinct_objects])));

// How much a history would have to hold: changes, and attribute values inside them.
const ev30 = events.filter(in30);
const history = {
  days: last30.length,
  changes: ev30.length,
  changes_per_day_mean: Math.round((ev30.length / last30.length) * 100) / 100,
  attribute_values_in_those_changes: ev30.reduce((a, e) => a + e.attributes, 0),
  attribute_values_per_change_mean: Math.round((ev30.reduce((a, e) => a + e.attributes, 0) / Math.max(1, ev30.length)) * 100) / 100,
  modified_changes: ev30.filter((e) => e.kind === 'modified').length,
  differing_tags_per_modified_object_mean: Math.round((ev30.filter((e) => e.kind === 'modified').reduce((a, e) => a + e.attributes, 0) / Math.max(1, ev30.filter((e) => e.kind === 'modified').length)) * 100) / 100,
  material_changes: ev30.filter(material).length,
};
console.log('\nfor a history:', history);

const gz = perDiff.map((d) => d.gz_bytes);
const files = {
  diffs: perDiff.length,
  first_day: perDiff[0]!.day,
  last_day: perDiff[perDiff.length - 1]!.day,
  gz_bytes: { median: quant(gz, 0.5), min: Math.min(...gz), max: Math.max(...gz), total: gz.reduce((a, b) => a + b, 0) },
  xml_bytes_median: quant(perDiff.map((d) => d.xml_bytes), 0.5),
  objects_in_a_diff: { median: quant(perDiff.map((d) => d.objects), 0.5), max: Math.max(...perDiff.map((d) => d.objects)) },
  ms_to_process_one: { median: quant(perDiff.map((d) => d.ms), 0.5), max: Math.max(...perDiff.map((d) => d.ms)) },
  share_of_objects_in_a_diff_that_touch_the_five_groups: `${((100 * events.length) / perDiff.reduce((a, d) => a + d.objects, 0)).toFixed(2)} %`,
};
console.log('\ndiff files:', files, `base state: ${baseCount} objects, loaded in ${base.ms} ms`);
const perDay = perDiff.map((d) => {
  const list = events.filter((e) => e.seq === d.seq);
  const row: Record<string, unknown> = { day: d.day, seq: d.seq, gz_kb: Math.round(d.gz_bytes / 1000), objects_in_diff: d.objects };
  for (const k of KINDS3) row[k] = list.filter((e) => kind3(e.kind) === k).length;
  for (const g of GROUPS) row[g] = list.filter((e) => e.group === g).length;
  row.material = list.filter(material).length;
  return row;
});
console.log(mdTable(['Day', 'Diff, kB', 'Objects in the diff', 'Created', 'Deleted', 'Modified', ...GROUPS.map((g) => GROUP_LABEL[g]), 'Material'],
  perDay.slice(-30).map((r) => [r.day as string, r.gz_kb as number, r.objects_in_diff as number, r.created as number, r.deleted as number, r.modified as number, ...GROUPS.map((g) => r[g] as number), r.material as number])));

writeJson('out/23-diffs.json', {
  base_extract: BASE,
  base_state: { sequence: bh.replicationSequence, timestamp: new Date((bh.replicationTimestamp ?? 0) * 1000).toISOString(), objects_in_the_five_groups: baseCount },
  diffs: files,
  check_against_the_newer_extract: check,
  last_30_days: { from: perDiff.find((d) => d.seq === last30[0])!.day, to: perDiff[perDiff.length - 1]!.day, summary: summary30, modified_by_what_changed: reasonRows, kinds_of_change: kinds30, left_a_group_because: leftWhy, shown_to_a_curator: proposals },
  for_a_history: history,
  all_days: { days: days.length, summary: summaryAll },
  per_day: perDay,
  examples: {
    opening_hours_changed: events.filter((e) => e.reasons.includes('opening hours')).slice(-8).map((e) => `${e.day} ${e.key} ${e.label}`),
    closed_by_lifecycle_prefix: events.filter((e) => e.left?.startsWith('lifecycle')).slice(-8).map((e) => `${e.day} ${e.key} ${e.label} (${e.left})`),
    deleted_named_routable: events.filter((e) => e.kind === 'deleted' && e.routable && e.named).slice(-8).map((e) => `${e.day} ${e.key} ${e.label}`),
  },
});
