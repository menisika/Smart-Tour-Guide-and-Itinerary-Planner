// Belarus as a whole: the five groups of Places, counted in three areas (Minsk, the five other
// regional centres, the rest) with the attributes that tell how much a base can know without a
// person: name, opening hours, website, phone, a check date, a Wikidata link.
import { OSM_DATE, PBF, mdTable, pct, writeJson } from './lib.ts';
import { AREAS, GROUPS, GROUP_LABEL, areaOf, checkDateKeys, classify, hasPhone, hasWebsite, isPlaque, lifecycle, websiteOf, type Area, type Group } from './focus.ts';
import { loadCandidates } from './focus-load.ts';

const { candidates, cities, ms } = await loadCandidates(PBF, { cities: true });

export interface FocusObject {
  type: string;
  id: number;
  group: Group;
  rule: string;
  area: Area;
  lat: number | null;
  lon: number | null;
  name: string | null;
  opening_hours: string | null;
  website: string | null;
  phone: boolean;
  check_date: string | null;
  wikidata: string | null;
}
const objects: FocusObject[] = [];
let plaques = 0;
const closed: Record<string, Partial<Record<Group, number>>> = {};
let lifecycleTotal = 0;
for (const c of candidates) {
  const hit = classify(c.tags);
  if (!hit) {
    if (isPlaque(c.tags)) plaques++;
    const lc = lifecycle(c.tags);
    if (lc) {
      lifecycleTotal++;
      const row = (closed[lc.prefix] ??= {});
      row[lc.was.group] = (row[lc.was.group] ?? 0) + 1;
    }
    continue;
  }
  const dates = checkDateKeys(c.tags);
  objects.push({
    type: c.type, id: c.id, group: hit.group, rule: hit.rule, area: areaOf(cities, c.lon, c.lat), lat: c.lat, lon: c.lon,
    name: c.tags.name ?? null,
    opening_hours: c.tags.opening_hours ?? null,
    website: websiteOf(c.tags),
    phone: hasPhone(c.tags),
    check_date: dates.length > 0 ? (c.tags['check_date:opening_hours'] ?? c.tags.check_date ?? c.tags[dates[0]!] ?? null) : null,
    wikidata: c.tags.wikidata ?? null,
  });
}

interface Row { objects: number; named: number; opening_hours: number; website: number; phone: number; check_date: number; wikidata: number }
function tally(list: FocusObject[]): Row {
  return {
    objects: list.length,
    named: list.filter((o) => o.name !== null).length,
    opening_hours: list.filter((o) => o.opening_hours !== null).length,
    website: list.filter((o) => o.website !== null).length,
    phone: list.filter((o) => o.phone).length,
    check_date: list.filter((o) => o.check_date !== null).length,
    wikidata: list.filter((o) => o.wikidata !== null).length,
  };
}
const HEAD = ['Group', 'Area', 'Objects', 'Named', 'Opening hours', 'Website', 'Phone', 'Check date', 'Wikidata link'];
const cell = (v: number, n: number) => `${v} (${pct(v, n)})`;
const line = (g: string, a: string, r: Row) => [g, a, r.objects, cell(r.named, r.objects), cell(r.opening_hours, r.objects), cell(r.website, r.objects), cell(r.phone, r.objects), cell(r.check_date, r.objects), cell(r.wikidata, r.objects)];
const table: (string | number)[][] = [];
const json: Record<string, unknown>[] = [];
for (const g of [...GROUPS, 'all' as const]) {
  for (const a of [...AREAS, 'Belarus' as const]) {
    const set = objects.filter((o) => (g === 'all' || o.group === g) && (a === 'Belarus' || o.area === a));
    const r = tally(set);
    table.push(line(g === 'all' ? 'All five' : GROUP_LABEL[g], a, r));
    json.push({ group: g, area: a, ...r });
  }
}
console.log(mdTable(HEAD, table));

// Which tags make up each group.
const byRule = new Map<string, number>();
for (const o of objects) byRule.set(`${o.group}|${o.rule}`, (byRule.get(`${o.group}|${o.rule}`) ?? 0) + 1);
const rules = [...byRule.entries()].map(([k, n]) => ({ group: k.split('|')[0]!, rule: k.split('|')[1]!, objects: n })).sort((x, y) => (x.group === y.group ? y.objects - x.objects : GROUPS.indexOf(x.group as Group) - GROUPS.indexOf(y.group as Group)));
console.log();
console.log(mdTable(['Group', 'Tag', 'Objects'], rules.map((r) => [GROUP_LABEL[r.group as Group], r.rule, r.objects])));

// Opening hours that say "closed".
const closedHours = objects.filter((o) => o.opening_hours !== null && /^\s*"?(closed|off)"?\s*$/i.test(o.opening_hours));
const byType = { node: 0, way: 0, relation: 0 } as Record<string, number>;
for (const o of objects) byType[o.type]!++;
console.log(`\nobjects ${objects.length} (${JSON.stringify(byType)}); memorial plaques, counted apart: ${plaques}; with a lifecycle prefix on the kind tag: ${lifecycleTotal}`, closed);
console.log(`opening_hours "closed" or "off": ${closedHours.length}; without coordinates: ${objects.filter((o) => o.lat === null).length}; scan ${ms} ms`);
console.log('cities:', cities.map((c) => `${c.name} ${(c as unknown as { km2: number }).km2.toFixed(1)} km²`).join(', '));

writeJson('out/21-focus-counts.json', {
  osm_extract: PBF,
  osm_date: OSM_DATE,
  scan_ms: ms,
  candidates_scanned: candidates.length,
  objects_in_the_five_groups: objects.length,
  by_osm_type: byType,
  memorial_plaques_counted_apart: plaques,
  cities: cities.map((c) => ({ wikidata: c.qid, name: c.name, km2: Math.round((c as unknown as { km2: number }).km2 * 10) / 10 })),
  table: json,
  tags_of_each_group: rules,
  lifecycle_prefix_on_the_kind_tag: { objects: lifecycleTotal, by_prefix_and_former_group: closed },
  opening_hours_closed_or_off: { objects: closedHours.length, by_group: Object.fromEntries(GROUPS.map((g) => [g, closedHours.filter((o) => o.group === g).length])) },
});
// The objects themselves, for the freshness, website and size steps (not for committing).
writeJson('out/21-focus-objects.json', objects);
