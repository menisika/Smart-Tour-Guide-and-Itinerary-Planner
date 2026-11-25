// Freshness that the data itself shows: the age of the last edit of every object of the five
// groups, from the version and timestamp the extract carries per object, and the age of the
// check dates mappers wrote. An edit is any new version of the object, not a visit to the Place.
import { readFileSync } from 'node:fs';
import { OSM_DATE, PBF, mdTable, pct, timer, writeJson } from './lib.ts';
import { AREAS, GROUPS, GROUP_LABEL, type Area, type Group } from './focus.ts';
import { readPbf, type PbfHeader } from './pbf.ts';

interface FocusObject { type: string; id: number; group: Group; area: Area; opening_hours: string | null; check_date: string | null; name: string | null; website: string | null }
const objects = JSON.parse(readFileSync('out/21-focus-objects.json', 'utf8')) as FocusObject[];
const want = new Map<string, FocusObject>(objects.map((o) => [`${o.type[0]}${o.id}`, o]));
const meta = new Map<string, { version: number; ts: number }>();

const t = timer();
let header: PbfHeader | null = null;
const stats = readPbf(PBF, {
  header: (h) => { header = h; },
  object: (type, id, version, ts) => {
    const key = `${type[0]}${id}`;
    if (want.has(key)) meta.set(key, { version, ts });
  },
});
const readMs = t();
const h = header as PbfHeader | null;
if (!h?.replicationTimestamp) throw new Error('the extract has no replication timestamp in its header');
const now = h.replicationTimestamp;
const DAY = 86400;
const ageDays = (ts: number) => (now - ts) / DAY;

const quant = (xs: number[], p: number) => (xs.length === 0 ? NaN : xs[Math.min(xs.length - 1, Math.floor(p * xs.length))]!);
function ages(list: FocusObject[]) {
  const a = list.map((o) => meta.get(`${o.type[0]}${o.id}`)).filter((m): m is { version: number; ts: number } => Boolean(m)).map((m) => ageDays(m.ts)).sort((x, y) => x - y);
  const years = (d: number) => Math.round((d / 365.25) * 10) / 10;
  return {
    objects: a.length,
    p10_years: years(quant(a, 0.1)), p25_years: years(quant(a, 0.25)), median_years: years(quant(a, 0.5)), p75_years: years(quant(a, 0.75)), p90_years: years(quant(a, 0.9)),
    edited_in_the_last_30_days: a.filter((d) => d <= 30).length,
    edited_in_the_last_year: a.filter((d) => d <= 365).length,
    not_edited_for_5_years: a.filter((d) => d > 5 * 365.25).length,
  };
}
const HEAD = ['Set', 'Objects', '10 %', '25 %', 'Median', '75 %', '90 %', 'Edited in 30 days', 'Edited in a year', 'Untouched 5 years'];
type Ages = ReturnType<typeof ages>;
const line = (label: string, r: Ages) => [label, r.objects, r.p10_years, r.p25_years, r.median_years, r.p75_years, r.p90_years, `${r.edited_in_the_last_30_days} (${pct(r.edited_in_the_last_30_days, r.objects)})`, `${r.edited_in_the_last_year} (${pct(r.edited_in_the_last_year, r.objects)})`, `${r.not_edited_for_5_years} (${pct(r.not_edited_for_5_years, r.objects)})`];

const table: (string | number)[][] = [];
const json: Record<string, unknown>[] = [];
const add = (label: string, set: FocusObject[]) => {
  const r = ages(set);
  table.push(line(label, r));
  json.push({ set: label, ...r });
};
for (const g of GROUPS) add(GROUP_LABEL[g], objects.filter((o) => o.group === g));
add('All five', objects);
for (const a of AREAS) add(`All five, ${a}`, objects.filter((o) => o.area === a));
for (const g of GROUPS) add(`${GROUP_LABEL[g]}, with opening hours`, objects.filter((o) => o.group === g && o.opening_hours !== null));
add('All five, with opening hours', objects.filter((o) => o.opening_hours !== null));
add('All five, with a website', objects.filter((o) => o.website !== null));
console.log('Age of the last edit, in years:');
console.log(mdTable(HEAD, table));

// When were the objects last touched? A month that holds a large share is a mass edit, not visits.
const byMonth = new Map<string, number>();
for (const o of objects) {
  const m = meta.get(`${o.type[0]}${o.id}`);
  if (!m) continue;
  const month = new Date(m.ts * 1000).toISOString().slice(0, 7);
  byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
}
const busiest = [...byMonth.entries()].sort((x, y) => y[1] - x[1]).slice(0, 6).map(([month, n]) => ({ month, objects: n, share: pct(n, meta.size) }));
console.log('\nMonths that hold the most last edits:', busiest);

// Versions: how often an object has been touched at all.
const versions = objects.map((o) => meta.get(`${o.type[0]}${o.id}`)?.version ?? 0).sort((a, b) => a - b);
const versionStats = {
  median: quant(versions, 0.5), p90: quant(versions, 0.9), max: versions[versions.length - 1],
  never_edited_after_creation: versions.filter((v) => v === 1).length,
  share_never_edited: pct(versions.filter((v) => v === 1).length, versions.length),
};

// Check dates written by mappers: a person saw the Place on that day.
const dated = objects.filter((o) => o.check_date !== null);
const parsed = dated.map((o) => ({ o, ts: Date.parse(`${o.check_date!.slice(0, 10)}T12:00:00Z`) / 1000 })).filter((x) => Number.isFinite(x.ts) && /^\d{4}-\d{2}-\d{2}/.test(x.o.check_date!));
function checkAges(list: typeof parsed) {
  const a = list.map((x) => ageDays(x.ts)).sort((x, y) => x - y);
  const years = (d: number) => Math.round((d / 365.25) * 10) / 10;
  return { objects: a.length, p25_years: years(quant(a, 0.25)), median_years: years(quant(a, 0.5)), p75_years: years(quant(a, 0.75)), within_a_year: a.filter((d) => d <= 365).length, older_than_3_years: a.filter((d) => d > 3 * 365.25).length };
}
const checks = {
  objects_with_a_check_date: dated.length,
  of_them_a_full_date: parsed.length,
  all: checkAges(parsed),
  by_group: Object.fromEntries(GROUPS.map((g) => [g, checkAges(parsed.filter((x) => x.o.group === g))])),
};
console.log('\nVersions:', versionStats);
console.log('Check dates:', JSON.stringify(checks, null, 1));

writeJson('out/22-freshness.json', {
  osm_extract: PBF,
  osm_date: OSM_DATE,
  header: h,
  state_of_the_extract: new Date(now * 1000).toISOString(),
  objects_in_the_extract: stats,
  every_object_has_a_version_and_a_timestamp: stats.withVersion === stats.nodes + stats.ways + stats.relations && stats.withTimestamp === stats.withVersion,
  read_ms: Math.round(readMs),
  objects_of_the_five_groups_found: meta.size,
  age_of_last_edit_years: json,
  months_with_the_most_last_edits: busiest,
  versions: versionStats,
  check_dates: checks,
});
