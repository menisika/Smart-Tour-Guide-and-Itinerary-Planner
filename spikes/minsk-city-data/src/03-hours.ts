// Opening hours (specification §10.4, ADR-0029): how many candidate Places carry the
// opening_hours tag, and how many of those values the standard parser of the OpenStreetMap
// ecosystem (opening_hours.js) can resolve into intervals, public-holiday rules included.
//
// Run with TZ=Europe/Minsk ("npm run hours" sets it): the parser works in the process's zone.
import opening_hours from 'opening_hours';
import { CENTRE, CITY_COUNTRY, CITY_TZ, OSM_DATE, mdTable, openDb, pct, rows, writeJson } from './lib.ts';

if (Intl.DateTimeFormat().resolvedOptions().timeZone !== CITY_TZ) {
  console.error(`Run with TZ=${CITY_TZ}: opening_hours.js evaluates rules in the process's time zone.`);
  process.exit(1);
}

// Two horizons of two weeks, as ADR-0029 resolves them: an ordinary fortnight right after the
// date of the data, and the fortnight that holds 25 December, 1 January and 7 January.
const ORDINARY = [new Date(2026, 10, 23), new Date(2026, 11, 7)] as const;
const HOLIDAYS = [new Date(2026, 11, 25), new Date(2027, 0, 8)] as const;

interface PlaceRow {
  ref: string;
  kind: string;
  subkind: string;
  name: string | null;
  oh: string | null;
  lat: number;
  lon: number;
  check_date: string | null;
}
const con = await openDb({ readOnly: true });
const places = await rows<PlaceRow>(
  con,
  `SELECT osm_type || '/' || osm_id AS ref, kind, subkind, name, opening_hours AS oh, lat, lon,
          coalesce(tags['check_date:opening_hours'], tags['check_date'], tags['survey:date']) AS check_date
   FROM place ORDER BY osm_type, osm_id`,
);

interface Parsed {
  ok: boolean;
  error?: string;
  warnings: number;
  intervalsOrdinary: number;
  intervalsHolidays: number;
  unknown: boolean; // some interval is "unknown" (a comment such as "by appointment")
  weekStable: boolean;
  holidayFortnightDiffers: boolean;
}
const cache = new Map<string, Parsed>();
function parse(value: string, lat: number, lon: number): Parsed {
  const hit = cache.get(value);
  if (hit) return hit;
  let out: Parsed;
  try {
    const oh = new opening_hours(
      value,
      { lat, lon, address: { country_code: CITY_COUNTRY, state: '' } } as never,
      { tag_key: 'opening_hours' } as never,
    );
    const a = oh.getOpenIntervals(ORDINARY[0], ORDINARY[1]);
    const b = oh.getOpenIntervals(HOLIDAYS[0], HOLIDAYS[1]);
    const minutes = (iv: [Date, Date, boolean, string | undefined][]) =>
      iv.reduce((s, [f, t]) => s + (t.getTime() - f.getTime()) / 60000, 0);
    out = {
      ok: true,
      warnings: oh.getWarnings().length,
      intervalsOrdinary: a.length,
      intervalsHolidays: b.length,
      unknown: [...a, ...b].some((iv) => iv[2]),
      weekStable: oh.isWeekStable(),
      holidayFortnightDiffers: Math.abs(minutes(a) - minutes(b)) > 0.5,
    };
  } catch (e) {
    out = {
      ok: false,
      error: String(e).replace(/\s+/g, ' ').slice(0, 300),
      warnings: 0,
      intervalsOrdinary: 0,
      intervalsHolidays: 0,
      unknown: false,
      weekStable: false,
      holidayFortnightDiffers: false,
    };
  }
  cache.set(value, out);
  return out;
}

const GROUPS: [string, (p: PlaceRow) => boolean][] = [
  ['Museums (tourism=museum)', (p) => p.subkind === 'museum'],
  ['Galleries (tourism=gallery)', (p) => p.subkind === 'gallery'],
  ['Cafés (amenity=cafe)', (p) => p.subkind === 'cafe'],
  ['Bars and pubs (amenity=bar, pub)', (p) => p.subkind === 'bar'],
  ['Restaurants (amenity=restaurant)', (p) => p.subkind === 'restaurant'],
  ['Cafés, bars and restaurants together', (p) => ['cafe', 'bar', 'restaurant'].includes(p.subkind)],
  ['Fast food and food courts', (p) => p.subkind === 'fast_food'],
  ['Markets (amenity=marketplace)', (p) => p.kind === 'market'],
  ['Theatres and arts centres', (p) => p.subkind === 'theatre'],
  ['Places of worship', (p) => p.subkind === 'place_of_worship'],
  ['Parks and gardens', (p) => p.subkind === 'park' || p.subkind === 'garden'],
  ['Attractions, zoo, theme parks', (p) => p.subkind === 'attraction'],
  ['Every candidate Place', () => true],
];

const table: (string | number)[][] = [];
const json: Record<string, unknown>[] = [];
for (const [label, test] of GROUPS) {
  const set = places.filter(test);
  const tagged = set.filter((p) => p.oh !== null && p.oh.trim() !== '');
  const parsed = tagged.map((p) => parse(p.oh!, p.lat, p.lon));
  const ok = parsed.filter((x) => x.ok);
  const clean = ok.filter((x) => x.warnings === 0);
  const withPH = tagged.filter((p) => /\bPH\b/.test(p.oh!));
  const withPHok = withPH.filter((p) => parse(p.oh!, p.lat, p.lon).ok);
  const checked = tagged.filter((p) => p.check_date !== null);
  table.push([
    label, set.length, tagged.length, pct(tagged.length, set.length), ok.length, pct(ok.length, tagged.length),
    clean.length, withPH.length, withPHok.length, pct(ok.length, set.length),
  ]);
  json.push({
    group: label,
    places: set.length,
    with_opening_hours: tagged.length,
    resolved: ok.length,
    resolved_without_warnings: clean.length,
    not_resolved: tagged.length - ok.length,
    with_public_holiday_rule: withPH.length,
    with_public_holiday_rule_resolved: withPHok.length,
    with_school_holiday_rule: tagged.filter((p) => /\bSH\b/.test(p.oh!)).length,
    always_open_24_7: tagged.filter((p) => /^24\/7$/.test(p.oh!.trim())).length,
    with_unknown_intervals: tagged.filter((p) => parse(p.oh!, p.lat, p.lon).unknown).length,
    not_week_stable: tagged.filter((p) => { const x = parse(p.oh!, p.lat, p.lon); return x.ok && !x.weekStable; }).length,
    holiday_fortnight_differs: tagged.filter((p) => parse(p.oh!, p.lat, p.lon).holidayFortnightDiffers).length,
    with_check_date: checked.length,
    known_hours_share_of_all: pct(ok.length, set.length),
  });
}
console.log(
  mdTable(
    ['Group', 'Places', 'With opening_hours', 'Coverage', 'Resolved', 'Resolved of tagged', 'No warnings', 'With PH rule', 'PH resolved', 'Known hours of all'],
    table,
  ),
);

// What does not resolve, and the most common spellings.
const failures = new Map<string, { value: string; error: string; count: number }>();
const frequent = new Map<string, number>();
for (const p of places) {
  if (!p.oh) continue;
  frequent.set(p.oh, (frequent.get(p.oh) ?? 0) + 1);
  const x = parse(p.oh, p.lat, p.lon);
  if (!x.ok) {
    const f = failures.get(p.oh) ?? { value: p.oh, error: x.error ?? '', count: 0 };
    f.count++;
    failures.set(p.oh, f);
  }
}
const failureList = [...failures.values()].sort((a, b) => b.count - a.count || (a.value < b.value ? -1 : 1));
console.log(`\nDistinct values: ${frequent.size}; distinct values that do not resolve: ${failureList.length}`);
for (const f of failureList.slice(0, 25)) console.log(`  x${f.count}  ${JSON.stringify(f.value)}\n        ${f.error.slice(0, 160)}`);

// The holiday calendar the parser applies to Belarus, for comparison with the official one.
const ph = new opening_hours('PH', { lat: CENTRE.lat, lon: CENTRE.lon, address: { country_code: CITY_COUNTRY, state: '' } } as never, { tag_key: 'opening_hours' } as never);
const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const holidays = ph.getOpenIntervals(new Date(2027, 0, 1), new Date(2028, 0, 1)).map((iv) => ({ date: fmt(iv[0]), name: iv[3] }));
let schoolHolidays = 'defined';
try {
  new opening_hours('SH', { lat: CENTRE.lat, lon: CENTRE.lon, address: { country_code: CITY_COUNTRY, state: '' } } as never, { tag_key: 'opening_hours' } as never)
    .getOpenIntervals(new Date(2027, 0, 1), new Date(2028, 0, 1));
} catch (e) {
  schoolHolidays = `not defined: ${String(e).replace(/\s+/g, ' ').slice(0, 160)}`;
}
console.log('\nPublic holidays the parser knows for 2027:', holidays);
console.log('School holidays:', schoolHolidays);

// Size of the resolved form ADR-0029 describes: every interval of every Place for two weeks.
let intervals = 0;
let placesResolved = 0;
for (const p of places) {
  if (!p.oh) continue;
  const x = parse(p.oh, p.lat, p.lon);
  if (!x.ok) continue;
  placesResolved++;
  intervals += x.intervalsOrdinary;
}
console.log(`\nResolved intervals for the two ordinary weeks: ${intervals} for ${placesResolved} Places`);

writeJson('out/03-hours.json', {
  osm_date: OSM_DATE,
  parser: 'opening_hours.js 3.16.0',
  time_zone: CITY_TZ,
  horizons: { ordinary: ORDINARY.map(fmt), with_holidays: HOLIDAYS.map(fmt) },
  groups: json,
  resolved_intervals_two_weeks: { places: placesResolved, intervals, bytes_as_two_uint16_minutes: intervals * 4 },
  distinct_values: frequent.size,
  distinct_values_not_resolved: failureList.length,
  not_resolved: failureList,
  most_frequent_values: [...frequent.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 20).map(([value, count]) => ({ value, count })),
  parser_public_holidays_2027: holidays,
  parser_school_holidays: schoolHolidays,
});
